import { useAuthSession } from "@/features/auth/hooks/useAuthSession";
import { CreateUserRequest, apiService } from "@/network/ApiService";
import { getApiErrorMessage } from "@/network/responses";
import { adminTheme } from "@/theme/adminTheme";
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
};

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  required = false,
  keyboardType = "default",
  autoCapitalize = "sentences",
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
        placeholder={placeholder}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        placeholderTextColor={adminTheme.muted}
        className="rounded-[14px] border px-4 py-3.5 text-base"
        style={{
          borderColor: adminTheme.border,
          backgroundColor: adminTheme.surface,
          color: adminTheme.slate,
        }}
      />
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
  onToggle,
  onSelect,
}: {
  value: UserTypeValue;
  isOpen: boolean;
  isMobile: boolean;
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
        onPress={onToggle}
        className="flex-row items-center justify-between rounded-[14px] border px-4 py-3.5"
        style={{
          borderColor: isOpen ? adminTheme.primary : adminTheme.border,
          backgroundColor: adminTheme.surfaceAlt,
        }}
      >
        <Text className="text-base" style={{ color: adminTheme.slateSoft }}>
          {selectedLabel}
        </Text>
        <Feather name="chevron-down" size={16} color={adminTheme.muted} />
      </Pressable>

      {isOpen ? (
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

export default function AddEmployeeScreen() {
  const { width } = useWindowDimensions();
  const { organization, refreshOrganization } = useAuthSession();
  const isMobile = width < 1024;
  const isWide = width >= 1260;

  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [userType, setUserType] = useState<UserTypeValue>(3);
  const [userTypeOpen, setUserTypeOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");

  const resetFeedback = () => {
    setSubmitError("");
    setSubmitSuccess("");
  };

 const handleSubmit = async () => {
  const trimmedFirstName = firstName.trim();
  const trimmedMiddleName = middleName.trim();
  const trimmedLastName = lastName.trim();
  const trimmedEmployeeId = employeeId.trim();
  const trimmedEmail = email.trim();
  const trimmedMobile = mobile.trim();

  if (!trimmedFirstName) {
    setSubmitError("First Name is required.");
    return;
  }

  if (!trimmedLastName) {
    setSubmitError("Last Name is required.");
    return;
  }

  if (!trimmedEmployeeId) {
    setSubmitError("Employee ID is required.");
    return;
  }

  if (!trimmedMobile) {
    setSubmitError("Mobile is required.");
    return;
  }

  setIsSubmitting(true);
  resetFeedback();

  try {
   const payload: CreateUserRequest = {
  UserId: trimmedEmployeeId,
  FirstName: trimmedFirstName,
  MiddleName: trimmedMiddleName || undefined,
  LastName: trimmedLastName,
  UserType: userType,
  EmailId: trimmedEmail || undefined,
  Mobile: trimmedMobile,

  // ✅ INTERNAL DEFAULTS (fix for backend crash)
  Address: {
    Id: 0,
    Address1: "",
    Address2: "",
    City: 0,
    CityName: "",
    DistrictId: 0,
    DistrictName: "",
    StateId: 101,
    StateName: "",
    CountryId: 101, // India
    CountryName: "",
    Pin: 0,
  },

  GSTTypeID: 2,
  GSTType: "Un-Register",
};

    await apiService.createUser(payload);

    setSubmitSuccess("Employee created successfully.");

    setFirstName("");
    setMiddleName("");
    setLastName("");
    setEmployeeId("");
    setEmail("");
    setMobile("");
    setUserType(3);
    setUserTypeOpen(false);
  } catch (error) {
    setSubmitError(
      getApiErrorMessage(error, "Unable to create the employee right now.")
    );
  } finally {
    setIsSubmitting(false);
  }
};

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
            <View className="rounded-full px-5 py-2" style={{ backgroundColor: adminTheme.accentGoldSoft }}>
              <Text className="text-xs font-medium tracking-[0.4px]" style={{ color: adminTheme.accentGold }}>
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
                Add Employee
              </Text>
              <Text className="mt-1 text-sm" style={{ color: adminTheme.muted }}>
                Create a user with the existing admin API
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View className="mb-6 flex-row items-start justify-between">
          <View>
            <Text className="text-[28px] font-semibold" style={{ color: adminTheme.slate }}>
              Add Employee
            </Text>
            <Text className="mt-1 text-sm" style={{ color: adminTheme.muted }}>
              Create a user with the existing admin API
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
              disabled={isSubmitting}
              className="rounded-xl px-5 py-2.5"
              style={{
                backgroundColor: isSubmitting ? adminTheme.primaryDark : adminTheme.primary,
                opacity: isSubmitting ? 0.8 : 1,
              }}
            >
              <Text className="text-sm font-semibold text-white">
                {isSubmitting ? "Creating..." : "Create Employee"}
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
              <Banner
                message="Required fields are First Name, Last Name, Employee ID, Mobile, User Type, and the logged-in organization."
                tone="info"
              />
            </View>
          )}

          <View className="mb-5 flex-row gap-4" style={{ flexWrap: isWide ? "nowrap" : "wrap" }}>
            <Field label="First Name" value={firstName} placeholder="Narendra" required autoCapitalize="words" onChangeText={(value) => { setFirstName(value); resetFeedback(); }} />
            <Field label="Middle Name" value={middleName} placeholder="Kumar" autoCapitalize="words" onChangeText={(value) => { setMiddleName(value); resetFeedback(); }} />
            <Field label="Last Name" value={lastName} placeholder="Sharma" required autoCapitalize="words" onChangeText={(value) => { setLastName(value); resetFeedback(); }} />
          </View>

          <View className="mb-5 flex-row gap-4" style={{ flexWrap: isWide ? "nowrap" : "wrap" }}>
            <Field label="Employee ID" value={employeeId} placeholder="EMP-0042" required autoCapitalize="characters" onChangeText={(value) => { setEmployeeId(value); resetFeedback(); }} />
            <Field label="Email" value={email} placeholder="narendra@company.com" keyboardType="email-address" autoCapitalize="none" onChangeText={(value) => { setEmail(value); resetFeedback(); }} />
          </View>

          <View className="flex-row gap-4" style={{ flexWrap: isWide ? "nowrap" : "wrap" }}>
            <Field label="Mobile" value={mobile} placeholder="9876543210" required keyboardType="phone-pad" autoCapitalize="none" onChangeText={(value) => { setMobile(value); resetFeedback(); }} />
            <UserTypeField
              value={userType}
              isOpen={userTypeOpen}
              isMobile={isMobile}
              onToggle={() => {
                setUserTypeOpen((current) => !current);
                setSubmitError("");
              }}
              onSelect={(value) => {
                setUserType(value);
                setUserTypeOpen(false);
                setSubmitError("");
              }}
            />
          </View>
        </View>
      </View>

      {isMobile ? (
        <View className="px-4 pt-4">
          <Pressable
            onPress={() => void handleSubmit()}
            disabled={isSubmitting}
            className="items-center rounded-[18px] px-5 py-4"
            style={{
              backgroundColor: isSubmitting ? adminTheme.primaryDark : adminTheme.primary,
              opacity: isSubmitting ? 0.8 : 1,
            }}
          >
            <Text className="text-base font-semibold text-white">
              {isSubmitting ? "Creating..." : "Create Employee"}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}
