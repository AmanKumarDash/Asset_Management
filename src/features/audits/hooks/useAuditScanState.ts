import {
  AssetWarehouseStagingItem,
  AuditPhase,
  AuditReportAsset,
  AuditReportTone,
  AuditSubmitResponse,
} from "@/features/audits/types/audit";
import { apiService } from "@/network/ApiService";
import mqttService, { MqttConnectionStatus } from "@/network/mqttService";
import { appLogger } from "@/utils/appLogger";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AuditScanItem } from "../data/auditScanData";
import { InventoryBarcodeScanDetail } from "../types/inventory";

type AuditSummary = {
  found: number;
  missing: number;
  extra: number;
  scanned: number;
};

type StagedAssetLookup = Omit<AssetWarehouseStagingItem, "WareHouseId">;

// Extracts a tag id from either plain strings or the nested payloads returned by the scanner stream.
function getTagId(entry: unknown): string | null {
  if (typeof entry === "string") {
    const value = entry.trim();
    return value || null;
  }

  if (!entry || typeof entry !== "object") {
    return null;
  }

  const record = entry as Record<string, unknown>;
  const directTagId = record.TAG_ID;

  if (typeof directTagId === "string" && directTagId.trim()) {
    return directTagId.trim();
  }

  const nestedData = record.DATA;

  if (!nestedData || typeof nestedData !== "object") {
    return null;
  }

  const nestedTagId = (nestedData as Record<string, unknown>).TAG_ID;
  return typeof nestedTagId === "string" && nestedTagId.trim()
    ? nestedTagId.trim()
    : null;
}

// Normalizes mixed API ids into numbers because the staging endpoint expects numeric ids.
function parseNumericId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

// Converts inventory lookup data into the reusable UI item shape shown in the audit results list.
function mapInventoryToAuditItem(
  tagId: string,
  asset: InventoryBarcodeScanDetail | null
): AuditScanItem {
  if (!asset) {
    return {
      id: tagId,
      title: "RFID Asset Detected",
      subtitle: `${tagId} - Details unavailable`,
      tone: "found",
      icon: "plus-square",
    };
  }

  const productCode = asset.ProductCode?.trim();
  const manufacturer = asset.ManufecturName?.trim();
  const modelNo = asset.ModelNo?.trim();
  const subtitleParts = [
    asset.TagId?.trim() || tagId,
    productCode,
    manufacturer,
    modelNo,
  ].filter(Boolean);

  return {
    id: asset.TagId?.trim() || tagId,
    title: asset.ProductName?.trim() || "RFID Asset Detected",
    subtitle: subtitleParts.join(" - "),
    tone: "found",
    icon: "plus-square",
  };
}

// Extracts the numeric tag and product ids needed by the warehouse staging API.
// The inventory lookup returns the scanned RFID value as TagId for display, but
// the staging endpoint expects the numeric tag record id, which comes back as ID.
function mapInventoryToStagedLookup(
  tagId: string,
  asset: InventoryBarcodeScanDetail | null
): StagedAssetLookup | null {
  const resolvedTagId = parseNumericId(asset?.ID ?? asset?.TagId ?? tagId);
  const productId = parseNumericId(asset?.ProductId);

  if (resolvedTagId === null || productId === null) {
    return null;
  }

  return {
    TagId: resolvedTagId,
    ProductId: productId,
  };
}

// Stores scan lookup data under all relevant tag keys so submit can rebuild the payload reliably.
function registerStagedLookup(
  lookups: Map<string, StagedAssetLookup>,
  lookup: StagedAssetLookup,
  keys: (string | null | undefined)[]
) {
  keys.forEach((key) => {
    if (!key?.trim()) {
      return;
    }

    lookups.set(key.trim(), lookup);
  });

  lookups.set(String(lookup.TagId), lookup);
}

// Merges live MQTT items and manual entries into one deduplicated list for the screen.
function mergeAuditItems(
  manualItems: AuditScanItem[],
  mqttItems: AuditScanItem[]
): AuditScanItem[] {
  const seen = new Set<string>();

  return [...mqttItems, ...manualItems].filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
}

