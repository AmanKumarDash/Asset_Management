import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { ROLE_BADGES, USER_ROLES } from "@/constants/auth";
import { useAuthSession } from "@/features/auth/hooks/useAuthSession";
import { OrganizationDetails } from "@/models/organization";
import { AppUser } from "@/models/user";
import { adminTheme } from "@/theme/adminTheme";

const emptyUser: AppUser = {
  initials: "",
  name: "",
  role: USER_ROLES.EMPLOYEE,
  roleBadge: ROLE_BADGES[USER_ROLES.EMPLOYEE],
  email: "",
  employeeId: "",
  department: "",
  phone: "",
  location: "",
  avatarBg: adminTheme.employeePrimary,
  avatarText: "#ffffff",
  permissions: [],
};

type ProfileFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
};

type ReadonlyFieldProps = {
  label: string;
  value: string;
};

function ProfileField({ label, value, onChangeText }: ProfileFieldProps) {
  return (
    <View className="flex-1">
      <Text className="mb-2 text-sm" style={{ color: adminTheme.muted }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
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

function ReadonlyField({ label, value }: ReadonlyFieldProps) {
  return (
    <View className="flex-1">
      <Text className="mb-2 text-sm" style={{ color: adminTheme.muted }}>
        {label}
      </Text>
      <View
        className="rounded-[14px] border px-4 py-3.5"
        style={{
          borderColor: adminTheme.border,
          backgroundColor: adminTheme.surfaceAlt,
        }}
      >
        <Text className="text-base" style={{ color: adminTheme.slate }}>
          {value || "-"}
        </Text>
      </View>
    </View>
  );
}

function getRoleColors(user: AppUser) {
  return user.role === USER_ROLES.ADMIN
    ? {
        badgeBg: adminTheme.accentGoldSoft,
        badgeText: adminTheme.accentGold,
        primary: adminTheme.primary,
      }
    : {
        badgeBg: adminTheme.employeePrimarySoft,
        badgeText: adminTheme.employeePrimary,
        primary: adminTheme.employeePrimary,
      };
}

function getOrganizationAddress(organization: OrganizationDetails | null) {
  if (!organization?.Address) {
    return "";
  }

  return [
    organization.Address.Address1,
    organization.Address.Address2,
    organization.Address.CityName,
    organization.Address.StateName,
    organization.Address.CountryName,
  ]
    .filter((part): part is string => Boolean(part?.trim()))
    .map((part) => part.trim())
    .join(", ");
}

function getOrganizationContactName(organization: OrganizationDetails | null) {
  const fullName = [organization?.FirstName, organization?.LastName]
    .filter((part): part is string => Boolean(part?.trim()))
    .map((part) => part.trim())
    .join(" ");

  return fullName || organization?.ContactPerson?.trim() || "";
}

function useProfileForm(user: AppUser) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [employeeId, setEmployeeId] = useState(user.employeeId);
  const [department, setDepartment] = useState(user.department);
  const [phone, setPhone] = useState(user.phone);
  const [location, setLocation] = useState(user.location);

  useEffect(() => {
    setName(user.name);
    setEmail(user.email);
    setEmployeeId(user.employeeId);
    setDepartment(user.department);
    setPhone(user.phone);
    setLocation(user.location);
  }, [user]);

  return {
    fields: { name, email, employeeId, department, phone, location },
    setters: {
      setName,
      setEmail,
      setEmployeeId,
      setDepartment,
      setPhone,
      setLocation,
    },
  };
}

function OrganizationSection({ organization }: { organization: OrganizationDetails | null }) {
  return (
    <View
      className="rounded-[20px] border bg-white p-5"
      style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
    >
      <View className="mb-5 flex-row items-center">
        <View
          className="mr-3 h-11 w-11 items-center justify-center rounded-[14px]"
          style={{ backgroundColor: adminTheme.infoBg }}
        >
          <Feather name="briefcase" size={18} color={adminTheme.primary} />
        </View>
        <View className="flex-1">
          <Text className="text-[18px] font-semibold" style={{ color: adminTheme.slate }}>
            Organization Details
          </Text>
          <Text className="mt-1 text-sm" style={{ color: adminTheme.muted }}>
            Loaded from the authenticated `GetDetails` API response
          </Text>
        </View>
      </View>

      {organization ? (
        <>
          <View className="mb-5 flex-row gap-4">
            <ReadonlyField label="Organization name" value={organization.Name?.trim() || ""} />
            <ReadonlyField label="Short name" value={organization.ShortName?.trim() || ""} />
          </View>

          <View className="mb-5 flex-row gap-4">
            <ReadonlyField label="Contact person" value={getOrganizationContactName(organization)} />
            <ReadonlyField label="Email" value={organization.EmailId?.trim() || ""} />
          </View>

          <View className="mb-5 flex-row gap-4">
            <ReadonlyField label="Phone" value={organization.Phone?.trim() || ""} />
            <ReadonlyField label="State" value={organization.Address?.StateName?.trim() || ""} />
          </View>

          <ReadonlyField label="Address" value={getOrganizationAddress(organization)} />
        </>
      ) : (
        <View
          className="rounded-[16px] border px-4 py-4"
          style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surfaceAlt }}
        >
          <Text className="text-sm leading-5" style={{ color: adminTheme.slateSoft }}>
            Organization details are not available in the current session yet.
          </Text>
        </View>
      )}
    </View>
  );
}

