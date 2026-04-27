import { useAuthSession } from "@/features/auth/hooks/useAuthSession";
import { UserDetails, apiService } from "@/network/ApiService";
import { adminTheme } from "@/theme/adminTheme";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { Href, router } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

type Tone = "success" | "muted";

type EmployeeListEntry = {
  userId: string;
  name: string;
  mobile: string;
  email: string;
  status: string;
  statusTone: Tone;
  initials: string;
  avatarBg: string;
  avatarText: string;
};

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
      className="self-start rounded-full px-2.5 py-1"
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

function buildInitials(name: string, userId: string) {
  const parts = name
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return userId.slice(0, 2).toUpperCase() || "EM";
}

function getAvatarPalette(index: number) {
  const palettes = [
    { bg: "#E8F0FF", text: adminTheme.primary },
    { bg: "#E6F4EF", text: adminTheme.employeePrimary },
    { bg: "#FFF4D6", text: adminTheme.warningText },
    { bg: "#F5EFFF", text: "#7C3AED" },
  ] as const;

  return palettes[index % palettes.length];
}

function formatEmployee(user: UserDetails, index: number): EmployeeListEntry {
  const name = `${user.FirstName || ""} ${user.LastName || ""}`.trim() || "Unknown employee";
  const palette = getAvatarPalette(index);

  return {
    userId: user.UserId?.trim() || "N/A",
    name,
    mobile: user.Mobile?.trim() || "-",
    email: user.EmailId?.trim() || "-",
    status: user.IsActive ? "Active" : "Inactive",
    statusTone: user.IsActive ? "success" : "muted",
    initials: buildInitials(name, user.UserId?.trim() || ""),
    avatarBg: palette.bg,
    avatarText: palette.text,
  };
}

