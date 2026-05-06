import {
  AssetWarehouseStagingItem,
  AuditComparisonAsset,
  AuditComparisonResponse,
  AuditPhase,
  AuditReportAsset,
  AuditReportTone,
  AuditSummary,
  WarehouseTagLocationItem,
} from "@/features/audits/types/audit";
import { useAuthSession } from "@/features/auth/hooks/useAuthSession";
import {
  LatestAuditReport,
  setLatestAuditReport,
} from "@/features/reports/state/latestAuditReportStore";
import { saveAuditReportSession } from "@/features/reports/state/auditReportSessionStore";
import { apiService } from "@/network/ApiService";
import mqttService, { MqttConnectionStatus } from "@/network/mqttService";
import { appLogger } from "@/utils/appLogger";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AuditScanItem } from "../data/auditScanData";
import { InventoryBarcodeScanDetail } from "../types/inventory";

type StagedAssetLookup = Omit<AssetWarehouseStagingItem, "WareHouseId" | "UserId">;

type PendingMissingAuditItem = AuditScanItem & {
  expectedWarehouseId: string;
  expectedWarehouseName?: string;
};

type ResolvedMisplacedAuditItem = AuditScanItem & {
  expectedWarehouseId: string;
  expectedWarehouseName?: string;
  foundWarehouseId: string;
  foundWarehouseName?: string;
};

function createAuditSessionId() {
  const randomUuid = globalThis.crypto?.randomUUID?.();

  if (randomUuid) {
    return randomUuid.replace(/-/g, "").slice(0, 8);
  }

  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
    .slice(-8);
}

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

function getTagKey(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
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
      title: "Unmatched RFID Asset",
      subtitle: `${tagId} - No product association found`,
      tone: "extra",
      icon: "plus-circle",
    };
  }

  const resolvedTagId = getTagKey(asset?.ID ?? asset?.TagId ?? tagId);
  const productId = parseNumericId(asset?.ProductId);
  const isStagingReady = resolvedTagId !== null && productId !== null;

  const productCode = asset.ProductCode?.trim();
  const manufacturer = asset.ManufecturName?.trim();
  const modelNo = asset.ModelNo?.trim();
  const subtitleParts = [
    asset.TagId?.trim() || tagId,
    productCode,
    manufacturer,
    modelNo,
  ].filter(Boolean);
  const baseSubtitle = subtitleParts.join(" - ");

  if (!isStagingReady) {
    return {
      id: asset.TagId?.trim() || tagId,
      title: asset.ProductName?.trim() || "Unmatched RFID Asset",
      subtitle: baseSubtitle
        ? `${baseSubtitle} - No product match for submission`
        : `${asset.TagId?.trim() || tagId} - No product match for submission`,
      tone: "extra",
      icon: "plus-circle",
    };
  }

  return {
    id: asset.TagId?.trim() || tagId,
    title: asset.ProductName?.trim() || "RFID Asset Detected",
    subtitle: baseSubtitle,
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
  const resolvedTagId = getTagKey(asset?.ID ?? asset?.TagId ?? tagId);
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

function getComparisonAssetTagId(
  asset: AuditComparisonAsset,
  fallbackTagId?: string
): string {
  const tagId =
    getTagKey(asset.TagId) ??
    getTagKey(asset.ID) ??
    pickString(asset as Record<string, unknown>, ["TAG_ID", "TagID", "tagId"]);

  return tagId ?? fallbackTagId ?? "UNKNOWN-TAG";
}

function getComparisonKey(
  asset: AuditComparisonAsset | StagedAssetLookup,
  fallbackKey: string
): string {
  const productId =
    parseNumericId((asset as AuditComparisonAsset).ProductId) ??
    parseNumericId((asset as AuditComparisonAsset).ProductID) ??
    parseNumericId((asset as AuditComparisonAsset).productId);

  if (productId !== null) {
    return `product:${productId}`;
  }

  const tagKey =
    getTagKey((asset as AuditComparisonAsset).TagId) ??
    getTagKey((asset as AuditComparisonAsset).ID) ??
    pickString(asset as Record<string, unknown>, ["TAG_ID", "TagID", "tagId"]);

  if (tagKey) {
    return `tag:${tagKey}`;
  }

  return fallbackKey;
}

function filterComparisonAssets(value: unknown): AuditComparisonAsset[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (entry): entry is AuditComparisonAsset => !!entry && typeof entry === "object"
  );
}

