import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import {
  auditReportSummary,
  reportMismatches,
  ReportMismatchItem,
  ReportMismatchTone,
} from "../data/reportData";
import { adminTheme } from "@/theme/adminTheme";

function getMismatchStyles(tone: ReportMismatchTone) {
  switch (tone) {
    case "missing":
      return {
        iconBg: "#FCE8E8",
        icon: "#D64545",
        badgeBg: "#FFF0F0",
        badgeText: "#D64545",
      };
    default:
      return {
        iconBg: "#FFF1DB",
        icon: "#B97818",
        badgeBg: "#FFF6E7",
        badgeText: "#B97818",
      };
  }
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

  const matchPercent = Math.round((found / expected) * 100);

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

function SummaryCard({ mobile = false }: { mobile?: boolean }) {
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
        {mobile ? (
          <View className="rounded-full px-3 py-1" style={{ backgroundColor: adminTheme.successBg }}>
            <Text className="text-xs font-medium" style={{ color: adminTheme.successText }}>
              {auditReportSummary.status}
            </Text>
          </View>
        ) : null}
      </View>

      <View className={`${mobile ? "flex-row items-center" : "items-center"}`}>
        <View className={mobile ? "mr-5" : ""}>
          <DonutChart
            found={auditReportSummary.found}
            missing={auditReportSummary.missing}
            extra={auditReportSummary.extra}
            expected={auditReportSummary.expected}
            size={mobile ? 90 : 106}
          />
        </View>

        <View className={`${mobile ? "flex-1" : "mt-6 w-full"}`}>
          <SummaryLegendRow label="Found" value={auditReportSummary.found} color="#467A13" />
          <SummaryLegendRow label="Missing" value={auditReportSummary.missing} color="#E34D45" />
          <SummaryLegendRow label="Extra" value={auditReportSummary.extra} color="#C47E17" />
          <SummaryLegendRow label="Expected" value={auditReportSummary.expected} color="#D4D4D8" />
        </View>
      </View>
    </View>
  );
}

function MismatchBadge({ tone }: { tone: ReportMismatchTone }) {
  const styles = getMismatchStyles(tone);

  return (
    <View className="rounded-full px-3 py-1" style={{ backgroundColor: styles.badgeBg }}>
      <Text className="text-xs font-medium" style={{ color: styles.badgeText }}>
        {tone === "missing" ? "Missing" : "Extra"}
      </Text>
    </View>
  );
}

function MismatchListItem({
  item,
  mobile = false,
}: {
  item: ReportMismatchItem;
  mobile?: boolean;
}) {
  const styles = getMismatchStyles(item.tone);

  return (
    <View
      className={`flex-row rounded-[18px] border bg-white px-4 py-4 ${mobile ? "" : "items-center"}`}
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
          {!mobile ? <MismatchBadge tone={item.tone} /> : null}
        </View>
        <Text className="mt-1 text-sm leading-5" style={{ color: adminTheme.slateSoft }}>
          {item.subtitle}
        </Text>
      </View>

      {mobile ? (
        <View className="ml-3">
          <MismatchBadge tone={item.tone} />
        </View>
      ) : null}
    </View>
  );
}

function DesktopReports() {
  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="mb-5 flex-row items-start justify-between">
        <View>
          <Text className="text-[28px] font-semibold" style={{ color: adminTheme.slate }}>
            {auditReportSummary.title}
          </Text>
          <Text className="mt-1 text-base" style={{ color: adminTheme.slateSoft }}>
            {auditReportSummary.desktopMeta}{" "}
            <Text style={{ color: adminTheme.successText, fontWeight: "600" }}>
              {auditReportSummary.status}
            </Text>
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
          <SectionButton title="Export PDF" icon="download" filled />
        </View>
      </View>

      <View className="flex-row" style={{ gap: 18, alignItems: "flex-start" }}>
        <View style={{ width: 300 }}>
          <SummaryCard />
        </View>

        <View className="flex-1">
          <Text className="mb-3 text-[18px] font-semibold" style={{ color: adminTheme.slate }}>
            Mismatches ({reportMismatches.length})
          </Text>

          <View
            className="overflow-hidden rounded-[20px] border bg-white"
            style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
          >
            {reportMismatches.map((item, index) => (
              <View
                key={item.id}
                className={`${index < reportMismatches.length - 1 ? "border-b" : ""} px-4 py-3`}
                style={
                  index < reportMismatches.length - 1
                    ? { borderColor: adminTheme.border }
                    : undefined
                }
              >
                <MismatchListItem item={item} />
              </View>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function MobileReports() {
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
              {auditReportSummary.title}
            </Text>
            <Text className="mt-1 text-sm" style={{ color: adminTheme.slateSoft }}>
              {auditReportSummary.mobileMeta}
            </Text>
          </View>
        </View>
      </View>

      <View className="px-4 pt-4">
        <SummaryCard mobile />
      </View>

      <View className="px-4 pt-4">
        <Text className="mb-3 text-[18px] font-semibold" style={{ color: adminTheme.slate }}>
          Mismatches ({reportMismatches.length})
        </Text>

        {reportMismatches.slice(0, 3).map((item, index) => (
          <View key={item.id} className={index < 2 ? "mb-3" : ""}>
            <MismatchListItem item={item} mobile />
          </View>
        ))}
      </View>

      <View className="px-4 pt-4">
        <Pressable
          className="flex-row items-center justify-center rounded-[18px] border bg-white px-5 py-4"
          style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
        >
          <Feather name="download" size={18} color={adminTheme.slateSoft} />
          <Text className="ml-3 text-[18px] font-semibold" style={{ color: adminTheme.slate }}>
            Export Report (PDF)
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

export default function ReportsScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 1024;

  return isMobile ? <MobileReports /> : <DesktopReports />;
}
