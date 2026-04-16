import { apiService } from "@/network/ApiService";
import { adminTheme } from "@/theme/adminTheme";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

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
    <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: styles.bg }}>
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
      <Text
        className="text-xs font-semibold"
        style={{ color: filled ? "#ffffff" : adminTheme.slate }}
      >
        {title}
      </Text>
    </Pressable>
  );
}

function DesktopSummaryCards({ employees }: { employees: any[] }) {
  const activeEmployees = employees.filter((e) => e.statusTone === "success").length;
  const idleEmployees = employees.length - activeEmployees;
  const assignedEmployees = employees.filter((e) => e.audit !== "-").length;

  const summaryCards = [
    { label: "Total employees", value: String(employees.length), color: "#1f5ea8" },
    { label: "Active now", value: String(activeEmployees), color: "#4f7d1f" },
    { label: "Assigned audits", value: String(assignedEmployees), color: "#9c6306" },
    { label: "Idle members", value: String(idleEmployees), color: "#7c7469" },
  ];

  return (
    <View className="mb-5 flex-row flex-wrap gap-3">
      {summaryCards.map((card) => (
        <View
          key={card.label}
          className="min-w-[180px] flex-1 rounded-[18px] border px-4 py-4"
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
  );
}

function DesktopEmployeeTable({
  onAdd,
  employees,
}: {
  onAdd: () => void;
  employees: any[];
}) {
  return (
    <View
      className="overflow-hidden rounded-[20px] border"
      style={{ borderColor: adminTheme.border }}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between border-b px-4 py-3.5">
        <Text className="text-[20px] font-semibold">Employee Directory</Text>

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

      {/* Table Headings */}
      <View className="flex-row px-4 py-3 border-b">
        <Text className="flex-1 font-semibold">Name</Text>
        <Text className="flex-1 font-semibold">Mobile</Text>
        <Text className="flex-1 font-semibold">Email</Text>
        <Text className="flex-1 font-semibold">User ID</Text>
      </View>

      {/* Table Rows */}
      {employees.map((employee, index) => (
        <View
          key={employee.userId}
          className="flex-row px-4 py-3 border-b"
        >
          <Text className="flex-1">{employee.name}</Text>
          <Text className="flex-1">{employee.mobile}</Text>
          <Text className="flex-1">{employee.email}</Text>
          <Text className="flex-1">{employee.userId}</Text>
        </View>
      ))}
    </View>
  );
}

function MobileEmployeeCards({
  onAdd,
  employees,
}: {
  onAdd: () => void;
  employees: any[];
}) {
  return (
    <ScrollView>
      {employees.map((employee) => (
        <View key={employee.userId} className="p-4 border mb-3">
          <Text className="font-semibold">{employee.name}</Text>
          <Text>📱 {employee.mobile}</Text>
          <Text>📧 {employee.email}</Text>
          <Text>🆔 {employee.userId}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

function DesktopEmployees({ employees }: { employees: any[] }) {
  const openAddEmployee = () => router.push("/employees/new");

  return (
    <ScrollView>
      <SectionButton title={`${employees.length} Total`} />
      <DesktopSummaryCards employees={employees} />
      <DesktopEmployeeTable onAdd={openAddEmployee} employees={employees} />
    </ScrollView>
  );
}

export default function EmployeesScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 1024;

  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const openAddEmployee = () => router.push("/employees/new");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await apiService.getUserDetails("");

      const formatted = data
  .filter((u) => u.UserType === 3)
  .map((u) => ({
    name: `${u.FirstName || ""} ${u.LastName || ""}`.trim() || "N/A",
    mobile: u.Mobile || "-",
    email: u.EmailId || "-",
    userId: u.UserId?.trim(), // IMPORTANT (removes spaces)
    status: u.IsActive ? "Active" : "Inactive",
    statusTone: u.IsActive ? "success" : "muted",
  }));

        setEmployees(formatted);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text>Loading...</Text>
      </View>
    );
  }

  return isMobile ? (
    <MobileEmployeeCards onAdd={openAddEmployee} employees={employees} />
  ) : (
    <DesktopEmployees employees={employees} />
  );
}
