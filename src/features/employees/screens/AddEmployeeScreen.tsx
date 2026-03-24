import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { adminTheme } from "@/theme/adminTheme";

const auditOptions = [
  {
    id: "floor-3",
    title: "Floor 3 - IT Assets",
    subtitle: "Block A - 48 assets",
  },
  {
    id: "warehouse",
    title: "Warehouse - Furniture",
    subtitle: "Block B - 112 assets",
  },
  {
    id: "reception",
    title: "Reception - Furniture",
    subtitle: "Block D - 34 assets",
  },
] as const;

const departmentOptions = [
  "Asset Management",
  "Frontend Dev",
  "Analyst",
  "Billing",
] as const;

type PermissionKey =
  | "performAudit"
  | "viewReports"
  | "assetMovement"
  | "viewAllReports";

const permissionRows: {
  key: PermissionKey;
  title: string;
  description: string;
}[] = [
  {
    key: "performAudit",
    title: "Perform audit",
    description: "Can scan assets and submit audit reports",
  },
  {
    key: "viewReports",
    title: "View own reports",
    description: "Can see reports for audits they submitted",
  },
  {
    key: "assetMovement",
    title: "Asset movement",
    description: "Can log location and ownership changes",
  },
  {
    key: "viewAllReports",
    title: "View all reports",
    description: "Admin-level access to all audit data",
  },
] as const;

type TextFieldProps = {
  label: string;
  value: string;
  placeholder?: string;
  onChangeText?: (value: string) => void;
};

function TextField({
  label,
  value,
  placeholder,
  onChangeText,
}: TextFieldProps) {
  return (
    <View className="flex-1">
      <Text className="mb-2 text-sm" style={{ color: adminTheme.muted }}>{label}</Text>
      <TextInput
        value={value}
        placeholder={placeholder}
        onChangeText={onChangeText}
        placeholderTextColor={adminTheme.muted}
        className="rounded-[14px] border px-4 py-3.5 text-base"
        style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface, color: adminTheme.slate }}
      />
    </View>
  );
}

function DepartmentField({
  value,
  isMobile,
}: {
  value: string;
  isMobile: boolean;
}) {
  return (
    <View className="flex-1">
      <Text className="mb-2 text-sm" style={{ color: adminTheme.muted }}>Department</Text>
      <Pressable className="flex-row items-center justify-between rounded-[14px] border px-4 py-3.5" style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surfaceAlt }}>
        <Text className={`${isMobile ? "text-base" : "text-base"}`} style={{ color: adminTheme.slateSoft }}>
          {value}
        </Text>
        <Feather name="chevron-down" size={16} color={adminTheme.muted} />
      </Pressable>
    </View>
  );
}

function ToggleSwitch({
  value,
  onToggle,
}: {
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      className="h-7 w-11 rounded-full px-1"
      style={{ justifyContent: "center", backgroundColor: value ? adminTheme.primary : "#CBD5E1" }}
    >
      <View
        className={`h-5 w-5 rounded-full bg-white ${
          value ? "self-end" : "self-start"
        }`}
      />
    </Pressable>
  );
}

function PermissionCard({
  isMobile,
  permissions,
  onToggle,
}: {
  isMobile: boolean;
  permissions: Record<PermissionKey, boolean>;
  onToggle: (key: PermissionKey) => void;
}) {
  const rows = (
    <View
      className={`overflow-hidden ${isMobile ? "rounded-[18px]" : ""}`}
      style={isMobile ? { backgroundColor: adminTheme.surfaceAlt } : undefined}
    >
      {permissionRows.map((row, index) => (
        <View
          key={row.key}
          className={`flex-row items-center justify-between ${
            isMobile ? "px-4 py-3.5" : "py-4"
          } ${index < permissionRows.length - 1 ? "border-b" : ""}`}
          style={index < permissionRows.length - 1 ? { borderColor: adminTheme.border } : undefined}
        >
          <View className="flex-1 pr-4">
            <Text className={`${isMobile ? "text-[15px]" : "text-[16px]"} font-medium`} style={{ color: adminTheme.slate }}>
              {row.title}
            </Text>
            <Text className="mt-1 text-sm" style={{ color: adminTheme.muted }}>{row.description}</Text>
          </View>
          <ToggleSwitch
            value={permissions[row.key]}
            onToggle={() => onToggle(row.key)}
          />
        </View>
      ))}
    </View>
  );

  if (isMobile) {
    return (
      <View className="mt-3 px-4">
        <Text className="mb-3 text-[18px] font-semibold" style={{ color: adminTheme.slate }}>
          Access permissions
        </Text>
        {rows}
      </View>
    );
  }

  return (
    <View className="rounded-[18px] border bg-white p-5" style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}>
      <Text className="mb-5 text-[18px] font-semibold" style={{ color: adminTheme.slate }}>
        Access permissions
      </Text>
      {rows}
    </View>
  );
}

