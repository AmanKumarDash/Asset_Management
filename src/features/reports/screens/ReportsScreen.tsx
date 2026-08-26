import { AuditItemTone, AuditScanItem } from "@/features/audits/data/auditScanData";
import { useAuthSession } from "@/features/auth/hooks/useAuthSession";
import {
  LatestAuditReport,
  LatestAuditReportExcelRow,
  LatestAuditReportWarehouseSection,
  setLatestAuditReport,
} from "@/features/reports/state/latestAuditReportStore";
import { WarehouseSummary } from "@/models/warehouse";
import {
  UserDetails,
  WarehouseDetailsApiItem,
  WarehouseDetailsComparisonResponse,
  apiService,
} from "@/network/ApiService";
import { adminTheme } from "@/theme/adminTheme";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import DatePicker from "react-native-date-picker";
import { exportAuditReportAsExcel } from "../utils/reportExcelExporter";
import { exportAuditReportAsPdf } from "../utils/reportPdfGenerator";
import EmployeeReportsScreen from "./EmployeeReportsScreen";

import { AuditSummary } from "@/features/audits/types/audit";

interface DatewiseScanItem {
  TagId: string;
  ProductId: number;
  ProductCode: string;
  ReferenceId: string;
  WarehouseAuditData: {
    WarehouseData: {
      ProductId: number;
      TagId: string;
      ProductName: string;
      ProductCode: string;
    }[];
  }[];
}

function getDatewiseScanKey(
  item: Pick<DatewiseScanItem, "ProductId" | "TagId" | "ReferenceId">,
  fallbackKey: string
) {
  if (item.ProductId !== 0) {
    return `product:${item.ProductId}`;
  }

  const tagId = item.TagId?.trim();

  if (tagId) {
    return `tag:${tagId}`;
  }

  const referenceId = item.ReferenceId?.trim();

  return referenceId ? `reference:${referenceId}` : fallbackKey;
}

function getDatewiseWarehouseKey(
  item: DatewiseScanItem["WarehouseAuditData"][number]["WarehouseData"][number],
  fallbackKey: string
) {
  if (item.ProductId !== 0) {
    return `product:${item.ProductId}`;
  }

  const tagId = item.TagId?.trim();

  return tagId ? `tag:${tagId}` : fallbackKey;
}

function computeDatewiseAuditItems(data: DatewiseScanItem[]): {
  items: AuditScanItem[];
  summary: AuditSummary;
} {
  if (!data.length || !data[0]?.WarehouseAuditData?.[0]?.WarehouseData) {
    return { 
      items: [], 
      summary: { found: 0, missing: 0, extra: 0, scanned: 0 } 
    };
  }

  const scannedKeys = data.map((item, index) =>
    getDatewiseScanKey(item, `scanned:${index}`)
  );
  const scannedSet = new Set(scannedKeys);
  const scannedMap = new Map<string, { shortTag: string; refId: string; code?: string }>();


  data.forEach((item, index) => {
    const key = getDatewiseScanKey(item, `scanned:${index}`);

    if (!scannedMap.has(key)) {
      scannedMap.set(key, { shortTag: item.TagId, refId: item.ReferenceId, code: item.ProductCode });
    }
  });

  const warehouseItems = data[0].WarehouseAuditData[0].WarehouseData;
  const items: AuditScanItem[] = [];
  const summary: AuditSummary = { found: 0, missing: 0, extra: 0, scanned: scannedSet.size };

  // Found: warehouse + scanned
  warehouseItems.forEach((whItem, index) => {
    const warehouseKey = getDatewiseWarehouseKey(whItem, `warehouse:${index}`);
    const isScanned = scannedSet.has(warehouseKey);

    if (isScanned) {
      const scanInfo = scannedMap.get(warehouseKey)!;
      items.push({
        id: whItem.TagId, // full RFID Tag ID (consistent format)
        title: whItem.ProductName,
        subtitle: `Scanned as ${scanInfo.shortTag} • ${scanInfo.refId}`,
        tone: "found" as const,
        icon: "plus-circle"
      });
      summary.found++;
    } else {
      // Missing
      items.push({
        id: whItem.TagId, // full RFID Tag ID (consistent format)
        title: whItem.ProductName,
        subtitle: `Expected but not scanned`,
        tone: "missing" as const,
        icon: "briefcase"
      });
      summary.missing++;
    }
  });

  // Extra: scanned not in warehouse
  scannedSet.forEach(key => {
    if (!warehouseItems.some((whItem, index) => getDatewiseWarehouseKey(whItem, `warehouse:${index}`) === key)) {
      const scanInfo = scannedMap.get(key)!;
      items.push({
        id: scanInfo.shortTag, // Use scan TagId for extra items (only source available)
        title: scanInfo.code || "Unknown Product",
        subtitle: scanInfo.refId,
        tone: "extra" as const,
        icon: "plus-circle"
      });
      summary.extra++;
    }
  });

  summary.expected = summary.found + summary.missing;
  return { items, summary };
}

type StatusFilter = "all" | AuditItemTone;
function formatDateForApi(date: Date) {
  return date.toISOString().replace("T", " ").replace("Z", "");
}

function formatDateOnlyForApi(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}



function getToneStyles(tone: AuditItemTone) {
  switch (tone) {
    case "found":
      return {
        iconBg: "#EAF5DB",
        icon: "#78A22F",
        badgeBg: "#EAF5DB",
        badgeText: "#5D8B1F",
        label: "Found",
      };
    case "missing":
      return {
        iconBg: "#FCE8E8",
        icon: "#D64545",
        badgeBg: "#FFF0F0",
        badgeText: "#D64545",
        label: "Missing",
      };
    default:
      return {
        iconBg: "#FFF1DB",
        icon: "#B97818",
        badgeBg: "#FFF6E7",
        badgeText: "#B97818",
        label: "Extra",
      };
  }
}

//filter items by serach text and status
function filterAuditItems(
  items: AuditScanItem[],
  searchTerm: string,
  statusFilter: StatusFilter
) {
  const normalizedQuery = searchTerm.trim().toLowerCase();

  return items.filter((item) => {
    const matchesStatus =
      statusFilter === "all" || item.tone === statusFilter;
    const matchesSearch =
      normalizedQuery.length === 0 ||
      item.id.toLowerCase().includes(normalizedQuery) ||
      item.title.toLowerCase().includes(normalizedQuery) ||
      item.subtitle.toLowerCase().includes(normalizedQuery);

    return matchesStatus && matchesSearch;
  });
}

function getReportSections(
  report: LatestAuditReport
): LatestAuditReportWarehouseSection[] {
  if (report.warehouseSections?.length) {
    return report.warehouseSections;
  }

  return [
    {
      warehouseId: null,
      warehouseName: report.location,
      referenceId: report.referenceId,
      observedAt: report.observedAt,
      summary: report.summary,
      items: report.items,
    },
  ];
}

function filterReportSections(
  report: LatestAuditReport,
  searchTerm: string,
  statusFilter: StatusFilter
) {
  return getReportSections(report)
    .map((section) => ({
      ...section,
      items: filterAuditItems(section.items, searchTerm, statusFilter),
    }))
    .filter((section) => section.items.length > 0);
}

