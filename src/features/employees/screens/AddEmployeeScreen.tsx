import { useAuthSession } from "@/features/auth/hooks/useAuthSession";
import { OrganizationAddress } from "@/models/organization";
import { WarehouseSummary } from "@/models/warehouse";
import {
  CreateUserRequest,
  UserDetails,
  WarehouseApiRecord,
  apiService,
} from "@/network/ApiService";
import { getApiErrorMessage } from "@/network/responses";
import { adminTheme } from "@/theme/adminTheme";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";

const userTypeOptions = [
  { label: "Admin", value: 1 },
  { label: "Employee", value: 3 },
] as const;

type UserTypeValue = (typeof userTypeOptions)[number]["value"];

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  editable?: boolean;
  error?: string;
  onBlur?: () => void;
};

type EmployeeFormValues = {
  firstName: string;
  middleName: string;
  lastName: string;
  employeeId: string;
  email: string;
  mobile: string;
  userType: UserTypeValue;
  selectedWarehouseIds: string[];
};

const EMPTY_FORM_VALUES: EmployeeFormValues = {
  firstName: "",
  middleName: "",
  lastName: "",
  employeeId: "",
  email: "",
  mobile: "",
  userType: 3,
  selectedWarehouseIds: [],
};

function pickString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function pickId(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function getAddressSubtitle(address: unknown) {
  if (!address || typeof address !== "object") {
    return null;
  }

  const addressRecord = address as OrganizationAddress & Record<string, unknown>;
  const parts = [
    pickString(addressRecord, ["Address1"]),
    pickString(addressRecord, ["Address2"]),
    pickString(addressRecord, ["CityName"]),
    pickString(addressRecord, ["StateName"]),
    pickString(addressRecord, ["CountryName"]),
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" - ") : null;
}

function normalizeWarehouse(record: WarehouseApiRecord, index: number): WarehouseSummary {
  const id =
    pickId(record, ["Id", "ID", "WarehouseId", "warehouseId"]) ??
    `warehouse-${index + 1}`;
  const name =
    pickString(record, [
      "WareHouseName",
      "WarehouseName",
      "Name",
      "Title",
      "ShortName",
      "warehouseName",
    ]) ?? "";
  const code = pickString(record, [
    "Code",
    "WarehouseCode",
    "ShortName",
    "ReferenceId",
    "warehouseCode",
  ]);
  const subtitle =
    [
      code,
      pickString(record, ["CityName", "cityName"]),
      pickString(record, ["StateName", "stateName"]),
      getAddressSubtitle(record.Address),
    ]
      .filter(Boolean)
      .join(" - ") || null;

  return {
    id,
    name,
    code,
    subtitle,
    raw: record,
  };
}

function normalizeWarehouses(records: WarehouseApiRecord[]) {
  const seen = new Set<string>();

  return records
    .map((record, index) => normalizeWarehouse(record, index))
    .filter((warehouse) => {
      if (seen.has(warehouse.id)) {
        return false;
      }

      seen.add(warehouse.id);
      return true;
    });
}

function toWarehouseId(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim();
    return trimmedValue ? trimmedValue : null;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;

    return (
      pickId(record, [
        "Id",
        "ID",
        "WarehouseId",
        "warehouseId",
        "WareHouseId",
        "wareHouseId",
        "Value",
        "value",
      ]) ?? null
    );
  }

  return null;
}

function collectWarehouseIds(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => toWarehouseId(entry))
      .filter((entry): entry is string => Boolean(entry));
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  const id = toWarehouseId(value);
  return id ? [id] : [];
}

function extractAssignedWarehouseIds(source: unknown) {
  if (!source || typeof source !== "object") {
    return [];
  }

  const record = source as Record<string, unknown>;
  const warehouseCandidates = [
    record.WarehouseIds,
    record.WareHouseIds,
    record.warehouseIds,
    record.wareHouseIds,
    record.AssignedWarehouseIds,
    record.AssignedWareHouseIds,
    record.AccessWarehouseIds,
    record.AccessWareHouseIds,
    record.WarehouseList,
    record.WareHouseList,
    record.Warehouses,
    record.warehouses,
    record.AccessWarehouses,
    record.AssignedWarehouses,
    record.WarehouseId,
    record.WareHouseId,
    record.warehouseId,
    record.wareHouseId,
  ];

  return Array.from(
    new Set(warehouseCandidates.flatMap((candidate) => collectWarehouseIds(candidate)))
  );
}

