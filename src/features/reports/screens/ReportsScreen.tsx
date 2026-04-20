import { AuditItemTone, AuditScanItem } from "@/features/audits/data/auditScanData";
import { useAuthSession } from "@/features/auth/hooks/useAuthSession";
import {
  LatestAuditReport,
  setLatestAuditReport,
  useLatestAuditReport,
} from "@/features/reports/state/latestAuditReportStore";
import { apiService } from "@/network/ApiService";
import { adminTheme } from "@/theme/adminTheme";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
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
import {
  auditReportSummary,
  reportMismatches,
} from "../data/reportData";
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

  const scannedSet = new Set(data.map(item => item.ProductId));
  const scannedMap = new Map<number, { shortTag: string; refId: string; code?: string }>();


  data.forEach(item => {
    if (!scannedMap.has(item.ProductId)) {
      scannedMap.set(item.ProductId, { shortTag: item.TagId, refId: item.ReferenceId, code: item.ProductCode });
    }
  });

  const warehouseItems = data[0].WarehouseAuditData[0].WarehouseData;
  const items: AuditScanItem[] = [];
  const summary: AuditSummary = { found: 0, missing: 0, extra: 0, scanned: scannedSet.size };

  // Found: warehouse + scanned
  warehouseItems.forEach(whItem => {
    const isScanned = scannedSet.has(whItem.ProductId);
    if (isScanned) {
      const scanInfo = scannedMap.get(whItem.ProductId)!;
      items.push({
        id: whItem.TagId, // full RFID
        title: whItem.ProductName,
        subtitle: `Short Tag ${scanInfo.shortTag} • ${scanInfo.refId}`,
        tone: "found" as const,
        icon: "plus-circle"
      });
      summary.found++;
    } else {
      // Missing
      items.push({
        id: whItem.TagId,
        title: whItem.ProductName,
        subtitle: `Expected but not scanned`,
        tone: "missing" as const,
        icon: "briefcase"
      });
      summary.missing++;
    }
  });

  // Extra: scanned not in warehouse
  scannedSet.forEach(pid => {
    if (!warehouseItems.some(w => w.ProductId === pid)) {
      const scanInfo = scannedMap.get(pid)!;
      items.push({
        id: scanInfo.shortTag,
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

function getFallbackReport(): LatestAuditReport {
  const items: AuditScanItem[] = reportMismatches.map((item) => ({
    id: item.id,
    title: item.title,
    subtitle: item.subtitle,
    tone: item.tone,
    icon: item.tone === "missing" ? "briefcase" : "plus-circle",
  }));

  return {
    title: auditReportSummary.title,
    location: auditReportSummary.location,
    mobileMeta: auditReportSummary.mobileMeta,
    desktopMeta: auditReportSummary.desktopMeta,
    status: auditReportSummary.status,
    referenceId: null,
    observedAt: null,
    summary: {
      found: auditReportSummary.found,
      missing: auditReportSummary.missing,
      extra: auditReportSummary.extra,
      scanned: auditReportSummary.found + auditReportSummary.extra,
      expected: auditReportSummary.expected,
    },
    items,
  };
}

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

      {report.referenceId ? (
        <Text className="mb-4 text-sm" style={{ color: adminTheme.slateSoft }}>
          Reference: {report.referenceId}
        </Text>
      ) : null}

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

type ReportDetailProps = {
  report: LatestAuditReport;
  onExportPdf: () => void;
  isExporting: boolean;
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
  onExportPdf,
  isExporting,
  onBack,
  showDateFilters = true,
}: ReportDetailProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const filteredItems = useMemo(
    () => filterAuditItems(report.items, searchTerm, statusFilter),
    [report.items, searchTerm, statusFilter]
  );
  const [startDate, setStartDate] = useState<Date | null>(null);
const [endDate, setEndDate] = useState<Date | null>(null);
const [openStart, setOpenStart] = useState(false);
const [openEnd, setOpenEnd] = useState(false);
const [loadingReport, setLoadingReport] = useState(false);
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
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="mb-5 flex-row items-start justify-between">
        <View>
          <Text className="text-[28px] font-semibold" style={{ color: adminTheme.slate }}>
            {report.title}
          </Text>
          <Text className="mt-1 text-base" style={{ color: adminTheme.slateSoft }}>
            {report.desktopMeta}
          </Text>
        </View>

        <View className="flex-row gap-3">
          <SectionButton
            title="Back"
            icon="arrow-left"
            onPress={onBack ?? handleDefaultBackNavigation}
          />
          <SectionButton 
            title={isExporting ? "Exporting..." : "Export PDF"}
            icon="download" 
            filled 
            onPress={onExportPdf}
          />
        </View>
      </View>

      <View className="flex-row" style={{ gap: 18, alignItems: "flex-start" }}>
        <View style={{ width: 300 }}>
          <SummaryCard report={report} />
        </View>

        <View className="flex-1">
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

          {filteredItems.length > 0 ? (
            <View
              className="overflow-hidden rounded-[20px] border bg-white"
              style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
            >
              {filteredItems.map((item, index) => (
                <View
                  key={`${item.id}-${index}`}
                  className={`${index < filteredItems.length - 1 ? "border-b" : ""} px-4 py-3`}
                  style={
                    index < filteredItems.length - 1
                      ? { borderColor: adminTheme.border }
                      : undefined
                  }
                >
                  <ReportResultItem item={item} />
                </View>
              ))}
            </View>
          ) : (
            <EmptyResults />
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function MobileReports({
  report,
  onExportPdf,
  isExporting,
  onBack,
  showDateFilters = true,
}: ReportDetailProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const filteredItems = useMemo(
    () => filterAuditItems(report.items, searchTerm, statusFilter),
    [report.items, searchTerm, statusFilter]
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
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 20 }}
      showsVerticalScrollIndicator={false}
    >
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

      <View className="px-4 pt-4">
        <SummaryCard report={report} mobile />
      </View>

      <View className="px-4 pt-4">
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

        {filteredItems.length > 0 ? (
          filteredItems.map((item, index) => (
            <View key={`${item.id}-${index}`} className={index < filteredItems.length - 1 ? "mb-3" : ""}>
              <ReportResultItem item={item} mobile />
            </View>
          ))
        ) : (
          <EmptyResults />
        )}
      </View>

      <View className="px-4 pt-4">
        <Pressable
          onPress={onExportPdf}
          className="flex-row items-center justify-center rounded-[18px] border bg-white px-5 py-4"
          style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
        >
          <Feather name="download" size={18} color={adminTheme.slateSoft} />
          <Text className="ml-3 text-[18px] font-semibold" style={{ color: adminTheme.slate }}>
            {isExporting ? "Exporting..." : "Export Report (PDF)"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

export default function ReportsScreen() {
  const { user } = useAuthSession();
  const { width } = useWindowDimensions();
  const latestReport = useLatestAuditReport();
  const adminReport = latestReport ?? getFallbackReport();
  const [isExporting, setIsExporting] = useState(false);
  const [selectedEmployeeReport, setSelectedEmployeeReport] =
    useState<LatestAuditReport | null>(null);
  const isMobile = width < 1024;
  const activeReport =
    user?.role === "employee" ? selectedEmployeeReport : adminReport;

  async function handleExportPdf() {
    if (!user || !activeReport) {
      return;
    }

    setIsExporting(true);
    try {
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
      setIsExporting(false);
    }
  }

  if (!user) {
    return null;
  }

  if (user.role === "employee") {
    if (!activeReport) {
      return (
        <EmployeeReportsScreen
          onSelectReport={(report) => {
            setSelectedEmployeeReport(report);
            setLatestAuditReport(report);
          }}
        />
      );
    }

    return isMobile ? (
      <MobileReports
        report={activeReport}
        onExportPdf={handleExportPdf}
        isExporting={isExporting}
        onBack={() => setSelectedEmployeeReport(null)}
        showDateFilters={false}
      />
    ) : (
      <DesktopReports
        report={activeReport}
        onExportPdf={handleExportPdf}
        isExporting={isExporting}
        onBack={() => setSelectedEmployeeReport(null)}
        showDateFilters={false}
      />
    );
  }

  return isMobile ? (
    <MobileReports report={adminReport} onExportPdf={handleExportPdf} isExporting={isExporting} />
  ) : (
    <DesktopReports report={adminReport} onExportPdf={handleExportPdf} isExporting={isExporting} />
  );
}