function WarehouseSectionHeader({
  section,
  mobile = false,
}: {
  section: LatestAuditReportWarehouseSection;
  mobile?: boolean;
}) {
  const expected =
    section.summary.expected ?? section.summary.found + section.summary.missing;

  return (
    <View
      className={`${mobile ? "mb-3" : "mb-4"} rounded-[14px] border px-4 py-3`}
      style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surfaceAlt }}
    >
      <View className={`${mobile ? "" : "flex-row items-start justify-between"}`}>
        <View className="flex-1">
          <Text className="text-base font-semibold" style={{ color: adminTheme.slate }}>
            {section.warehouseName}
          </Text>
          {section.referenceId ? (
            <Text className="mt-1 text-xs font-medium" style={{ color: adminTheme.slateSoft }}>
              Reference ID: {section.referenceId}
            </Text>
          ) : null}
        </View>

        <Text
          className={`${mobile ? "mt-2" : ""} text-xs font-medium`}
          style={{ color: adminTheme.slateSoft }}
        >
          Found {section.summary.found} / Missing {section.summary.missing} / Extra{" "}
          {section.summary.extra} / Expected {expected}
        </Text>
      </View>
    </View>
  );
}
// Constructs display name from user object
function getUserDisplayName(user: UserDetails) {
  const fullName = [user.FirstName, user.LastName]
    .filter((part): part is string => Boolean(part?.trim()))
    .map((part) => part.trim())
    .join(" ");

  return fullName || user.EmailId?.trim() || user.UserId?.trim() || "Unknown employee";
}

function pickWarehouseReportString(
  record: Record<string, unknown>,
  keys: string[]
): string | null {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return null;
}

function buildWarehouseExcelRows(
  items: AuditScanItem[],
  warehouseName: string,
  observedAt: string | null
): LatestAuditReportExcelRow[] {
  return items.map((item, index) => ({
    sno: index + 1,
    newCostCentre: warehouseName,
    costCentreDescription:
      item.reportFields?.hsnCode ?? item.extraProductDetails?.HSNCode ?? "",
    newFunctionalLocation: warehouseName,
    assetNo:
      item.reportFields?.productCode ?? item.extraProductDetails?.ProductCode ?? "",
    plantNo:
      item.reportFields?.modelNoAndCatelog ?? item.extraProductDetails?.ModelNo ?? "",
    plantIdentification: item.title,
    rfidTaggingPosition: item.id,
    quantity: "1",
    auditStart: observedAt ?? "",
    auditEnd: observedAt ?? "",
  }));
}

function isScannedWarehouseAuditItem(item: WarehouseDetailsApiItem) {
  const status =
    pickWarehouseReportString(item, ["Status", "status", "StatusName", "statusName"])?.toLowerCase() ??
    null;

  if (!status) {
    return true;
  }

  return !["not scanned", "not-scanned", "missing", "inactive"].includes(status);
}

function getWarehouseComparisonKey(item: WarehouseDetailsApiItem, fallbackKey: string) {
  const productId = pickWarehouseReportString(item, ["ProductId", "ProductID", "productId"]);

  if (productId && productId !== "0") {
    return `product:${productId}`;
  }

  const tagId = pickWarehouseReportString(item, [
    "TagId",
    "TAG_ID",
    "TagID",
    "tagId",
    "RFIDTagId",
    "RFIDTagID",
    "TagIdNumber",
    "ID",
  ]);

  return tagId ? `tag:${tagId}` : fallbackKey;
}

function uniqueWarehouseComparisonEntries(items: WarehouseDetailsApiItem[], source: string) {
  return items.reduce<{ key: string; item: WarehouseDetailsApiItem }[]>(
    (entries, item, index) => {
      const key = getWarehouseComparisonKey(item, `${source}:${index}`);

      if (!entries.some((entry) => entry.key === key)) {
        entries.push({ key, item });
      }

      return entries;
    },
    []
  );
}

function mapWarehouseComparisonItemToAuditItem(
  tone: AuditItemTone,
  item: WarehouseDetailsApiItem,
  index: number,
  warehouseName: string,
  fallbackTagId?: string | null
): AuditScanItem {
  const tagId =
    pickWarehouseReportString(item, [
      "TagId",
      "TAG_ID",
      "TagID",
      "tagId",
      "RFIDTagId",
      "RFIDTagID",
      "TagIdNumber",
      "ID",
    ]) ??
    fallbackTagId ??
    pickWarehouseReportString(item, ["ProductId", "ProductID", "productId"]) ??
    `WAREHOUSE-ASSET-${index + 1}`;
  const productName =
    pickWarehouseReportString(item, [
      "ProductName",
      "ItemName",
      "Name",
      "Title",
      "ProductCode",
    ]) ??
    (tone === "missing"
      ? "Missing Asset"
      : tone === "extra"
        ? "Extra Asset"
        : `Asset ${tagId}`);
  const status = pickWarehouseReportString(item, ["Status", "status"]);
  const productId = pickWarehouseReportString(item, ["ProductId", "ProductID", "productId"]);
  const subtitleParts = [
    tagId,
    productId ? `Product ${productId}` : null,
    pickWarehouseReportString(item, ["ProductCode", "AssetNo", "Code"]),
    status,
  ].filter(Boolean);

  return {
    id: tagId,
    title: productName,
    subtitle:
      subtitleParts.length > 0
        ? subtitleParts.join(" - ")
        : tone === "missing"
          ? `${warehouseName} - Expected asset not scanned`
          : `${warehouseName} - Present in audit`,
    tone,
    icon:
      tone === "missing"
        ? "briefcase"
        : tone === "extra"
          ? "plus-circle"
          : "plus-square",
    reportFields: {
      hsnCode: pickWarehouseReportString(item, ["HSNCode"]) ?? undefined,
      productCode:
        pickWarehouseReportString(item, ["ProductCode", "AssetNo", "Code"]) ??
        undefined,
      modelNoAndCatelog:
        pickWarehouseReportString(item, [
          "modelNo_and_catelog",
          "ModelNo",
          "ModelNoAndCatelog",
        ]) ?? undefined,
    },
  };
}

function resolveWarehouseReportReferenceId(
  warehouse: WarehouseSummary,
  response?: WarehouseDetailsComparisonResponse
) {
  const responseReference =
    response && typeof response === "object"
      ? pickWarehouseReportString(response, [
          "ReferanceId",
          "referanceId",
          "RefrenceId",
          "ReferenceId",
          "referenceId",
        ])
      : null;

  const warehouseReference = pickWarehouseReportString(warehouse.raw, [
    "ReferanceId",
    "referanceId",
    "RefrenceId",
    "ReferenceId",
    "referenceId",
  ]);
  const codeReference = warehouse.code?.startsWith("WH-") ? warehouse.code : null;

  return responseReference ?? warehouseReference ?? codeReference ?? null;
}

function getEmployeeReportReferenceId(item: EmployeeReportApiItem) {
  return pickWarehouseReportString(item as Record<string, unknown>, [
    "ReferanceId",
    "referanceId",
    "RefrenceId",
    "ReferenceId",
    "referenceId",
  ]);
}

async function resolveWarehouseReportReferenceForDate(
  warehouse: WarehouseSummary,
  userId: string,
  reportDate: string
) {
  const warehouseReference = resolveWarehouseReportReferenceId(warehouse);

  if (warehouseReference) {
    return warehouseReference;
  }

  const reportRows = await apiService.getReportByEmployee(userId, {
    fromDate: reportDate,
    toDate: reportDate,
  });
  const warehouseReportRows = reportRows
    .filter((row) => String(row.WareHouseId).trim() === String(warehouse.id).trim())
    .sort((left, right) => {
      const leftTime = new Date(left.ScanningDate ?? "").getTime() || 0;
      const rightTime = new Date(right.ScanningDate ?? "").getTime() || 0;
      return rightTime - leftTime;
    });

  return (
    warehouseReportRows
      .map(getEmployeeReportReferenceId)
      .find((referenceId): referenceId is string => Boolean(referenceId)) ?? null
  );
}

