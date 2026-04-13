import { AuditItemTone, AuditScanItem } from "@/features/audits/data/auditScanData";
import { useAuthSession } from "@/features/auth/hooks/useAuthSession";
import {
  LatestAuditReport,
  useLatestAuditReport,
} from "@/features/reports/state/latestAuditReportStore";
import { adminTheme } from "@/theme/adminTheme";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import {
  auditReportSummary,
  reportMismatches,
} from "../data/reportData";
import { exportAuditReportAsPdf } from "../utils/reportPdfGenerator";
import EmployeeReportsScreen from "./EmployeeReportsScreen";

type StatusFilter = "all" | AuditItemTone;

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
        <View className="ml-3 rounded-full px-3 py-1" style={{ backgroundColor: styles.badgeBg }}>
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

function DesktopReports({ 
  report, 
  onExportPdf, 
  isExporting 
}: { 
  report: LatestAuditReport; 
  onExportPdf: () => void; 
  isExporting: boolean;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const filteredItems = useMemo(
    () => filterAuditItems(report.items, searchTerm, statusFilter),
    [report.items, searchTerm, statusFilter]
  );

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
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.push("/audits");
              }
            }}
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
  isExporting 
}: { 
  report: LatestAuditReport; 
  onExportPdf: () => void; 
  isExporting: boolean;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const filteredItems = useMemo(
    () => filterAuditItems(report.items, searchTerm, statusFilter),
    [report.items, searchTerm, statusFilter]
  );

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="border-b px-4 pb-4 pt-3" style={{ borderColor: adminTheme.border }}>
        <View className="flex-row items-start">
          <Pressable
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.push("/audits");
              }
            }}
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
  const report = latestReport ?? getFallbackReport();
  const [isExporting, setIsExporting] = useState(false);
  const isMobile = width < 1024;

  async function handleExportPdf() {
    if (!user) {
      return;
    }

    setIsExporting(true);
    try {
      await exportAuditReportAsPdf(report, user.name);
    } catch (error) {
      console.warn("Failed to export PDF:", error);
    } finally {
      setIsExporting(false);
    }
  }

  if (!user) {
    return null;
  }

  if (user.role === "employee") {
    return <EmployeeReportsScreen />;
  }

  return isMobile ? (
    <MobileReports report={report} onExportPdf={handleExportPdf} isExporting={isExporting} />
  ) : (
    <DesktopReports report={report} onExportPdf={handleExportPdf} isExporting={isExporting} />
  );
}
