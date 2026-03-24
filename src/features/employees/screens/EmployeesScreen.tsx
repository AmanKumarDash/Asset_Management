import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { employees } from "../data/employeeData";
import { adminTheme } from "@/theme/adminTheme";

type Tone = "success" | "muted";

function getPillStyles(tone: Tone) {
  switch (tone) {
    case "success":
      return { bg: adminTheme.successBg, text: adminTheme.successText };
    default:
      return { bg: adminTheme.mutedBg, text: adminTheme.mutedText };
  }
}

function StatusPill({ label, tone }: { label: string; tone: Tone }) {
  const styles = getPillStyles(tone);

  return (
    <View
      className="rounded-full px-2.5 py-1"
      style={{ backgroundColor: styles.bg }}
    >
      <Text className="text-xs font-medium" style={{ color: styles.text }}>
        {label}
      </Text>
    </View>
  );
}

function SectionButton({
  title,
  filled = false,
  onPress,
}: {
  title: string;
  filled?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-xl border px-4 py-2.5"
      style={{
        borderColor: filled ? adminTheme.primary : adminTheme.border,
        backgroundColor: filled ? adminTheme.primary : adminTheme.surface,
      }}
    >
      <Text className="text-xs font-semibold" style={{ color: filled ? "#ffffff" : adminTheme.slate }}>
        {title}
      </Text>
    </Pressable>
  );
}

function DesktopSummaryCards() {
  const activeEmployees = employees.filter(
    (employee) => employee.statusTone === "success"
  ).length;
  const idleEmployees = employees.length - activeEmployees;
  const assignedEmployees = employees.filter(
    (employee) => employee.audit !== "-"
  ).length;

  const summaryCards = [
    {
      label: "Total employees",
      value: String(employees.length),
      color: "#1f5ea8",
    },
    {
      label: "Active now",
      value: String(activeEmployees),
      color: "#4f7d1f",
    },
    {
      label: "Assigned audits",
      value: String(assignedEmployees),
      color: "#9c6306",
    },
    {
      label: "Idle members",
      value: String(idleEmployees),
      color: "#7c7469",
    },
  ] as const;

  return (
    <View className="mb-5 flex-row flex-wrap gap-3">
      {summaryCards.map((card) => (
        <View
          key={card.label}
          className="min-w-[180px] flex-1 rounded-[18px] border px-4 py-4"
          style={{ backgroundColor: adminTheme.surfaceAlt, borderColor: adminTheme.border }}
        >
          <Text
            className="text-[28px] font-semibold"
            style={{ color: card.color }}
          >
            {card.value}
          </Text>
          <Text className="mt-1 text-sm" style={{ color: adminTheme.muted }}>{card.label}</Text>
        </View>
      ))}
    </View>
  );
}