async function buildWarehouseComparisonReport(
  warehouse: WarehouseSummary,
  response: WarehouseDetailsComparisonResponse,
  requestedDate: string
): Promise<LatestAuditReport> {
  const warehouseName = warehouse.name || warehouse.code || `Warehouse ${warehouse.id}`;
  const referenceId = resolveWarehouseReportReferenceId(warehouse, response);
  const warehouseData = Array.isArray(response.WarehouseData)
    ? response.WarehouseData
    : Array.isArray(response.WareHouseData)
      ? response.WareHouseData
      : [];
  const auditScanData = Array.isArray(response.AuditScanData)
    ? response.AuditScanData.filter(isScannedWarehouseAuditItem)
    : [];
  const observedAt =
    pickWarehouseReportString(response, ["ObservedAt", "ScanningDate", "ScanDate"]) ??
    auditScanData
      .map((row) => pickWarehouseReportString(row, ["ScanDate", "ScanningDate", "ObservedAt"]))
      .find(Boolean) ??
    warehouseData
      .map((row) => pickWarehouseReportString(row, ["ScanDate", "ScanningDate", "ObservedAt"]))
      .find(Boolean) ??
    requestedDate;
  const warehouseEntries = uniqueWarehouseComparisonEntries(warehouseData, "warehouse");
  const scannedEntries = uniqueWarehouseComparisonEntries(auditScanData, "scanned");
  const warehouseByKey = new Map(warehouseEntries.map((entry) => [entry.key, entry]));
  const scannedByKey = new Map(scannedEntries.map((entry) => [entry.key, entry]));
  const foundItems = warehouseEntries
    .filter((entry) => scannedByKey.has(entry.key))
    .map((entry, index) =>
      mapWarehouseComparisonItemToAuditItem(
        "found",
        scannedByKey.get(entry.key)?.item ?? entry.item,
        index,
        warehouseName,
        pickWarehouseReportString(entry.item, ["TagId", "TAG_ID", "TagID", "tagId"])
      )
    );
  const missingItems = warehouseEntries
    .filter((entry) => !scannedByKey.has(entry.key))
    .map((entry, index) =>
      mapWarehouseComparisonItemToAuditItem("missing", entry.item, index, warehouseName)
    );
  const extraItems = scannedEntries
    .filter((entry) => !warehouseByKey.has(entry.key))
    .map((entry, index) =>
      mapWarehouseComparisonItemToAuditItem("extra", entry.item, index, warehouseName)
    );
  const items = [...foundItems, ...missingItems, ...extraItems];
  const summary = {
    found: foundItems.length,
    missing: missingItems.length,
    extra: extraItems.length,
    scanned: scannedEntries.length,
    expected: warehouseEntries.length,
  };
  const excelRows = buildWarehouseExcelRows(items, warehouseName, observedAt);

  return {
    title: `${warehouseName} Report`,
    location: warehouseName,
    mobileMeta: observedAt ? `${warehouseName} - ${observedAt}` : warehouseName,
    desktopMeta: observedAt ? `${warehouseName} - ${observedAt}` : warehouseName,
    status: "Submitted",
    sessionId: null,
    referenceId,
    observedAt,
    summary,
    items,
    excelRows,
    warehouseSections: [
      {
        warehouseId: warehouse.id,
        warehouseName,
        referenceId,
        observedAt,
        summary,
        items,
        excelRows,
      },
    ],
  };
}