function normalizeUserType(userType: unknown): UserTypeValue {
  return Number(userType) === 1 ? 1 : 3;
}

function mapUserDetailsToFormValues(user: UserDetails): EmployeeFormValues {
  return {
    firstName: typeof user.FirstName === "string" ? user.FirstName : "",
    middleName: typeof user.MiddleName === "string" ? user.MiddleName : "",
    lastName: typeof user.LastName === "string" ? user.LastName : "",
    employeeId: typeof user.UserId === "string" ? user.UserId : "",
    email: typeof user.EmailId === "string" ? user.EmailId : "",
    mobile: typeof user.Mobile === "string" ? user.Mobile : "",
    userType: normalizeUserType(user.UserType),
    selectedWarehouseIds: extractAssignedWarehouseIds(user),
  };
}

function getDefaultUserAddress(): NonNullable<CreateUserRequest["Address"]> {
  return {
    Id: 0,
    Address1: "",
    Address2: "",
    City: 0,
    CityName: "",
    DistrictId: 0,
    DistrictName: "",
    StateId: 101,
    StateName: "",
    CountryId: 101,
    CountryName: "",
    Pin: 0,
  };
}

function buildEmployeePayload(values: EmployeeFormValues): CreateUserRequest {
  return {
    UserId: values.employeeId,
    FirstName: values.firstName,
    MiddleName: values.middleName || undefined,
    LastName: values.lastName,
    UserType: values.userType,
    EmailId: values.email || undefined,
    Mobile: values.mobile,
    Address: getDefaultUserAddress(),
    GSTTypeID: 2,
    GSTType: "Un-Register",
  };
}

function buildWarehouseAccessRequest(values: EmployeeFormValues) {
  return {
    AssignTo: values.employeeId,
    WareHouseId: values.selectedWarehouseIds.join(","),
    Description: "",
  };
}