function AuditTaskList({
  isMobile,
  selectedAudit,
  onSelect,
}: {
  isMobile: boolean;
  selectedAudit: string | null;
  onSelect: (id: string) => void;
}) {
  const content = auditOptions.map((option, index) => {
    const selected = selectedAudit === option.id;

    return (
      <Pressable
        key={option.id}
        onPress={() => onSelect(option.id)}
        className={`flex-row items-center rounded-[16px] border px-4 py-3.5 ${index < auditOptions.length - 1 ? "mb-3" : ""}`}
        style={{ borderColor: selected ? adminTheme.primary : adminTheme.border, backgroundColor: adminTheme.surface }}
      >
        <View
          className="mr-3 h-6 w-6 items-center justify-center rounded-[7px] border"
          style={{ borderColor: selected ? adminTheme.primary : adminTheme.border, backgroundColor: selected ? adminTheme.primary : adminTheme.surface }}
        >
          {selected ? <Feather name="check" size={14} color="#ffffff" /> : null}
        </View>

        <View>
          <Text className={`${isMobile ? "text-[16px]" : "text-[16px]"} font-medium`} style={{ color: adminTheme.slate }}>
            {option.title}
          </Text>
          <Text className="mt-1 text-sm" style={{ color: adminTheme.muted }}>{option.subtitle}</Text>
        </View>
      </Pressable>
    );
  });

  if (isMobile) {
    return (
      <View className="mt-5 px-4">
        <Text className="mb-3 text-[18px] font-semibold" style={{ color: adminTheme.slate }}>
          Assign audit task
        </Text>
        {content}
      </View>
    );
  }

  return (
    <View className="rounded-[18px] border bg-white p-5" style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}>
      <Text className="mb-5 text-[18px] font-semibold" style={{ color: adminTheme.slate }}>
        Assign audit task
      </Text>
      {content}
    </View>
  );
}

