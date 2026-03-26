import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import {
  employeeAssignedAudit,
  employeeCompletedAudits,
} from "@/features/audits/data/employeeAuditData";
import { useAuthSession } from "@/features/auth/hooks/useAuthSession";
import { adminTheme } from "@/theme/adminTheme";

function StatusBadge({ label }: { label: string }) {
  return (
    <View
      className="self-start rounded-full px-3 py-1"
      style={{ backgroundColor: adminTheme.employeePrimarySoft }}
    >
      <Text
        className="text-xs font-medium"
        style={{ color: adminTheme.employeePrimary }}
      >
        {label}
      </Text>
    </View>
  );
}

function AssignedAuditCard({ mobile = false }: { mobile?: boolean }) {
  return (
    <View
      className="rounded-[20px] border bg-white p-4"
      style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-[20px] font-semibold" style={{ color: adminTheme.slate }}>
            {employeeAssignedAudit.title}
          </Text>
          <Text className="mt-1 text-sm" style={{ color: adminTheme.muted }}>
            {employeeAssignedAudit.location} - {employeeAssignedAudit.assets} assets - Assigned by{" "}
            {employeeAssignedAudit.assignedBy}
          </Text>
        </View>
        <StatusBadge label={employeeAssignedAudit.status} />
      </View>

      <View
        className="mt-4 h-[4px] rounded-full"
        style={{ backgroundColor: adminTheme.border }}
      >
        <View
          className="h-[4px] rounded-full"
          style={{
            width: `${(employeeAssignedAudit.scanned / employeeAssignedAudit.assets) * 100}%`,
            backgroundColor: adminTheme.employeePrimary,
          }}
        />
      </View>

      <View className="mt-4 flex-row items-center justify-between">
        <Text className="text-sm" style={{ color: adminTheme.slateSoft }}>
          {employeeAssignedAudit.dueText} - {employeeAssignedAudit.scanned} /{" "}
          {employeeAssignedAudit.assets}
        </Text>
        <Pressable
          onPress={() => router.push("/audits")}
          className="rounded-xl px-4 py-2.5"
          style={{ backgroundColor: adminTheme.employeePrimary }}
        >
          <Text className="text-sm font-semibold text-white">
            {mobile ? "Start Audit" : "Start Audit ->"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function DesktopEmployeeDashboard() {
  const { user } = useAuthSession();

  if (!user) {
    return null;
  }

  const statCards = [
    { label: "Pending audit", value: "1", color: "#854F0B" },
    { label: "Completed audits", value: String(employeeCompletedAudits.length), color: "#3B6D11" },
    { label: "Total assets scanned", value: "51", color: adminTheme.employeePrimary },
  ] as const;

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="mb-5">
        <Text className="text-[28px] font-semibold" style={{ color: adminTheme.slate }}>
          My Dashboard
        </Text>
        <Text className="mt-1 text-sm" style={{ color: adminTheme.muted }}>
          Welcome back, {user.name}
        </Text>
      </View>

      <View
        className="mb-5 flex-row rounded-[20px] border px-4 py-4"
        style={{ borderColor: "#D4E6FF", backgroundColor: adminTheme.infoBg }}
      >
        <View
          className="mr-3 h-10 w-10 items-center justify-center rounded-[12px]"
          style={{ backgroundColor: "#DDEBFF" }}
        >
          <Feather name="clipboard" size={18} color={adminTheme.primary} />
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold" style={{ color: adminTheme.slate }}>
            1 audit assigned and due today
          </Text>
          <Text className="mt-1 text-sm" style={{ color: adminTheme.slateSoft }}>
            {employeeAssignedAudit.title} - Assigned by {employeeAssignedAudit.assignedBy} - Please
            complete before end of day
          </Text>
        </View>
      </View>

      <View className="mb-5 flex-row gap-3">
        {statCards.map((card) => (
          <View
            key={card.label}
            className="flex-1 rounded-[18px] border px-4 py-4"
            style={{ backgroundColor: adminTheme.surfaceAlt, borderColor: adminTheme.border }}
          >
            <Text className="text-[28px] font-semibold" style={{ color: card.color }}>
              {card.value}
            </Text>
            <Text className="mt-1 text-sm" style={{ color: adminTheme.muted }}>
              {card.label}
            </Text>
          </View>
        ))}
      </View>

      <Text className="mb-3 text-[18px] font-semibold" style={{ color: adminTheme.slate }}>
        Assigned audit
      </Text>
      <AssignedAuditCard />

      <Text className="mb-3 mt-5 text-[18px] font-semibold" style={{ color: adminTheme.slate }}>
        Completed audits
      </Text>
      <View
        className="overflow-hidden rounded-[20px] border bg-white"
        style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
      >
        <View className="border-b px-4 py-3" style={{ borderColor: adminTheme.border }}>
          <View className="flex-row">
            <Text className="flex-[2] text-xs font-medium" style={{ color: adminTheme.muted }}>
              Audit name
            </Text>
            <Text className="flex-[1.2] text-xs font-medium" style={{ color: adminTheme.muted }}>
              Location
            </Text>
            <Text className="flex-[1.6] text-xs font-medium" style={{ color: adminTheme.muted }}>
              Date & time
            </Text>
            <Text className="flex-[1] text-xs font-medium" style={{ color: adminTheme.muted }}>
              Scanned
            </Text>
            <Text className="flex-[1] text-xs font-medium" style={{ color: adminTheme.muted }}>
              Match rate
            </Text>
            <Text className="flex-[1] text-xs font-medium" style={{ color: adminTheme.muted }}>
              Status
            </Text>
          </View>
        </View>

        {employeeCompletedAudits.map((audit, index) => (
          <View
            key={audit.id}
            className={`px-4 py-3.5 ${index < employeeCompletedAudits.length - 1 ? "border-b" : ""}`}
            style={
              index < employeeCompletedAudits.length - 1
                ? { borderColor: adminTheme.border }
                : undefined
            }
          >
            <View className="flex-row items-center">
              <Text className="flex-[2] text-sm font-medium" style={{ color: adminTheme.slate }}>
                {audit.title}
              </Text>
              <Text className="flex-[1.2] text-sm" style={{ color: adminTheme.slate }}>
                {audit.location}
              </Text>
              <Text className="flex-[1.6] text-sm" style={{ color: adminTheme.slate }}>
                {audit.completedAt}
              </Text>
              <Text className="flex-[1] text-sm" style={{ color: adminTheme.slate }}>
                {audit.scannedLabel}
              </Text>
              <Text
                className="flex-[1] text-sm font-medium"
                style={{ color: adminTheme.successText }}
              >
                {audit.matchRate}
              </Text>
              <View className="flex-[1]">
                <StatusBadge label={audit.status} />
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function MobileEmployeeDashboard() {
  const { user } = useAuthSession();

  if (!user) {
    return null;
  }

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="border-b px-4 pb-4 pt-3" style={{ borderColor: adminTheme.border }}>
        <View className="flex-row items-center justify-between">
          <View>
            <View
              className="self-start rounded-full px-3 py-1"
              style={{ backgroundColor: adminTheme.employeePrimarySoft }}
            >
              <Text className="text-xs font-medium" style={{ color: adminTheme.employeePrimary }}>
                {user.roleBadge}
              </Text>
            </View>
            <Text className="mt-3 text-[28px] font-semibold" style={{ color: adminTheme.slate }}>
              {user.name}
            </Text>
          </View>
          <View
            className="h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: user.avatarBg }}
          >
            <Text className="text-base font-semibold" style={{ color: user.avatarText }}>
              {user.initials}
            </Text>
          </View>
        </View>
      </View>

      <View
        className="mx-4 mt-4 flex-row rounded-[18px] border px-4 py-4"
        style={{ borderColor: "#D4E6FF", backgroundColor: adminTheme.infoBg }}
      >
        <View className="mr-3">
          <Feather name="clipboard" size={18} color={adminTheme.primary} />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-semibold" style={{ color: adminTheme.slate }}>
            1 audit assigned to you
          </Text>
          <Text className="mt-1 text-sm" style={{ color: adminTheme.slateSoft }}>
            Due today - Assigned by Alka
          </Text>
        </View>
      </View>

      <View className="px-4 pt-4">
        <Text className="mb-3 text-[18px] font-semibold" style={{ color: adminTheme.slate }}>
          My assigned audits
        </Text>
        <AssignedAuditCard mobile />
      </View>

      <View className="px-4 pt-4">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-[18px] font-semibold" style={{ color: adminTheme.slate }}>
            Completed audits
          </Text>
          <Text className="text-xs" style={{ color: adminTheme.muted }}>
            {employeeCompletedAudits.length} total
          </Text>
        </View>

        {employeeCompletedAudits.map((audit, index) => (
          <View
            key={audit.id}
            className={`rounded-[18px] border bg-white px-4 py-4 ${
              index < employeeCompletedAudits.length - 1 ? "mb-3" : ""
            }`}
            style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-[18px] font-medium" style={{ color: adminTheme.slate }}>
                  {audit.title}
                </Text>
                <Text className="mt-1 text-sm" style={{ color: adminTheme.muted }}>
                  {audit.completedAt}
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={adminTheme.muted} />
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export default function EmployeeDashboardScreen() {
  const { width } = useWindowDimensions();

  return width < 1024 ? <MobileEmployeeDashboard /> : <DesktopEmployeeDashboard />;
}