function normalizeRouteUserId(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  required = false,
  keyboardType = "default",
  autoCapitalize = "sentences",
  editable = true,
  error,
  onBlur,
}: FieldProps) {
  return (
    <View className="flex-1">
      <Text className="mb-2 text-sm" style={{ color: adminTheme.muted }}>
        {label}
        {required ? " *" : ""}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={error || placeholder}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        editable={editable}
        placeholderTextColor={error ? "#DC2626" : adminTheme.muted}
        onBlur={onBlur}
        className="rounded-[14px] border px-4 py-3.5 text-base"
        style={{
          borderColor: error ? "#DC2626" : adminTheme.border,
          backgroundColor: editable ? adminTheme.surface : adminTheme.surfaceAlt,
          color: adminTheme.slate,
          opacity: editable ? 1 : 0.75,
        }}
      />
      {error ? (
        <Text className="mt-2 text-xs" style={{ color: "#DC2626" }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function Banner({
  message,
  tone,
}: {
  message: string;
  tone: "error" | "success" | "info";
}) {
  const styles =
    tone === "error"
      ? { bg: "#FFF5F5", border: "#F5C2C7", text: "#A83D3D" }
      : tone === "success"
        ? { bg: adminTheme.successBg, border: "#B9E2C4", text: adminTheme.successText }
        : { bg: adminTheme.infoBg, border: "#C9D8FF", text: adminTheme.primary };

  return (
    <View
      className="rounded-[16px] border px-4 py-3.5"
      style={{ backgroundColor: styles.bg, borderColor: styles.border }}
    >
      <Text className="text-sm leading-5" style={{ color: styles.text }}>
        {message}
      </Text>
    </View>
  );
}

function UserTypeField({
  value,
  isOpen,
  isMobile,
  editable = true,
  onToggle,
  onSelect,
}: {
  value: UserTypeValue;
  isOpen: boolean;
  isMobile: boolean;
  editable?: boolean;
  onToggle: () => void;
  onSelect: (value: UserTypeValue) => void;
}) {
  const selectedLabel =
    userTypeOptions.find((option) => option.value === value)?.label ?? "Select";

  return (
    <View className="flex-1">
      <Text className="mb-2 text-sm" style={{ color: adminTheme.muted }}>
        User Type *
      </Text>
      <Pressable
        onPress={editable ? onToggle : undefined}
        className="flex-row items-center justify-between rounded-[14px] border px-4 py-3.5"
        style={{
          borderColor: isOpen ? adminTheme.primary : adminTheme.border,
          backgroundColor: adminTheme.surfaceAlt,
          opacity: editable ? 1 : 0.75,
        }}
      >
        <Text className="text-base" style={{ color: adminTheme.slateSoft }}>
          {selectedLabel}
        </Text>
        <Feather name="chevron-down" size={16} color={adminTheme.muted} />
      </Pressable>

      {isOpen && editable ? (
        <View
          className="mt-3 overflow-hidden rounded-[14px] border"
          style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
        >
          {userTypeOptions.map((option, index) => {
            const selected = option.value === value;

            return (
              <Pressable
                key={option.value}
                onPress={() => onSelect(option.value)}
                className={`flex-row items-center justify-between px-4 py-3.5 ${
                  index < userTypeOptions.length - 1 ? "border-b" : ""
                }`}
                style={
                  index < userTypeOptions.length - 1
                    ? { borderColor: adminTheme.border }
                    : undefined
                }
              >
                <Text
                  className={`${isMobile ? "text-base" : "text-base"} font-medium`}
                  style={{ color: selected ? adminTheme.primary : adminTheme.slate }}
                >
                  {option.label}
                </Text>
                {selected ? (
                  <Feather name="check" size={16} color={adminTheme.primary} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function summarizeSelectedWarehouses(
  warehouses: WarehouseSummary[],
  selectedWarehouseIds: string[]
) {
  if (selectedWarehouseIds.length === 0) {
    return "Select one or more warehouses";
  }

  const selectedWarehouses = warehouses.filter((warehouse) =>
    selectedWarehouseIds.includes(warehouse.id)
  );

  if (selectedWarehouses.length === 0) {
    return `${selectedWarehouseIds.length} warehouses selected`;
  }

  if (selectedWarehouses.length === 1) {
    return selectedWarehouses[0].name;
  }

  if (selectedWarehouses.length === 2) {
    return `${selectedWarehouses[0].name}, ${selectedWarehouses[1].name}`;
  }

  return `${selectedWarehouses[0].name}, ${selectedWarehouses[1].name} +${
    selectedWarehouses.length - 2
  } more`;
}

function WarehouseAccessField({
  warehouses,
  selectedWarehouseIds,
  isOpen,
  isLoading,
  error,
  onToggle,
  onToggleWarehouse,
  onClear,
  onRetry,
}: {
  warehouses: WarehouseSummary[];
  selectedWarehouseIds: string[];
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;
  onToggle: () => void;
  onToggleWarehouse: (warehouseId: string) => void;
  onClear: () => void;
  onRetry: () => void;
}) {
  const summary = summarizeSelectedWarehouses(warehouses, selectedWarehouseIds);

  return (
    <View>
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-sm" style={{ color: adminTheme.muted }}>
          Warehouse Access *
        </Text>
        {selectedWarehouseIds.length > 0 ? (
          <Pressable onPress={onClear}>
            <Text className="text-xs font-medium" style={{ color: adminTheme.primary }}>
              Clear selection
            </Text>
          </Pressable>
        ) : null}
      </View>

      <Pressable
        onPress={onToggle}
        className="flex-row items-center justify-between rounded-[14px] border px-4 py-3.5"
        style={{
          borderColor: isOpen ? adminTheme.primary : adminTheme.border,
          backgroundColor: adminTheme.surfaceAlt,
        }}
      >
        <View className="flex-1 pr-3">
          <Text className="text-base" style={{ color: adminTheme.slateSoft }}>
            {summary}
          </Text>
          <Text className="mt-1 text-xs" style={{ color: adminTheme.muted }}>
            {selectedWarehouseIds.length} selected
          </Text>
        </View>
        <Feather name="chevron-down" size={16} color={adminTheme.muted} />
      </Pressable>

      {isOpen ? (
        <View
          className="mt-3 overflow-hidden rounded-[14px] border"
          style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
        >
          {isLoading ? (
            <View className="px-4 py-4">
              <Text className="text-sm" style={{ color: adminTheme.muted }}>
                Loading organization warehouses...
              </Text>
            </View>
          ) : error ? (
            <View className="px-4 py-4">
              <Text className="text-sm leading-5" style={{ color: "#A83D3D" }}>
                {error}
              </Text>
              <Pressable onPress={onRetry} className="mt-3 self-start">
                <Text className="text-sm font-medium" style={{ color: adminTheme.primary }}>
                  Retry
                </Text>
              </Pressable>
            </View>
          ) : warehouses.length === 0 ? (
            <View className="px-4 py-4">
              <Text className="text-sm leading-5" style={{ color: adminTheme.muted }}>
                No warehouses were returned for this organization.
              </Text>
            </View>
          ) : (
            <View>
              {warehouses.map((warehouse, index) => {
                const selected = selectedWarehouseIds.includes(warehouse.id);

                return (
                  <Pressable
                    key={warehouse.id}
                    onPress={() => onToggleWarehouse(warehouse.id)}
                    className={`flex-row items-start justify-between px-4 py-3.5 ${
                      index < warehouses.length - 1 ? "border-b" : ""
                    }`}
                    style={
                      index < warehouses.length - 1
                        ? { borderColor: adminTheme.border }
                        : undefined
                    }
                  >
                    <View className="flex-1 pr-3">
                      <Text
                        className="text-base font-medium"
                        style={{ color: selected ? adminTheme.primary : adminTheme.slate }}
                      >
                        {warehouse.name || warehouse.code || "Unnamed warehouse"}
                      </Text>
                      {warehouse.subtitle ? (
                        <Text className="mt-1 text-xs leading-5" style={{ color: adminTheme.muted }}>
                          {warehouse.subtitle}
                        </Text>
                      ) : null}
                    </View>
                    <View
                      className="mt-0.5 h-5 w-5 items-center justify-center rounded-md border"
                      style={{
                        borderColor: selected ? adminTheme.primary : adminTheme.border,
                        backgroundColor: selected ? adminTheme.primary : adminTheme.surface,
                      }}
                    >
                      {selected ? <Feather name="check" size={12} color="#ffffff" /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

function LoadingState({ title }: { title: string }) {
  return (
    <View className="flex-1 items-center justify-center px-6">
      <ActivityIndicator size="large" color={adminTheme.primary} />
      <Text className="mt-4 text-base" style={{ color: adminTheme.muted }}>
        {title}
      </Text>
    </View>
  );
}

export default function AddEmployeeScreen() {
  const { width } = useWindowDimensions();
  const { organization, refreshOrganization } = useAuthSession();
  const { userId } = useLocalSearchParams<{ userId?: string | string[] }>();
  const isMobile = width < 1024;
  const isWide = width >= 1260;
  const editingUserId = normalizeRouteUserId(userId).trim();
  const isEditMode = Boolean(editingUserId);

  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [mobile, setMobile] = useState("");
  const [userType, setUserType] = useState<UserTypeValue>(3);
  const [selectedWarehouseIds, setSelectedWarehouseIds] = useState<string[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseSummary[]>([]);
  const [warehouseError, setWarehouseError] = useState<string | null>(null);
  const [isLoadingWarehouses, setIsLoadingWarehouses] = useState(false);
  const [userTypeOpen, setUserTypeOpen] = useState(false);
  const [warehousePickerOpen, setWarehousePickerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingEmployee, setIsLoadingEmployee] = useState(isEditMode);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const hasSelectedWarehouses = selectedWarehouseIds.length > 0;
  const resetFeedback = () => {
    setSubmitError("");
    setSubmitSuccess("");
    setEmailError("");
  };

  const applyFormValues = (values: EmployeeFormValues) => {
    setFirstName(values.firstName);
    setMiddleName(values.middleName);
    setLastName(values.lastName);
    setEmployeeId(values.employeeId);
    setEmail(values.email);
    setEmailError("");
    setMobile(values.mobile);
    setUserType(values.userType);
    setSelectedWarehouseIds(values.selectedWarehouseIds);
  };

  const loadWarehouses = useCallback(async () => {
    setIsLoadingWarehouses(true);
    setWarehouseError(null);

    try {
      const resolvedOrganization = organization ?? (await refreshOrganization());

      if (!resolvedOrganization) {
        setWarehouses([]);
        setWarehouseError("Unable to load organization details for warehouse access.");
        return;
      }

      const records = await apiService.getWarehouses(1, 50);
      setWarehouses(normalizeWarehouses(records));
    } catch (error) {
      setWarehouses([]);
      setWarehouseError(
        getApiErrorMessage(error, "Unable to load organization warehouses right now.")
      );
    } finally {
      setIsLoadingWarehouses(false);
    }
  }, [organization, refreshOrganization]);

  useEffect(() => {
    void loadWarehouses();
  }, [loadWarehouses]);

  useEffect(() => {
    if (!isEditMode) {
      applyFormValues(EMPTY_FORM_VALUES);
      setIsLoadingEmployee(false);
      return;
    }

    const loadEmployee = async () => {
      setIsLoadingEmployee(true);
      resetFeedback();

      try {
        const employees = await apiService.getUserDetails(editingUserId, 1, 10);
        const employee =
          employees.find((entry) => entry.UserId?.trim() === editingUserId) ?? employees[0];

        if (!employee) {
          setSubmitError("No employee details were returned for this user.");
          return;
        }

        applyFormValues(mapUserDetailsToFormValues(employee));
      } catch (error) {
        setSubmitError(
          getApiErrorMessage(error, "Unable to load employee details right now.")
        );
      } finally {
        setIsLoadingEmployee(false);
      }
    };

    void loadEmployee();
  }, [editingUserId, isEditMode]);

  const handleToggleWarehouse = (warehouseId: string) => {
    setSelectedWarehouseIds((current) =>
      current.includes(warehouseId)
        ? current.filter((id) => id !== warehouseId)
        : [...current, warehouseId]
    );
    resetFeedback();
  };

  const normalizeNameInput = (value: string) => value.replace(/[^A-Za-z\s'-]/g, "");
  const normalizeMobileInput = (value: string) => value.replace(/\D/g, "").slice(0, 10);
  const normalizeEmailInput = (value: string) => {
    const filtered = value.replace(/[^A-Za-z0-9@._+-]/g, "");
    const parts = filtered.split("@");
    if (parts.length <= 2) {
      return filtered;
    }
    return `${parts[0]}@${parts.slice(1).join("")}`;
  };

  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleSubmit = async () => {
    const values: EmployeeFormValues = {
      firstName: firstName.trim(),
      middleName: middleName.trim(),
      lastName: lastName.trim(),
      employeeId: employeeId.trim(),
      email: email.trim(),
      mobile: mobile.trim(),
      userType,
      selectedWarehouseIds,
    };

    if (!values.firstName) {
      setSubmitError("First Name is required.");
      return;
    }

    if (!values.lastName) {
      setSubmitError("Last Name is required.");
      return;
    }

    if (/[0-9]/.test(values.firstName) || /[0-9]/.test(values.lastName) || /[0-9]/.test(values.middleName)) {
      setSubmitError("Name fields cannot contain numbers.");
      return;
    }

    if (!values.employeeId) {
      setSubmitError("Employee ID is required.");
      return;
    }

    if (!values.mobile) {
      setSubmitError("Mobile is required.");
      return;
    }

    if (!/^[0-9]{10}$/.test(values.mobile)) {
      setSubmitError("Mobile must be a valid 10-digit number.");
      return;
    }

    if (values.email && !isValidEmail(values.email)) {
      setEmailError("Enter a valid email address.");
      setSubmitError("Enter a valid email address.");
      return;
    }

    if (values.selectedWarehouseIds.length === 0) {
      setSubmitError("Select at least one warehouse for employee access.");
      return;
    }

    setIsSubmitting(true);
    resetFeedback();

    try {
      if (isEditMode) {
        await apiService.updateWarehouseAccess(buildWarehouseAccessRequest(values));
        setSubmitSuccess("Employee access updated successfully.");
      } else {
        await apiService.createUser(buildEmployeePayload(values));
        try {
          await apiService.updateWarehouseAccess(buildWarehouseAccessRequest(values));
        } catch (warehouseAccessError) {
          setSubmitError(
            getApiErrorMessage(
              warehouseAccessError,
              "Employee was created, but assigning warehouse access failed. Open the employee again and retry warehouse assignment."
            )
          );
          return;
        }

        setSubmitSuccess("Employee created and warehouse access assigned successfully.");
        applyFormValues(EMPTY_FORM_VALUES);
      }
    } catch (error) {
      setSubmitError(
        getApiErrorMessage(
          error,
          isEditMode
            ? "Unable to update the employee right now."
            : "Unable to create the employee right now."
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isEditMode && isLoadingEmployee) {
    return <LoadingState title="Loading employee details..." />;
  }

  const title = isEditMode ? "Edit Employee" : "Add Employee";
  const subtitle = isEditMode
    ? "Update employee warehouse access"
    : "Create a user and assign warehouse access";
  const infoMessage = isEditMode
    ? "Only warehouse access is updated here because the backend currently provides the WarehouseAccess API for edits."
    : "Required fields are First Name, Last Name, Employee ID, Mobile, User Type, and at least one warehouse access selection.";

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={
        isMobile ? { paddingBottom: 24 } : { paddingHorizontal: 20, paddingVertical: 20 }
      }
      showsVerticalScrollIndicator={false}
    >
      {isMobile ? (
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
                Admin user setup
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
                {title}
              </Text>
              <Text className="mt-1 text-sm" style={{ color: adminTheme.muted }}>
                {subtitle}
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View className="mb-6 flex-row items-start justify-between">
          <View>
            <Text className="text-[28px] font-semibold" style={{ color: adminTheme.slate }}>
              {title}
            </Text>
            <Text className="mt-1 text-sm" style={{ color: adminTheme.muted }}>
              {subtitle}
            </Text>
          </View>

          <View className="flex-row gap-3">
            <Pressable
              onPress={() => router.back()}
              className="rounded-xl border bg-white px-5 py-2.5"
              style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
            >
              <Text className="text-sm font-medium" style={{ color: adminTheme.slate }}>
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={() => void handleSubmit()}
              disabled={isSubmitting || !hasSelectedWarehouses}
              className="rounded-xl px-5 py-2.5"
              style={{
                backgroundColor: isSubmitting ? adminTheme.primaryDark : adminTheme.primary,
                opacity: isSubmitting || !hasSelectedWarehouses ? 0.8 : 1,
              }}
            >
              <Text className="text-sm font-semibold text-white">
                {isSubmitting
                  ? isEditMode
                    ? "Saving..."
                    : "Creating..."
                  : isEditMode
                    ? "Save Changes"
                    : "Create Employee"}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      <View className={isMobile ? "px-4 pt-4" : ""}>
        <View
          className="rounded-[18px] border bg-white p-5"
          style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
        >
          <Text className="mb-5 text-[18px] font-semibold" style={{ color: adminTheme.slate }}>
            Employee details
          </Text>

          {submitError ? (
            <View className="mb-4">
              <Banner message={submitError} tone="error" />
            </View>
          ) : null}

          {submitSuccess ? (
            <View className="mb-4">
              <Banner message={submitSuccess} tone="success" />
            </View>
          ) : (
            <View className="mb-4">
              <Banner message={infoMessage} tone="info" />
            </View>
          )}

          <View className="mb-5 flex-row gap-4" style={{ flexWrap: isWide ? "nowrap" : "wrap" }}>
            <Field
              label="First Name"
              value={firstName}
              placeholder="Enter first name"
              required
              editable={!isEditMode}
              autoCapitalize="words"
              onChangeText={(value) => {
                setFirstName(normalizeNameInput(value));
                resetFeedback();
              }}
            />
            <Field
              label="Middle Name"
              value={middleName}
              placeholder="Enter middle name (optional)"
              editable={!isEditMode}
              autoCapitalize="words"
              onChangeText={(value) => {
                setMiddleName(normalizeNameInput(value));
                resetFeedback();
              }}
            />
            <Field
              label="Last Name"
              value={lastName}
              placeholder="Enter last name"
              required
              editable={!isEditMode}
              autoCapitalize="words"
              onChangeText={(value) => {
                setLastName(normalizeNameInput(value));
                resetFeedback();
              }}
            />
          </View>

          <View className="mb-5 flex-row gap-4" style={{ flexWrap: isWide ? "nowrap" : "wrap" }}>
            <Field
              label="Employee ID"
              value={employeeId}
              placeholder="Enter employee ID"
              required
              editable={!isEditMode}
              autoCapitalize="characters"
              onChangeText={(value) => {
                setEmployeeId(value);
                resetFeedback();
              }}
            />
            <Field
              label="Email"
              value={email}
              placeholder="Enter email address"
              required={false}
              editable={!isEditMode}
              keyboardType="email-address"
              autoCapitalize="none"
              error={emailError}
              onChangeText={(value) => {
                const normalized = normalizeEmailInput(value);
                setEmail(normalized);
                setEmailError(
                  normalized && !isValidEmail(normalized)
                    ? "Enter a valid email address."
                    : ""
                );
                resetFeedback();
              }}
              onBlur={() => {
                if (email && !isValidEmail(email)) {
                  setEmailError("Enter a valid email address.");
                }
              }}
            />
          </View>

          <View className="mb-5 flex-row gap-4" style={{ flexWrap: isWide ? "nowrap" : "wrap" }}>
            <Field
              label="Mobile"
              value={mobile}
              placeholder="Enter 10-digit mobile number"
              required
              editable={!isEditMode}
              keyboardType="phone-pad"
              autoCapitalize="none"
              onChangeText={(value) => {
                setMobile(normalizeMobileInput(value));
                resetFeedback();
              }}
            />
            <UserTypeField
              value={userType}
              isOpen={userTypeOpen}
              isMobile={isMobile}
              editable={!isEditMode}
              onToggle={() => {
                setUserTypeOpen((current) => !current);
                resetFeedback();
              }}
              onSelect={(value) => {
                setUserType(value);
                setUserTypeOpen(false);
                resetFeedback();
              }}
            />
          </View>

          <WarehouseAccessField
            warehouses={warehouses}
            selectedWarehouseIds={selectedWarehouseIds}
            isOpen={warehousePickerOpen}
            isLoading={isLoadingWarehouses}
            error={warehouseError}
            onToggle={() => {
              setWarehousePickerOpen((current) => !current);
              resetFeedback();
            }}
            onToggleWarehouse={handleToggleWarehouse}
            onClear={() => {
              setSelectedWarehouseIds([]);
              resetFeedback();
            }}
            onRetry={() => {
              void loadWarehouses();
            }}
          />
        </View>
      </View>

      {isMobile ? (
        <View className="px-4 pt-4">
          <Pressable
            onPress={() => void handleSubmit()}
            disabled={isSubmitting || !hasSelectedWarehouses}
            className="items-center rounded-[18px] px-5 py-4"
            style={{
              backgroundColor: isSubmitting ? adminTheme.primaryDark : adminTheme.primary,
              opacity: isSubmitting || !hasSelectedWarehouses ? 0.8 : 1,
            }}
          >
            <Text className="text-base font-semibold text-white">
              {isSubmitting
                ? isEditMode
                  ? "Saving..."
                  : "Creating..."
                : isEditMode
                  ? "Save Changes"
                  : "Create Employee"}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}
