import { useMemo, useState } from "react";
import { router } from "expo-router";
import { ScrollView, Text, View, useWindowDimensions } from "react-native";
import { USER_ROLES } from "@/constants/auth";
import { useAuthSession } from "@/features/auth/hooks/useAuthSession";
import {
  DashboardPeriod,
  formatDashboardDate,
  getPeriodLabel,
  useAdminDashboardData,
} from "@/features/dashboard/hooks/useDashboardData";
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
import EmployeeDashboardScreen from "./EmployeeDashboardScreen";
import { adminTheme } from "@/theme/adminTheme";

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

export default function DashboardScreen() {
  const { user, organization } = useAuthSession();
  const { width } = useWindowDimensions();
  const [period, setPeriod] = useState<DashboardPeriod>("weekly");
  const { data, isLoading, errorMessage, periodLabel, reload } = useAdminDashboardData(period);
  const isDesktop = width >= 1024;
  const isCompactMobile = width < 640;
  const teamBars = useMemo(
    () =>
      data.teamActivity.slice(0, 5).map((item) => ({
        label: item.name,
        value: item.scannedAssets,
        helper: `${item.reportCount} submitted audits`,
      })),
    [data.teamActivity]
  );
  const auditColumns = useMemo(
    () =>
      data.recentAudits.slice(0, 4).map((item, index) => ({
        label: item.employeeName === "You" ? `Admin ${index + 1}` : `Audit ${index + 1}`,
        value: item.scannedCount,
        caption: item.location,
      })),
    [data.recentAudits]
  );

  if (!user) {
    return null;
  }

  if (user.role === USER_ROLES.EMPLOYEE) {
    return <EmployeeDashboardScreen />;
  }

  const stats = [
    {
      label: "Employees",
      value: String(data.employeeCount),
      helper: "Total employee accounts in your organization.",
      tone: "primary" as const,
    },
    {
      label: "Active auditors",
      value: String(data.activeAuditorCount),
      helper: `${getPeriodLabel(period)} employees with at least one submitted audit.`,
      tone: "success" as const,
    },
    {
      label: "Submitted audits",
      value: String(data.submittedAuditCount),
      helper: `Completed audit submissions recorded for ${periodLabel.toLowerCase()}.`,
      tone: "gold" as const,
    },
    {
      label: "Assets scanned",
      value: String(data.scannedAssetCount),
      helper: `${data.locationCount} warehouse locations covered in this view.`,
      tone: "warning" as const,
    },
  ];

  const participationProgress =
    data.employeeCount > 0 ? data.activeAuditorCount / data.employeeCount : 0;

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
        style={{ borderColor: "#D9E5FF", backgroundColor: "#F6FAFF" }}
      >
        <View
          className="flex-row items-start justify-between"
          style={{ flexWrap: isDesktop ? "nowrap" : "wrap", rowGap: 16 }}
        >
          <View className="flex-1">
            <View
              className="self-start rounded-full px-3 py-1"
              style={{ backgroundColor: adminTheme.accentGoldSoft }}
            >
              <Text className="text-xs font-medium" style={{ color: adminTheme.accentGold }}>
                Admin dashboard
              </Text>
            </View>
            <Text className="mt-4 text-[30px] font-semibold" style={{ color: adminTheme.slate }}>
              {organization?.Name?.trim() || "Operations overview"}
            </Text>
            <Text className="mt-2 text-sm leading-6" style={{ color: adminTheme.slateSoft }}>
              Track employee activity, audit submissions, and scanned asset volume with a view
              built from real report data. This keeps the dashboard clean today and dependable as
              your audit history grows.
            </Text>
          </View>

          <View
            className="flex-row flex-wrap"
            style={{ gap: 10, width: isCompactMobile ? "100%" : undefined }}
          >
            <ActionButton
              label="Open Audits"
              icon="clipboard"
              accentColor={adminTheme.primary}
              onPress={() => router.push("/audits")}
              fullWidth={isCompactMobile}
            />
            <ActionButton
              label="Add Employee"
              icon="user-plus"
              filled
              accentColor={adminTheme.primary}
              onPress={() => router.push("/employees/new")}
              fullWidth={isCompactMobile}
            />
          </View>
        </View>

        <View
          className="mt-5 flex-row items-center justify-between"
          style={{ flexWrap: isDesktop ? "nowrap" : "wrap", rowGap: 12 }}
        >
          <View>
            <Text className="text-sm font-medium" style={{ color: adminTheme.muted }}>
              Viewing
            </Text>
            <Text className="mt-1 text-base font-semibold" style={{ color: adminTheme.slate }}>
              {periodLabel} audit activity
            </Text>
          </View>
          <PeriodSwitch value={period} onChange={setPeriod} accentColor={adminTheme.primary} />
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
                title="Team Participation"
                subtitle="How many employee accounts contributed at least one audit in the selected period."
                valueLabel={`${Math.round(participationProgress * 100)}%`}
                progress={participationProgress}
                accentColor={adminTheme.primary}
                helper={`${data.activeAuditorCount} of ${data.employeeCount} employees submitted audit activity.`}
              />
            </View>

            <View style={{ flex: 1 }}>
              <ColumnChart
                title="Recent Audit Volume"
                subtitle="Latest submissions compared by scanned asset count."
                items={auditColumns}
                accentColor={adminTheme.accentGold}
                emptyMessage="Recent audit volume will appear here after submissions are recorded."
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
                title="Top Contributors"
                subtitle="Employees with the highest scanned volume for the selected period."
                items={teamBars}
                accentColor={adminTheme.primary}
                emptyMessage="Contributor insights will appear here after employees submit audits."
              />
            </View>

            <View style={{ flex: 1 }}>
              <SectionCard
                title="Recent Audits"
                subtitle="Most recent submissions across your team and your own admin account."
              >
                <AuditList audits={data.recentAudits} />
              </SectionCard>
            </View>
          </View>

          <View className="mt-5">
            <SectionCard
              title="Team Activity"
              subtitle="Who submitted work in the selected period and how much they scanned."
            >
              <TeamActivityList activity={data.teamActivity} />
            </SectionCard>
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}
