import { useAuthSession } from "@/features/auth/hooks/useAuthSession";
import { UserDetails, apiService } from "@/network/ApiService";
import { adminTheme } from "@/theme/adminTheme";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Href, router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  GestureResponderEvent,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
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

type EmployeeNotice = "created" | "updated" | "deleted";

const EMPLOYEE_PAGE_SIZE = 20;
const LOAD_MORE_SCROLL_THRESHOLD = 240;

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
  onDelete,
}: {
  employees: EmployeeListEntry[];
  canAdd: boolean;
  canEdit: boolean;
  onAdd: () => void;
  onEdit: (employeeId: string) => void;
  onDelete: (employee: EmployeeListEntry) => void;
}) {
  const stopRowPress = (event: GestureResponderEvent) => {
    event.stopPropagation();
  };

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
        {/* Status column hidden for now */}
        {canEdit ? (
          <>
            <Text className="flex-[0.7] text-right text-xs font-medium" style={{ color: adminTheme.muted }}>
              Edit
            </Text>
            <Text className="flex-[0.7] text-right text-xs font-medium" style={{ color: adminTheme.muted }}>
              Delete
            </Text>
          </>
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
            {/* Status column hidden for now */}
            {canEdit ? (
              <>
                <View className="flex-[0.7] items-end">
                  <Pressable
                    onPress={(event) => {
                      stopRowPress(event);
                      onEdit(employee.userId);
                    }}
                    className="h-9 w-9 items-center justify-center rounded-full"
                    style={{ backgroundColor: adminTheme.infoBg }}
                  >
                    <Feather name="edit-2" size={16} color={adminTheme.primary} />
                  </Pressable>
                </View>
                <View className="flex-[0.7] items-end">
                  <Pressable
                    onPress={(event) => {
                      stopRowPress(event);
                      onDelete(employee);
                    }}
                    className="h-9 w-9 items-center justify-center rounded-full"
                    style={{ backgroundColor: "#FEE2E2" }}
                  >
                    <Feather name="trash-2" size={16} color="#DC2626" />
                  </Pressable>
                </View>
              </>
            ) : null}
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function LoadMoreFooter({
  hasMore,
  isLoadingMore,
}: {
  hasMore: boolean;
  isLoadingMore: boolean;
}) {
  if (isLoadingMore) {
    return (
      <View className="items-center py-5">
        <ActivityIndicator size="small" color={adminTheme.primary} />
      </View>
    );
  }

  if (!hasMore) {
    return (
      <Text className="py-5 text-center text-sm" style={{ color: adminTheme.muted }}>
        All employees loaded
      </Text>
    );
  }

  return null;
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
  hasMore,
  isLoadingMore,
  onAdd,
  onEdit,
  onDelete,
  onLoadMore,
}: {
  employees: EmployeeListEntry[];
  canAdd: boolean;
  canEdit: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  onAdd: () => void;
  onEdit: (employeeId: string) => void;
  onDelete: (employee: EmployeeListEntry) => void;
  onLoadMore: () => void;
}) {
  const stopCardPress = (event: GestureResponderEvent) => {
    event.stopPropagation();
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const isNearBottom =
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - LOAD_MORE_SCROLL_THRESHOLD;

    if (isNearBottom) {
      onLoadMore();
    }
  };

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 24 }}
      onScroll={handleScroll}
      scrollEventThrottle={250}
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

              {/* Status pill hidden for now */}
            </View>

            <View style={{ gap: 12 }}>
              <DetailRow icon="phone" label="Mobile" value={employee.mobile} />
              <DetailRow icon="mail" label="Email" value={employee.email} />
            </View>
            {canEdit ? (
              <View
                className="mt-4 flex-row justify-end border-t pt-4"
                style={{ borderColor: adminTheme.border, gap: 10 }}
              >
                <Pressable
                  onPress={(event) => {
                    stopCardPress(event);
                    onEdit(employee.userId);
                  }}
                  className="h-10 w-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: adminTheme.infoBg }}
                >
                  <Feather name="edit-2" size={17} color={adminTheme.primary} />
                </Pressable>
                <Pressable
                  onPress={(event) => {
                    stopCardPress(event);
                    onDelete(employee);
                  }}
                  className="h-10 w-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: "#FEE2E2" }}
                >
                  <Feather name="trash-2" size={17} color="#DC2626" />
                </Pressable>
              </View>
            ) : null}
          </Pressable>
        ))}
        <LoadMoreFooter hasMore={hasMore} isLoadingMore={isLoadingMore} />
      </View>
    </ScrollView>
  );
}

function DesktopEmployees({
  employees,
  canAdd,
  canEdit,
  hasMore,
  isLoadingMore,
  onAdd,
  onEdit,
  onDelete,
  onLoadMore,
}: {
  employees: EmployeeListEntry[];
  canAdd: boolean;
  canEdit: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  onAdd: () => void;
  onEdit: (employeeId: string) => void;
  onDelete: (employee: EmployeeListEntry) => void;
  onLoadMore: () => void;
}) {
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const isNearBottom =
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - LOAD_MORE_SCROLL_THRESHOLD;

    if (isNearBottom) {
      onLoadMore();
    }
  };

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 20 }}
      onScroll={handleScroll}
      scrollEventThrottle={250}
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
        onDelete={onDelete}
      />
      <LoadMoreFooter hasMore={hasMore} isLoadingMore={isLoadingMore} />
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

