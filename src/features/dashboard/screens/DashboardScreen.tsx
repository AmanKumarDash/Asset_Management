import { useMemo, useState } from "react";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import {
  DimensionValue,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { USER_ROLES } from "@/constants/auth";
import { useAuthSession } from "@/features/auth/hooks/useAuthSession";
import {
  DashboardAssetStatusSummary,
  DashboardPeriod,
  DashboardWarehouseDistributionItem,
  formatDashboardDate,
  useAdminDashboardData,
} from "@/features/dashboard/hooks/useDashboardData";
import {
  DashboardError,
  EmptyBlock,
  LoadingState,
  PeriodSwitch,
  ProfileShortcut,
  SectionCard,
} from "@/features/dashboard/components/DashboardVisuals";
import EmployeeDashboardScreen from "./EmployeeDashboardScreen";
import { adminTheme } from "@/theme/adminTheme";

const ASSET_STATUS_COLORS = {
  found: "#22C55E",
  missing: "#EF4444",
  extra: "#F59E0B",
} as const;

function AuditList({
  audits,
}: {
  audits: {
    id: string;
    title: string;
    location: string;
    completedAt: string | null;
    scannedCount: number;
    referenceId: string;
    employeeName?: string;
  }[];
}) {
  if (audits.length === 0) {
    return <EmptyBlock message="No submitted audits were found for this period yet." />;
  }

  return (
    <View>
      {audits.map((audit, index) => (
        <View
          key={audit.id}
          className={`rounded-[18px] border px-4 py-4 ${
            index < audits.length - 1 ? "mb-3" : ""
          }`}
          style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surfaceAlt }}
        >
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text className="text-base font-semibold" style={{ color: adminTheme.slate }}>
                {audit.title}
              </Text>
              <Text className="mt-1 text-sm" style={{ color: adminTheme.slateSoft }}>
                {audit.location}
                {audit.employeeName ? ` - ${audit.employeeName}` : ""}
              </Text>
            </View>
            <View
              className="rounded-full px-3 py-1"
              style={{ backgroundColor: adminTheme.infoBg }}
            >
              <Text className="text-xs font-medium" style={{ color: adminTheme.primary }}>
                Submitted
              </Text>
            </View>
          </View>

          <View className="mt-4 flex-row flex-wrap items-center" style={{ gap: 10 }}>
            <Text className="text-sm" style={{ color: adminTheme.slate }}>
              {audit.scannedCount} assets scanned
            </Text>
            <Text className="text-sm" style={{ color: adminTheme.muted }}>
              {formatDashboardDate(audit.completedAt)}
            </Text>
          </View>

          <Text className="mt-2 text-xs" style={{ color: adminTheme.muted }}>
            Reference: {audit.referenceId}
          </Text>
        </View>
      ))}
    </View>
  );
}