function DesktopEmployeeTable({ onAdd }: { onAdd: () => void }) {
  return (
    <View className="overflow-hidden rounded-[20px] border bg-white" style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}>
      <View className="flex-row items-center justify-between border-b px-4 py-3.5" style={{ borderColor: adminTheme.border }}>
        <View>
          <Text className="text-[20px] font-semibold" style={{ color: adminTheme.slate }}>
            Employee Directory
          </Text>
          <Text className="mt-1 text-sm" style={{ color: adminTheme.muted }}>
            All existing employees and their current audit assignments
          </Text>
        </View>
        <Pressable
          onPress={onAdd}
          className="rounded-xl px-4 py-2.5"
          style={{ backgroundColor: adminTheme.primary }}
        >
          <Text className="text-xs font-semibold text-white">
            + Add Employee
          </Text>
        </Pressable>
      </View>

      <View className="border-b px-4 py-3" style={{ borderColor: adminTheme.border }}>
        <View className="flex-row">
          <Text className="flex-[1.7] text-xs font-medium" style={{ color: adminTheme.muted }}>Name</Text>
          <Text className="flex-[1.4] text-xs font-medium" style={{ color: adminTheme.muted }}>Department</Text>
          <Text className="flex-[1.4] text-xs font-medium" style={{ color: adminTheme.muted }}>Employee ID</Text>
          <Text className="flex-[1.9] text-xs font-medium" style={{ color: adminTheme.muted }}>Assigned audit</Text>
          <Text className="flex-[1.1] text-xs font-medium" style={{ color: adminTheme.muted }}>Status</Text>
          <Text className="flex-[1] text-xs font-medium" style={{ color: adminTheme.muted }}>Last active</Text>
        </View>
      </View>

      {employees.map((employee, index) => (
        <View
          key={employee.employeeId}
          className={`px-4 py-3.5 ${index < employees.length - 1 ? "border-b" : ""}`}
          style={index < employees.length - 1 ? { borderColor: adminTheme.border } : undefined}
        >
          <View className="flex-row items-center">
            <View className="flex-[1.7] flex-row items-center">
              <View
                className="mr-3 h-9 w-9 items-center justify-center rounded-full"
                style={{ backgroundColor: employee.avatarColor }}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{ color: employee.avatarText }}
                >
                  {employee.initials}
                </Text>
              </View>
              <View>
                <Text className="text-sm font-medium" style={{ color: adminTheme.slate }}>
                  {employee.name}
                </Text>
                <Text className="mt-1 text-xs" style={{ color: adminTheme.muted }}>{employee.email}</Text>
              </View>
            </View>
            <Text className="flex-[1.4] text-sm" style={{ color: adminTheme.slate }}>
              {employee.department}
            </Text>
            <Text className="flex-[1.4] text-sm" style={{ color: adminTheme.slate }}>
              {employee.employeeId}
            </Text>
            <Text className="flex-[1.9] text-sm" style={{ color: adminTheme.slate }}>
              {employee.audit === "-" ? "Unassigned" : employee.audit}
            </Text>
            <View className="flex-[1.1]">
              <StatusPill label={employee.status} tone={employee.statusTone} />
            </View>
            <Text className="flex-[1] text-sm" style={{ color: adminTheme.slate }}>
              {employee.activeAt}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function MobileEmployeeCards({ onAdd }: { onAdd: () => void }) {
  const activeEmployees = employees.filter(
    (employee) => employee.statusTone === "success"
  ).length;

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="border-b px-4 pb-4 pt-3" style={{ borderColor: adminTheme.border }}>
        <View className="mb-4 flex-row items-start justify-between">
          <View className="flex-1">
            <Text className="text-[22px] font-semibold" style={{ color: adminTheme.slate }}>
              Employees
            </Text>
            <Text className="mt-1 text-sm" style={{ color: adminTheme.muted }}>
              {employees.length} team members, {activeEmployees} active right now
            </Text>
          </View>

          <Pressable
            onPress={onAdd}
            className="ml-4 rounded-xl px-4 py-2.5"
            style={{ backgroundColor: adminTheme.primary }}
          >
            <Text className="text-sm font-semibold text-white">+ Add</Text>
          </Pressable>
        </View>
      </View>

      <View className="px-4 pt-4">
        {employees.map((employee, index) => (
          <View
            key={employee.employeeId}
            className={`rounded-[18px] border bg-white p-4 ${
              index < employees.length - 1 ? "mb-3" : ""
            }`}
            style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
          >
            <View className="flex-row items-start justify-between">
              <View className="mr-3 flex-1 flex-row items-center">
                <View
                  className="mr-3 h-10 w-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: employee.avatarColor }}
                >
                  <Text
                    className="text-sm font-semibold"
                    style={{ color: employee.avatarText }}
                  >
                    {employee.initials}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-[18px] font-medium" style={{ color: adminTheme.slate }}>
                    {employee.name}
                  </Text>
                  <Text className="mt-1 text-sm" style={{ color: adminTheme.muted }}>
                    {employee.department}
                  </Text>
                </View>
              </View>
              <StatusPill label={employee.status} tone={employee.statusTone} />
            </View>

            <View className="mt-4 rounded-[16px] px-4 py-3" style={{ backgroundColor: adminTheme.surfaceAlt }}>
              <Text className="text-xs uppercase tracking-[0.6px]" style={{ color: adminTheme.muted }}>
                Assigned audit
              </Text>
              <Text className="mt-1 text-sm font-medium" style={{ color: adminTheme.slate }}>
                {employee.audit === "-" ? "No audit assigned" : employee.audit}
              </Text>
              <Text className="mt-3 text-xs uppercase tracking-[0.6px]" style={{ color: adminTheme.muted }}>
                Employee ID
              </Text>
              <Text className="mt-1 text-sm" style={{ color: adminTheme.slate }}>
                {employee.employeeId}
              </Text>
              <Text className="mt-3 text-xs uppercase tracking-[0.6px]" style={{ color: adminTheme.muted }}>
                Last active
              </Text>
              <Text className="mt-1 text-sm" style={{ color: adminTheme.slate }}>
                {employee.activeAt}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View className="px-4 pt-4">
        <Pressable
          onPress={onAdd}
          className="flex-row items-center justify-center rounded-[18px] border bg-white px-5 py-4"
          style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
        >
          <Feather name="user-plus" size={18} color={adminTheme.primary} />
          <Text className="ml-2 text-base font-semibold" style={{ color: adminTheme.primary }}>
            Add New Employee
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function DesktopEmployees() {
  const openAddEmployee = () => router.push("/employees/new");

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="mb-5 flex-row items-center justify-between">
        <View>
          <Text className="text-[28px] font-semibold" style={{ color: adminTheme.slate }}>
            Employees
          </Text>
          <Text className="mt-1 text-sm" style={{ color: adminTheme.muted }}>
            Manage all existing employees and invite new team members
          </Text>
        </View>

        <View className="flex-row gap-3">
          <SectionButton title={`${employees.length} Total`} />
          <SectionButton
            title="+ Add Employee"
            filled
            onPress={openAddEmployee}
          />
        </View>
      </View>

      <DesktopSummaryCards />
      <DesktopEmployeeTable onAdd={openAddEmployee} />
    </ScrollView>
  );
}

export default function EmployeesScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 1024;
  const openAddEmployee = () => router.push("/employees/new");

  return isMobile ? (
    <MobileEmployeeCards onAdd={openAddEmployee} />
  ) : (
    <DesktopEmployees />
  );
}
