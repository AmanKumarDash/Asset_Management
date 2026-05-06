import { useAuthSession } from "@/features/auth/hooks/useAuthSession";
import { AuditReportTone, AuditSummary } from "@/features/audits/types/audit";
import { AuditScanItem } from "@/features/audits/data/auditScanData";
import { LatestAuditReport } from "@/features/reports/state/latestAuditReportStore";
import {
  PersistedAuditReportSession,
  getAuditReportSessionsForUser,
} from "@/features/reports/state/auditReportSessionStore";
import { EmployeeReportApiItem, apiService } from "@/network/ApiService";
import { adminTheme } from "@/theme/adminTheme";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { ReactNode, useEffect, useMemo, useState } from "react";
import DatePicker from "react-native-date-picker";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

type EmployeeReportSummary = {
  id: string;
  title: string;
  location: string;
  completedAt: string;
  scannedLabel: string;
  referenceId: string;
  status: "Submitted";
  report: LatestAuditReport;
};

type EmployeeReportsScreenProps = {
  onSelectReport: (report: LatestAuditReport) => void;
  subjectUserId?: string | null;
  title?: string;
  subtitle?: string;
  accentColor?: string;
  showOpenScanButton?: boolean;
  headerControls?: ReactNode;
  loadingMessage?: string;
  emptyMessage?: string;
  missingSubjectMessage?: string;
  retryButtonColor?: string;
};

type AuditReportAsset = Record<string, unknown>;

type AuditComparisonAsset = AuditReportAsset & {
  ProductId?: number | string;
  ProductID?: number | string;
  productId?: number | string;
  TagId?: string | number | null;
  ID?: string | number | null;
};