function DesktopAddEmployee() {
  const { width } = useWindowDimensions();
  const isWide = width >= 1260;
  const [fullName, setFullName] = useState("Narendra Kumar");
  const [employeeId, setEmployeeId] = useState("EMP-0042");
  const [email, setEmail] = useState("");
  const [department] = useState<string>(departmentOptions[0]);
  const [selectedAudit, setSelectedAudit] = useState<string | null>("floor-3");
  const [permissions, setPermissions] = useState<Record<PermissionKey, boolean>>({
    performAudit: true,
    viewReports: true,
    assetMovement: false,
    viewAllReports: false,
  });

  const togglePermission = (key: PermissionKey) => {
    setPermissions((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="mb-6 flex-row items-start justify-between">
        <View>
          <Text className="text-[28px] font-semibold" style={{ color: adminTheme.slate }}>
            Add Employee
          </Text>
          <Text className="mt-1 text-sm" style={{ color: adminTheme.muted }}>
            Grant access and assign an audit task
          </Text>
        </View>

        <View className="flex-row gap-3">
          <Pressable
            onPress={() => router.back()}
            className="rounded-xl border bg-white px-5 py-2.5"
            style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
          >
            <Text className="text-sm font-medium" style={{ color: adminTheme.slate }}>Cancel</Text>
          </Pressable>
          <Pressable className="rounded-xl px-5 py-2.5" style={{ backgroundColor: adminTheme.primary }}>
            <Text className="text-sm font-semibold text-white">
              Save & Send Invite
            </Text>
          </Pressable>
        </View>
      </View>

      <View
        className="flex-row items-start gap-4"
        style={{ flexWrap: isWide ? "nowrap" : "wrap" }}
      >
        <View className="min-w-[300px] flex-1">
          <View className="rounded-[18px] border bg-white p-5" style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}>
            <Text className="mb-5 text-[18px] font-semibold" style={{ color: adminTheme.slate }}>
              Employee details
            </Text>

            <View className="mb-5 flex-row gap-4" style={{ flexWrap: isWide ? "nowrap" : "wrap" }}>
              <TextField
                label="Full name"
                value={fullName}
                onChangeText={setFullName}
              />
              <TextField
                label="Employee ID"
                value={employeeId}
                onChangeText={setEmployeeId}
              />
            </View>

            <View className="flex-row gap-4" style={{ flexWrap: isWide ? "nowrap" : "wrap" }}>
              <TextField
                label="Email address"
                value={email}
                placeholder="narendra@company.com"
                onChangeText={setEmail}
              />
              <DepartmentField value={department} isMobile={false} />
            </View>
          </View>

          <View className="mt-4">
            <PermissionCard
              isMobile={false}
              permissions={permissions}
              onToggle={togglePermission}
            />
          </View>
        </View>

        <View style={{ width: isWide ? 320 : "100%" }}>
          <AuditTaskList
            isMobile={false}
            selectedAudit={selectedAudit}
            onSelect={setSelectedAudit}
          />
        </View>
      </View>
    </ScrollView>
  );
}

function MobileAddEmployee() {
  const [fullName, setFullName] = useState("Narendra Kumar");
  const [employeeId, setEmployeeId] = useState("EMP-0042");
  const [email, setEmail] = useState("");
  const [department] = useState<string>(departmentOptions[0]);
  const [selectedAudit, setSelectedAudit] = useState<string | null>("floor-3");
  const [permissions, setPermissions] = useState<Record<PermissionKey, boolean>>({
    performAudit: true,
    viewReports: true,
    assetMovement: false,
    viewAllReports: false,
  });

  const togglePermission = (key: PermissionKey) => {
    setPermissions((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="border-b px-4 pb-4 pt-3" style={{ borderColor: adminTheme.border }}>
        <View className="mb-4 items-center">
          <View className="rounded-full px-5 py-2" style={{ backgroundColor: adminTheme.accentGoldSoft }}>
            <Text className="text-xs font-medium tracking-[0.4px]" style={{ color: adminTheme.accentGold }}>
              Screen 3 - Add employee
            </Text>
          </View>
        </View>

        <View className="flex-row items-start">
          <Pressable
            onPress={() => router.back()}
            className="mr-3 mt-0.5 h-9 w-9 items-center justify-center rounded-xl border"
            style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
          >
            <Feather name="chevron-left" size={18} color={adminTheme.slateSoft} />
          </Pressable>

          <View className="flex-1">
            <Text className="text-[18px] font-semibold" style={{ color: adminTheme.slate }}>
              Add Employee
            </Text>
            <Text className="mt-1 text-sm" style={{ color: adminTheme.muted }}>
              Grant access & assign audit
            </Text>
          </View>
        </View>
      </View>

      <View className="px-4 pt-4">
        <View className="mb-4">
          <TextField
            label="Full name"
            value={fullName}
            onChangeText={setFullName}
          />
        </View>
        <View className="mb-4">
          <TextField
            label="Employee ID"
            value={employeeId}
            onChangeText={setEmployeeId}
          />
        </View>
        <View className="mb-4">
          <TextField
            label="Email"
            value={email}
            placeholder="narendra@company.com"
            onChangeText={setEmail}
          />
        </View>
        <DepartmentField value={department} isMobile />
      </View>

      <PermissionCard
        isMobile
        permissions={permissions}
        onToggle={togglePermission}
      />

      <AuditTaskList
        isMobile
        selectedAudit={selectedAudit}
        onSelect={setSelectedAudit}
      />

      <View className="px-4 pt-3">
        <Pressable className="items-center rounded-[18px] px-5 py-4" style={{ backgroundColor: adminTheme.primary }}>
          <Text className="text-base font-semibold text-white">
            Save & Send Invite
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

export default function AddEmployeeScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 1024;

  return isMobile ? <MobileAddEmployee /> : <DesktopAddEmployee />;
}
