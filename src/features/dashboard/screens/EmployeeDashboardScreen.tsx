import { useMemo, useState } from "react";
import { router } from "expo-router";
import { ScrollView, Text, View, useWindowDimensions } from "react-native";
import {
  DashboardPeriod,
  formatDashboardDate,
  useEmployeeDashboardData,
} from "@/features/dashboard/hooks/useDashboardData";
import { useAuthSession } from "@/features/auth/hooks/useAuthSession";
import {
  ActionButton,
  ColumnChart,
  DashboardError,
  DashboardStatsGrid,
  EmptyBlock,
  HorizontalBarChart,
  LoadingState,
  PeriodSwitch,
  ProgressInsightCard,
  SectionCard,
} from "@/features/dashboard/components/DashboardVisuals";
import { adminTheme } from "@/theme/adminTheme";

function WarehouseList({
  warehouses,
}: {
  warehouses: { id: string; name: string; subtitle: string | null }[];
}) {
  if (warehouses.length === 0) {
    return (
      <EmptyBlock message="No warehouse access is assigned yet. Once locations are mapped to your account, they will appear here." />
    );
  }

  return (
    <View>
      {warehouses.map((warehouse, index) => (
        <View
          key={warehouse.id}
          className={`rounded-[18px] border px-4 py-4 ${
            index < warehouses.length - 1 ? "mb-3" : ""
          }`}
          style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surfaceAlt }}
        >
          <Text className="text-base font-semibold" style={{ color: adminTheme.slate }}>
            {warehouse.name}
          </Text>
          <Text className="mt-1 text-sm leading-5" style={{ color: adminTheme.slateSoft }}>
            {warehouse.subtitle || "Assigned audit location"}
          </Text>
        </View>
      ))}
    </View>
  );
}