function DeleteEmployeeModal({
  employee,
  isDeleting,
  errorMessage,
  onCancel,
  onProceed,
}: {
  employee: EmployeeListEntry | null;
  isDeleting: boolean;
  errorMessage: string;
  onCancel: () => void;
  onProceed: () => void;
}) {
  return (
    <Modal
      animationType="fade"
      transparent
      visible={Boolean(employee)}
      onRequestClose={isDeleting ? undefined : onCancel}
    >
      <View
        className="flex-1 items-center justify-center px-5"
        style={{ backgroundColor: "rgba(15, 23, 42, 0.42)" }}
      >
        <View
          className="w-full max-w-[420px] rounded-[20px] border px-5 py-5"
          style={{
            borderColor: adminTheme.border,
            backgroundColor: adminTheme.surface,
          }}
        >
          <View className="mb-4 flex-row items-center">
            <View
              className="mr-3 h-11 w-11 items-center justify-center rounded-full"
              style={{ backgroundColor: "#FEE2E2" }}
            >
              <Feather name="trash-2" size={20} color="#DC2626" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-semibold" style={{ color: adminTheme.slate }}>
                Delete employee
              </Text>
              {employee ? (
                <Text className="mt-0.5 text-sm" style={{ color: adminTheme.muted }}>
                  {employee.name}
                </Text>
              ) : null}
            </View>
          </View>

          <Text className="text-sm leading-6" style={{ color: adminTheme.slateSoft }}>
            If you proceed, the employee will be deleted.
          </Text>

          {errorMessage ? (
            <Text className="mt-3 text-sm" style={{ color: "#DC2626" }}>
              {errorMessage}
            </Text>
          ) : null}

          <View className="mt-5 flex-row justify-end" style={{ gap: 10 }}>
            <Pressable
              disabled={isDeleting}
              onPress={onCancel}
              className="rounded-xl border px-4 py-2.5"
              style={{
                borderColor: adminTheme.border,
                backgroundColor: adminTheme.surface,
                opacity: isDeleting ? 0.6 : 1,
              }}
            >
              <Text className="text-sm font-semibold" style={{ color: adminTheme.slate }}>
                Cancel
              </Text>
            </Pressable>
            <Pressable
              disabled={isDeleting}
              onPress={onProceed}
              className="min-w-[96px] flex-row items-center justify-center rounded-xl px-4 py-2.5"
              style={{
                backgroundColor: "#DC2626",
                opacity: isDeleting ? 0.8 : 1,
              }}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text className="text-sm font-semibold text-white">Proceed</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function EmployeeSuccessModal({
  notice,
  onClose,
}: {
  notice: EmployeeNotice | null;
  onClose: () => void;
}) {
  const messages: Record<EmployeeNotice, string> = {
    created: "Employee created successfully.",
    updated: "Employee updated successfully.",
    deleted: "Employee deleted successfully.",
  };

  return (
    <Modal
      animationType="fade"
      transparent
      visible={Boolean(notice)}
      onRequestClose={onClose}
    >
      <View
        className="flex-1 items-center justify-center px-5"
        style={{ backgroundColor: "rgba(15, 23, 42, 0.42)" }}
      >
        <View
          className="w-full max-w-[380px] rounded-[20px] border px-5 py-5"
          style={{
            borderColor: adminTheme.border,
            backgroundColor: adminTheme.surface,
          }}
        >
          <View className="mb-4 flex-row items-center">
            <View
              className="mr-3 h-11 w-11 items-center justify-center rounded-full"
              style={{ backgroundColor: adminTheme.successBg }}
            >
              <Feather name="check" size={22} color={adminTheme.successText} />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-semibold" style={{ color: adminTheme.slate }}>
                Success
              </Text>
              <Text className="mt-0.5 text-sm" style={{ color: adminTheme.muted }}>
                {notice ? messages[notice] : ""}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={onClose}
            className="items-center rounded-xl px-4 py-3"
            style={{ backgroundColor: adminTheme.primary }}
          >
            <Text className="text-sm font-semibold text-white">OK</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default function EmployeesScreen() {
  const { width } = useWindowDimensions();
  const { user } = useAuthSession();
  const { notice } = useLocalSearchParams<{ notice?: string | string[] }>();
  const isMobile = width < 1024;
  const canManageEmployees = user?.role === "admin";

  const [employees, setEmployees] = useState<EmployeeListEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreEmployees, setHasMoreEmployees] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const employeeRequestIdRef = useRef(0);
  const [employeeToDelete, setEmployeeToDelete] =
    useState<EmployeeListEntry | null>(null);
  const [employeeNotice, setEmployeeNotice] = useState<EmployeeNotice | null>(null);
  const [isDeletingEmployee, setIsDeletingEmployee] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const openAddEmployee = () => router.push("/employees/new");
  const openEditEmployee = (employeeId: string) =>
    router.push(
      {
        pathname: "/employees/new",
        params: { userId: employeeId },
      } as unknown as Href
    );
  const requestDeleteEmployee = (employee: EmployeeListEntry) => {
    setDeleteError("");
    setEmployeeToDelete(employee);
  };
  const cancelDeleteEmployee = () => {
    if (isDeletingEmployee) {
      return;
    }

    setEmployeeToDelete(null);
    setDeleteError("");
  };
  const confirmDeleteEmployee = async () => {
    if (!employeeToDelete?.userId || employeeToDelete.userId === "N/A") {
      setDeleteError("Employee ID is required to delete this employee.");
      return;
    }

    setIsDeletingEmployee(true);
    setDeleteError("");

    try {
      await apiService.deleteEmployeeWarehouse(employeeToDelete.userId);
      setEmployees((currentEmployees) =>
        currentEmployees.filter(
          (employee) => employee.userId !== employeeToDelete.userId
        )
      );
      setEmployeeToDelete(null);
      setEmployeeNotice("deleted");
    } catch (error) {
      console.error(error);
      setDeleteError("Unable to delete the employee right now.");
    } finally {
      setIsDeletingEmployee(false);
    }
  };

  const fetchUsersPage = useCallback(async (pageNo: number, replace = false) => {
    const requestId = employeeRequestIdRef.current + 1;
    employeeRequestIdRef.current = requestId;

    if (replace) {
      setLoading(true);
      setHasMoreEmployees(true);
      setCurrentPage(0);
    } else {
      setLoadingMore(true);
    }

    try {
      const data = await apiService.getUserDetails(
        "",
        pageNo,
        EMPLOYEE_PAGE_SIZE
      );

      if (employeeRequestIdRef.current !== requestId) {
        return;
      }

      setEmployees((currentEmployees) => {
        const pageEmployees = data.map((employee, index) =>
          formatEmployee(
            employee,
            replace ? index : currentEmployees.length + index
          )
        );

        if (replace) {
          return pageEmployees;
        }

        const existingIds = new Set(
          currentEmployees.map((employee) => employee.userId)
        );
        const newEmployees = pageEmployees.filter(
          (employee) => !existingIds.has(employee.userId)
        );

        return [...currentEmployees, ...newEmployees];
      });
      setCurrentPage(pageNo);
      setHasMoreEmployees(data.length > 0);
    } catch (error) {
      console.error(error);
    } finally {
      if (employeeRequestIdRef.current === requestId) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    await fetchUsersPage(1, true);
  }, [fetchUsersPage]);

  const loadMoreEmployees = useCallback(() => {
    if (loading || loadingMore || !hasMoreEmployees) {
      return;
    }

    void fetchUsersPage(currentPage + 1);
  }, [
    currentPage,
    fetchUsersPage,
    hasMoreEmployees,
    loading,
    loadingMore,
  ]);

  useFocusEffect(
    useCallback(() => {
      void fetchUsers();
    }, [fetchUsers])
  );

  useEffect(() => {
    const routeNotice = Array.isArray(notice) ? notice[0] : notice;

    if (
      routeNotice === "created" ||
      routeNotice === "updated" ||
      routeNotice === "deleted"
    ) {
      setEmployeeNotice(routeNotice);
    }
  }, [notice]);

  const closeEmployeeNotice = () => {
    setEmployeeNotice(null);

    if (notice) {
      router.replace("/employees");
    }
  };

  if (loading) {
    return (
      <>
        <LoadingState />
        <EmployeeSuccessModal
          notice={employeeNotice}
          onClose={closeEmployeeNotice}
        />
      </>
    );
  }

  if (employees.length === 0) {
    return (
      <>
        <EmptyState canAdd={canManageEmployees} onAdd={openAddEmployee} />
        <EmployeeSuccessModal
          notice={employeeNotice}
          onClose={closeEmployeeNotice}
        />
      </>
    );
  }

  return (
    <>
      {isMobile ? (
        <MobileEmployees
          employees={employees}
          canAdd={canManageEmployees}
          canEdit={canManageEmployees}
          hasMore={hasMoreEmployees}
          isLoadingMore={loadingMore}
          onAdd={openAddEmployee}
          onEdit={openEditEmployee}
          onDelete={requestDeleteEmployee}
          onLoadMore={loadMoreEmployees}
        />
      ) : (
        <DesktopEmployees
          employees={employees}
          canAdd={canManageEmployees}
          canEdit={canManageEmployees}
          hasMore={hasMoreEmployees}
          isLoadingMore={loadingMore}
          onAdd={openAddEmployee}
          onEdit={openEditEmployee}
          onDelete={requestDeleteEmployee}
          onLoadMore={loadMoreEmployees}
        />
      )}

      <DeleteEmployeeModal
        employee={employeeToDelete}
        isDeleting={isDeletingEmployee}
        errorMessage={deleteError}
        onCancel={cancelDeleteEmployee}
        onProceed={confirmDeleteEmployee}
      />

      <EmployeeSuccessModal
        notice={employeeNotice}
        onClose={closeEmployeeNotice}
      />
    </>
  );
}