function TeamActivityList({
  activity,
}: {
  activity: {
    id: string;
    name: string;
    reportCount: number;
    scannedAssets: number;
    lastSubmittedAt: string | null;
  }[];
}) {
  if (activity.length === 0) {
    return <EmptyBlock message="Employee activity will appear here once reports start coming in." />;
  }

  return (
    <View>
      {activity.map((item, index) => (
        <View
          key={item.id}
          className={`rounded-[18px] border px-4 py-4 ${
            index < activity.length - 1 ? "mb-3" : ""
          }`}
          style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surfaceAlt }}
        >
          <View className="flex-row items-center justify-between gap-3">
            <Text className="flex-1 text-base font-semibold" style={{ color: adminTheme.slate }}>
              {item.name}
            </Text>
            <Text className="text-sm font-medium" style={{ color: adminTheme.primary }}>
              {item.reportCount} audits
            </Text>
          </View>

          <View className="mt-3 flex-row flex-wrap items-center" style={{ gap: 10 }}>
            <Text className="text-sm" style={{ color: adminTheme.slateSoft }}>
              {item.scannedAssets} assets scanned
            </Text>
            <Text className="text-sm" style={{ color: adminTheme.muted }}>
              {formatDashboardDate(item.lastSubmittedAt)}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

type HeaderMetricCardProps = {
  label: string;
  value: string;
  icon: keyof typeof Feather.glyphMap;
  accentColor: string;
  backgroundColor: string;
  borderColor: string;
  onPress: () => void;
  width: DimensionValue;
};

function HeaderMetricCard({
  label,
  value,
  icon,
  accentColor,
  backgroundColor,
  borderColor,
  onPress,
  width,
}: HeaderMetricCardProps) {
  return (
    <Pressable
      onPress={onPress}
      className="min-h-[142px] rounded-[10px] border px-3 py-4"
      style={{
        width,
        borderColor,
        backgroundColor,
        shadowColor: accentColor,
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 1,
      }}
    >
      <View className="flex-row items-start justify-between" style={{ gap: 8 }}>
        <View
          className="h-10 w-10 items-center justify-center rounded-[8px]"
          style={{ backgroundColor: accentColor }}
        >
          <Feather name={icon} size={22} color="#ffffff" />
        </View>
        <Text
          className="flex-1 text-right text-xs font-semibold leading-4"
          style={{ color: adminTheme.slate }}
          numberOfLines={2}
        >
          {label}
        </Text>
      </View>

      <View className="mt-2 flex-row items-end justify-between">
        <Text className="text-[30px] font-semibold" style={{ color: adminTheme.slate }}>
          {value}
        </Text>
        <Feather name="chevron-down" size={18} color={adminTheme.slateSoft} />
      </View>

      <View
        className="mt-auto border-t pt-3"
        style={{ borderColor }}
      >
        <View className="flex-row items-center">
          <Text className="text-xs font-semibold" style={{ color: accentColor }}>
            View Details
          </Text>
          <Feather name="chevron-right" size={15} color={accentColor} />
        </View>
      </View>
    </Pressable>
  );
}

function formatCompactCount(value: number) {
  if (value >= 1000) {
    const compactValue = value / 1000;
    return `${Number.isInteger(compactValue) ? compactValue.toFixed(0) : compactValue.toFixed(1)}K`;
  }

  return String(value);
}

function getChartMaxValue(items: DashboardWarehouseDistributionItem[]) {
  const maxValue = Math.max(...items.map((item) => item.assetCount), 0);

  if (maxValue <= 0) {
    return 1;
  }

  if (maxValue <= 100) {
    return Math.ceil(maxValue / 25) * 25;
  }

  if (maxValue <= 1000) {
    return Math.ceil(maxValue / 100) * 100;
  }

  return Math.ceil(maxValue / 500) * 500;
}

function WarehouseDistributionChart({
  items,
  isCompact,
}: {
  items: DashboardWarehouseDistributionItem[];
  isCompact: boolean;
}) {
  const visibleItems = items.slice(0, 5);

  if (visibleItems.length === 0) {
    return (
      <SectionCard title="Assets by Warehouse" subtitle="Warehouse asset distribution">
        <EmptyBlock message="Warehouse asset distribution will appear after warehouses are loaded." />
      </SectionCard>
    );
  }

  const chartMaxValue = getChartMaxValue(visibleItems);
  const axisValues = [chartMaxValue, chartMaxValue * 0.75, chartMaxValue * 0.5, chartMaxValue * 0.25, 0];
  const chartHeight = 180;
  const minimumChartWidth = isCompact ? Math.max(visibleItems.length * 92, 460) : 520;

  return (
    <View
      className="rounded-[8px] border p-5"
      style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
    >
      <View className="flex-row items-start justify-between">
        <Text className="text-base font-semibold" style={{ color: adminTheme.slate }}>
          Assets by Warehouse
        </Text>
        <Feather name="more-vertical" size={22} color={adminTheme.muted} />
      </View>

      <ScrollView horizontal={isCompact} showsHorizontalScrollIndicator={false}>
        <View
          className="mt-4 flex-row"
          style={{ width: isCompact ? minimumChartWidth : "100%", minWidth: minimumChartWidth }}
        >
          <View className="pr-3" style={{ height: chartHeight + 40, width: 42 }}>
            {axisValues.map((value, index) => (
              <Text
                key={`${value}-${index}`}
                className="absolute right-2 text-xs"
                style={{
                  top: (index / (axisValues.length - 1)) * chartHeight - 7,
                  color: adminTheme.muted,
                }}
              >
                {formatCompactCount(Math.round(value))}
              </Text>
            ))}
          </View>

          <View className="flex-1">
            <View style={{ height: chartHeight }}>
              {axisValues.map((value, index) => (
                <View
                  key={`${value}-${index}-grid`}
                  className="absolute left-0 right-0 border-t"
                  style={{
                    top: (index / (axisValues.length - 1)) * chartHeight,
                    borderColor: index === axisValues.length - 1 ? "#CBD5E1" : "#E5E7EB",
                  }}
                />
              ))}

              <View className="absolute bottom-0 left-0 right-0 flex-row items-end justify-around">
                {visibleItems.map((item) => {
                  const barHeight = Math.max((item.assetCount / chartMaxValue) * (chartHeight - 8), 8);

                  return (
                    <View key={item.id} className="items-center" style={{ width: 72 }}>
                      <Text className="mb-2 text-xs font-semibold" style={{ color: "#1E40AF" }}>
                        {item.assetCount.toLocaleString()}
                      </Text>
                      <View
                        className="rounded-t-[3px]"
                        style={{
                          width: 34,
                          height: barHeight,
                          backgroundColor: "#3B63E6",
                          shadowColor: "#1E40AF",
                          shadowOpacity: 0.18,
                          shadowRadius: 6,
                          shadowOffset: { width: 0, height: 3 },
                          elevation: 2,
                        }}
                      />
                    </View>
                  );
                })}
              </View>
            </View>

            <View className="mt-2 flex-row justify-around">
              {visibleItems.map((item) => (
                <View key={`${item.id}-label`} className="items-center" style={{ width: 72 }}>
                  <Text
                    className="text-center text-[11px] font-medium"
                    style={{ color: adminTheme.muted }}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  <Text
                    className="mt-1 text-center text-[10px]"
                    style={{ color: adminTheme.slateSoft }}
                    numberOfLines={1}
                  >
                    {item.auditCount} audits
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function getAssetStatusTotal(status: DashboardAssetStatusSummary) {
  return status.found + status.missing + status.extra;
}

function getAssetStatusPercent(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

function getAssetStatusLabel(value: number, total: number) {
  if (total <= 0) {
    return "0%";
  }

  return `${((value / total) * 100).toFixed(1)}%`;
}

function AssetStatusDonut({
  status,
  size,
}: {
  status: DashboardAssetStatusSummary;
  size: number;
}) {
  const total = getAssetStatusTotal(status);
  const foundPercent = total > 0 ? (status.found / total) * 100 : 100;
  const missingPercent = total > 0 ? (status.missing / total) * 100 : 0;
  const extraPercent = total > 0 ? (status.extra / total) * 100 : 0;
  const missingStart = foundPercent;
  const extraStart = foundPercent + missingPercent;
  const chartBackground =
    total > 0
      ? `conic-gradient(${ASSET_STATUS_COLORS.found} 0% ${foundPercent}%, ${ASSET_STATUS_COLORS.missing} ${missingStart}% ${extraStart}%, ${ASSET_STATUS_COLORS.extra} ${extraStart}% ${
          extraStart + extraPercent
        }%, ${ASSET_STATUS_COLORS.found} ${extraStart + extraPercent}% 100%)`
      : `conic-gradient(${adminTheme.mutedBg} 0% 100%)`;

  return (
    <View
      className="items-center justify-center rounded-full"
      style={
        {
          width: size,
          height: size,
          backgroundColor: total > 0 ? ASSET_STATUS_COLORS.found : adminTheme.mutedBg,
          backgroundImage: chartBackground,
        } as object
      }
    >
      <View
        className="items-center justify-center rounded-full"
        style={{
          width: size * 0.48,
          height: size * 0.48,
          backgroundColor: adminTheme.surface,
        }}
      >
        <Text className="text-base font-bold" style={{ color: adminTheme.slate }}>
          {getAssetStatusPercent(status.found, total)}%
        </Text>
      </View>
    </View>
  );
}

function AssetStatusLegendRow({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  return (
    <View className="flex-row items-center">
      <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      <View className="ml-3">
        <Text className="text-sm font-semibold" style={{ color: adminTheme.slate }}>
          {label}
        </Text>
        <Text className="mt-0.5 text-xs" style={{ color: adminTheme.slateSoft }}>
          {value.toLocaleString()} ({getAssetStatusLabel(value, total)})
        </Text>
      </View>
    </View>
  );
}

function AssetStatusAnalyticsCard({
  label,
  helper,
  value,
  total,
  color,
  icon,
}: {
  label: string;
  helper: string;
  value: number;
  total: number;
  color: string;
  icon: keyof typeof Feather.glyphMap;
}) {
  return (
    <View
      className="flex-row items-center rounded-[8px] border px-3 py-3"
      style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surfaceAlt }}
    >
      <View
        className="h-9 w-9 items-center justify-center rounded-full"
        style={{ backgroundColor: color }}
      >
        <Feather name={icon} size={18} color="#ffffff" />
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-sm font-semibold" style={{ color: adminTheme.slate }}>
          {label}
        </Text>
        <Text className="mt-0.5 text-xs" style={{ color: adminTheme.slateSoft }}>
          {helper}
        </Text>
      </View>
      <View className="items-end">
        <Text className="text-sm font-bold" style={{ color }}>
          {getAssetStatusPercent(value, total)}%
        </Text>
        <Text className="text-xs font-semibold" style={{ color: adminTheme.slateSoft }}>
          ({value.toLocaleString()})
        </Text>
      </View>
    </View>
  );
}

function WarehouseStatusDropdown({
  warehouses,
  selectedWarehouseId,
  isOpen,
  onToggle,
  onSelect,
}: {
  warehouses: DashboardWarehouseDistributionItem[];
  selectedWarehouseId: string | null;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (warehouseId: string | null) => void;
}) {
  const selectedWarehouse = warehouses.find((warehouse) => warehouse.id === selectedWarehouseId);

  return (
    <View style={{ zIndex: 5 }}>
      <Pressable
        onPress={onToggle}
        className="h-11 flex-row items-center justify-between rounded-[8px] border px-3"
        style={{ borderColor: "#93C5FD", backgroundColor: adminTheme.surface, minWidth: 220 }}
      >
        <Text
          className="flex-1 text-sm font-semibold"
          style={{ color: adminTheme.slate }}
          numberOfLines={1}
        >
          {selectedWarehouse?.name ?? "All Warehouses"}
        </Text>
        <Feather
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={18}
          color={adminTheme.primary}
        />
      </Pressable>

      {isOpen ? (
        <View
          className="mt-2 overflow-hidden rounded-[8px] border"
          style={{
            borderColor: adminTheme.border,
            backgroundColor: adminTheme.surface,
            elevation: 6,
            shadowColor: "#0F172A",
            shadowOpacity: 0.12,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
          }}
        >
          <Pressable
            onPress={() => onSelect(null)}
            className="border-b px-3 py-3"
            style={{
              borderColor: adminTheme.border,
              backgroundColor: selectedWarehouseId === null ? adminTheme.infoBg : adminTheme.surface,
            }}
          >
            <Text className="text-sm font-semibold" style={{ color: adminTheme.slate }}>
              All Warehouses
            </Text>
          </Pressable>
          {warehouses.map((warehouse) => (
            <Pressable
              key={warehouse.id}
              onPress={() => onSelect(warehouse.id)}
              className="border-b px-3 py-3"
              style={{
                borderColor: adminTheme.border,
                backgroundColor:
                  selectedWarehouseId === warehouse.id ? adminTheme.infoBg : adminTheme.surface,
              }}
            >
              <Text className="text-sm font-semibold" style={{ color: adminTheme.slate }} numberOfLines={1}>
                {warehouse.name}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function AssetStatusPanel({
  status,
  warehouses,
  selectedWarehouseId,
  isDropdownOpen,
  onToggleDropdown,
  onSelectWarehouse,
  isDesktop,
}: {
  status: DashboardAssetStatusSummary;
  warehouses: DashboardWarehouseDistributionItem[];
  selectedWarehouseId: string | null;
  isDropdownOpen: boolean;
  onToggleDropdown: () => void;
  onSelectWarehouse: (warehouseId: string | null) => void;
  isDesktop: boolean;
}) {
  const total = getAssetStatusTotal(status);
  const selectedWarehouse = warehouses.find((warehouse) => warehouse.id === selectedWarehouseId);
  const chartSize = isDesktop ? 210 : 190;

  return (
    <View
      className="rounded-[8px] border p-5"
      style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
    >
      <View
        className="items-start justify-between"
        style={{ flexDirection: isDesktop ? "row" : "column", gap: 12 }}
      >
        <View>
          <View className="flex-row items-center">
            <Text className="text-base font-semibold" style={{ color: adminTheme.slate }}>
              Asset Status
            </Text>
            <Feather name="info" size={14} color={adminTheme.muted} style={{ marginLeft: 6 }} />
          </View>
          <Text className="mt-1 text-xs" style={{ color: adminTheme.slateSoft }}>
            {selectedWarehouse
              ? `Data shown for ${selectedWarehouse.name}.`
              : "Overall status across all warehouses."}
          </Text>
        </View>

        <WarehouseStatusDropdown
          warehouses={warehouses}
          selectedWarehouseId={selectedWarehouseId}
          isOpen={isDropdownOpen}
          onToggle={onToggleDropdown}
          onSelect={onSelectWarehouse}
        />
      </View>

      <View
        className="mt-5"
        style={{
          flexDirection: isDesktop ? "row" : "column",
          gap: 24,
          alignItems: isDesktop ? "center" : "stretch",
        }}
      >
        <View className="items-center" style={{ flex: isDesktop ? 1 : undefined }}>
          <AssetStatusDonut status={status} size={chartSize} />
          <View className="mt-4 flex-row flex-wrap justify-center" style={{ gap: 14 }}>
            <AssetStatusLegendRow
              label="Found"
              value={status.found}
              total={total}
              color={ASSET_STATUS_COLORS.found}
            />
            <AssetStatusLegendRow
              label="Missing"
              value={status.missing}
              total={total}
              color={ASSET_STATUS_COLORS.missing}
            />
            <AssetStatusLegendRow
              label="Extra"
              value={status.extra}
              total={total}
              color={ASSET_STATUS_COLORS.extra}
            />
          </View>
        </View>

        <View style={{ flex: isDesktop ? 1 : undefined, gap: 10 }}>
          <AssetStatusAnalyticsCard
            label="Found"
            helper="Assets found and matched"
            value={status.found}
            total={total}
            color={ASSET_STATUS_COLORS.found}
            icon="check"
          />
          <AssetStatusAnalyticsCard
            label="Missing"
            helper="Assets not found"
            value={status.missing}
            total={total}
            color={ASSET_STATUS_COLORS.missing}
            icon="x"
          />
          <AssetStatusAnalyticsCard
            label="Extra"
            helper="Unexpected assets found"
            value={status.extra}
            total={total}
            color={ASSET_STATUS_COLORS.extra}
            icon="plus"
          />
          <View
            className="rounded-[8px] border px-4 py-3"
            style={{ borderColor: adminTheme.border, backgroundColor: "#F8FAFC" }}
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold" style={{ color: adminTheme.slate }}>
                Total Assets Scanned
              </Text>
              <View className="items-end">
                <Text className="text-base font-bold" style={{ color: adminTheme.slate }}>
                  {total.toLocaleString()}
                </Text>
                <Text className="text-xs font-semibold" style={{ color: adminTheme.slateSoft }}>
                  (100%)
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const { user, organization } = useAuthSession();
  const { width } = useWindowDimensions();
  const [period, setPeriod] = useState<DashboardPeriod>("weekly");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);
  const [isWarehouseStatusDropdownOpen, setIsWarehouseStatusDropdownOpen] = useState(false);
  const { data, isLoading, errorMessage, periodLabel, reload } = useAdminDashboardData(period);
  const isDesktop = width >= 1024;
  const isCompactMobile = width < 640;
  const metricCardWidth: DimensionValue = isDesktop
    ? `${100 / 7 - 1.2}%`
    : isCompactMobile
      ? "48%"
      : "31.5%";
  const selectedAssetStatus = useMemo(() => {
    if (!selectedWarehouseId) {
      return data.assetStatus;
    }

    return (
      data.warehouseDistribution.find((warehouse) => warehouse.id === selectedWarehouseId)?.status ??
      data.assetStatus
    );
  }, [data.assetStatus, data.warehouseDistribution, selectedWarehouseId]);

  if (!user) {
    return null;
  }

  if (user.role === USER_ROLES.EMPLOYEE) {
    return <EmployeeDashboardScreen />;
  }

  const headerMetrics = [
    {
      label: "Total Employees",
      value: String(data.employeeCount),
      icon: "users" as const,
      accentColor: "#2563EB",
      backgroundColor: "#EEF4FF",
      borderColor: "#D6E4FF",
      onPress: () => router.push("/employees"),
    },
    {
      label: "Total Warehouses",
      value: String(data.warehouseCount),
      icon: "home" as const,
      accentColor: "#16A05D",
      backgroundColor: "#EEF9F1",
      borderColor: "#D8F0DC",
      onPress: () => router.push("/audits"),
    },
    {
      label: "Total Assets",
      value: String(data.totalAssetCount),
      icon: "package" as const,
      accentColor: "#F97316",
      backgroundColor: "#FFF5EB",
      borderColor: "#FEDFC1",
      onPress: () => router.push("/audits"),
    },
    {
      label: "Audits Completed",
      value: String(data.submittedAuditCount),
      icon: "check-square" as const,
      accentColor: "#8B5CF6",
      backgroundColor: "#F5F0FF",
      borderColor: "#E3D6FF",
      onPress: () => router.push("/reports"),
    },
    {
      label: "Missing Assets",
      value: String(data.missingAssetCount),
      icon: "x" as const,
      accentColor: "#EF4444",
      backgroundColor: "#FFF1F1",
      borderColor: "#FFD4D4",
      onPress: () => router.push("/reports"),
    },
    {
      label: "Extra Assets",
      value: String(data.extraAssetCount),
      icon: "plus" as const,
      accentColor: "#2563EB",
      backgroundColor: "#FFF8E1",
      borderColor: "#FBE6A2",
      onPress: () => router.push("/reports"),
    },
    {
      label: "Pending Audits",
      value: String(data.pendingAuditCount),
      icon: "clock" as const,
      accentColor: "#F97316",
      backgroundColor: "#FFF6EA",
      borderColor: "#FED9B4",
      onPress: () => router.push("/reports"),
    },
  ];

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{
        paddingHorizontal: isDesktop ? 20 : 16,
        paddingVertical: 20,
        paddingBottom: isDesktop ? 24 : 90,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View
        className="rounded-[16px] border px-4 py-4"
        style={{ borderColor: "#E2E8F0", backgroundColor: "#FFFFFF" }}
      >
        <View
          className="items-center"
          style={{
            flexDirection: isDesktop ? "row" : "column",
            gap: 12,
            justifyContent: "space-between",
          }}
        >
          <View style={{ flex: 1, width: isDesktop ? undefined : "100%" }}>
            <Text className="text-[22px] font-semibold" style={{ color: adminTheme.slate }}>
              {organization?.Name?.trim() || "Dashboard"}
            </Text>
            <Text className="mt-1 text-sm" style={{ color: adminTheme.slateSoft }}>
              {periodLabel} audit status
            </Text>
          </View>

          <PeriodSwitch value={period} onChange={setPeriod} accentColor={adminTheme.primary} />

          <ProfileShortcut
            initials={user.initials}
            avatarBg={user.avatarBg}
            avatarText={user.avatarText}
            onPress={() => router.push("/profile")}
          />
        </View>
      </View>

      {isLoading ? <LoadingState label={periodLabel} accentColor={adminTheme.primary} /> : null}
      {!isLoading && errorMessage ? (
        <View className="mt-5">
          <DashboardError
            message={errorMessage}
            onRetry={reload}
            accentColor={adminTheme.primary}
            borderColor="#D9E5FF"
            backgroundColor="#F6FAFF"
          />
        </View>
      ) : null}

      {!isLoading && !errorMessage ? (
        <>
          <View className="mt-4 flex-row flex-wrap" style={{ gap: 12 }}>
            {headerMetrics.map((metric) => (
              <HeaderMetricCard key={metric.label} {...metric} width={metricCardWidth} />
            ))}
          </View>

          <View className="mt-5">
            <AssetStatusPanel
              status={selectedAssetStatus}
              warehouses={data.warehouseDistribution}
              selectedWarehouseId={selectedWarehouseId}
              isDropdownOpen={isWarehouseStatusDropdownOpen}
              onToggleDropdown={() => setIsWarehouseStatusDropdownOpen((current) => !current)}
              onSelectWarehouse={(warehouseId) => {
                setSelectedWarehouseId(warehouseId);
                setIsWarehouseStatusDropdownOpen(false);
              }}
              isDesktop={isDesktop}
            />
          </View>

          <View className="mt-5">
            <WarehouseDistributionChart
              items={data.warehouseDistribution}
              isCompact={!isDesktop}
            />
          </View>

          <View
            className="mt-5"
            style={{
              flexDirection: isDesktop ? "row" : "column",
              gap: 16,
            }}
          >
            <View style={{ flex: 1 }}>
              <SectionCard
                title="Recent Audits"
                subtitle={`${data.scannedAssetCount} assets scanned across ${data.locationCount} audited warehouses.`}
              >
                <AuditList audits={data.recentAudits} />
              </SectionCard>
            </View>

            <View style={{ flex: 1 }}>
              <SectionCard
                title="Team Activity"
                subtitle={`${data.activeAuditorCount} active employees, ${data.pendingAuditCount} pending for ${periodLabel.toLowerCase()}.`}
              >
                <TeamActivityList activity={data.teamActivity} />
              </SectionCard>
            </View>
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}