function RecentAuditList({
  audits,
}: {
  audits: {
    id: string;
    title: string;
    location: string;
    completedAt: string | null;
    scannedCount: number;
    referenceId: string;
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
              </Text>
            </View>
            <View
              className="rounded-full px-3 py-1"
              style={{ backgroundColor: adminTheme.employeePrimarySoft }}
            >
              <Text className="text-xs font-medium" style={{ color: adminTheme.employeePrimary }}>
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

export default function EmployeeDashboardScreen() {
  const { user } = useAuthSession();
  const { width } = useWindowDimensions();
  const [period, setPeriod] = useState<DashboardPeriod>("weekly");
  const { data, isLoading, errorMessage, periodLabel, reload } = useEmployeeDashboardData(period);
  const isDesktop = width >= 1024;
  const isCompactMobile = width < 640;
  const recentAuditBars = useMemo(
    () =>
      data.recentAudits.slice(0, 5).map((item) => ({
        label: item.location,
        value: item.scannedCount,
        helper: formatDashboardDate(item.completedAt),
      })),
    [data.recentAudits]
  );
  const recentAuditColumns = useMemo(
    () =>
      data.recentAudits.slice(0, 4).map((item, index) => ({
        label: `Audit ${index + 1}`,
        value: item.scannedCount,
        caption: item.location,
      })),
    [data.recentAudits]
  );

  if (!user) {
    return null;
  }

  const stats = [
    {
      label: "Assigned locations",
      value: String(data.assignedLocationCount),
      helper: "Warehouses currently available from your account access.",
      tone: "employee" as const,
    },
    {
      label: "Submitted audits",
      value: String(data.submittedAuditCount),
      helper: `Your completed audit submissions for ${periodLabel.toLowerCase()}.`,
      tone: "success" as const,
    },
    {
      label: "Assets scanned",
      value: String(data.scannedAssetCount),
      helper: "Unique assets scanned in the selected period.",
      tone: "warning" as const,
    },
    {
      label: "Audited locations",
      value: String(data.auditedLocationCount),
      helper: "Locations where you completed at least one audit.",
      tone: "employee" as const,
    },
  ];

  const coverageProgress =
    data.assignedLocationCount > 0
      ? data.auditedLocationCount / data.assignedLocationCount
      : 0;

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
        className="rounded-[28px] border px-5 py-5"
        style={{ borderColor: "#D7EBE4", backgroundColor: "#F5FCF8" }}
      >
        <View
          className="items-start justify-between"
          style={{
            flexDirection: isDesktop ? "row" : "column",
            gap: 16,
          }}
        >
          <View style={{ flex: isDesktop ? 1 : undefined, width: isDesktop ? undefined : "100%" }}>
            <View
              className="self-start rounded-full px-3 py-1"
              style={{ backgroundColor: adminTheme.employeePrimarySoft }}
            >
              <Text className="text-xs font-medium" style={{ color: adminTheme.employeePrimary }}>
                Employee dashboard
              </Text>
            </View>
            <Text className="mt-4 text-[30px] font-semibold" style={{ color: adminTheme.slate }}>
              Welcome back, {user.name}
            </Text>
            <Text className="mt-2 text-sm leading-6" style={{ color: adminTheme.slateSoft }}>
              Keep this view focused on what you can act on fast: assigned locations, recent
              submissions, and how much you scanned over time.
            </Text>
          </View>

          <View
            className="flex-row flex-wrap"
            style={{ gap: 10, width: isCompactMobile ? "100%" : undefined }}
          >
            <ActionButton
              label="My Reports"
              icon="bar-chart-2"
              accentColor={adminTheme.employeePrimary}
              onPress={() => router.push("/reports")}
              fullWidth={isCompactMobile}
            />
            <ActionButton
              label="Start Audit"
              icon="play"
              filled
              accentColor={adminTheme.employeePrimary}
              onPress={() => router.push("/audits")}
              fullWidth={isCompactMobile}
            />
          </View>
        </View>

        <View
          className="mt-5 items-start justify-between"
          style={{
            flexDirection: isDesktop ? "row" : "column",
            gap: 12,
          }}
        >
          <View>
            <Text className="text-sm font-medium" style={{ color: adminTheme.muted }}>
              Viewing
            </Text>
            <Text className="mt-1 text-base font-semibold" style={{ color: adminTheme.slate }}>
              {periodLabel} audit activity
            </Text>
          </View>
          <PeriodSwitch
            value={period}
            onChange={setPeriod}
            accentColor={adminTheme.employeePrimary}
          />
        </View>

        <View
          className="mt-5 rounded-[20px] border px-4 py-4"
          style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
        >
          <Text className="text-sm font-medium" style={{ color: adminTheme.muted }}>
            Last submission
          </Text>
          <Text className="mt-2 text-lg font-semibold" style={{ color: adminTheme.slate }}>
            {formatDashboardDate(data.lastSubmittedAt)}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <LoadingState label={periodLabel} accentColor={adminTheme.employeePrimary} />
      ) : null}
      {!isLoading && errorMessage ? (
        <View className="mt-5">
          <DashboardError
            message={errorMessage}
            onRetry={reload}
            accentColor={adminTheme.employeePrimary}
            borderColor="#D7EBE4"
            backgroundColor="#F5FCF8"
          />
        </View>
      ) : null}

      {!isLoading && !errorMessage ? (
        <>
          <DashboardStatsGrid stats={stats} width={width} isDesktop={isDesktop} />

          <View
            className="mt-5"
            style={{
              flexDirection: isDesktop ? "row" : "column",
              gap: 16,
            }}
          >
            <View style={{ flex: 1 }}>
              <ProgressInsightCard
                title="Location Coverage"
                subtitle="How much of your assigned access has already been audited in the selected period."
                valueLabel={`${data.auditedLocationCount}/${data.assignedLocationCount || 0}`}
                progress={coverageProgress}
                accentColor={adminTheme.employeePrimary}
                helper={`${data.auditedLocationCount} audited locations out of ${data.assignedLocationCount} assigned locations.`}
              />
            </View>

            <View style={{ flex: 1 }}>
              <ColumnChart
                title="Audit Scan Volume"
                subtitle="Your latest audit submissions compared by scanned asset count."
                items={recentAuditColumns}
                accentColor={adminTheme.employeePrimary}
                emptyMessage="Audit scan volume will appear here after you submit reports."
              />
            </View>
          </View>

          <View
            className="mt-5"
            style={{
              flexDirection: isDesktop ? "row" : "column",
              gap: 16,
            }}
          >
            <View style={{ flex: 1 }}>
              <HorizontalBarChart
                title="Recent Audit Bars"
                subtitle="A quick comparison of scanned volume across your latest audits."
                items={recentAuditBars}
                accentColor={adminTheme.employeePrimary}
                emptyMessage="Recent audit comparisons will appear here after you submit reports."
              />
            </View>

            <View style={{ flex: 1 }}>
              <SectionCard
                title="Assigned Locations"
                subtitle="These are the places currently available for you to audit."
              >
                <WarehouseList warehouses={data.accessibleWarehouses.slice(0, 6)} />
              </SectionCard>
            </View>
          </View>

          <View className="mt-5">
            <SectionCard
              title="Recent Audits"
              subtitle="Your latest submitted audit reports for the selected period."
            >
              <RecentAuditList audits={data.recentAudits.slice(0, 6)} />
            </SectionCard>
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}
