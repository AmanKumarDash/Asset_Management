import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { employeeCompletedAudits } from "@/features/audits/data/employeeAuditData";
import { adminTheme } from "@/theme/adminTheme";

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

function DesktopEmployeeReports() {
  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="mb-5 flex-row items-start justify-between">
        <View>
          <Text className="text-[28px] font-semibold" style={{ color: adminTheme.slate }}>
            My Reports
          </Text>
          <Text className="mt-1 text-sm" style={{ color: adminTheme.muted }}>
            Review the audits you have already submitted
          </Text>
        </View>

        <Pressable
          onPress={() => router.push("/audits")}
          className="rounded-xl px-4 py-2.5"
          style={{ backgroundColor: adminTheme.employeePrimary }}
        >
          <Text className="text-sm font-semibold text-white">Open Scan</Text>
        </Pressable>
      </View>

      <View className="mb-5 flex-row gap-3">
        <View
          className="flex-1 rounded-[18px] border px-4 py-4"
          style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surfaceAlt }}
        >
          <Text className="text-[28px] font-semibold" style={{ color: adminTheme.employeePrimary }}>
            {employeeCompletedAudits.length}
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
            89%
          </Text>
          <Text className="mt-1 text-sm" style={{ color: adminTheme.muted }}>
            Average match rate
          </Text>
        </View>
      </View>

      <View
        className="overflow-hidden rounded-[20px] border bg-white"
        style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
      >
        <View className="border-b px-4 py-3" style={{ borderColor: adminTheme.border }}>
          <View className="flex-row">
            <Text className="flex-[2] text-xs font-medium" style={{ color: adminTheme.muted }}>
              Audit
            </Text>
            <Text className="flex-[1.2] text-xs font-medium" style={{ color: adminTheme.muted }}>
              Location
            </Text>
            <Text className="flex-[1.4] text-xs font-medium" style={{ color: adminTheme.muted }}>
              Submitted
            </Text>
            <Text className="flex-[1] text-xs font-medium" style={{ color: adminTheme.muted }}>
              Scanned
            </Text>
            <Text className="flex-[1] text-xs font-medium" style={{ color: adminTheme.muted }}>
              Match
            </Text>
            <Text className="flex-[1] text-xs font-medium" style={{ color: adminTheme.muted }}>
              Status
            </Text>
          </View>
        </View>

        {employeeCompletedAudits.map((report, index) => (
          <View
            key={report.id}
            className={`px-4 py-3.5 ${index < employeeCompletedAudits.length - 1 ? "border-b" : ""}`}
            style={
              index < employeeCompletedAudits.length - 1
                ? { borderColor: adminTheme.border }
                : undefined
            }
          >
            <View className="flex-row items-center">
              <Text className="flex-[2] text-sm font-medium" style={{ color: adminTheme.slate }}>
                {report.title}
              </Text>
              <Text className="flex-[1.2] text-sm" style={{ color: adminTheme.slate }}>
                {report.location}
              </Text>
              <Text className="flex-[1.4] text-sm" style={{ color: adminTheme.slate }}>
                {report.completedAt}
              </Text>
              <Text className="flex-[1] text-sm" style={{ color: adminTheme.slate }}>
                {report.scannedLabel}
              </Text>
              <Text className="flex-[1] text-sm font-medium" style={{ color: adminTheme.successText }}>
                {report.matchRate}
              </Text>
              <View className="flex-[1]">
                <ReportStatus />
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function MobileEmployeeReports() {
  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="border-b px-4 pb-4 pt-3" style={{ borderColor: adminTheme.border }}>
        <Text className="text-[22px] font-semibold" style={{ color: adminTheme.slate }}>
          My Reports
        </Text>
        <Text className="mt-1 text-sm" style={{ color: adminTheme.muted }}>
          Previously submitted audits
        </Text>
      </View>

      <View className="px-4 pt-4">
        {employeeCompletedAudits.map((report, index) => (
          <View
            key={report.id}
            className={`rounded-[18px] border bg-white p-4 ${
              index < employeeCompletedAudits.length - 1 ? "mb-3" : ""
            }`}
            style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
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
              <Feather name="chevron-right" size={16} color={adminTheme.muted} />
            </View>

            <View className="mt-4 flex-row items-center justify-between">
              <Text className="text-sm" style={{ color: adminTheme.slateSoft }}>
                Match rate
              </Text>
              <Text className="text-sm font-medium" style={{ color: adminTheme.successText }}>
                {report.matchRate}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export default function EmployeeReportsScreen() {
  const { width } = useWindowDimensions();

  return width < 1024 ? <MobileEmployeeReports /> : <DesktopEmployeeReports />;
}
