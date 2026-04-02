import {
  AuditPhase,
  AuditReportAsset,
  AuditReportTone,
  AuditSubmitResponse,
} from "@/features/audits/types/audit";
import { apiService } from "@/network/ApiService";
import mqttService, { MqttConnectionStatus } from "@/network/mqttService";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AuditScanItem } from "../data/auditScanData";
import { InventoryBarcodeScanDetail } from "../types/inventory";

type AuditSummary = {
  found: number;
  missing: number;
  extra: number;
  scanned: number;
};

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

export function useAuditScanState() {
  const [manualAssetId, setManualAssetId] = useState("");
  const [auditPhase, setAuditPhase] = useState<AuditPhase>("idle");
  const [mqttItems, setMqttItems] = useState<AuditScanItem[]>([]);
  const [manualItems, setManualItems] = useState<AuditScanItem[]>([]);
  const [frozenItems, setFrozenItems] = useState<AuditScanItem[]>([]);
  const [reportItems, setReportItems] = useState<AuditScanItem[]>([]);
  const [submittedTagIds, setSubmittedTagIds] = useState<string[]>([]);
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
  const scannedTagIdsRef = useRef(new Set<string>());
  const auditPhaseRef = useRef<AuditPhase>("idle");
  const scanSessionRef = useRef(0);

  useEffect(() => {
    auditPhaseRef.current = auditPhase;
  }, [auditPhase]);

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
      .then((results) => mapInventoryToAuditItem(tagId, results[0] ?? null))
      .catch(() => mapInventoryToAuditItem(tagId, null))
      .then((item) => {
        itemCacheRef.current.set(tagId, item);
        pendingLookupsRef.current.delete(tagId);
        return item;
      });

    pendingLookupsRef.current.set(tagId, lookupPromise);
    return lookupPromise;
  }, []);

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

  const liveItems = useMemo(
    () => mergeAuditItems(manualItems, mqttItems),
    [manualItems, mqttItems]
  );

  const items = useMemo(() => {
    if (auditPhase === "submitted") {
      return reportItems.length > 0 ? reportItems : frozenItems;
    }

    if (auditPhase === "submitting" || auditPhase === "submitError") {
      return frozenItems;
    }

    return liveItems;
  }, [auditPhase, frozenItems, liveItems, reportItems]);

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

  const resetAudit = useCallback(() => {
    scanSessionRef.current += 1;
    mqttService.disconnectMqtt();
    itemCacheRef.current.clear();
    pendingLookupsRef.current.clear();
    scannedTagIdsRef.current = new Set<string>();
    setManualAssetId("");
    setMqttItems([]);
    setManualItems([]);
    setFrozenItems([]);
    setReportItems([]);
    setSubmittedTagIds([]);
    setReportSummary({ found: 0, missing: 0, extra: 0, scanned: 0 });
    setSubmitError(null);
    setConnectionStatus("idle");
    setAuditWarehouseId(null);
    setAuditPhase("idle");
  }, []);

  const startAudit = useCallback((warehouseId?: string) => {
    if (!warehouseId) {
      return;
    }

    resetAudit();
    setAuditWarehouseId(warehouseId);
    setAuditPhase("scanning");
  }, [resetAudit]);

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

  const submitAudit = useCallback(async () => {
    const canRetry = auditPhase === "submitError" && submittedTagIds.length > 0;
    const canSubmitLive = auditPhase === "scanning" && liveItems.length > 0;

    if (!canRetry && !canSubmitLive) {
      return;
    }

    const tagIds = canRetry
      ? submittedTagIds
      : Array.from(scannedTagIdsRef.current.values());

    if (tagIds.length === 0) {
      return;
    }

    const snapshotItems = canRetry
      ? frozenItems
      : buildSnapshotItems(tagIds, liveItems);

    scanSessionRef.current += 1;
    setSubmitError(null);
    setSubmittedTagIds(tagIds);
    setFrozenItems(snapshotItems);
    setReportItems([]);
    setReportSummary(getSummaryFromItems(snapshotItems, tagIds.length));
    setConnectionStatus("idle");
    setAuditPhase("submitting");
    mqttService.disconnectMqtt();

    try {
      const response = await apiService.submitScannedAuditTags(tagIds);
      const normalizedReport = normalizeAuditSubmitResponse(
        response,
        snapshotItems,
        tagIds
      );

      setReportItems(normalizedReport.items);
      setReportSummary(normalizedReport.summary);
      setAuditPhase("submitted");
    } catch {
      setAuditPhase("submitError");
      setSubmitError(
        "MQTT has been disconnected and the scanned TAG_ID list is frozen, but the audit API request failed. Retry submit after the backend endpoint is ready."
      );
    }
  }, [auditPhase, frozenItems, liveItems, submittedTagIds]);

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