function SummaryCards({ employees }: { employees: EmployeeListEntry[] }) {
  const activeEmployees = employees.filter(
    (employee) => employee.statusTone === "success"
  ).length;
  const inactiveEmployees = employees.length - activeEmployees;

  const cards = [
    { label: "Total employees", value: String(employees.length), color: adminTheme.primary },
    { label: "Active now", value: String(activeEmployees), color: adminTheme.successText },
    { label: "Inactive", value: String(inactiveEmployees), color: adminTheme.mutedText },
  ];

  return (
    <View className="mb-5 flex-row flex-wrap" style={{ gap: 12 }}>
      {cards.map((card) => (
        <View
          key={card.label}
          className="min-w-[160px] flex-1 rounded-[18px] border px-4 py-4"
          style={{
            borderColor: adminTheme.border,
            backgroundColor: adminTheme.surfaceAlt,
          }}
        >
          <Text className="text-[26px] font-semibold" style={{ color: card.color }}>
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

function EmployeeTable({
  employees,
  canAdd,
  canEdit,
  onAdd,
  onEdit,
}: {
  employees: EmployeeListEntry[];
  canAdd: boolean;
  canEdit: boolean;
  onAdd: () => void;
  onEdit: (employeeId: string) => void;
}) {
  return (
    <View
      className="overflow-hidden rounded-[20px] border bg-white"
      style={{
        borderColor: adminTheme.border,
        backgroundColor: adminTheme.surface,
      }}
    >
      <View
        className="flex-row items-center justify-between border-b px-5 py-4"
        style={{ borderColor: adminTheme.border }}
      >
        <View>
          <Text className="text-[20px] font-semibold" style={{ color: adminTheme.slate }}>
            Employee Directory
          </Text>
          <Text className="mt-1 text-sm" style={{ color: adminTheme.muted }}>
            Manage employee accounts for your organization
          </Text>
        </View>

        {canAdd ? (
          <SectionButton title="Add Employee" icon="plus" filled onPress={onAdd} />
        ) : null}
      </View>

      <View
        className="flex-row border-b px-5 py-3"
        style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surfaceAlt }}
      >
        <Text className="flex-[1.6] text-xs font-medium" style={{ color: adminTheme.muted }}>
          Name
        </Text>
        <Text className="flex-[1.2] text-xs font-medium" style={{ color: adminTheme.muted }}>
          Mobile
        </Text>
        <Text className="flex-[1.8] text-xs font-medium" style={{ color: adminTheme.muted }}>
          Email
        </Text>
        <Text className="flex-[1.1] text-xs font-medium" style={{ color: adminTheme.muted }}>
          Employee ID
        </Text>
        <Text className="flex-[0.9] text-xs font-medium" style={{ color: adminTheme.muted }}>
          Status
        </Text>
        {canEdit ? (
          <Text className="flex-[0.9] text-right text-xs font-medium" style={{ color: adminTheme.muted }}>
            Actions
          </Text>
        ) : null}
      </View>

      {employees.map((employee, index) => (
        <Pressable
          key={employee.userId}
          onPress={canEdit ? () => onEdit(employee.userId) : undefined}
          className={`px-5 py-4 ${index < employees.length - 1 ? "border-b" : ""}`}
          style={
            index < employees.length - 1
              ? { borderColor: adminTheme.border }
              : undefined
          }
        >
          <View className="flex-row items-center">
            <View className="flex-[1.6] flex-row items-center">
              <View
                className="mr-3 h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: employee.avatarBg }}
              >
                <Text className="text-sm font-semibold" style={{ color: employee.avatarText }}>
                  {employee.initials}
                </Text>
              </View>
              <Text className="text-sm font-medium" style={{ color: adminTheme.slate }}>
                {employee.name}
              </Text>
            </View>

            <Text className="flex-[1.2] text-sm" style={{ color: adminTheme.slate }}>
              {employee.mobile}
            </Text>
            <Text className="flex-[1.8] text-sm" style={{ color: adminTheme.slate }}>
              {employee.email}
            </Text>
            <Text className="flex-[1.1] text-sm" style={{ color: adminTheme.slate }}>
              {employee.userId}
            </Text>
            <View className="flex-[0.9]">
              <StatusPill label={employee.status} tone={employee.statusTone} />
            </View>
            {canEdit ? (
              <View className="flex-[0.9] items-end">
                <Text className="text-sm font-medium" style={{ color: adminTheme.primary }}>
                  Edit
                </Text>
              </View>
            ) : null}
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-center">
      <View
        className="mr-3 h-8 w-8 items-center justify-center rounded-[10px]"
        style={{ backgroundColor: adminTheme.surfaceAlt }}
      >
        <Feather name={icon} size={14} color={adminTheme.primary} />
      </View>
      <View className="flex-1">
        <Text className="text-xs font-medium" style={{ color: adminTheme.muted }}>
          {label}
        </Text>
        <Text className="mt-0.5 text-sm" style={{ color: adminTheme.slate }}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function MobileEmployees({
  employees,
  canAdd,
  canEdit,
  onAdd,
  onEdit,
}: {
  employees: EmployeeListEntry[];
  canAdd: boolean;
  canEdit: boolean;
  onAdd: () => void;
  onEdit: (employeeId: string) => void;
}) {
  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="border-b px-4 pb-4 pt-3" style={{ borderColor: adminTheme.border }}>
        <View className="mb-4 items-center">
          <View
            className="rounded-full px-5 py-2"
            style={{ backgroundColor: adminTheme.accentGoldSoft }}
          >
            <Text
              className="text-xs font-medium tracking-[0.4px]"
              style={{ color: adminTheme.accentGold }}
            >
              Admin employee directory
            </Text>
          </View>
        </View>

        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-[24px] font-semibold" style={{ color: adminTheme.slate }}>
              Employees
            </Text>
            <Text className="mt-1 text-sm" style={{ color: adminTheme.muted }}>
              View and manage employee accounts
            </Text>
          </View>

          {canAdd ? (
            <Pressable
              onPress={onAdd}
              className="flex-row items-center rounded-[16px] px-4 py-3"
              style={{ backgroundColor: adminTheme.primary }}
            >
              <Feather name="plus" size={16} color="#ffffff" />
              <Text className="ml-2 text-sm font-semibold text-white">Add</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View className="px-4 pt-4">
        <SummaryCards employees={employees} />

        {employees.map((employee, index) => (
          <Pressable
            key={employee.userId}
            onPress={canEdit ? () => onEdit(employee.userId) : undefined}
            className={`rounded-[20px] border px-4 py-4 ${
              index < employees.length - 1 ? "mb-3" : ""
            }`}
            style={{
              borderColor: adminTheme.border,
              backgroundColor: adminTheme.surface,
            }}
          >
            <View className="mb-4 flex-row items-start justify-between gap-3">
              <View className="flex-1 flex-row items-center">
                <View
                  className="mr-3 h-12 w-12 items-center justify-center rounded-full"
                  style={{ backgroundColor: employee.avatarBg }}
                >
                  <Text
                    className="text-base font-semibold"
                    style={{ color: employee.avatarText }}
                  >
                    {employee.initials}
                  </Text>
                </View>

                <View className="flex-1">
                  <Text className="text-[18px] font-semibold" style={{ color: adminTheme.slate }}>
                    {employee.name}
                  </Text>
                  <Text className="mt-1 text-sm" style={{ color: adminTheme.muted }}>
                    Employee ID: {employee.userId}
                  </Text>
                </View>
              </View>

              <StatusPill label={employee.status} tone={employee.statusTone} />
            </View>

            <View style={{ gap: 12 }}>
              <DetailRow icon="phone" label="Mobile" value={employee.mobile} />
              <DetailRow icon="mail" label="Email" value={employee.email} />
            </View>
            {canEdit ? (
              <View className="mt-4 border-t pt-4" style={{ borderColor: adminTheme.border }}>
                <Text className="text-sm font-medium" style={{ color: adminTheme.primary }}>
                  Edit warehouse access
                </Text>
              </View>
            ) : null}
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

function DesktopEmployees({
  employees,
  canAdd,
  canEdit,
  onAdd,
  onEdit,
}: {
  employees: EmployeeListEntry[];
  canAdd: boolean;
  canEdit: boolean;
  onAdd: () => void;
  onEdit: (employeeId: string) => void;
}) {
  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="mb-5 flex-row items-start justify-between">
        <View>
          <Text className="text-[28px] font-semibold" style={{ color: adminTheme.slate }}>
            Employees
          </Text>
          <Text className="mt-1 text-base" style={{ color: adminTheme.muted }}>
            Manage employee accounts for your organization
          </Text>
        </View>

        <View className="flex-row gap-3">
          <SectionButton title={`${employees.length} Total`} />
          {canAdd ? (
            <SectionButton title="Add Employee" icon="plus" filled onPress={onAdd} />
          ) : null}
        </View>
      </View>

      <SummaryCards employees={employees} />
      <EmployeeTable
        employees={employees}
        canAdd={false}
        canEdit={canEdit}
        onAdd={onAdd}
        onEdit={onEdit}
      />
    </ScrollView>
  );
}

function LoadingState() {
  return (
    <View className="flex-1 items-center justify-center px-6">
      <ActivityIndicator size="large" color={adminTheme.primary} />
      <Text className="mt-4 text-base" style={{ color: adminTheme.muted }}>
        Loading employees...
      </Text>
    </View>
  );
}

function EmptyState({ canAdd, onAdd }: { canAdd: boolean; onAdd: () => void }) {
  return (
    <View className="flex-1 px-4 pt-6">
      <View
        className="rounded-[20px] border px-5 py-6"
        style={{
          borderColor: adminTheme.border,
          backgroundColor: adminTheme.surface,
        }}
      >
        <Text className="text-[18px] font-semibold" style={{ color: adminTheme.slate }}>
          No employees found
        </Text>
        <Text className="mt-2 text-sm leading-6" style={{ color: adminTheme.muted }}>
          There are no employee accounts available for this organization yet.
        </Text>

        {canAdd ? (
          <View className="mt-4 self-start">
            <SectionButton title="Add Employee" icon="plus" filled onPress={onAdd} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default function EmployeesScreen() {
  const { width } = useWindowDimensions();
  const { user } = useAuthSession();
  const isMobile = width < 1024;
  const canManageEmployees = user?.role === "admin";

  const [employees, setEmployees] = useState<EmployeeListEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const openAddEmployee = () => router.push("/employees/new");
  const openEditEmployee = (employeeId: string) =>
    router.push(
      {
        pathname: "/employees/new",
        params: { userId: employeeId },
      } as unknown as Href
    );

  const fetchUsers = useCallback(async () => {
    setLoading(true);

    try {
      const data = await apiService.getUserDetails("");
      setEmployees(data.map((employee, index) => formatEmployee(employee, index)));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchUsers();
    }, [fetchUsers])
  );

  if (loading) {
    return <LoadingState />;
  }

  if (employees.length === 0) {
    return <EmptyState canAdd={canManageEmployees} onAdd={openAddEmployee} />;
  }

  return isMobile ? (
    <MobileEmployees
      employees={employees}
      canAdd={canManageEmployees}
      canEdit={canManageEmployees}
      onAdd={openAddEmployee}
      onEdit={openEditEmployee}
    />
  ) : (
    <DesktopEmployees
      employees={employees}
      canAdd={canManageEmployees}
      canEdit={canManageEmployees}
      onAdd={openAddEmployee}
      onEdit={openEditEmployee}
    />
  );
}