//Reusable button component with icon support
function SectionButton({
  title,
  filled = false,
  icon,
  onPress,
}: {
  title: string;
  filled?: boolean;
  icon?: keyof typeof Feather.glyphMap;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center rounded-xl border px-4 py-2.5"
      style={{
        borderColor: filled ? adminTheme.primary : adminTheme.border,
        backgroundColor: filled ? adminTheme.primary : adminTheme.surface,
      }}
    >
      {icon ? (
        <Feather
          name={icon}
          size={16}
          color={filled ? "#ffffff" : adminTheme.slate}
        />
      ) : null}
      <Text
        className={`text-xs font-semibold ${icon ? "ml-2" : ""}`}
        style={{ color: filled ? "#ffffff" : adminTheme.slate }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
// PREPARE THE CHART FOR SHWIG AUDIT REPORT
function DonutChart({
  found,
  missing,
  extra,
  expected,
  size = 100,
}: {
  found: number;
  missing: number;
  extra: number;
  expected: number;
  size?: number;
}) {
  const thickness = size * 0.14;
  const radius = size / 2 - thickness / 2;
  const center = size / 2;
  const total = Math.max(found + missing + extra, 1);
  const segments = 60;
  const markers = Array.from({ length: segments }, (_, index) => {
    const ratio = index / segments;
    const scaled = ratio * total;
    let color = "#D9D9D9";

    if (scaled < found) {
      color = "#467A13";
    } else if (scaled < found + missing) {
      color = "#E34D45";
    } else if (scaled < found + missing + extra) {
      color = "#C47E17";
    }

    const angle = (360 / segments) * index - 90;
    const radians = (angle * Math.PI) / 180;
    const x = center + radius * Math.cos(radians) - thickness / 2;
    const y = center + radius * Math.sin(radians) - thickness / 2;

    return { angle, x, y, color };
  });
  const matchPercent =
    expected > 0 ? Math.round((found / expected) * 100) : 0;

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {markers.map((marker, index) => (
        <View
          key={`marker-${index}`}
          style={{
            position: "absolute",
            width: thickness,
            height: thickness * 0.56,
            borderRadius: thickness,
            backgroundColor: marker.color,
            left: marker.x,
            top: marker.y,
            transform: [{ rotate: `${marker.angle + 90}deg` }],
          }}
        />
      ))}

      <View className="items-center justify-center">
        <Text className="text-[18px] font-semibold" style={{ color: adminTheme.slate }}>
          {matchPercent}%
        </Text>
        <Text className="text-[11px]" style={{ color: adminTheme.slateSoft }}>
          match
        </Text>
      </View>
    </View>
  );
}
//Prepare the summary card for the audit report
function SummaryLegendRow({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View className="mb-3 flex-row items-center justify-between">
      <View className="flex-row items-center">
        <View className="mr-3 h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
        <Text className="text-base" style={{ color: adminTheme.slateSoft }}>
          {label}
        </Text>
      </View>
      <Text className="text-base font-medium" style={{ color: adminTheme.slate }}>
        {value}
      </Text>
    </View>
  );
}

function SummaryCard({
  report,
  mobile = false,
}: {
  report: LatestAuditReport;
  mobile?: boolean;
}) {
  const expected = report.summary.expected ?? report.summary.found + report.summary.missing;

  return (
    <View
      className="rounded-[20px] border px-5 py-5"
      style={{
        borderColor: adminTheme.border,
        backgroundColor: mobile ? adminTheme.surface : adminTheme.surfaceAlt,
      }}
    >
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-[18px] font-semibold" style={{ color: adminTheme.slate }}>
          Audit summary
        </Text>
        <View className="rounded-full px-3 py-1" style={{ backgroundColor: adminTheme.successBg }}>
          <Text className="text-xs font-medium" style={{ color: adminTheme.successText }}>
            {report.status}
          </Text>
        </View>
      </View>

      <View className={`${mobile ? "flex-row items-center" : "items-center"}`}>
        <View className={mobile ? "mr-5" : ""}>
          <DonutChart
            found={report.summary.found}
            missing={report.summary.missing}
            extra={report.summary.extra}
            expected={expected}
            size={mobile ? 90 : 106}
          />
        </View>

        <View className={`${mobile ? "flex-1" : "mt-6 w-full"}`}>
          <SummaryLegendRow label="Found" value={report.summary.found} color="#467A13" />
          <SummaryLegendRow label="Missing" value={report.summary.missing} color="#E34D45" />
          <SummaryLegendRow label="Extra" value={report.summary.extra} color="#C47E17" />
          <SummaryLegendRow label="Expected" value={expected} color="#D4D4D8" />
        </View>
      </View>
    </View>
  );
}

function ReportResultItem({
  item,
  mobile = false,
}: {
  item: AuditScanItem;
  mobile?: boolean;
}) {
  const styles = getToneStyles(item.tone);

  return (
    <View
      className={`flex-row rounded-[18px] border px-4 py-4 ${mobile ? "" : "items-center"}`}
      style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
    >
      <View
        className="mr-3 h-10 w-10 items-center justify-center rounded-[12px]"
        style={{ backgroundColor: styles.iconBg }}
      >
        <Feather name={item.icon} size={18} color={styles.icon} />
      </View>

      <View className="flex-1">
        <View className={`${mobile ? "" : "flex-row items-center justify-between gap-3"}`}>
          <Text className="text-[18px] font-semibold leading-6" style={{ color: adminTheme.slate }}>
            {item.title}
          </Text>
          {!mobile ? (
            <View className="rounded-full px-3 py-1" style={{ backgroundColor: styles.badgeBg }}>
              <Text className="text-xs font-medium" style={{ color: styles.badgeText }}>
                {styles.label}
              </Text>
            </View>
          ) : null}
        </View>
        <Text className="mt-1 text-sm leading-5" style={{ color: adminTheme.slateSoft }}>
          {item.subtitle}
        </Text>
      </View>

      {mobile ? (
        <View
          className="ml-3 rounded-full px-3 py-1"
          style={{ backgroundColor: styles.badgeBg, alignSelf: "flex-start" }}
        >
          <Text className="text-xs font-medium" style={{ color: styles.badgeText }}>
            {styles.label}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

//Search and filter controls
function FilterBar({
  searchTerm,
  onChangeSearchTerm,
  statusFilter,
  setStatusFilter,
  filteredCount,
  totalCount,
}: {
  searchTerm: string;
  onChangeSearchTerm: (value: string) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (value: StatusFilter) => void;
  filteredCount: number;
  totalCount: number;
}) {
  return (
    <View className="mb-4">
      <View className="flex-row flex-wrap items-center" style={{ gap: 10 }}>
        <View
          className="min-w-[220px] flex-1 rounded-[14px] border px-3 py-2"
          style={{
            borderColor: adminTheme.border,
            backgroundColor: adminTheme.surface,
          }}
        >
          <TextInput
            value={searchTerm}
            onChangeText={onChangeSearchTerm}
            placeholder="Search products, tags, or details"
            placeholderTextColor="#94A3B8"
            className="text-base"
            style={{ color: adminTheme.slate }}
          />
        </View>

        <View className="flex-row flex-wrap" style={{ gap: 8 }}>
          {(["all", "found", "missing", "extra"] as StatusFilter[]).map((option) => {
            const selected = statusFilter === option;

            return (
              <Pressable
                key={option}
                onPress={() => setStatusFilter(option)}
                className="rounded-full border px-3 py-2"
                style={{
                  borderColor: selected ? adminTheme.primary : adminTheme.border,
                  backgroundColor: selected ? adminTheme.infoBg : adminTheme.surface,
                }}
              >
                <Text
                  className="text-sm font-medium"
                  style={{ color: selected ? adminTheme.primary : adminTheme.slate }}
                >
                  {option === "all"
                    ? "All"
                    : option.charAt(0).toUpperCase() + option.slice(1)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Text className="mt-2 text-sm" style={{ color: adminTheme.slateSoft }}>
        Showing {filteredCount} of {totalCount} results
      </Text>
    </View>
  );
}
// Displayed when no items match the search or filter criteria
function EmptyResults() {
  return (
    <View
      className="rounded-[20px] border px-5 py-5"
      style={{
        borderColor: adminTheme.border,
        backgroundColor: adminTheme.surface,
      }}
    >
      <Text className="text-base" style={{ color: adminTheme.slateSoft }}>
        No report items match the current search or status filter.
      </Text>
    </View>
  );
}

//Admin-specific controls for employee report selection
function AdminReportControls({
  showEmployeeReports,
  showWarehouseReports,
  onChangeShowEmployeeReports,
  onChangeShowWarehouseReports,
  selectedEmployee,
  employees,
  isLoadingEmployees,
  employeeLookupError,
  isEmployeePickerOpen,
  onToggleEmployeePicker,
  onSelectEmployee,
  onRetryEmployeeLoad,
}: {
  showEmployeeReports: boolean;
  showWarehouseReports: boolean;
  onChangeShowEmployeeReports: (value: boolean) => void;
  onChangeShowWarehouseReports: (value: boolean) => void;
  selectedEmployee: UserDetails | null;
  employees: UserDetails[];
  isLoadingEmployees: boolean;
  employeeLookupError: string | null;
  isEmployeePickerOpen: boolean;
  onToggleEmployeePicker: () => void;
  onSelectEmployee: (value: UserDetails) => void;
  onRetryEmployeeLoad: () => void;
}) {
  return (
    <View
      className="rounded-[20px] border px-4 py-4"
      style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
    >
      <Text className="text-sm font-medium" style={{ color: adminTheme.slateSoft }}>
        Report source
      </Text>

      <View className="mt-3 flex-row flex-wrap" style={{ gap: 8 }}>
        <Pressable
          onPress={() => onChangeShowEmployeeReports(false)}
          className="rounded-full border px-3 py-2"
          style={{
            borderColor:
              !showEmployeeReports && !showWarehouseReports
                ? adminTheme.primary
                : adminTheme.border,
            backgroundColor:
              !showEmployeeReports && !showWarehouseReports
                ? adminTheme.infoBg
                : adminTheme.surface,
          }}
        >
          <Text
            className="text-sm font-medium"
            style={{
              color:
                !showEmployeeReports && !showWarehouseReports
                  ? adminTheme.primary
                  : adminTheme.slate,
            }}
          >
            My reports
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            onChangeShowWarehouseReports(false);
            onChangeShowEmployeeReports(true);
          }}
          className="rounded-full border px-3 py-2"
          style={{
            borderColor: showEmployeeReports ? adminTheme.primary : adminTheme.border,
            backgroundColor: showEmployeeReports ? adminTheme.infoBg : adminTheme.surface,
          }}
        >
          <Text
            className="text-sm font-medium"
            style={{
              color: showEmployeeReports ? adminTheme.primary : adminTheme.slate,
            }}
          >
            Employee reports
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onChangeShowWarehouseReports(true)}
          className="rounded-full border px-3 py-2"
          style={{
            borderColor: showWarehouseReports ? adminTheme.primary : adminTheme.border,
            backgroundColor: showWarehouseReports ? adminTheme.infoBg : adminTheme.surface,
          }}
        >
          <Text
            className="text-sm font-medium"
            style={{
              color: showWarehouseReports ? adminTheme.primary : adminTheme.slate,
            }}
          >
            Warehouse reports
          </Text>
        </Pressable>
      </View>

      {showEmployeeReports ? (
        <View className="mt-4">
          <Text className="text-sm font-medium" style={{ color: adminTheme.slateSoft }}>
            Select employee
          </Text>

          <Pressable
            onPress={onToggleEmployeePicker}
            className="mt-2 flex-row items-center justify-between rounded-[14px] border px-4 py-3.5"
            style={{
              borderColor: adminTheme.border,
              backgroundColor: adminTheme.surfaceAlt,
            }}
          >
            <Text style={{ color: adminTheme.slate }}>
              {selectedEmployee
                ? getUserDisplayName(selectedEmployee)
                : isLoadingEmployees
                  ? "Loading employees..."
                  : "Choose an employee"}
            </Text>
            <Feather
              name={isEmployeePickerOpen ? "chevron-up" : "chevron-down"}
              size={18}
              color={adminTheme.slateSoft}
            />
          </Pressable>

          {isEmployeePickerOpen ? (
            <View
              className="mt-2 rounded-[14px] border"
              style={{
                borderColor: adminTheme.border,
                backgroundColor: adminTheme.surface,
                maxHeight: 220,
              }}
            >
              <ScrollView nestedScrollEnabled>
                {isLoadingEmployees ? (
                  <View className="items-center px-4 py-5">
                    <ActivityIndicator size="small" color={adminTheme.primary} />
                    <Text className="mt-2 text-sm" style={{ color: adminTheme.muted }}>
                      Loading employees...
                    </Text>
                  </View>
                ) : employeeLookupError ? (
                  <View className="px-4 py-4">
                    <Text className="text-sm leading-5" style={{ color: "#D64545" }}>
                      {employeeLookupError}
                    </Text>
                    <Pressable
                      onPress={onRetryEmployeeLoad}
                      className="mt-3 self-start rounded-xl px-4 py-2"
                      style={{ backgroundColor: adminTheme.primary }}
                    >
                      <Text className="text-sm font-semibold text-white">Retry</Text>
                    </Pressable>
                  </View>
                ) : employees.length === 0 ? (
                  <View className="px-4 py-4">
                    <Text className="text-sm leading-5" style={{ color: adminTheme.slateSoft }}>
                      No employees are available for this organization yet.
                    </Text>
                  </View>
                ) : (
                  employees.map((employee, index) => {
                    const isSelected =
                      selectedEmployee?.UserId?.trim() === employee.UserId?.trim();

                    return (
                      <Pressable
                        key={`${employee.UserId}-${index}`}
                        onPress={() => onSelectEmployee(employee)}
                        className={`px-4 py-3 ${index < employees.length - 1 ? "border-b" : ""}`}
                        style={{
                          borderColor: index < employees.length - 1 ? adminTheme.border : undefined,
                          backgroundColor: isSelected ? adminTheme.infoBg : adminTheme.surface,
                        }}
                      >
                        <Text
                          className="text-sm font-medium"
                          style={{ color: adminTheme.slate }}
                        >
                          {getUserDisplayName(employee)}
                        </Text>
                        <Text className="mt-1 text-xs" style={{ color: adminTheme.slateSoft }}>
                          {employee.UserId?.trim() || "Unknown id"}
                        </Text>
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function WarehouseReportsScreen({
  warehouses,
  isMobile,
  userId,
  headerControls,
  onRefreshWarehouseAccess,
  onSelectReport,
}: {
  warehouses: WarehouseSummary[];
  isMobile: boolean;
  userId: string;
  headerControls?: ReactNode;
  onRefreshWarehouseAccess: () => Promise<WarehouseSummary[]>;
  onSelectReport: (report: LatestAuditReport) => void;
}) {
  const [isRefreshingWarehouses, setIsRefreshingWarehouses] = useState(false);
  const [warehouseError, setWarehouseError] = useState<string | null>(null);
  const [loadingWarehouseId, setLoadingWarehouseId] = useState<string | null>(null);

  const handleRefreshWarehouses = useCallback(async () => {
    try {
      setIsRefreshingWarehouses(true);
      setWarehouseError(null);
      await onRefreshWarehouseAccess();
    } catch (error) {
      console.warn("Failed to refresh warehouse access for reports:", error);
      setWarehouseError("Unable to load assigned warehouses right now.");
    } finally {
      setIsRefreshingWarehouses(false);
    }
  }, [onRefreshWarehouseAccess]);

  useEffect(() => {
    if (warehouses.length > 0) {
      return;
    }

    void handleRefreshWarehouses();
  }, [handleRefreshWarehouses, warehouses.length]);

  async function handleOpenWarehouseReport(warehouse: WarehouseSummary) {
    try {
      setLoadingWarehouseId(warehouse.id);
      setWarehouseError(null);

      const currentDate = formatDateOnlyForApi(new Date());
      const referenceId = await resolveWarehouseReportReferenceForDate(
        warehouse,
        userId,
        currentDate
      );

      if (!referenceId) {
        setWarehouseError(
          "No submitted audit reference was found for this warehouse today."
        );
        return;
      }

      const comparisonResponse =
        await apiService.getWarehouseDetailsComparisonByWarehouseId(warehouse.id, {
          referenceId,
          startDate: currentDate,
          endDate: currentDate,
        });
      const report = await buildWarehouseComparisonReport(
        warehouse,
        comparisonResponse,
        currentDate
      );

      setLatestAuditReport(report);
      onSelectReport(report);
    } catch (error) {
      console.warn("Failed to load warehouse report:", error);
      setWarehouseError("Unable to load warehouse report details right now.");

      if (Platform.OS !== "web") {
        Alert.alert(
          "Unable to open report",
          "We couldn't load this warehouse report right now. Please try again."
        );
      }
    } finally {
      setLoadingWarehouseId(null);
    }
  }

  const content = (
    <>
      {headerControls ? <View className={isMobile ? "mb-4" : "mb-5"}>{headerControls}</View> : null}

      <View
        className="rounded-[20px] border px-4 py-4"
        style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
      >
        <View className={`${isMobile ? "" : "flex-row items-start justify-between"}`}>
          <View className="flex-1">
            <Text className="text-sm font-semibold" style={{ color: adminTheme.slate }}>
              Warehouse wise report
            </Text>
            <Text className="mt-2 text-sm leading-5" style={{ color: adminTheme.muted }}>
              Select an assigned warehouse to view its asset details.
            </Text>
          </View>

          <Pressable
            onPress={handleRefreshWarehouses}
            disabled={isRefreshingWarehouses}
            className={`${isMobile ? "mt-4 self-start" : "ml-4"} flex-row items-center rounded-xl border px-4 py-2.5`}
            style={{
              borderColor: adminTheme.border,
              backgroundColor: adminTheme.surfaceAlt,
              opacity: isRefreshingWarehouses ? 0.75 : 1,
            }}
          >
            {isRefreshingWarehouses ? (
              <ActivityIndicator size="small" color={adminTheme.primary} />
            ) : (
              <Feather name="refresh-cw" size={16} color={adminTheme.slateSoft} />
            )}
            <Text className="ml-2 text-sm font-semibold" style={{ color: adminTheme.slate }}>
              Refresh
            </Text>
          </Pressable>
        </View>

        {warehouseError ? (
          <View className="mt-4 rounded-[14px] border px-4 py-3" style={{ borderColor: "#F5B5B5", backgroundColor: "#FFF5F5" }}>
            <Text className="text-sm leading-5" style={{ color: "#D64545" }}>
              {warehouseError}
            </Text>
          </View>
        ) : null}

        {isRefreshingWarehouses && warehouses.length === 0 ? (
          <View className="items-center justify-center py-12">
            <ActivityIndicator size="large" color={adminTheme.primary} />
            <Text className="mt-3 text-sm" style={{ color: adminTheme.muted }}>
              Loading assigned warehouses...
            </Text>
          </View>
        ) : warehouses.length === 0 ? (
          <View className="mt-4 rounded-[14px] border border-dashed px-4 py-4">
            <Text className="text-sm leading-5" style={{ color: adminTheme.slateSoft }}>
              No warehouse access is assigned to this user yet.
            </Text>
          </View>
        ) : (
          <View className="mt-4" style={{ gap: 10 }}>
            {warehouses.map((warehouse) => {
              const isLoading = loadingWarehouseId === warehouse.id;

              return (
                <Pressable
                  key={warehouse.id}
                  onPress={() => handleOpenWarehouseReport(warehouse)}
                  disabled={Boolean(loadingWarehouseId)}
                  className="rounded-[18px] border px-4 py-4"
                  style={({ pressed }) => ({
                    borderColor: adminTheme.border,
                    backgroundColor: pressed ? adminTheme.infoBg : adminTheme.surfaceAlt,
                    opacity: loadingWarehouseId && !isLoading ? 0.65 : 1,
                  })}
                >
                  <View className="flex-row items-center justify-between" style={{ gap: 12 }}>
                    <View className="flex-1">
                      <Text className="text-base font-semibold" style={{ color: adminTheme.slate }}>
                        {warehouse.name || warehouse.code || `Warehouse ${warehouse.id}`}
                      </Text>
                      <Text className="mt-1 text-sm" style={{ color: adminTheme.slateSoft }}>
                        {warehouse.subtitle || `Warehouse ID: ${warehouse.id}`}
                      </Text>
                    </View>

                    {isLoading ? (
                      <ActivityIndicator size="small" color={adminTheme.primary} />
                    ) : (
                      <Feather name="chevron-right" size={18} color={adminTheme.slateSoft} />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    </>
  );

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={
        isMobile
          ? { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 16 }
          : { paddingHorizontal: 20, paddingVertical: 20 }
      }
      showsVerticalScrollIndicator={false}
    >
      <View className="mb-5">
        <Text
          className={isMobile ? "text-[22px] font-semibold" : "text-[28px] font-semibold"}
          style={{ color: adminTheme.slate }}
        >
          Warehouse Reports
        </Text>
        <Text className="mt-1 text-sm" style={{ color: adminTheme.muted }}>
          Review details for warehouses assigned to your account.
        </Text>
      </View>

      {content}
    </ScrollView>
  );
}

type ReportDetailProps = {
  report: LatestAuditReport;
  onExportExcel: () => void;
  onExportPdf: () => void;
  isExportingExcel: boolean;
  isExportingPdf: boolean;
  onBack?: () => void;
  showDateFilters?: boolean;
};

function handleDefaultBackNavigation() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.push("/audits");
  }
}

function DesktopReports({
  report,
  onExportExcel,
  onExportPdf,
  isExportingExcel,
  isExportingPdf,
  onBack,
  showDateFilters = true,
}: ReportDetailProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const filteredItems = useMemo(
    () => filterAuditItems(report.items, searchTerm, statusFilter),
    [report.items, searchTerm, statusFilter]
  );
  const filteredSections = useMemo(
    () => filterReportSections(report, searchTerm, statusFilter),
    [report, searchTerm, statusFilter]
  );
  const [startDate, setStartDate] = useState<Date | null>(null);
const [endDate, setEndDate] = useState<Date | null>(null);
const [openStart, setOpenStart] = useState(false);
const [openEnd, setOpenEnd] = useState(false);
const [loadingReport, setLoadingReport] = useState(false);

// Fetches a new report based on the selected date range
async function handleFetchReportByDate() {
  if (!startDate || !endDate) {
    alert("Select both dates");
    return;
  }

  try {
    setLoadingReport(true);

    const rawData = await apiService.getReportByDateWiseAsset(
      startDate.toISOString(),
      endDate.toISOString(),
    );

    const { items, summary } = computeDatewiseAuditItems(rawData);

    const newReport: LatestAuditReport = {
      ...report,
      items,
      warehouseSections: undefined,
      referenceId: rawData[0]?.ReferenceId ?? null,
      observedAt: rawData[0]?.ScanningDate ?? null,
      summary,
    };

    setLatestAuditReport(newReport);

  } catch (err) {
    console.error(err);
  } finally {
    setLoadingReport(false);
  }
}


  return (
    <View className="flex-1" style={{ paddingHorizontal: 20, paddingVertical: 20, minHeight: 0 }}>
      <View className="mb-5 flex-row items-start justify-between" style={{ gap: 16 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            className="text-[28px] font-semibold"
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{ color: adminTheme.slate }}
          >
            {report.title}
          </Text>
          <Text
            className="mt-1 text-base"
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{ color: adminTheme.slateSoft }}
          >
            {report.desktopMeta}
          </Text>
        </View>

        <View className="flex-row" style={{ flexShrink: 0, gap: 12 }}>
          <SectionButton
            title="Back"
            icon="arrow-left"
            onPress={onBack ?? handleDefaultBackNavigation}
          />
          <SectionButton
            title={isExportingExcel ? "Exporting..." : "Export Excel"}
            icon="download"
            onPress={onExportExcel}
          />
          <SectionButton
            title={isExportingPdf ? "Exporting..." : "Export PDF"}
            icon="download"
            filled
            onPress={onExportPdf}
          />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 20, minHeight: 0 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row" style={{ gap: 18, alignItems: "flex-start", minHeight: 0 }}>
          <View style={{ width: 300 }}>
            <SummaryCard report={report} />
          </View>

          <View className="flex-1 flex-col" style={{ minHeight: 0 }}>
            <Text className="mb-3 text-[18px] font-semibold" style={{ color: adminTheme.slate }}>
              Audit results ({report.items.length})
            </Text>
            {showDateFilters ? (
              <>
                <View className="mb-4 flex-row flex-wrap items-center" style={{ gap: 10 }}>
                  {/* ✅ MOBILE BUTTONS */}
                  <View className="mb-4 flex-row flex-wrap items-center" style={{ gap: 10 }}>
                    {/* Mobile: Pressable + Modal DatePicker */}
                    {Platform.OS !== "web" && (
                      <>
                        <Pressable
                          onPress={() => setOpenStart(true)}
                          className="rounded-xl border px-3 py-2"
                          style={{ borderColor: adminTheme.border }}
                        >
                          <Text>
                            {startDate ? startDate.toDateString() : "Start Date"}
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() => setOpenEnd(true)}
                          className="rounded-xl border px-3 py-2"
                          style={{ borderColor: adminTheme.border }}
                        >
                          <Text>
                            {endDate ? endDate.toDateString() : "End Date"}
                          </Text>
                        </Pressable>
                      </>
                    )}

                    {/* Web: Native date inputs (no time) */}
                    {Platform.OS === "web" && (
                      <>
                        <input
                          type="date"
                          onChange={(e) => setStartDate(new Date(e.target.value))}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '12px',
                            border: `1px solid ${adminTheme.border}`,
                            backgroundColor: adminTheme.surface,
                            color: adminTheme.slate,
                          }}
                        />
                        <input
                          type="date"
                          onChange={(e) => setEndDate(new Date(e.target.value))}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '12px',
                            border: `1px solid ${adminTheme.border}`,
                            backgroundColor: adminTheme.surface,
                            color: adminTheme.slate,
                          }}
                        />
                      </>
                    )}

                    {/* Go Button */}
                    <Pressable
                      onPress={handleFetchReportByDate}
                      className="rounded-xl px-4 py-2"
                      style={{ backgroundColor: adminTheme.primary }}
                    >
                      <Text style={{ color: "#fff" }}>
                        {loadingReport ? "Loading..." : "Go"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
                {Platform.OS !== "web" && (
                  <>
                    <DatePicker
                      modal
                      open={openStart}
                      date={startDate || new Date()}
                      mode="date"
                      onConfirm={(date) => {
                        setOpenStart(false);
                        setStartDate(date);
                      }}
                      onCancel={() => setOpenStart(false)}
                    />

                    <DatePicker
                      modal
                      open={openEnd}
                      date={endDate || new Date()}
                      mode="date"
                      onConfirm={(date) => {
                        setOpenEnd(false);
                        setEndDate(date);
                      }}
                      onCancel={() => setOpenEnd(false)}
                    />
                  </>
                )}
              </>
            ) : null}

            <FilterBar
              searchTerm={searchTerm}
              onChangeSearchTerm={setSearchTerm}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              filteredCount={filteredItems.length}
              totalCount={report.items.length}
            />

            {filteredSections.length > 0 ? (
              <View>
                {filteredSections.map((section, sectionIndex) => (
                  <View
                    key={`${section.warehouseId ?? section.warehouseName}-${sectionIndex}`}
                    className={sectionIndex < filteredSections.length - 1 ? "mb-5" : ""}
                  >
                    <WarehouseSectionHeader section={section} />
                    <View
                      className="overflow-hidden rounded-[20px] border bg-white"
                      style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
                    >
                      {section.items.map((item, index) => (
                        <View
                          key={`${item.id}-${index}`}
                          className={`${index < section.items.length - 1 ? "border-b" : ""} px-4 py-3`}
                          style={
                            index < section.items.length - 1
                              ? { borderColor: adminTheme.border }
                              : undefined
                          }
                        >
                          <ReportResultItem item={item} />
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <EmptyResults />
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function MobileReports({
  report,
  onExportExcel,
  onExportPdf,
  isExportingExcel,
  isExportingPdf,
  onBack,
  showDateFilters = true,
}: ReportDetailProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const filteredItems = useMemo(
    () => filterAuditItems(report.items, searchTerm, statusFilter),
    [report.items, searchTerm, statusFilter]
  );
  const filteredSections = useMemo(
    () => filterReportSections(report, searchTerm, statusFilter),
    [report, searchTerm, statusFilter]
  );
  const [startDate, setStartDate] = useState<Date | null>(null);
const [endDate, setEndDate] = useState<Date | null>(null);
const [openStart, setOpenStart] = useState(false);
const [openEnd, setOpenEnd] = useState(false);
const [loadingReport, setLoadingReport] = useState(false);

async function handleFetchReportByDate() {
  if (!startDate || !endDate) {
    alert("Please select both dates");
    return;
  }

  try {
    setLoadingReport(true);

    const rawData = await apiService.getReportByDateWiseAsset(
      formatDateForApi(startDate),
      formatDateForApi(endDate)
    );

    const { items, summary } = computeDatewiseAuditItems(rawData);

    const newReport: LatestAuditReport = {
      ...report,
      items,
      warehouseSections: undefined,
      referenceId: rawData[0]?.ReferenceId ?? null,
      observedAt: rawData[0]?.ScanningDate ?? null,
      summary,
    };

    setLatestAuditReport(newReport);

  } catch (err) {
    console.error(err);
  } finally {
    setLoadingReport(false);
  }
}

  return (
    <View className="flex-1" style={{ minHeight: 0 }}>
      <View className="border-b px-4 pb-4 pt-3" style={{ borderColor: adminTheme.border }}>
        <View className="flex-row items-start">
          <Pressable
            onPress={onBack ?? handleDefaultBackNavigation}
            className="mr-3 mt-1 h-9 w-9 items-center justify-center rounded-[12px] border"
            style={{
              borderColor: adminTheme.border,
              backgroundColor: adminTheme.surface,
            }}
          >
            <Feather name="chevron-left" size={18} color={adminTheme.slateSoft} />
          </Pressable>

          <View className="flex-1">
            <Text className="text-[18px] font-semibold" style={{ color: adminTheme.slate }}>
              {report.title}
            </Text>
            <Text className="mt-1 text-sm" style={{ color: adminTheme.slateSoft }}>
              {report.mobileMeta}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-4 pt-4">
          <SummaryCard report={report} mobile />
        </View>

        <View className="flex-1 px-4 pt-4" style={{ minHeight: 0 }}>
          <Text className="mb-3 text-[18px] font-semibold" style={{ color: adminTheme.slate }}>
            Audit results ({report.items.length})
          </Text>
          {showDateFilters ? (
            <>
              <View className="mb-4 flex-row flex-wrap items-center" style={{ gap: 10 }}>

                <Pressable
                  onPress={() => setOpenStart(true)}
                  className="rounded-xl border px-3 py-2"
                  style={{ borderColor: adminTheme.border }}
                >
                  <Text>
                    {startDate ? startDate.toDateString() : "Start Date"}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setOpenEnd(true)}
                  className="rounded-xl border px-3 py-2"
                  style={{ borderColor: adminTheme.border }}
                >
                  <Text>
                    {endDate ? endDate.toDateString() : "End Date"}
                  </Text>
                </Pressable>
                {Platform.OS === "web" && (
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <input
                      type="date"
                      onChange={(e) => setStartDate(new Date(e.target.value))}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "12px",
                        border: `1px solid ${adminTheme.border}`,
                        backgroundColor: adminTheme.surface,
                        color: adminTheme.slate,
                      }}
                    />
                    <input
                      type="date"
                      onChange={(e) => setEndDate(new Date(e.target.value))}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "12px",
                        border: `1px solid ${adminTheme.border}`,
                        backgroundColor: adminTheme.surface,
                        color: adminTheme.slate,
                      }}
                    />
                  </View>
                )}

                <Pressable
                  onPress={handleFetchReportByDate}
                  className="rounded-xl px-4 py-2"
                  style={{ backgroundColor: adminTheme.primary }}
                >
                  <Text style={{ color: "#fff" }}>
                    {loadingReport ? "Loading..." : "Go"}
                  </Text>
                </Pressable>
              </View>
              {Platform.OS !== "web" && (
                <>
                  <DatePicker
                    modal
                    open={openStart}
                    date={startDate || new Date()}
                    mode="date"
                    onConfirm={(date) => {
                      setOpenStart(false);
                      setStartDate(date);
                    }}
                    onCancel={() => setOpenStart(false)}
                  />

                  <DatePicker
                    modal
                    open={openEnd}
                    date={endDate || new Date()}
                    mode="date"
                    onConfirm={(date) => {
                      setOpenEnd(false);
                      setEndDate(date);
                    }}
                    onCancel={() => setOpenEnd(false)}
                  />
                </>
              )}
            </>
          ) : null}

          <FilterBar
            searchTerm={searchTerm}
            onChangeSearchTerm={setSearchTerm}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            filteredCount={filteredItems.length}
            totalCount={report.items.length}
          />

          {filteredSections.length > 0 ? (
            filteredSections.map((section, sectionIndex) => (
              <View key={`${section.warehouseId ?? section.warehouseName}-${sectionIndex}`} className={sectionIndex < filteredSections.length - 1 ? "mb-5" : ""}>
                <WarehouseSectionHeader section={section} mobile />
                {section.items.map((item, index) => (
                  <View key={`${item.id}-${index}`} className={index < section.items.length - 1 ? "mb-3" : ""}>
                    <ReportResultItem item={item} mobile />
                  </View>
                ))}
              </View>
            ))
          ) : (
            <EmptyResults />
          )}

          <View className="pt-4">
            <Pressable
              onPress={onExportExcel}
              className="mb-3 flex-row items-center justify-center rounded-[18px] border bg-white px-5 py-4"
              style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
            >
              <Feather name="download" size={18} color={adminTheme.slateSoft} />
              <Text className="ml-3 text-[18px] font-semibold" style={{ color: adminTheme.slate }}>
                {isExportingExcel ? "Exporting..." : "Export Report (Excel)"}
              </Text>
            </Pressable>
            <Pressable
              onPress={onExportPdf}
              className="flex-row items-center justify-center rounded-[18px] border bg-white px-5 py-4"
              style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
            >
              <Feather name="download" size={18} color={adminTheme.slateSoft} />
              <Text className="ml-3 text-[18px] font-semibold" style={{ color: adminTheme.slate }}>
                {isExportingPdf ? "Exporting..." : "Export Report (PDF)"}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

export default function ReportsScreen() {
  const { user, accessibleWarehouses, refreshWarehouseAccess } = useAuthSession();
  const { width } = useWindowDimensions();
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [selectedEmployeeReport, setSelectedEmployeeReport] =
    useState<LatestAuditReport | null>(null);
  const [selectedAdminReport, setSelectedAdminReport] =
    useState<LatestAuditReport | null>(null);
  const [showEmployeeReports, setShowEmployeeReports] = useState(false);
  const [showWarehouseReports, setShowWarehouseReports] = useState(false);
  const [organizationEmployees, setOrganizationEmployees] = useState<UserDetails[]>([]);
  const [selectedAdminEmployee, setSelectedAdminEmployee] = useState<UserDetails | null>(null);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [employeeLookupError, setEmployeeLookupError] = useState<string | null>(null);
  const [isEmployeePickerOpen, setIsEmployeePickerOpen] = useState(false);
  const isMobile = width < 1024;
  const activeReport =
    user?.role === "employee" ? selectedEmployeeReport : selectedAdminReport;

    // Only runs for admin users
  const loadOrganizationEmployees = useCallback(async () => {
    if (user?.role !== "admin") {
      return;
    }

    try {
      setIsLoadingEmployees(true);
      setEmployeeLookupError(null);
      const response = await apiService.getUserDetails("");
      const filteredEmployees = response.filter(
        (employee) => employee.UserId?.trim() && employee.UserId?.trim() !== user.employeeId.trim()
      );

      setOrganizationEmployees(filteredEmployees);
    } catch (error) {
      console.warn("Failed to load organization employees:", error);
      setOrganizationEmployees([]);
      setEmployeeLookupError(
        "Unable to load employees for this organization right now."
      );
    } finally {
      setIsLoadingEmployees(false);
    }
  }, [user?.employeeId, user?.role]);


  // Load employees when admin switches to employee reports view
  useEffect(() => {
    if (user?.role !== "admin" || !showEmployeeReports || organizationEmployees.length > 0) {
      return;
    }

    void loadOrganizationEmployees();
  }, [loadOrganizationEmployees, organizationEmployees.length, showEmployeeReports, user?.role]);

  const adminSubjectUserId =
    showEmployeeReports
      ? selectedAdminEmployee?.UserId?.trim() ?? null
      : user?.employeeId ?? null;
  const adminHeaderTitle = showWarehouseReports
    ? "Warehouse Reports"
    : showEmployeeReports
    ? selectedAdminEmployee
      ? `${getUserDisplayName(selectedAdminEmployee)} Reports`
      : "Employee Reports"
    : "My Reports";
  const adminHeaderSubtitle = showWarehouseReports
    ? "Review the audits grouped by warehouse"
    : showEmployeeReports
    ? selectedAdminEmployee
      ? `Review submitted audits for ${getUserDisplayName(selectedAdminEmployee)}`
      : "Select an employee to review submitted audits."
    : "Review the audits you have already submitted";

  async function handleExportPdf() {
    if (!user || !activeReport) {
      return;
    }

    setIsExportingPdf(true);
    try {
      // Calls utility to generate and download PDF based on report data and user info
      await exportAuditReportAsPdf(activeReport, user.name);
    } catch (error) {
      console.warn("Failed to export PDF:", error);

      if (Platform.OS !== "web") {
        Alert.alert(
          "Export failed",
          "We couldn't generate the PDF. Please try again."
        );
      }
    } finally {
      setIsExportingPdf(false);
    }
  }

  async function handleExportExcel() {
    if (!activeReport) {
      return;
    }

    setIsExportingExcel(true);
    try {
      await exportAuditReportAsExcel(activeReport);
    } catch (error) {
      console.warn("Failed to export Excel:", error);

      if (Platform.OS !== "web") {
        Alert.alert(
          "Export failed",
          "We couldn't generate the Excel report. Please try again."
        );
      }
    } finally {
      setIsExportingExcel(false);
    }
  }

  if (!user) {
    return null;
  }

  const adminHeaderControls = (
    <AdminReportControls
      showEmployeeReports={showEmployeeReports}
      showWarehouseReports={showWarehouseReports}
      onChangeShowEmployeeReports={(value) => {
        setShowEmployeeReports(value);
        if (value) {
          setShowWarehouseReports(false);
        }
        setSelectedAdminReport(null);
        setIsEmployeePickerOpen(false);
      }}
      onChangeShowWarehouseReports={(value) => {
        setShowWarehouseReports(value);
        if (value) {
          setShowEmployeeReports(false);
          setSelectedAdminEmployee(null);
        }
        setSelectedAdminReport(null);
        setIsEmployeePickerOpen(false);
      }}
      selectedEmployee={selectedAdminEmployee}
      employees={organizationEmployees}
      isLoadingEmployees={isLoadingEmployees}
      employeeLookupError={employeeLookupError}
      isEmployeePickerOpen={isEmployeePickerOpen}
      onToggleEmployeePicker={() => {
        setIsEmployeePickerOpen((current) => !current);

        if (!isLoadingEmployees && organizationEmployees.length === 0 && !employeeLookupError) {
          void loadOrganizationEmployees();
        }
      }}
      onSelectEmployee={(employee) => {
        setSelectedAdminEmployee(employee);
        setSelectedAdminReport(null);
        setIsEmployeePickerOpen(false);
      }}
      onRetryEmployeeLoad={() => {
        void loadOrganizationEmployees();
      }}
    />
  );

  if (user.role === "employee") {
    if (!activeReport) {
      return (
        <EmployeeReportsScreen
          onSelectReport={(report) => {
            setSelectedEmployeeReport(report);
            setLatestAuditReport(report);
          }}
          title="My Reports"
          subtitle="Review the audits you have already submitted"
          showOpenScanButton
        />
      );
    }

    return isMobile ? (
      <MobileReports
        report={activeReport}
        onExportExcel={handleExportExcel}
        onExportPdf={handleExportPdf}
        isExportingExcel={isExportingExcel}
        isExportingPdf={isExportingPdf}
        onBack={() => setSelectedEmployeeReport(null)}
        showDateFilters={false}
      />
    ) : (
      <DesktopReports
        report={activeReport}
        onExportExcel={handleExportExcel}
        onExportPdf={handleExportPdf}
        isExportingExcel={isExportingExcel}
        isExportingPdf={isExportingPdf}
        onBack={() => setSelectedEmployeeReport(null)}
        showDateFilters={false}
      />
    );
  }

  if (!activeReport) {
    if (showWarehouseReports) {
      return (
        <WarehouseReportsScreen
          warehouses={accessibleWarehouses}
          isMobile={isMobile}
          userId={user.employeeId}
          headerControls={adminHeaderControls}
          onRefreshWarehouseAccess={refreshWarehouseAccess}
          onSelectReport={(report) => {
            setSelectedAdminReport(report);
            setLatestAuditReport(report);
          }}
        />
      );
    }

    return (
      <EmployeeReportsScreen
        onSelectReport={(report) => {
          setSelectedAdminReport(report);
          setLatestAuditReport(report);
        }}
        subjectUserId={adminSubjectUserId}
        title={adminHeaderTitle}
        subtitle={adminHeaderSubtitle}
        accentColor={adminTheme.primary}
        showOpenScanButton={false}
        headerControls={adminHeaderControls}
        loadingMessage={
          showEmployeeReports
            ? "Loading employee reports..."
            : "Loading your reports..."
        }
        emptyMessage={
          showEmployeeReports
            ? "No submitted reports are available for the selected employee yet."
            : "No submitted reports are available for this admin yet."
        }
        missingSubjectMessage="Select an employee from the dropdown to review submitted reports."
        retryButtonColor={adminTheme.primary}
      />
    );
  }

  return isMobile ? (
    <MobileReports
      report={activeReport}
      onExportExcel={handleExportExcel}
      onExportPdf={handleExportPdf}
      isExportingExcel={isExportingExcel}
      isExportingPdf={isExportingPdf}
      onBack={() => setSelectedAdminReport(null)}
      showDateFilters={false}
    />
  ) : (
    <DesktopReports
      report={activeReport}
      onExportExcel={handleExportExcel}
      onExportPdf={handleExportPdf}
      isExportingExcel={isExportingExcel}
      isExportingPdf={isExportingPdf}
      onBack={() => setSelectedAdminReport(null)}
      showDateFilters={false}
    />
  );
}