function pickComparisonArrayEntry(
  response: AuditComparisonResponse,
  keys: string[]
): { key: string; assets: AuditComparisonAsset[] } | null {
  for (const key of keys) {
    const assets = filterComparisonAssets(response[key]);

    if (assets.length > 0) {
      return { key, assets };
    }
  }

  return null;
}

function scoreArrayRole(key: string, role: "scanned" | "warehouse") {
  const normalizedKey = key.toLowerCase();
  const scannedTokens = ["scan", "staging", "staged", "actual", "audit"];
  const warehouseTokens = ["warehouse", "expected", "baseline", "selected"];
  const matches = role === "scanned" ? scannedTokens : warehouseTokens;

  return matches.reduce(
    (score, token) => (normalizedKey.includes(token) ? score + 1 : score),
    0
  );
}

function pickAuditComparisonArrays(response: AuditComparisonResponse): {
  scannedAssets: AuditComparisonAsset[];
  warehouseAssets: AuditComparisonAsset[];
} {
  const explicitScannedEntry = pickComparisonArrayEntry(response, [
    "ScannedAssets",
    "ScannedItems",
    "Scanned",
    "AuditScanData",
    "ActualData",
    "ActualItems",
    "Actual",
    "AuditData",
    "AuditItems",
    "StagedAssets",
    "StagingData",
  ]);
  const explicitWarehouseEntry = pickComparisonArrayEntry(response, [
    "WarehouseAssets",
    "WarehouseItems",
    "WarehouseData",
    "ExpectedAssets",
    "ExpectedItems",
    "Expected",
    "SelectedWarehouseAssets",
    "BaselineAssets",
  ]);

  const arrayEntries = Object.entries(response)
    .map(([key, value]) => ({
      key,
      assets: filterComparisonAssets(value),
    }))
    .filter((entry) => entry.assets.length > 0);

  if (arrayEntries.length === 0) {
    return { scannedAssets: [], warehouseAssets: [] };
  }

  if (explicitScannedEntry && explicitWarehouseEntry) {
    return {
      scannedAssets: explicitScannedEntry.assets,
      warehouseAssets: explicitWarehouseEntry.assets,
    };
  }

  const scoredEntries = arrayEntries.map((entry) => ({
    ...entry,
    scannedScore: scoreArrayRole(entry.key, "scanned"),
    warehouseScore: scoreArrayRole(entry.key, "warehouse"),
  }));

  const warehouseEntry =
    explicitWarehouseEntry ??
    scoredEntries
      .filter((entry) => entry.warehouseScore > 0)
      .sort((left, right) => right.warehouseScore - left.warehouseScore)[0] ??
    (scoredEntries.length > 1 ? scoredEntries[1] : null);
  const scannedEntry =
    explicitScannedEntry ??
    scoredEntries
      .filter((entry) => entry.scannedScore > 0 && entry.key !== warehouseEntry?.key)
      .sort((left, right) => right.scannedScore - left.scannedScore)[0] ??
    scoredEntries.find((entry) => entry.key !== warehouseEntry?.key) ??
    scoredEntries[0];

  return {
    scannedAssets: scannedEntry?.assets ?? [],
    warehouseAssets: warehouseEntry?.assets ?? [],
  };
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

function getWarehouseLocationTagId(location: WarehouseTagLocationItem): string | null {
  return (
    getTagKey(location.TagId) ??
    getTagKey(location.TAG_ID) ??
    getTagKey(location.TagID) ??
    null
  );
}

function getWarehouseLocationName(location: WarehouseTagLocationItem): string | null {
  return (
    pickString(location, ["WareHouseName", "WarehouseName", "warehouseName"]) ??
    null
  );
}

function getWarehouseLocationId(location: WarehouseTagLocationItem): string | null {
  return (
    getTagKey(location.WareHouseId) ??
    getTagKey(location.WarehouseId) ??
    getTagKey(location.warehouseId) ??
    null
  );
}

function getWarehouseLabel(warehouseId: string, warehouseName?: string | null) {
  return warehouseName?.trim() || `Warehouse ${warehouseId}`;
}

async function enrichExtraItemsWithWarehouseOrigin(
  items: AuditScanItem[],
  currentWarehouseId: string
): Promise<AuditScanItem[]> {
  const extraItems = items.filter((item) => item.tone === "extra");

  if (extraItems.length === 0) {
    return items;
  }

  try {
    const locations = await apiService.getWarehouseIdAccessByTagId(
      extraItems.map((item) => item.id)
    );
    const locationByTag = new Map(
      locations
        .map((location) => [getWarehouseLocationTagId(location), location] as const)
        .filter((entry): entry is [string, WarehouseTagLocationItem] =>
          Boolean(entry[0])
        )
    );

    return items.map((item) => {
      if (item.tone !== "extra") {
        return item;
      }

      const location = locationByTag.get(item.id);
      if (!location) {
        return item;
      }

      const sourceWarehouseId = getWarehouseLocationId(location);

      if (!sourceWarehouseId || sourceWarehouseId === currentWarehouseId) {
        return item;
      }

      const sourceLabel = getWarehouseLabel(
        sourceWarehouseId,
        getWarehouseLocationName(location)
      );

      return {
        ...item,
        subtitle: `${item.subtitle} - Expected in ${sourceLabel}, found here`,
      };
    });
  } catch (error) {
    appLogger.warn("AuditScan", "Failed to enrich extra assets with warehouse origin.", {
      currentWarehouseId,
      error,
    });
    return items;
  }
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

function formatAuditObservedAt(date: Date) {
  return date.toLocaleString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mergeAuditSummaries(reports: LatestAuditReport[]): AuditSummary {
  return reports.reduce<AuditSummary>(
    (summary, report) => ({
      found: summary.found + report.summary.found,
      missing: summary.missing + report.summary.missing,
      extra: summary.extra + report.summary.extra,
      scanned: summary.scanned + report.summary.scanned,
      expected: (summary.expected ?? 0) + (report.summary.expected ?? 0),
    }),
    { found: 0, missing: 0, extra: 0, scanned: 0, expected: 0 }
  );
}

function buildCombinedWarehouseReport(
  reports: LatestAuditReport[],
  warehouseIds: string[],
  observedAt: string,
  sessionId?: string | null
): LatestAuditReport {
  const locationLabel =
    warehouseIds.length > 1
      ? `Warehouses ${warehouseIds.join(", ")}`
      : reports[0]?.location ?? "Selected warehouse";
  const referenceIds = reports
    .map((report) => report.referenceId)
    .filter((referenceId): referenceId is string => Boolean(referenceId));

  return {
    title:
      warehouseIds.length > 1
        ? "Multi-Warehouse Audit Report"
        : reports[0]?.title ?? "Audit Report",
    location: locationLabel,
    mobileMeta: `${locationLabel} - ${observedAt}`,
    desktopMeta: `${locationLabel} - ${observedAt}`,
    status: "Completed",
    sessionId: sessionId ?? null,
    referenceId: referenceIds.length > 0 ? referenceIds.join(", ") : null,
    observedAt,
    summary: mergeAuditSummaries(reports),
    items: reports.flatMap((report) => report.items),
  };
}

function buildAuditComparisonReport(
  comparisonResponse: AuditComparisonResponse,
  snapshotItems: AuditScanItem[],
  submittedTagIds: string[],
  matchedTagIds: string[],
  stagingList: AssetWarehouseStagingItem[],
  unmatchedTagIds: string[]
): {
  items: AuditScanItem[];
  summary: AuditSummary;
  warehouseCount: number;
} {
  const { scannedAssets, warehouseAssets } = pickAuditComparisonArrays(
    comparisonResponse
  );
  const snapshotMap = new Map(snapshotItems.map((item) => [item.id, item]));
  const comparisonSnapshotMap = new Map<string, AuditScanItem>();

  matchedTagIds.forEach((tagId, index) => {
    const stagingItem = stagingList[index];

    if (!stagingItem) {
      return;
    }

    const snapshotItem =
      snapshotMap.get(tagId) ?? snapshotMap.get(String(stagingItem.TagId));

    if (!snapshotItem) {
      return;
    }

    comparisonSnapshotMap.set(
      getComparisonKey(stagingItem, `submitted-${index}`),
      snapshotItem
    );
  });

  const scannedEntries = scannedAssets.reduce<
    { key: string; asset: AuditComparisonAsset }[]
  >((entries, asset, index) => {
    const key = getComparisonKey(asset, `scanned-${index}`);

    if (entries.some((entry) => entry.key === key)) {
      return entries;
    }

    entries.push({ key, asset });
    return entries;
  }, []);
  const warehouseEntries = warehouseAssets.reduce<
    { key: string; asset: AuditComparisonAsset }[]
  >((entries, asset, index) => {
    const key = getComparisonKey(asset, `warehouse-${index}`);

    if (entries.some((entry) => entry.key === key)) {
      return entries;
    }

    entries.push({ key, asset });
    return entries;
  }, []);
  const scannedByKey = new Map(scannedEntries.map((entry) => [entry.key, entry]));
  const warehouseByKey = new Map(
    warehouseEntries.map((entry) => [entry.key, entry])
  );

  const foundItems = warehouseEntries
    .filter((entry) => scannedByKey.has(entry.key))
    .map((entry) => {
      const snapshotItem = comparisonSnapshotMap.get(entry.key);

      if (snapshotItem) {
        return {
          ...snapshotItem,
          tone: "found" as const,
          icon: "plus-square" as const,
        };
      }

      const scannedAsset = scannedByKey.get(entry.key)?.asset ?? entry.asset;
      return mapReportAssetToAuditItem(
        "found",
        scannedAsset,
        getComparisonAssetTagId(scannedAsset)
      );
    });

  const missingItems = warehouseEntries
    .filter((entry) => !scannedByKey.has(entry.key))
    .map((entry) =>
      mapReportAssetToAuditItem(
        "missing",
        entry.asset,
        getComparisonAssetTagId(entry.asset)
      )
    );

  const extraItems = scannedEntries
    .filter((entry) => !warehouseByKey.has(entry.key))
    .map((entry) => {
      const snapshotItem = comparisonSnapshotMap.get(entry.key);

      if (snapshotItem) {
        return {
          ...snapshotItem,
          tone: "extra" as const,
          icon: "plus-circle" as const,
        };
      }

      return mapReportAssetToAuditItem(
        "extra",
        entry.asset,
        getComparisonAssetTagId(entry.asset)
      );
    });

  const reportItemIds = new Set(
    [...foundItems, ...missingItems, ...extraItems].map((item) => item.id)
  );
  const unmatchedItems = snapshotItems
    .filter((item) => unmatchedTagIds.includes(item.id))
    .filter((item) => !reportItemIds.has(item.id))
    .map((item) => ({
      ...item,
      tone: "extra" as const,
      icon: "plus-circle" as const,
    }));
  const allItems = [...foundItems, ...missingItems, ...extraItems, ...unmatchedItems];

  return {
    items: allItems,
    summary: {
      found: foundItems.length,
      missing: missingItems.length,
      extra: extraItems.length + unmatchedItems.length,
      scanned: submittedTagIds.length,
      expected: warehouseEntries.length,
    },
    warehouseCount: warehouseEntries.length,
  };
}

// Central audit hook that manages the full client-side scan lifecycle from start, to submit, to report view.
export function useAuditScanState() {
  const { user } = useAuthSession();
  const [manualAssetId, setManualAssetId] = useState("");
  const [auditPhase, setAuditPhase] = useState<AuditPhase>("idle");
  const [mqttItems, setMqttItems] = useState<AuditScanItem[]>([]);
  const [manualItems, setManualItems] = useState<AuditScanItem[]>([]);
  const [frozenItems, setFrozenItems] = useState<AuditScanItem[]>([]);
  const [reportItems, setReportItems] = useState<AuditScanItem[]>([]);
  const [submittedTagIds, setSubmittedTagIds] = useState<string[]>([]);
  const [submittedMatchedTagIds, setSubmittedMatchedTagIds] = useState<string[]>(
    []
  );
  const [submittedStagingList, setSubmittedStagingList] = useState<
    AssetWarehouseStagingItem[]
  >([]);
  const [submittedReferenceId, setSubmittedReferenceId] = useState<string | null>(
    null
  );
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
  const [auditWarehouseIds, setAuditWarehouseIds] = useState<string[]>([]);
  const [auditApiSessionId, setAuditApiSessionId] = useState<string | null>(null);
  const [activeWarehouseIndex, setActiveWarehouseIndex] = useState(0);
  const [pendingMissingItems, setPendingMissingItems] = useState<
    PendingMissingAuditItem[]
  >([]);
  const [resolvedMisplacedItems, setResolvedMisplacedItems] = useState<
    ResolvedMisplacedAuditItem[]
  >([]);
  const [expectedAssetCount, setExpectedAssetCount] = useState(0);
  const [isPreparingWarehouse, setIsPreparingWarehouse] = useState(false);
  const itemCacheRef = useRef(new Map<string, AuditScanItem>());
  const pendingLookupsRef = useRef(new Map<string, Promise<AuditScanItem>>());
  const stagedLookupsRef = useRef(new Map<string, StagedAssetLookup>());
  const scannedTagIdsRef = useRef(new Set<string>());
  const auditPhaseRef = useRef<AuditPhase>("idle");
  const scanSessionRef = useRef(0);
  const warehouseLoadRequestRef = useRef(0);
  const completedWarehouseReportsRef = useRef<LatestAuditReport[]>([]);

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
      const isArrayPayload = Array.isArray(payload);
      const tagIds = isArrayPayload
        ? Array.from(
            new Set(payload.map((entry) => getTagId(entry)).filter(Boolean))
          )
        : [getTagId(payload)].filter(Boolean);

      // For array payloads, always update UI even if empty (to reflect websocket state)
      // For single payloads, only update if we have a tag
      if (!isArrayPayload && tagIds.length === 0) {
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

        if (isArrayPayload) {
          // Always replace entire list with websocket data (including empty arrays)
          setMqttItems(resolvedItems);
          return;
        }

        // For single items, append to existing list
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
      // setMqttItems([]);
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

  const clearScanSession = useCallback((nextPhase: AuditPhase = "idle") => {
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
    setSubmittedMatchedTagIds([]);
    setSubmittedStagingList([]);
    setSubmittedReferenceId(null);
    setReportSummary({ found: 0, missing: 0, extra: 0, scanned: 0 });
    setExpectedAssetCount(0);
    setSubmitError(null);
    setConnectionStatus("idle");
    setAuditPhase(nextPhase);
  }, []);

  // Stores the selected warehouse for the audit flow and clears any previous scan session state.
  const prepareWarehouseAudit = useCallback(async (
    warehouseId?: string | null,
    options?: { preserveMultiWarehouseSession?: boolean }
  ) => {
    warehouseLoadRequestRef.current += 1;
    const requestId = warehouseLoadRequestRef.current;

    clearScanSession("idle");

    if (!options?.preserveMultiWarehouseSession) {
      setAuditWarehouseIds(warehouseId ? [warehouseId] : []);
      setAuditApiSessionId(warehouseId ? createAuditSessionId() : null);
      setActiveWarehouseIndex(0);
      setPendingMissingItems([]);
      setResolvedMisplacedItems([]);
      completedWarehouseReportsRef.current = [];
    }

    if (!warehouseId) {
      setAuditWarehouseId(null);
      setExpectedAssetCount(0);
      setIsPreparingWarehouse(false);
      return;
    }

    const normalizedWarehouseId = warehouseId.trim();
    const numericWarehouseId = parseNumericId(normalizedWarehouseId);

    setAuditWarehouseId(normalizedWarehouseId);
    setExpectedAssetCount(0);
    setIsPreparingWarehouse(true);

    if (numericWarehouseId === null) {
      setIsPreparingWarehouse(false);
      setSubmitError("The selected warehouse id is invalid.");
      return;
    }

    try {
      const warehouseAssets = await apiService.getWarehouseTagBaseline(
        numericWarehouseId
      );

      if (requestId !== warehouseLoadRequestRef.current) {
        return;
      }

      const seen = new Set<string>();
      const expectedCount = warehouseAssets.reduce((count, asset) => {
        const tagKey = getTagKey(asset.TagId);

        if (!tagKey || seen.has(tagKey)) {
          return count;
        }

        seen.add(tagKey);
        return count + 1;
      }, 0);

      setExpectedAssetCount(expectedCount);
      setSubmitError(null);
      appLogger.info("AuditScan", "Loaded warehouse asset count for audit progress.", {
        warehouseId: numericWarehouseId,
        expectedCount,
      });
    } catch (error) {
      if (requestId !== warehouseLoadRequestRef.current) {
        return;
      }

      setExpectedAssetCount(0);
      setSubmitError(
        "Unable to load the selected warehouse asset count."
      );
      appLogger.warn("AuditScan", "Failed to load warehouse asset count for audit progress.", {
        warehouseId: numericWarehouseId,
        error,
      });
    } finally {
      if (requestId === warehouseLoadRequestRef.current) {
        setIsPreparingWarehouse(false);
      }
    }
  }, [clearScanSession]);

  // Returns the hook to a clean pre-scan state when the user changes warehouse or leaves the audit screen.
  const resetAudit = useCallback(() => {
    warehouseLoadRequestRef.current += 1;
    clearScanSession("idle");
    setAuditWarehouseId(null);
    setAuditWarehouseIds([]);
    setAuditApiSessionId(null);
    setActiveWarehouseIndex(0);
    setPendingMissingItems([]);
    setResolvedMisplacedItems([]);
    completedWarehouseReportsRef.current = [];
    setExpectedAssetCount(0);
    setIsPreparingWarehouse(false);
  }, [clearScanSession]);

  const prepareMultiWarehouseAudit = useCallback(async (warehouseIds: string[]) => {
    const normalizedWarehouseIds = Array.from(
      new Set(warehouseIds.map((warehouseId) => warehouseId.trim()).filter(Boolean))
    );

    setAuditApiSessionId(createAuditSessionId());
    setAuditWarehouseIds(normalizedWarehouseIds);
    setActiveWarehouseIndex(0);
    setPendingMissingItems([]);
    setResolvedMisplacedItems([]);
    completedWarehouseReportsRef.current = [];

    await prepareWarehouseAudit(normalizedWarehouseIds[0] ?? null, {
      preserveMultiWarehouseSession: true,
    });
  }, [prepareWarehouseAudit]);

  // Begins a new audit session only after a warehouse is chosen so scanning is always tied to a location.
  // We snapshot the current expectedAssetCount before clearScanSession wipes it to zero, then restore it
  // immediately so the progress card denominator stays correct once MQTT scanning begins.
  const startAudit = useCallback((warehouseId?: string) => {
    if (!warehouseId || isPreparingWarehouse) {
      return;
    }

    const currentExpectedCount = expectedAssetCount;
    clearScanSession("scanning");
    setAuditWarehouseId(warehouseId);
    setAuditWarehouseIds((current) => (current.length > 0 ? current : [warehouseId]));
    setAuditApiSessionId((current) =>
      current && auditPhase !== "submitted" ? current : createAuditSessionId()
    );

    if (currentExpectedCount > 0) {
      setExpectedAssetCount(currentExpectedCount);
    }
  }, [auditPhase, clearScanSession, expectedAssetCount, isPreparingWarehouse]);

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

  const reconcileReportWithSession = useCallback((
    normalizedItems: AuditScanItem[],
    warehouseId: string
  ) => {
    const currentWarehouseLabel = getWarehouseLabel(warehouseId);
    const foundOrExtraItems = normalizedItems.filter((item) => item.tone !== "missing");
    const foundById = new Map(foundOrExtraItems.map((item) => [item.id, item]));
    const newlyResolved = pendingMissingItems
      .filter((missingItem) => foundById.has(missingItem.id))
      .map((missingItem): ResolvedMisplacedAuditItem => {
        const scannedItem = foundById.get(missingItem.id);
        const expectedLabel = getWarehouseLabel(
          missingItem.expectedWarehouseId,
          missingItem.expectedWarehouseName
        );

        return {
          ...(scannedItem ?? missingItem),
          tone: "extra",
          icon: "plus-circle",
          subtitle: `${missingItem.id} - Expected in ${expectedLabel}, found in ${currentWarehouseLabel}`,
          expectedWarehouseId: missingItem.expectedWarehouseId,
          expectedWarehouseName: missingItem.expectedWarehouseName,
          foundWarehouseId: warehouseId,
          foundWarehouseName: currentWarehouseLabel,
        };
      });
    const resolvedIds = new Set(newlyResolved.map((item) => item.id));
    const nextPending = pendingMissingItems.filter(
      (item) => !resolvedIds.has(item.id)
    );
    const currentMissingItems = normalizedItems
      .filter((item) => item.tone === "missing")
      .filter((item) => !nextPending.some((pendingItem) => pendingItem.id === item.id))
      .map((item): PendingMissingAuditItem => ({
        ...item,
        subtitle: `${item.subtitle} - Pending search in selected warehouses`,
        expectedWarehouseId: warehouseId,
        expectedWarehouseName: currentWarehouseLabel,
      }));

    setPendingMissingItems([...nextPending, ...currentMissingItems]);
    setResolvedMisplacedItems((current) => {
      const existingIds = new Set(current.map((item) => item.id));
      return [
        ...current,
        ...newlyResolved.filter((item) => !existingIds.has(item.id)),
      ];
    });

    if (newlyResolved.length === 0) {
      return normalizedItems;
    }

    const resolvedById = new Map(newlyResolved.map((item) => [item.id, item]));

    return normalizedItems.map((item) => resolvedById.get(item.id) ?? item);
  }, [pendingMissingItems]);

  // Freezes the current scan set, disconnects MQTT, and submits the final staging payload for the selected warehouse.
  const submitAudit = useCallback(async () => {
    const canRetry =
      auditPhase === "submitError" &&
      (submittedReferenceId !== null || submittedTagIds.length > 0);
    const canSubmitLive = auditPhase === "scanning" && liveItems.length > 0;

    if (!canRetry && !canSubmitLive) {
      appLogger.warn("AuditScan", "Submit ignored because the audit is not in a submittable state.", {
        auditPhase,
        liveItemCount: liveItems.length,
        submittedTagCount: submittedTagIds.length,
        submittedReferenceId,
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
    const sessionId = auditApiSessionId ?? createAuditSessionId();

    if (!auditApiSessionId) {
      setAuditApiSessionId(sessionId);
    }

    if (warehouseId === null) {
      setSubmitError("Select a warehouse before submitting the scanned assets.");
      appLogger.warn("AuditScan", "Submit blocked because the selected warehouse id is not numeric.", {
        auditWarehouseId,
      });
      return;
    }

    const pendingLookups = canRetry && submittedReferenceId
      ? []
      : canRetry
        ? []
        : tagIds.flatMap((tagId) => {
            const pendingLookup = pendingLookupsRef.current.get(tagId);
            return pendingLookup ? [pendingLookup] : [];
          });

    if (pendingLookups.length > 0) {
      await Promise.all(pendingLookups);
    }

    const matchedTagIds =
      canRetry && submittedMatchedTagIds.length > 0
        ? submittedMatchedTagIds
        : tagIds.filter((tagId) => stagedLookupsRef.current.has(tagId));
    const unmatchedTagIds =
      canRetry && submittedMatchedTagIds.length > 0
        ? tagIds.filter((tagId) => !submittedMatchedTagIds.includes(tagId))
        : tagIds.filter((tagId) => !stagedLookupsRef.current.has(tagId));

    const stagingList = canRetry
      ? submittedStagingList
      : matchedTagIds.map((tagId) => {
          const stagedLookup = stagedLookupsRef.current.get(tagId);

          return {
            ...stagedLookup!,
            WareHouseId: warehouseId,
          };
        });

    if (stagingList.length === 0) {
      const message =
        unmatchedTagIds.length > 0
          ? `No scanned tags could be matched to a product for submission. Remove unmatched tags or resolve them before retrying.`
          : "No matched scanned tags are available to submit.";

      setSubmitError(message);
      appLogger.warn(
        "AuditScan",
        "Submit blocked because no valid staging entries were available.",
        {
          warehouseId,
          tagIds,
          unmatchedTagIds,
          stagedLookupKeys: Array.from(
            stagedLookupsRef.current.keys()
          ),
        }
      );
      return;
    }

    const snapshotItems = canRetry
      ? frozenItems
      : buildSnapshotItems(tagIds, liveItems);

    scanSessionRef.current += 1;
    setSubmitError(null);
    setSubmittedTagIds(tagIds);
    setSubmittedMatchedTagIds(matchedTagIds);
    setSubmittedStagingList(stagingList);
    setFrozenItems(snapshotItems);
    setReportItems([]);
    setReportSummary({
      found: 0,
      missing: 0,
      extra: unmatchedTagIds.length,
      scanned: tagIds.length,
    });
    setConnectionStatus("idle");
    setAuditPhase("submitting");
    mqttService.disconnectMqtt();

    appLogger.info("AuditScan", "Submitting warehouse staging payload.", {
      warehouseId,
      sessionId,
      tagIds,
      stagingList,
      submittedReferenceId,
    });

    let resolvedReferenceId = submittedReferenceId;

    try {
      const referenceId =
        resolvedReferenceId ??
        (await apiService.submitScannedAuditTags(sessionId, stagingList));

      resolvedReferenceId = referenceId || null;
      setSubmittedReferenceId(resolvedReferenceId);

      const currentWarehouseId = String(auditWarehouseId ?? warehouseId);
      const observedAt = formatAuditObservedAt(new Date());
      let normalizedReport: {
        items: AuditScanItem[];
        summary: AuditSummary;
        warehouseCount: number;
      };
      let currentReport: LatestAuditReport;

      if (referenceId) {
        const comparisonResponse = await apiService.getWarehouseAuditData(referenceId);
        normalizedReport = buildAuditComparisonReport(
          comparisonResponse,
          snapshotItems,
          tagIds,
          matchedTagIds,
          stagingList,
          unmatchedTagIds
        );
        const enrichedItems = await enrichExtraItemsWithWarehouseOrigin(
          normalizedReport.items,
          currentWarehouseId
        );
        const reconciledItems = reconcileReportWithSession(
          enrichedItems,
          currentWarehouseId
        );
        const reconciledSummary = {
          ...normalizedReport.summary,
          missing: reconciledItems.filter((item) => item.tone === "missing").length,
          extra: reconciledItems.filter((item) => item.tone === "extra").length,
          found: reconciledItems.filter((item) => item.tone === "found").length,
        };
        const locationLabel = auditWarehouseId
          ? `Warehouse ${auditWarehouseId}`
          : "Selected warehouse";

        currentReport = {
          title: "Audit Report",
          location: locationLabel,
          mobileMeta: `${locationLabel} - ${observedAt}`,
          desktopMeta: `${locationLabel} - ${observedAt}`,
          status: "Completed",
          sessionId,
          referenceId,
          observedAt,
          summary: reconciledSummary,
          items: reconciledItems,
        };
      } else {
        throw new Error(
          "The warehouse staging API did not return a reference id for audit comparison."
        );
      }
      const isMultiWarehouseSession = auditWarehouseIds.length > 1;
      const isFinalWarehouse =
        activeWarehouseIndex >= auditWarehouseIds.length - 1;
      let displayReport = currentReport;

      if (isMultiWarehouseSession) {
        const nextCompletedReports = [...completedWarehouseReportsRef.current];
        nextCompletedReports[activeWarehouseIndex] = currentReport;
        completedWarehouseReportsRef.current = nextCompletedReports;

        if (isFinalWarehouse) {
          displayReport = buildCombinedWarehouseReport(
            nextCompletedReports.filter(Boolean),
            auditWarehouseIds,
            observedAt,
            sessionId
          );

          void saveAuditReportSession({
            id: `audit-session-${Date.now()}`,
            sessionId,
            userId: user?.employeeId || "",
            referenceIds: nextCompletedReports
              .map((report) => report?.referenceId)
              .filter((referenceId): referenceId is string =>
                Boolean(referenceId)
              ),
            warehouseIds: auditWarehouseIds,
            observedAt,
            report: displayReport,
          });
        }
      }

      setReportItems(displayReport.items);
      setReportSummary(displayReport.summary);
      setExpectedAssetCount(
        displayReport.summary.expected ??
          normalizedReport.summary.expected ??
          normalizedReport.warehouseCount
      );
      setLatestAuditReport(displayReport);
      setAuditPhase("submitted");
    } catch (error) {
      appLogger.error("AuditScan", "Warehouse audit submission flow failed.", {
        warehouseId,
        sessionId,
        tagIds,
        stagingList,
        submittedReferenceId: resolvedReferenceId,
        error,
      });
      setAuditPhase("submitError");
      setSubmitError(
        resolvedReferenceId
          ? "The scan snapshot is frozen and staging already succeeded, but loading the warehouse audit comparison failed. Retry to fetch the report again."
          : "MQTT has been disconnected and the scan snapshot is frozen, but the warehouse staging request failed before a reference id was returned. Retry submit once the backend endpoint is ready."
      );
    }
  }, [
    auditPhase,
    auditApiSessionId,
    auditWarehouseId,
    auditWarehouseIds,
    activeWarehouseIndex,
    frozenItems,
    liveItems,
    submittedMatchedTagIds,
    submittedReferenceId,
    submittedStagingList,
    submittedTagIds,
    reconcileReportWithSession,
    user?.employeeId,
  ]);

  const isScanning = auditPhase === "scanning";
  const hasNextWarehouse = activeWarehouseIndex < auditWarehouseIds.length - 1;
  const activeAuditWarehouseId =
    auditWarehouseIds[activeWarehouseIndex] ?? auditWarehouseId;
  const proceedToNextWarehouse = useCallback(async () => {
    if (!hasNextWarehouse || auditPhase === "submitting") {
      return;
    }

    const nextIndex = activeWarehouseIndex + 1;
    const nextWarehouseId = auditWarehouseIds[nextIndex];

    if (!nextWarehouseId) {
      return;
    }

    setActiveWarehouseIndex(nextIndex);
    await prepareWarehouseAudit(nextWarehouseId, {
      preserveMultiWarehouseSession: true,
    });
  }, [
    activeWarehouseIndex,
    auditPhase,
    auditWarehouseIds,
    hasNextWarehouse,
    prepareWarehouseAudit,
  ]);
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
    prepareWarehouseAudit,
    prepareMultiWarehouseAudit,
    startAudit,
    addManualAsset,
    submitAudit,
    proceedToNextWarehouse,
    resetAudit,
    summary,
    auditWarehouseId: activeAuditWarehouseId,
    activeWarehouseIndex,
    auditWarehouseIds,
    hasNextWarehouse,
    pendingMissingItems,
    resolvedMisplacedItems,
    expectedAssetCount,
    isPreparingWarehouse,
  };
}