// Freezes the current list of scanned tags at submit time so later UI changes cannot affect the report request.
function buildSnapshotItems(
  tagIds: string[],
  liveItems: AuditScanItem[]
): AuditScanItem[] {
  const liveItemMap = new Map(liveItems.map((item) => [item.id, item]));
  const orderedIds = Array.from(
    new Set([...liveItems.map((item) => item.id), ...tagIds])
  );

  return orderedIds.map(
    (tagId) => liveItemMap.get(tagId) ?? mapInventoryToAuditItem(tagId, null)
  );
}

// Builds the count cards shown in the audit progress panel from a list of UI items.
function getSummaryFromItems(
  items: AuditScanItem[],
  scannedOverride?: number
): AuditSummary {
  const found = items.filter((item) => item.tone === "found").length;
  const missing = items.filter((item) => item.tone === "missing").length;
  const extra = items.filter((item) => item.tone === "extra").length;

  return {
    found,
    missing,
    extra,
    scanned: scannedOverride ?? items.length,
  };
}

// Reads the first useful string from backend report objects because those payloads can vary by key name.
function pickString(
  record: Record<string, unknown>,
  keys: string[]
): string | null {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

// Chooses the most reliable tag id field from a backend report asset and falls back when necessary.
function getReportAssetTagId(
  asset: AuditReportAsset,
  fallbackTagId?: string
): string {
  const assetRecord = asset as Record<string, unknown>;

  return (
    pickString(assetRecord, ["TagId", "TAG_ID", "TagID", "tagId"]) ??
    fallbackTagId ??
    "UNKNOWN-TAG"
  );
}

// Generates a display title for report rows while supporting partial backend payloads.
function getReportAssetTitle(
  asset: AuditReportAsset,
  tone: AuditReportTone,
  tagId: string
): string {
  const assetRecord = asset as Record<string, unknown>;

  return (
    pickString(assetRecord, ["ProductName", "Title", "Name", "ItemName"]) ??
    (tone === "missing"
      ? "Missing Asset"
      : tone === "extra"
        ? "Extra Asset"
        : `RFID Asset ${tagId}`)
  );
}

// Generates a readable subtitle so missing and extra rows still make sense even with incomplete report data.
function getReportAssetSubtitle(
  asset: AuditReportAsset,
  tone: AuditReportTone,
  tagId: string
): string {
  const assetRecord = asset as Record<string, unknown>;
  const directSubtitle = pickString(assetRecord, [
    "Subtitle",
    "Description",
    "StatusText",
  ]);

  if (directSubtitle) {
    return directSubtitle;
  }

  const subtitleParts = [
    tagId,
    pickString(assetRecord, ["ProductCode"]),
    pickString(assetRecord, ["ManufecturName"]),
    pickString(assetRecord, ["ModelNo"]),
  ].filter(Boolean);

  if (subtitleParts.length > 1) {
    return subtitleParts.join(" - ");
  }

  if (tone === "missing") {
    return `${tagId} - Expected asset not scanned`;
  }

  if (tone === "extra") {
    return `${tagId} - Found during audit but not expected`;
  }

  return `${tagId} - Present in audit`;
}

// Converts a backend report asset into the same UI row shape used during live scanning.
function mapReportAssetToAuditItem(
  tone: AuditReportTone,
  asset: AuditReportAsset,
  fallbackTagId?: string
): AuditScanItem {
  const tagId = getReportAssetTagId(asset, fallbackTagId);

  return {
    id: tagId,
    title: getReportAssetTitle(asset, tone, tagId),
    subtitle: getReportAssetSubtitle(asset, tone, tagId),
    tone,
    icon:
      tone === "missing"
        ? "briefcase"
        : tone === "extra"
          ? "plus-circle"
          : "plus-square",
  };
}

// Finds the first matching array field from a flexible report payload.
function pickAssetArray(
  response: AuditSubmitResponse,
  keys: string[]
): AuditReportAsset[] {
  const responseRecord = response as Record<string, unknown>;

  for (const key of keys) {
    const value = responseRecord[key];

    if (Array.isArray(value)) {
      return value.filter(
        (entry): entry is AuditReportAsset =>
          !!entry && typeof entry === "object"
      );
    }
  }

  return [];
}

// Reads numeric summary counts from the backend report when those counts are explicitly returned.
function pickNumber(
  response: AuditSubmitResponse,
  keys: string[]
): number | null {
  const responseRecord = response as Record<string, unknown>;

  for (const key of keys) {
    const value = responseRecord[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

// Normalizes the backend audit response into one list and one summary so the UI can render it consistently.
function normalizeAuditSubmitResponse(
  response: AuditSubmitResponse,
  frozenItems: AuditScanItem[],
  submittedTagIds: string[]
): {
  items: AuditScanItem[];
  summary: AuditSummary;
} {
  const foundAssets = pickAssetArray(response, [
    "FoundAssets",
    "FoundItems",
    "Found",
    "foundAssets",
    "foundItems",
    "found",
  ]);
  const missingAssets = pickAssetArray(response, [
    "MissingAssets",
    "MissingItems",
    "Missing",
    "missingAssets",
    "missingItems",
    "missing",
  ]);
  const extraAssets = pickAssetArray(response, [
    "ExtraAssets",
    "ExtraItems",
    "Extra",
    "extraAssets",
    "extraItems",
    "extra",
  ]);

  const missingItems = missingAssets.map((asset, index) =>
    mapReportAssetToAuditItem("missing", asset, `MISSING-${index + 1}`)
  );
  const extraItems = extraAssets.map((asset, index) =>
    mapReportAssetToAuditItem("extra", asset, `EXTRA-${index + 1}`)
  );
  const extraTagIds = new Set(extraItems.map((item) => item.id));
  const frozenItemMap = new Map(frozenItems.map((item) => [item.id, item]));

  const foundItems =
    foundAssets.length > 0
      ? foundAssets.map((asset, index) =>
          mapReportAssetToAuditItem(
            "found",
            asset,
            submittedTagIds[index] ?? `FOUND-${index + 1}`
          )
        )
      : submittedTagIds
          .filter((tagId) => !extraTagIds.has(tagId))
          .map((tagId) => {
            const frozenItem = frozenItemMap.get(tagId);

            if (frozenItem) {
              return {
                ...frozenItem,
                tone: "found" as const,
                icon: "plus-square" as const,
              };
            }

            return mapReportAssetToAuditItem("found", { tagId }, tagId);
          });

  const items = [...foundItems, ...missingItems, ...extraItems];

  return {
    items,
    summary: {
      found:
        pickNumber(response, ["FoundCount", "foundCount"]) ?? foundItems.length,
      missing:
        pickNumber(response, ["MissingCount", "missingCount"]) ??
        missingItems.length,
      extra:
        pickNumber(response, ["ExtraCount", "extraCount"]) ?? extraItems.length,
      scanned: submittedTagIds.length,
    },
  };
}

// Central audit hook that manages the full client-side scan lifecycle from start, to submit, to report view.
export function useAuditScanState() {
  const [manualAssetId, setManualAssetId] = useState("");
  const [auditPhase, setAuditPhase] = useState<AuditPhase>("idle");
  const [mqttItems, setMqttItems] = useState<AuditScanItem[]>([]);
  const [manualItems, setManualItems] = useState<AuditScanItem[]>([]);
  const [frozenItems, setFrozenItems] = useState<AuditScanItem[]>([]);
  const [reportItems, setReportItems] = useState<AuditScanItem[]>([]);
  const [submittedTagIds, setSubmittedTagIds] = useState<string[]>([]);
  const [submittedStagingList, setSubmittedStagingList] = useState<
    AssetWarehouseStagingItem[]
  >([]);
  const [reportSummary, setReportSummary] = useState<AuditSummary>({
    found: 0,
    missing: 0,
    extra: 0,
    scanned: 0,
  });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<MqttConnectionStatus>("idle");
  const [auditWarehouseId, setAuditWarehouseId] = useState<string | null>(null);
  const itemCacheRef = useRef(new Map<string, AuditScanItem>());
  const pendingLookupsRef = useRef(new Map<string, Promise<AuditScanItem>>());
  const stagedLookupsRef = useRef(new Map<string, StagedAssetLookup>());
  const scannedTagIdsRef = useRef(new Set<string>());
  const auditPhaseRef = useRef<AuditPhase>("idle");
  const scanSessionRef = useRef(0);

  // Keeps async callbacks synced with the latest phase without forcing every subscription to re-register.
  useEffect(() => {
    auditPhaseRef.current = auditPhase;
  }, [auditPhase]);

  // Resolves one scanned tag into a UI item and caches the result to avoid duplicate lookup calls.
  const resolveAuditItem = useCallback(async (tagId: string) => {
    const cachedItem = itemCacheRef.current.get(tagId);

    if (cachedItem) {
      return cachedItem;
    }

    const pendingLookup = pendingLookupsRef.current.get(tagId);

    if (pendingLookup) {
      return pendingLookup;
    }

    const lookupPromise = apiService
      .searchInventoryBarcodeScanMode(tagId)
      .then((results) => {
        const asset = results[0] ?? null;
        const item = mapInventoryToAuditItem(tagId, asset);
        const stagedLookup = mapInventoryToStagedLookup(tagId, asset);

        if (stagedLookup) {
          registerStagedLookup(stagedLookupsRef.current, stagedLookup, [
            tagId,
            asset?.TagId,
            item.id,
          ]);
        }

        return item;
      })
      .catch(() => mapInventoryToAuditItem(tagId, null))
      .then((item) => {
        itemCacheRef.current.set(tagId, item);
        pendingLookupsRef.current.delete(tagId);
        return item;
      });

    pendingLookupsRef.current.set(tagId, lookupPromise);
    return lookupPromise;
  }, []);

  // Handles live MQTT payloads, extracts unique tags, and updates the on-screen scan list.
  const handleMqttMessage = useCallback(
    (payload: unknown) => {
      if (auditPhaseRef.current !== "scanning") {
        return;
      }

      const sessionId = scanSessionRef.current;
      const tagIds = Array.isArray(payload)
        ? Array.from(
            new Set(payload.map((entry) => getTagId(entry)).filter(Boolean))
          )
        : [getTagId(payload)].filter(Boolean);

      if (tagIds.length === 0) {
        return;
      }

      tagIds.forEach((tagId) => scannedTagIdsRef.current.add(tagId as string));

      void Promise.all(
        tagIds.map((tagId) => resolveAuditItem(tagId as string))
      ).then((resolvedItems) => {
        if (
          auditPhaseRef.current !== "scanning" ||
          sessionId !== scanSessionRef.current
        ) {
          return;
        }

        if (Array.isArray(payload)) {
          setMqttItems(resolvedItems);
          return;
        }

        setMqttItems((current) => {
          const nextItems = [...current];

          resolvedItems.forEach((item) => {
            const existingIndex = nextItems.findIndex(
              (existingItem) => existingItem.id === item.id
            );

            if (existingIndex >= 0) {
              nextItems[existingIndex] = item;
              return;
            }

            nextItems.unshift(item);
          });

          return nextItems;
        });
      });
    },
    [resolveAuditItem]
  );

  // Starts and stops the MQTT subscription with the scanning phase so idle screens do not keep listening.
  useEffect(() => {
    if (auditPhase !== "scanning") {
      return;
    }

    mqttService.onMessage(handleMqttMessage);
    mqttService.onStatus(setConnectionStatus);
    mqttService.connectMqtt();

    return () => {
      mqttService.offMessage(handleMqttMessage);
      mqttService.offStatus(setConnectionStatus);
      mqttService.disconnectMqtt();
      setConnectionStatus("idle");
    };
  }, [auditPhase, handleMqttMessage]);

  // Combines manual and live scanner entries into the list used while the audit is still active.
  const liveItems = useMemo(
    () => mergeAuditItems(manualItems, mqttItems),
    [manualItems, mqttItems]
  );

  // Chooses which item list the UI should render based on whether we are scanning, submitting, or showing the report.
  const items = useMemo(() => {
    if (auditPhase === "submitted") {
      return reportItems.length > 0 ? reportItems : frozenItems;
    }

    if (auditPhase === "submitting" || auditPhase === "submitError") {
      return frozenItems;
    }

    return liveItems;
  }, [auditPhase, frozenItems, liveItems, reportItems]);

  // Chooses the correct summary source so progress cards stay stable after submit or retry states.
  const summary = useMemo(() => {
    if (auditPhase === "idle") {
      return { found: 0, missing: 0, extra: 0, scanned: 0 };
    }

    if (auditPhase === "submitted") {
      return reportSummary;
    }

    if (auditPhase === "submitting" || auditPhase === "submitError") {
      return getSummaryFromItems(
        frozenItems,
        submittedTagIds.length || frozenItems.length
      );
    }

    return getSummaryFromItems(liveItems);
  }, [auditPhase, frozenItems, liveItems, reportSummary, submittedTagIds]);

  // Returns the hook to a clean pre-scan state when the user changes warehouse or leaves the audit screen.
  const resetAudit = useCallback(() => {
    scanSessionRef.current += 1;
    mqttService.disconnectMqtt();
    itemCacheRef.current.clear();
    pendingLookupsRef.current.clear();
    stagedLookupsRef.current.clear();
    scannedTagIdsRef.current = new Set<string>();
    setManualAssetId("");
    setMqttItems([]);
    setManualItems([]);
    setFrozenItems([]);
    setReportItems([]);
    setSubmittedTagIds([]);
    setSubmittedStagingList([]);
    setReportSummary({ found: 0, missing: 0, extra: 0, scanned: 0 });
    setSubmitError(null);
    setConnectionStatus("idle");
    setAuditWarehouseId(null);
    setAuditPhase("idle");
  }, []);

  // Begins a new audit session only after a warehouse is chosen so scanning is always tied to a location.
  const startAudit = useCallback((warehouseId?: string) => {
    if (!warehouseId) {
      return;
    }

    resetAudit();
    setAuditWarehouseId(warehouseId);
    setAuditPhase("scanning");
  }, [resetAudit]);

  // Adds a manually typed asset id into the same scan dataset used by MQTT so both flows submit together.
  const addManualAsset = useCallback(() => {
    const value = manualAssetId.trim();

    if (!value || auditPhase !== "scanning") {
      return;
    }

    scannedTagIdsRef.current.add(value);

    setManualItems((current) => {
      if (
        current.some((item) => item.id === value) ||
        mqttItems.some((item) => item.id === value)
      ) {
        return current;
      }

      return [
        {
          id: value,
          title: "Manual Asset Entry",
          subtitle: `${value} - Added manually`,
          tone: "extra",
          icon: "plus-circle",
        },
        ...current,
      ];
    });

    setManualAssetId("");
  }, [auditPhase, manualAssetId, mqttItems]);

  // Freezes the current scan set, disconnects MQTT, and submits the final staging payload for the selected warehouse.
  const submitAudit = useCallback(async () => {
    const canRetry = auditPhase === "submitError" && submittedTagIds.length > 0;
    const canSubmitLive = auditPhase === "scanning" && liveItems.length > 0;

    if (!canRetry && !canSubmitLive) {
      appLogger.warn("AuditScan", "Submit ignored because the audit is not in a submittable state.", {
        auditPhase,
        liveItemCount: liveItems.length,
        submittedTagCount: submittedTagIds.length,
      });
      return;
    }

    const tagIds = canRetry
      ? submittedTagIds
      : Array.from(new Set(liveItems.map((item) => item.id)));

    if (tagIds.length === 0) {
      setSubmitError("No scanned tags are available to submit yet.");
      appLogger.warn("AuditScan", "Submit blocked because no scanned tags were captured for the staging payload.");
      return;
    }

    const warehouseId = parseNumericId(auditWarehouseId);

    if (warehouseId === null) {
      setSubmitError("Select a warehouse before submitting the scanned assets.");
      appLogger.warn("AuditScan", "Submit blocked because the selected warehouse id is not numeric.", {
        auditWarehouseId,
      });
      return;
    }

    const pendingLookups = canRetry
      ? []
      : tagIds.flatMap((tagId) => {
          const pendingLookup = pendingLookupsRef.current.get(tagId);
          return pendingLookup ? [pendingLookup] : [];
        });

    if (pendingLookups.length > 0) {
      await Promise.all(pendingLookups);
    }

    const stagingList = canRetry
      ? submittedStagingList
      : tagIds.flatMap((tagId) => {
          const stagedLookup = stagedLookupsRef.current.get(tagId);

          return stagedLookup
            ? [
                {
                  ...stagedLookup,
                  WareHouseId: warehouseId,
                },
              ]
            : [];
        });

    if (stagingList.length !== tagIds.length) {
      const missingTagIds = tagIds.filter(
        (tagId) => !stagedLookupsRef.current.has(tagId)
      );
      const message = `Some scanned tags could not be matched to a product for submission: ${missingTagIds.join(", ")}`;

      setSubmitError(message);
      appLogger.warn("AuditScan", "Submit blocked because some visible tags never resolved into staging lookup data.", {
        warehouseId,
        tagIds,
        missingTagIds,
        stagedLookupKeys: Array.from(stagedLookupsRef.current.keys()),
      });
      return;
    }

    const snapshotItems = canRetry
      ? frozenItems
      : buildSnapshotItems(tagIds, liveItems);

    scanSessionRef.current += 1;
    setSubmitError(null);
    setSubmittedTagIds(tagIds);
    setSubmittedStagingList(stagingList);
    setFrozenItems(snapshotItems);
    setReportItems([]);
    setReportSummary(getSummaryFromItems(snapshotItems, tagIds.length));
    setConnectionStatus("idle");
    setAuditPhase("submitting");
    mqttService.disconnectMqtt();

    appLogger.info("AuditScan", "Submitting warehouse staging payload.", {
      warehouseId,
      tagIds,
      stagingList,
    });

    try {
      const response = await apiService.submitScannedAuditTags(stagingList);
      const normalizedReport = normalizeAuditSubmitResponse(
        response,
        snapshotItems,
        tagIds
      );

      setReportItems(normalizedReport.items);
      setReportSummary(normalizedReport.summary);
      setAuditPhase("submitted");
    } catch (error) {
      appLogger.error("AuditScan", "Warehouse staging API request failed.", {
        warehouseId,
        tagIds,
        stagingList,
        error,
      });
      setAuditPhase("submitError");
      setSubmitError(
        "MQTT has been disconnected and the scan snapshot is frozen, but the warehouse staging API request failed. Retry submit after the backend endpoint is ready."
      );
    }
  }, [
    auditPhase,
    auditWarehouseId,
    frozenItems,
    liveItems,
    submittedStagingList,
    submittedTagIds,
  ]);

  const isScanning = auditPhase === "scanning";
  const canSubmit =
    (auditPhase === "scanning" && liveItems.length > 0) ||
    (auditPhase === "submitError" && submittedTagIds.length > 0);

  return {
    items,
    isScanning,
    auditPhase,
    canSubmit,
    submitError,
    connectionStatus,
    manualAssetId,
    setManualAssetId,
    startAudit,
    addManualAsset,
    submitAudit,
    resetAudit,
    summary,
    auditWarehouseId,
  };
}