function MobileProfile() {
  const { user, organization, updateUser, signOut } = useAuthSession();
  const [saved, setSaved] = useState(false);
  const profileUser = user ?? emptyUser;
  const roleColors = getRoleColors(profileUser);
  const { fields, setters } = useProfileForm(profileUser);

  if (!user) {
    return null;
  }

  const handleSave = () => {
    updateUser({
      name: fields.name,
      email: fields.email,
      employeeId: fields.employeeId,
      department: fields.department,
      phone: fields.phone,
      location: fields.location,
    });
    setSaved(true);
  };

  const handleLogout = () => {
    signOut();
    router.replace("/login");
  };

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="border-b px-4 pb-4 pt-3" style={{ borderColor: adminTheme.border }}>
        <View className="mb-4 flex-row items-center justify-between">
          <View>
            <Text className="text-[22px] font-semibold" style={{ color: adminTheme.slate }}>
              My Profile
            </Text>
            <Text className="mt-1 text-sm" style={{ color: adminTheme.muted }}>
              View and edit your current account details
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

        <View
          className="self-start rounded-full px-3 py-1"
          style={{ backgroundColor: roleColors.badgeBg }}
        >
          <Text className="text-xs font-medium" style={{ color: roleColors.badgeText }}>
            {user.roleBadge}
          </Text>
        </View>
      </View>

      {saved ? (
        <View className="px-4 pt-4">
          <View
            className="flex-row items-center rounded-[16px] border px-4 py-3"
            style={{ borderColor: adminTheme.successBg, backgroundColor: adminTheme.successBg }}
          >
            <Feather name="check-circle" size={18} color={adminTheme.successText} />
            <Text className="ml-3 text-sm font-medium" style={{ color: adminTheme.successText }}>
              Profile changes saved locally
            </Text>
          </View>
        </View>
      ) : null}

      <View className="px-4 pt-4">
        <View className="mb-4">
          <ProfileField label="Full name" value={fields.name} onChangeText={setters.setName} />
        </View>
        <View className="mb-4">
          <ProfileField
            label="Email address"
            value={fields.email}
            onChangeText={setters.setEmail}
          />
        </View>
        <View className="mb-4">
          <ProfileField
            label="Employee ID"
            value={fields.employeeId}
            onChangeText={setters.setEmployeeId}
          />
        </View>
        <View className="mb-4">
          <ProfileField
            label="Department"
            value={fields.department}
            onChangeText={setters.setDepartment}
          />
        </View>
        <View className="mb-4">
          <ProfileField label="Phone" value={fields.phone} onChangeText={setters.setPhone} />
        </View>
        <ProfileField
          label="Location"
          value={fields.location}
          onChangeText={setters.setLocation}
        />
      </View>

      <View className="px-4 pt-4">
        <OrganizationSection organization={organization} />
      </View>

      <View className="px-4 pt-5">
        <Pressable
          onPress={handleSave}
          className="items-center rounded-[18px] px-5 py-4"
          style={{ backgroundColor: roleColors.primary }}
        >
          <Text className="text-base font-semibold text-white">Save Changes</Text>
        </Pressable>
      </View>

      <View className="px-4 pt-3">
        <Pressable
          onPress={handleLogout}
          className="flex-row items-center justify-center rounded-[18px] border px-5 py-4"
          style={{ borderColor: "#F3D3D3", backgroundColor: "#FFF5F5" }}
        >
          <Feather name="log-out" size={18} color="#D64545" />
          <Text className="ml-3 text-base font-semibold" style={{ color: "#D64545" }}>
            Logout
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function DesktopProfile() {
  const { user, organization, updateUser, signOut } = useAuthSession();
  const [saved, setSaved] = useState(false);
  const profileUser = user ?? emptyUser;
  const roleColors = getRoleColors(profileUser);
  const { fields, setters } = useProfileForm(profileUser);

  if (!user) {
    return null;
  }

  const handleSave = () => {
    updateUser({
      name: fields.name,
      email: fields.email,
      employeeId: fields.employeeId,
      department: fields.department,
      phone: fields.phone,
      location: fields.location,
    });
    setSaved(true);
  };

  const handleLogout = () => {
    signOut();
    router.replace("/login");
  };

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="mb-5 flex-row items-center justify-between">
        <View>
          <Text className="text-[28px] font-semibold" style={{ color: adminTheme.slate }}>
            My Profile
          </Text>
          <Text className="mt-1 text-sm" style={{ color: adminTheme.muted }}>
            Review and edit the current logged-in account details
          </Text>
        </View>

        <View className="flex-row" style={{ gap: 12 }}>
          <Pressable
            onPress={handleSave}
            className="rounded-xl px-5 py-2.5"
            style={{ backgroundColor: roleColors.primary }}
          >
            <Text className="text-sm font-semibold text-white">Save Changes</Text>
          </Pressable>
          <Pressable
            onPress={handleLogout}
            className="rounded-xl border px-5 py-2.5"
            style={{ borderColor: "#F3D3D3", backgroundColor: "#FFF5F5" }}
          >
            <Text className="text-sm font-semibold" style={{ color: "#D64545" }}>
              Logout
            </Text>
          </Pressable>
        </View>
      </View>

      {saved ? (
        <View
          className="mb-4 flex-row items-center rounded-[16px] border px-4 py-3"
          style={{ borderColor: adminTheme.successBg, backgroundColor: adminTheme.successBg }}
        >
          <Feather name="check-circle" size={18} color={adminTheme.successText} />
          <Text className="ml-3 text-sm font-medium" style={{ color: adminTheme.successText }}>
            Profile changes saved locally
          </Text>
        </View>
      ) : null}

      <View
        className="mb-5 rounded-[20px] border bg-white p-5"
        style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
      >
        <View className="mb-6 flex-row items-center">
          <View
            className="mr-4 h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: user.avatarBg }}
          >
            <Text className="text-lg font-semibold" style={{ color: user.avatarText }}>
              {user.initials}
            </Text>
          </View>

          <View>
            <Text className="text-[22px] font-semibold" style={{ color: adminTheme.slate }}>
              {fields.name}
            </Text>
            <Text className="mt-1 text-sm" style={{ color: adminTheme.muted }}>
              {user.roleBadge}
            </Text>
            <View
              className="mt-2 self-start rounded-full px-3 py-1"
              style={{ backgroundColor: roleColors.badgeBg }}
            >
              <Text className="text-xs font-medium" style={{ color: roleColors.badgeText }}>
                {user.roleBadge}
              </Text>
            </View>
          </View>
        </View>

        <View className="mb-5 flex-row gap-4">
          <ProfileField label="Full name" value={fields.name} onChangeText={setters.setName} />
          <ProfileField
            label="Email address"
            value={fields.email}
            onChangeText={setters.setEmail}
          />
        </View>

        <View className="mb-5 flex-row gap-4">
          <ProfileField
            label="Employee ID"
            value={fields.employeeId}
            onChangeText={setters.setEmployeeId}
          />
          <ProfileField
            label="Department"
            value={fields.department}
            onChangeText={setters.setDepartment}
          />
        </View>

        <View className="flex-row gap-4">
          <ProfileField label="Phone" value={fields.phone} onChangeText={setters.setPhone} />
          <ProfileField
            label="Location"
            value={fields.location}
            onChangeText={setters.setLocation}
          />
        </View>
      </View>

      <OrganizationSection organization={organization} />
    </ScrollView>
  );
}

export default function ProfileScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 1024;

  return isMobile ? <MobileProfile /> : <DesktopProfile />;
}