function formatCompactDate(value: string | null) {
  if (!value) {
    return "Unknown date";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSummaryDate(value: string | null) {
  if (!value) {
    return "Unknown date";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleString("en-US", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTodayDate() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function formatDateForApi(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateInputValue(date: Date) {
  return formatDateForApi(date);
}

function formatDateFilterLabel(date: Date) {
  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function normalizeDateOnly(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getDateKeyFromValue(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const isoDateMatch = value.match(/^(\d{4}-\d{2}-\d{2})/);

  if (isoDateMatch) {
    return isoDateMatch[1];
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return formatDateForApi(parsed);
}

function filterReportsByDateRange(
  items: EmployeeReportApiItem[],
  startDate: Date,
  endDate: Date
) {
  const startKey = formatDateForApi(normalizeDateOnly(startDate));
  const endKey = formatDateForApi(normalizeDateOnly(endDate));

  return items.filter((item) => {
    const scanningDateKey = getDateKeyFromValue(item.ScanningDate);

    if (!scanningDateKey) {
      return false;
    }

    return scanningDateKey >= startKey && scanningDateKey <= endKey;
  });
}

function resolveReferenceId(item: EmployeeReportApiItem, index: number) {
  const directReference =
    (typeof item.RefrenceId === "string" && item.RefrenceId.trim()) ||
    (typeof item.ReferenceId === "string" && item.ReferenceId.trim());

  if (directReference) {
    return directReference;
  }

  const scannedAt = item.ScanningDate ?? `row-${index}`;
  return `warehouse-${String(item.WareHouseId)}-${scannedAt}`;
}

function resolveSessionId(item: EmployeeReportApiItem) {
  const directSessionId =
    (typeof item.SessionId === "string" && item.SessionId.trim()) ||
    (typeof item.sessionId === "string" && item.sessionId.trim());

  return directSessionId || null;
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

function parseNumericId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function getTagKey(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return null;
}

function getComparisonKey(
  asset: AuditComparisonAsset,
  fallbackKey: string
): string {
  const productId =
    parseNumericId(asset.ProductId) ??
    parseNumericId(asset.ProductID) ??
    parseNumericId(asset.productId);

  if (productId !== null) {
    return `product:${productId}`;
  }

  const tagKey =
    getTagKey(asset.TagId) ??
    getTagKey(asset.ID) ??
    pickString(asset, ["TAG_ID", "TagID", "tagId"]);

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
  response: Record<string, unknown>,
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

function pickAuditComparisonArrays(response: Record<string, unknown>): {
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

function getReportAssetTagId(
  asset: AuditReportAsset,
  fallbackTagId?: string
): string {
  return (
    pickString(asset, ["TagId", "TAG_ID", "TagID", "tagId"]) ??
    fallbackTagId ??
    "UNKNOWN-TAG"
  );
}

function getReportAssetTitle(
  asset: AuditReportAsset,
  tone: AuditReportTone,
  tagId: string
): string {
  return (
    pickString(asset, ["ProductName", "Title", "Name", "ItemName"]) ??
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
  const directSubtitle = pickString(asset, ["Subtitle", "Description", "StatusText"]);

  if (directSubtitle) {
    return directSubtitle;
  }

  const subtitleParts = [
    tagId,
    pickString(asset, ["ProductCode"]),
    pickString(asset, ["ManufecturName"]),
    pickString(asset, ["ModelNo"]),
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

function buildDetailedEmployeeReport(
  baseReport: LatestAuditReport,
  comparisonResponse: Record<string, unknown>
): LatestAuditReport {
  const responseRecord = comparisonResponse as Record<string, unknown>;
  const explicitFound = filterComparisonAssets(
    responseRecord.FoundAssets ??
      responseRecord.FoundItems ??
      responseRecord.Found
  );
  const explicitMissing = filterComparisonAssets(
    responseRecord.MissingAssets ??
      responseRecord.MissingItems ??
      responseRecord.Missing
  );
  const explicitExtra = filterComparisonAssets(
    responseRecord.ExtraAssets ??
      responseRecord.ExtraItems ??
      responseRecord.Extra
  );

  let foundItems: AuditScanItem[] = [];
  let missingItems: AuditScanItem[] = [];
  let extraItems: AuditScanItem[] = [];
  let summary: AuditSummary;

  if (explicitFound.length || explicitMissing.length || explicitExtra.length) {
    foundItems = explicitFound.map((asset) =>
      mapReportAssetToAuditItem("found", asset)
    );
    missingItems = explicitMissing.map((asset) =>
      mapReportAssetToAuditItem("missing", asset)
    );
    extraItems = explicitExtra.map((asset) =>
      mapReportAssetToAuditItem("extra", asset)
    );

    summary = {
      found: foundItems.length,
      missing: missingItems.length,
      extra: extraItems.length,
      scanned: foundItems.length + extraItems.length,
      expected: foundItems.length + missingItems.length,
    };
  } else {
    const { scannedAssets, warehouseAssets } =
      pickAuditComparisonArrays(responseRecord);
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

    foundItems = warehouseEntries
      .filter((entry) => scannedByKey.has(entry.key))
      .map((entry) =>
        mapReportAssetToAuditItem(
          "found",
          scannedByKey.get(entry.key)?.asset ?? entry.asset,
          getReportAssetTagId(entry.asset)
        )
      );

    missingItems = warehouseEntries
      .filter((entry) => !scannedByKey.has(entry.key))
      .map((entry) =>
        mapReportAssetToAuditItem(
          "missing",
          entry.asset,
          getReportAssetTagId(entry.asset)
        )
      );

    extraItems = scannedEntries
      .filter((entry) => !warehouseByKey.has(entry.key))
      .map((entry) =>
        mapReportAssetToAuditItem(
          "extra",
          entry.asset,
          getReportAssetTagId(entry.asset)
        )
      );

    summary = {
      found: foundItems.length,
      missing: missingItems.length,
      extra: extraItems.length,
      scanned: scannedEntries.length,
      expected: warehouseEntries.length,
    };
  }

  const observedAt =
    pickString(responseRecord, ["ObservedAt", "ScanningDate"]) ??
    baseReport.observedAt;
  const location =
    pickString(responseRecord, ["Location"]) ?? baseReport.location;

  return {
    ...baseReport,
    location,
    mobileMeta: observedAt ? `${location} - ${formatCompactDate(observedAt)}` : location,
    desktopMeta: observedAt ? `${location} - ${formatCompactDate(observedAt)}` : location,
    observedAt,
    summary,
    items: [...foundItems, ...missingItems, ...extraItems],
  };
}

function splitReferenceIds(value: string | null | undefined) {
  return Array.from(
    new Set(
      value
        ?.split(",")
        .map((referenceId) => referenceId.trim())
        .filter(Boolean) ?? []
    )
  );
}

function buildCombinedDetailedReport(
  baseReport: LatestAuditReport,
  reports: LatestAuditReport[]
): LatestAuditReport {
  if (reports.length === 0) {
    return baseReport;
  }

  const summary = reports.reduce<AuditSummary>(
    (total, report) => ({
      found: total.found + report.summary.found,
      missing: total.missing + report.summary.missing,
      extra: total.extra + report.summary.extra,
      scanned: total.scanned + report.summary.scanned,
      expected: (total.expected ?? 0) + (report.summary.expected ?? 0),
    }),
    { found: 0, missing: 0, extra: 0, scanned: 0, expected: 0 }
  );

  return {
    ...baseReport,
    summary,
    items: reports.flatMap((report) => report.items),
  };
}

function buildEmployeeReports(
  items: EmployeeReportApiItem[],
  savedSessions: PersistedAuditReportSession[] = [],
  forcedSessionId?: string | null
): EmployeeReportSummary[] {
  if (items.length === 0) {
    return [];
  }

  const groupedReports = new Map<string, EmployeeReportApiItem[]>();
  const sessionByReferenceId = new Map<string, PersistedAuditReportSession>();

  savedSessions.forEach((session) => {
    session.referenceIds.forEach((referenceId) => {
      const normalizedReferenceId = referenceId.trim();

      if (normalizedReferenceId && session.sessionId?.trim()) {
        sessionByReferenceId.set(normalizedReferenceId, session);
      }
    });
  });

  items.forEach((item, index) => {
    const referenceId = resolveReferenceId(item, index);
    const savedSession = sessionByReferenceId.get(referenceId);
    const groupId =
      forcedSessionId?.trim() ||
      resolveSessionId(item) ||
      savedSession?.sessionId?.trim() ||
      referenceId;
    const existingItems = groupedReports.get(groupId) ?? [];
    existingItems.push(item);
    groupedReports.set(groupId, existingItems);
  });

  return Array.from(groupedReports.entries())
    .map(([groupId, reportItems]) => {
      const sortedItems = [...reportItems].sort((left, right) => {
        const leftTime = new Date(left.ScanningDate ?? "").getTime() || 0;
        const rightTime = new Date(right.ScanningDate ?? "").getTime() || 0;
        return rightTime - leftTime;
      });

      const latestItem = sortedItems[0];
      const referenceIds = Array.from(
        new Set(sortedItems.map((item, index) => resolveReferenceId(item, index)))
      );
      const savedSession = referenceIds
        .map((referenceId) => sessionByReferenceId.get(referenceId))
        .find((session): session is PersistedAuditReportSession =>
          Boolean(session?.sessionId?.trim())
        );
      const sessionId =
        forcedSessionId?.trim() ||
        (latestItem ? resolveSessionId(latestItem) : null) ||
        savedSession?.sessionId?.trim() ||
        null;
      const referenceId = referenceIds.length > 0 ? referenceIds.join(", ") : groupId;
      const observedAt = latestItem?.ScanningDate ?? null;
      const warehouseIds = Array.from(
        new Set(sortedItems.map((item) => String(item.WareHouseId)).filter(Boolean))
      );
      const location =
        warehouseIds.length === 1
          ? `Warehouse ${warehouseIds[0]}`
          : `Warehouses ${warehouseIds.join(", ")}`;
      const title =
        warehouseIds.length === 1
          ? `Warehouse ${warehouseIds[0]} Report`
          : "Employee Audit Report";

      const report: LatestAuditReport = {
        title,
        location,
        mobileMeta: observedAt ? `${location} - ${formatCompactDate(observedAt)}` : location,
        desktopMeta: observedAt ? `${location} - ${formatCompactDate(observedAt)}` : location,
        status: "Submitted",
        sessionId,
        referenceId,
        observedAt,
        summary: {
          found: sortedItems.length,
          missing: 0,
          extra: 0,
          scanned: sortedItems.length,
          expected: sortedItems.length,
        },
        items: sortedItems.map((item) => {
          const tagId = String(item.TagId ?? item.ProductId ?? "UNKNOWN-TAG");
          const productCode = item.ProductCode?.trim();

          return {
            id: tagId,
            title: productCode || `Product ${String(item.ProductId)}`,
            subtitle: `${location} - Product ${String(item.ProductId)}`,
            tone: "found" as const,
            icon: "plus-square",
          };
        }),
      };

      return {
        id: referenceId,
        title,
        location,
        completedAt: formatSummaryDate(observedAt),
        scannedLabel: `${report.summary.scanned} scanned`,
        referenceId,
        status: "Submitted" as const,
        report,
      };
    })
    .sort((left, right) => {
      const leftTime = new Date(left.report.observedAt ?? "").getTime() || 0;
      const rightTime = new Date(right.report.observedAt ?? "").getTime() || 0;
      return rightTime - leftTime;
    });
}

function ReportStatus() {
  return (
    <View
      className="rounded-full px-3 py-1"
      style={{ backgroundColor: adminTheme.successBg }}
    >
      <Text className="text-xs font-medium" style={{ color: adminTheme.successText }}>
        Submitted
      </Text>
    </View>
  );
}

function EmptyState({
  message,
  onRetry,
  retryButtonColor,
}: {
  message: string;
  onRetry?: () => void;
  retryButtonColor?: string;
}) {
  return (
    <View
      className="rounded-[20px] border px-5 py-5"
      style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
    >
      <Text className="text-base" style={{ color: adminTheme.slateSoft }}>
        {message}
      </Text>
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          className="mt-4 self-start rounded-xl px-4 py-2.5"
          style={{ backgroundColor: retryButtonColor ?? adminTheme.employeePrimary }}
        >
          <Text className="text-sm font-semibold text-white">Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function DateRangeControls({
  startDate,
  endDate,
  onChangeStartDate,
  onChangeEndDate,
  onApply,
  accentColor,
  isLoading,
}: {
  startDate: Date;
  endDate: Date;
  onChangeStartDate: (date: Date) => void;
  onChangeEndDate: (date: Date) => void;
  onApply: () => void;
  accentColor: string;
  isLoading: boolean;
}) {
  const [isStartPickerOpen, setIsStartPickerOpen] = useState(false);
  const [isEndPickerOpen, setIsEndPickerOpen] = useState(false);

  return (
    <View
      className="rounded-[20px] border px-4 py-4"
      style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
    >
      <Text className="text-sm font-medium" style={{ color: adminTheme.slateSoft }}>
        Date range
      </Text>

      <View className="mt-3 flex-row flex-wrap items-center" style={{ gap: 10 }}>
        {Platform.OS === "web" ? (
          <>
            <input
              type="date"
              value={formatDateInputValue(startDate)}
              onChange={(event) => {
                const nextDate = new Date(event.target.value);

                if (!Number.isNaN(nextDate.getTime())) {
                  onChangeStartDate(nextDate);
                }
              }}
              style={{
                padding: "8px 12px",
                borderRadius: "12px",
                border: `1px solid ${adminTheme.border}`,
                backgroundColor: adminTheme.surfaceAlt,
                color: adminTheme.slate,
              }}
            />
            <input
              type="date"
              value={formatDateInputValue(endDate)}
              onChange={(event) => {
                const nextDate = new Date(event.target.value);

                if (!Number.isNaN(nextDate.getTime())) {
                  onChangeEndDate(nextDate);
                }
              }}
              style={{
                padding: "8px 12px",
                borderRadius: "12px",
                border: `1px solid ${adminTheme.border}`,
                backgroundColor: adminTheme.surfaceAlt,
                color: adminTheme.slate,
              }}
            />
          </>
        ) : (
          <>
            <Pressable
              onPress={() => setIsStartPickerOpen(true)}
              className="rounded-xl border px-3 py-2.5"
              style={{
                borderColor: adminTheme.border,
                backgroundColor: adminTheme.surfaceAlt,
              }}
            >
              <Text style={{ color: adminTheme.slate }}>
                {formatDateFilterLabel(startDate)}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setIsEndPickerOpen(true)}
              className="rounded-xl border px-3 py-2.5"
              style={{
                borderColor: adminTheme.border,
                backgroundColor: adminTheme.surfaceAlt,
              }}
            >
              <Text style={{ color: adminTheme.slate }}>
                {formatDateFilterLabel(endDate)}
              </Text>
            </Pressable>
          </>
        )}

        <Pressable
          onPress={onApply}
          disabled={isLoading}
          className="rounded-xl px-4 py-2.5"
          style={{
            backgroundColor: accentColor,
            opacity: isLoading ? 0.75 : 1,
          }}
        >
          <Text className="text-sm font-semibold text-white">
            {isLoading ? "Loading..." : "Go"}
          </Text>
        </Pressable>
      </View>

      {Platform.OS !== "web" ? (
        <>
          <DatePicker
            modal
            open={isStartPickerOpen}
            date={startDate}
            mode="date"
            onConfirm={(date) => {
              setIsStartPickerOpen(false);
              onChangeStartDate(date);
            }}
            onCancel={() => setIsStartPickerOpen(false)}
          />
          <DatePicker
            modal
            open={isEndPickerOpen}
            date={endDate}
            mode="date"
            onConfirm={(date) => {
              setIsEndPickerOpen(false);
              onChangeEndDate(date);
            }}
            onCancel={() => setIsEndPickerOpen(false)}
          />
        </>
      ) : null}
    </View>
  );
}

function DesktopEmployeeReports({
  reports,
  totalScanned,
  isLoading,
  errorMessage,
  loadingReferenceId,
  onRetry,
  onSelectReport,
  title,
  subtitle,
  accentColor,
  showOpenScanButton,
  headerControls,
  loadingMessage,
  emptyMessage,
  missingSubjectMessage,
  hasSubjectUserId,
  retryButtonColor,
}: {
  reports: EmployeeReportSummary[];
  totalScanned: number;
  isLoading: boolean;
  errorMessage: string | null;
  loadingReferenceId: string | null;
  onRetry: () => void;
  onSelectReport: (report: LatestAuditReport) => void;
  title: string;
  subtitle: string;
  accentColor: string;
  showOpenScanButton: boolean;
  headerControls?: ReactNode;
  loadingMessage: string;
  emptyMessage: string;
  missingSubjectMessage: string;
  hasSubjectUserId: boolean;
  retryButtonColor: string;
}) {
  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="mb-5 flex-row items-start justify-between">
        <View>
          <Text className="text-[28px] font-semibold" style={{ color: adminTheme.slate }}>
            {title}
          </Text>
          <Text className="mt-1 text-sm" style={{ color: adminTheme.muted }}>
            {subtitle}
          </Text>
        </View>

        {showOpenScanButton ? (
          <Pressable
            onPress={() => router.push("/audits")}
            className="rounded-xl px-4 py-2.5"
            style={{ backgroundColor: accentColor }}
          >
            <Text className="text-sm font-semibold text-white">Open Scan</Text>
          </Pressable>
        ) : null}
      </View>

      {headerControls ? <View className="mb-5">{headerControls}</View> : null}

      <View className="mb-5 flex-row gap-3">
        <View
          className="flex-1 rounded-[18px] border px-4 py-4"
          style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surfaceAlt }}
        >
          <Text className="text-[28px] font-semibold" style={{ color: accentColor }}>
            {reports.length}
          </Text>
          <Text className="mt-1 text-sm" style={{ color: adminTheme.muted }}>
            Submitted reports
          </Text>
        </View>
        <View
          className="flex-1 rounded-[18px] border px-4 py-4"
          style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surfaceAlt }}
        >
          <Text className="text-[28px] font-semibold" style={{ color: adminTheme.successText }}>
            {totalScanned}
          </Text>
          <Text className="mt-1 text-sm" style={{ color: adminTheme.muted }}>
            Total scanned assets
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View className="items-center justify-center py-12">
          <ActivityIndicator size="large" color={accentColor} />
          <Text className="mt-3 text-sm" style={{ color: adminTheme.muted }}>
            {loadingMessage}
          </Text>
        </View>
      ) : errorMessage ? (
        <EmptyState message={errorMessage} onRetry={onRetry} retryButtonColor={retryButtonColor} />
      ) : !hasSubjectUserId ? (
        <EmptyState message={missingSubjectMessage} />
      ) : reports.length === 0 ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <View
          className="overflow-hidden rounded-[20px] border bg-white"
          style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
        >
          <View className="border-b px-4 py-3" style={{ borderColor: adminTheme.border }}>
            <View className="flex-row">
              <Text className="flex-[1.8] text-xs font-medium" style={{ color: adminTheme.muted }}>
                Report
              </Text>
              <Text className="flex-[2] text-xs font-medium" style={{ color: adminTheme.muted }}>
                Reference
              </Text>
              <Text className="flex-[1.2] text-xs font-medium" style={{ color: adminTheme.muted }}>
                Location
              </Text>
              <Text className="flex-[1.3] text-xs font-medium" style={{ color: adminTheme.muted }}>
                Submitted
              </Text>
              <Text className="flex-[1] text-xs font-medium" style={{ color: adminTheme.muted }}>
                Scanned
              </Text>
              <Text className="flex-[1] text-xs font-medium" style={{ color: adminTheme.muted }}>
                Status
              </Text>
            </View>
          </View>

          {reports.map((report, index) => (
            <Pressable
              key={report.id}
              onPress={() => onSelectReport(report.report)}
              disabled={loadingReferenceId === report.referenceId}
              className={`px-4 py-3.5 ${index < reports.length - 1 ? "border-b" : ""}`}
              style={({ pressed }) => ({
                borderColor: index < reports.length - 1 ? adminTheme.border : undefined,
                backgroundColor:
                  pressed || loadingReferenceId === report.referenceId
                    ? adminTheme.infoBg
                    : adminTheme.surface,
                opacity: loadingReferenceId === report.referenceId ? 0.75 : 1,
              })}
            >
              <View className="flex-row items-center">
                <Text className="flex-[1.8] text-sm font-medium" style={{ color: adminTheme.slate }}>
                  {report.title}
                </Text>
                <Text className="flex-[2] text-sm" style={{ color: adminTheme.slate }}>
                  {report.referenceId}
                </Text>
                <Text className="flex-[1.2] text-sm" style={{ color: adminTheme.slate }}>
                  {report.location}
                </Text>
                <Text className="flex-[1.3] text-sm" style={{ color: adminTheme.slate }}>
                  {report.completedAt}
                </Text>
                <Text className="flex-[1] text-sm" style={{ color: adminTheme.slate }}>
                  {report.scannedLabel}
                </Text>
                <View className="flex-[1]">
                  {loadingReferenceId === report.referenceId ? (
                    <ActivityIndicator size="small" color={accentColor} />
                  ) : (
                    <ReportStatus />
                  )}
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function MobileEmployeeReports({
  reports,
  isLoading,
  errorMessage,
  loadingReferenceId,
  onRetry,
  onSelectReport,
  title,
  subtitle,
  accentColor,
  headerControls,
  loadingMessage,
  emptyMessage,
  missingSubjectMessage,
  hasSubjectUserId,
  retryButtonColor,
}: {
  reports: EmployeeReportSummary[];
  isLoading: boolean;
  errorMessage: string | null;
  loadingReferenceId: string | null;
  onRetry: () => void;
  onSelectReport: (report: LatestAuditReport) => void;
  title: string;
  subtitle: string;
  accentColor: string;
  headerControls?: ReactNode;
  loadingMessage: string;
  emptyMessage: string;
  missingSubjectMessage: string;
  hasSubjectUserId: boolean;
  retryButtonColor: string;
}) {
  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="border-b px-4 pb-4 pt-3" style={{ borderColor: adminTheme.border }}>
        <Text className="text-[22px] font-semibold" style={{ color: adminTheme.slate }}>
          {title}
        </Text>
        <Text className="mt-1 text-sm" style={{ color: adminTheme.muted }}>
          {subtitle}
        </Text>
      </View>

      <View className="px-4 pt-4">
        {headerControls ? <View className="mb-4">{headerControls}</View> : null}

        {isLoading ? (
          <View className="items-center justify-center py-12">
            <ActivityIndicator size="large" color={accentColor} />
            <Text className="mt-3 text-sm" style={{ color: adminTheme.muted }}>
              {loadingMessage}
            </Text>
          </View>
        ) : errorMessage ? (
          <EmptyState message={errorMessage} onRetry={onRetry} retryButtonColor={retryButtonColor} />
        ) : !hasSubjectUserId ? (
          <EmptyState message={missingSubjectMessage} />
        ) : reports.length === 0 ? (
          <EmptyState message={emptyMessage} />
        ) : (
          reports.map((report, index) => (
            <Pressable
              key={report.id}
              onPress={() => onSelectReport(report.report)}
              disabled={loadingReferenceId === report.referenceId}
              className={`rounded-[18px] border bg-white p-4 ${
                index < reports.length - 1 ? "mb-3" : ""
              }`}
              style={({ pressed }) => ({
                borderColor: adminTheme.border,
                backgroundColor:
                  pressed || loadingReferenceId === report.referenceId
                    ? adminTheme.infoBg
                    : adminTheme.surface,
                opacity: loadingReferenceId === report.referenceId ? 0.75 : 1,
              })}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-[18px] font-medium" style={{ color: adminTheme.slate }}>
                    {report.title}
                  </Text>
                  <Text className="mt-1 text-sm" style={{ color: adminTheme.muted }}>
                    {report.completedAt}
                  </Text>
                </View>
                {loadingReferenceId === report.referenceId ? (
                  <ActivityIndicator size="small" color={accentColor} />
                ) : (
                  <Feather name="chevron-right" size={16} color={adminTheme.muted} />
                )}
              </View>

              <Text className="mt-4 text-sm" style={{ color: adminTheme.slateSoft }}>
                {report.location}
              </Text>
              <Text className="mt-1 text-sm" style={{ color: adminTheme.slateSoft }}>
                {report.referenceId}
              </Text>

              <View className="mt-4 flex-row items-center justify-between">
                <Text className="text-sm" style={{ color: adminTheme.slateSoft }}>
                  Assets scanned
                </Text>
                <Text className="text-sm font-medium" style={{ color: adminTheme.successText }}>
                  {report.scannedLabel}
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  );
}

export default function EmployeeReportsScreen({
  onSelectReport,
  subjectUserId,
  title = "My Reports",
  subtitle = "Review the audits you have already submitted",
  accentColor = adminTheme.employeePrimary,
  showOpenScanButton = true,
  headerControls,
  loadingMessage = "Loading your reports...",
  emptyMessage = "No submitted reports are available for this employee yet.",
  missingSubjectMessage = "Select an employee to review submitted reports.",
  retryButtonColor,
}: EmployeeReportsScreenProps) {
  const { width } = useWindowDimensions();
  const { user } = useAuthSession();
  const resolvedSubjectUserId = subjectUserId ?? user?.employeeId ?? null;
  const shouldShowDateRangeFilter = Boolean(user);
  const [reports, setReports] = useState<EmployeeReportSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadingReferenceId, setLoadingReferenceId] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  const [selectedStartDate, setSelectedStartDate] = useState<Date>(() => getTodayDate());
  const [selectedEndDate, setSelectedEndDate] = useState<Date>(() => getTodayDate());
  const [appliedStartDate, setAppliedStartDate] = useState<Date>(() => getTodayDate());
  const [appliedEndDate, setAppliedEndDate] = useState<Date>(() => getTodayDate());

  const handleChangeStartDate = (date: Date) => {
    const normalizedDate = normalizeDateOnly(date);

    setSelectedStartDate(normalizedDate);

    if (normalizedDate.getTime() > selectedEndDate.getTime()) {
      setSelectedEndDate(normalizedDate);
    }
  };

  const handleChangeEndDate = (date: Date) => {
    const normalizedDate = normalizeDateOnly(date);

    setSelectedEndDate(normalizedDate);

    if (normalizedDate.getTime() < selectedStartDate.getTime()) {
      setSelectedStartDate(normalizedDate);
    }
  };

  const handleApplyDateRange = () => {
    setAppliedStartDate(normalizeDateOnly(selectedStartDate));
    setAppliedEndDate(normalizeDateOnly(selectedEndDate));
    setReloadCount((current) => current + 1);
  };

  useEffect(() => {
    let isMounted = true;

    async function loadReports() {
      if (!resolvedSubjectUserId) {
        if (isMounted) {
          setReports([]);
          setErrorMessage(null);
          setIsLoading(false);
        }
        return;
      }

      if (isMounted) {
        setIsLoading(true);
        setErrorMessage(null);
      }

      try {
        const [response, savedSessions] = await Promise.all([
          apiService.getReportByEmployee(resolvedSubjectUserId, {
            fromDate: shouldShowDateRangeFilter
              ? formatDateForApi(appliedStartDate)
              : undefined,
            toDate: shouldShowDateRangeFilter
              ? formatDateForApi(appliedEndDate)
              : undefined,
          }),
          getAuditReportSessionsForUser(resolvedSubjectUserId),
        ]);

        if (!isMounted) {
          return;
        }

        const filteredResponse = shouldShowDateRangeFilter
          ? filterReportsByDateRange(response, appliedStartDate, appliedEndDate)
          : response;

        setReports(buildEmployeeReports(filteredResponse, savedSessions));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        console.warn("Failed to load reports:", error);
        setReports([]);
        setErrorMessage("Unable to load submitted reports right now.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadReports();

    return () => {
      isMounted = false;
    };
  }, [
    appliedEndDate,
    appliedStartDate,
    reloadCount,
    resolvedSubjectUserId,
    shouldShowDateRangeFilter,
  ]);

  const totalScanned = useMemo(
    () => reports.reduce((sum, report) => sum + report.report.summary.scanned, 0),
    [reports]
  );

  const handleRetry = () => {
    setReloadCount((current) => current + 1);
  };

  const handleSelectReport = async (report: LatestAuditReport) => {
    const sessionId = report.sessionId?.trim();
    const referenceId = report.referenceId?.trim();
    const referenceIds = splitReferenceIds(referenceId);

    if (referenceIds.length > 1) {
      try {
        setLoadingReferenceId(sessionId || referenceId || null);
        const detailedReports = await Promise.all(
          referenceIds.map(async (currentReferenceId) => {
            const comparisonResponse = await apiService.getWarehouseAuditData(
              currentReferenceId
            );

            return buildDetailedEmployeeReport(
              {
                ...report,
                referenceId: currentReferenceId,
              },
              comparisonResponse as Record<string, unknown>
            );
          })
        );
        const detailedReport = buildCombinedDetailedReport(report, detailedReports);

        onSelectReport(detailedReport);
      } catch (error) {
        console.warn("Failed to load multi-reference report details:", error);
        Alert.alert(
          "Unable to open report",
          "We couldn't load the full report details right now. Please try again."
        );
      } finally {
        setLoadingReferenceId(null);
      }
      return;
    }

    if (!referenceId) {
      onSelectReport(report);
      return;
    }

    try {
      setLoadingReferenceId(referenceId);
      const comparisonResponse = await apiService.getWarehouseAuditData(referenceId);
      const detailedReport = buildDetailedEmployeeReport(
        report,
        comparisonResponse as Record<string, unknown>
      );

      onSelectReport(detailedReport);
    } catch (error) {
      console.warn("Failed to load report details:", error);
      Alert.alert(
        "Unable to open report",
        "We couldn't load the full report details right now. Please try again."
      );
    } finally {
      setLoadingReferenceId(null);
    }
  };

  const resolvedRetryButtonColor = retryButtonColor ?? accentColor;
  const resolvedHeaderControls = shouldShowDateRangeFilter ? (
    <>
      <DateRangeControls
        startDate={selectedStartDate}
        endDate={selectedEndDate}
        onChangeStartDate={handleChangeStartDate}
        onChangeEndDate={handleChangeEndDate}
        onApply={handleApplyDateRange}
        accentColor={accentColor}
        isLoading={isLoading}
      />
      {headerControls ? <View className="mt-4">{headerControls}</View> : null}
    </>
  ) : (
    headerControls
  );
  const resolvedEmptyMessage = shouldShowDateRangeFilter
    ? "No submitted reports are available for the selected date range."
    : emptyMessage;

  return width < 1024 ? (
    <MobileEmployeeReports
      reports={reports}
      isLoading={isLoading}
      errorMessage={errorMessage}
      loadingReferenceId={loadingReferenceId}
      onRetry={handleRetry}
      onSelectReport={handleSelectReport}
      title={title}
      subtitle={subtitle}
      accentColor={accentColor}
      headerControls={resolvedHeaderControls}
      loadingMessage={loadingMessage}
      emptyMessage={resolvedEmptyMessage}
      missingSubjectMessage={missingSubjectMessage}
      hasSubjectUserId={Boolean(resolvedSubjectUserId)}
      retryButtonColor={resolvedRetryButtonColor}
    />
  ) : (
    <DesktopEmployeeReports
      reports={reports}
      totalScanned={totalScanned}
      isLoading={isLoading}
      errorMessage={errorMessage}
      loadingReferenceId={loadingReferenceId}
      onRetry={handleRetry}
      onSelectReport={handleSelectReport}
      title={title}
      subtitle={subtitle}
      accentColor={accentColor}
      showOpenScanButton={showOpenScanButton}
      headerControls={resolvedHeaderControls}
      loadingMessage={loadingMessage}
      emptyMessage={resolvedEmptyMessage}
      missingSubjectMessage={missingSubjectMessage}
      hasSubjectUserId={Boolean(resolvedSubjectUserId)}
      retryButtonColor={resolvedRetryButtonColor}
    />
  );
}
