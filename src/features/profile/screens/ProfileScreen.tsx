import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { currentUser } from "../data/currentUser";
import { adminTheme } from "@/theme/adminTheme";

type ProfileFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
};

function ProfileField({ label, value, onChangeText }: ProfileFieldProps) {
  return (
    <View className="flex-1">
      <Text className="mb-2 text-sm" style={{ color: adminTheme.muted }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={adminTheme.muted}
        className="rounded-[14px] border px-4 py-3.5 text-base"
        style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface, color: adminTheme.slate }}
      />
    </View>
  );
}

function MobileProfile() {
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [employeeId, setEmployeeId] = useState(currentUser.employeeId);
  const [department, setDepartment] = useState(currentUser.department);
  const [phone, setPhone] = useState(currentUser.phone);
  const [location, setLocation] = useState(currentUser.location);
  const [saved, setSaved] = useState(false);

  const handleSave = () => setSaved(true);

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
            style={{ backgroundColor: currentUser.avatarBg }}
          >
            <Text
              className="text-base font-semibold"
              style={{ color: currentUser.avatarText }}
            >
              {currentUser.initials}
            </Text>
          </View>
        </View>

        <View className="self-start rounded-full px-3 py-1" style={{ backgroundColor: adminTheme.accentGoldSoft }}>
          <Text className="text-xs font-medium" style={{ color: adminTheme.accentGold }}>
            {currentUser.roleBadge}
          </Text>
        </View>
      </View>

      {saved ? (
        <View className="px-4 pt-4">
          <View className="flex-row items-center rounded-[16px] border px-4 py-3" style={{ borderColor: adminTheme.successBg, backgroundColor: adminTheme.successBg }}>
            <Feather name="check-circle" size={18} color={adminTheme.successText} />
            <Text className="ml-3 text-sm font-medium" style={{ color: adminTheme.successText }}>
              Profile changes saved locally
            </Text>
          </View>
        </View>
      ) : null}

      <View className="px-4 pt-4">
        <View className="mb-4">
          <ProfileField label="Full name" value={name} onChangeText={setName} />
        </View>
        <View className="mb-4">
          <ProfileField
            label="Email address"
            value={email}
            onChangeText={setEmail}
          />
        </View>
        <View className="mb-4">
          <ProfileField
            label="Employee ID"
            value={employeeId}
            onChangeText={setEmployeeId}
          />
        </View>
        <View className="mb-4">
          <ProfileField
            label="Department"
            value={department}
            onChangeText={setDepartment}
          />
        </View>
        <View className="mb-4">
          <ProfileField label="Phone" value={phone} onChangeText={setPhone} />
        </View>
        <ProfileField
          label="Location"
          value={location}
          onChangeText={setLocation}
        />
      </View>

      <View className="px-4 pt-5">
        <Pressable onPress={handleSave} className="items-center rounded-[18px] px-5 py-4" style={{ backgroundColor: adminTheme.primary }}>
          <Text className="text-base font-semibold text-white">Save Changes</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function DesktopProfile() {
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [employeeId, setEmployeeId] = useState(currentUser.employeeId);
  const [department, setDepartment] = useState(currentUser.department);
  const [phone, setPhone] = useState(currentUser.phone);
  const [location, setLocation] = useState(currentUser.location);
  const [saved, setSaved] = useState(false);

  const handleSave = () => setSaved(true);

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

        <Pressable onPress={handleSave} className="rounded-xl px-5 py-2.5" style={{ backgroundColor: adminTheme.primary }}>
          <Text className="text-sm font-semibold text-white">Save Changes</Text>
        </Pressable>
      </View>

      {saved ? (
        <View className="mb-4 flex-row items-center rounded-[16px] border px-4 py-3" style={{ borderColor: adminTheme.successBg, backgroundColor: adminTheme.successBg }}>
          <Feather name="check-circle" size={18} color={adminTheme.successText} />
          <Text className="ml-3 text-sm font-medium" style={{ color: adminTheme.successText }}>
            Profile changes saved locally
          </Text>
        </View>
      ) : null}

      <View className="rounded-[20px] border bg-white p-5" style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}>
        <View className="mb-6 flex-row items-center">
          <View
            className="mr-4 h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: currentUser.avatarBg }}
          >
            <Text
              className="text-lg font-semibold"
              style={{ color: currentUser.avatarText }}
            >
              {currentUser.initials}
            </Text>
          </View>

          <View>
            <Text className="text-[22px] font-semibold" style={{ color: adminTheme.slate }}>
              {name}
            </Text>
            <Text className="mt-1 text-sm" style={{ color: adminTheme.muted }}>{currentUser.role}</Text>
            <View className="mt-2 self-start rounded-full px-3 py-1" style={{ backgroundColor: adminTheme.accentGoldSoft }}>
              <Text className="text-xs font-medium" style={{ color: adminTheme.accentGold }}>
                {currentUser.roleBadge}
              </Text>
            </View>
          </View>
        </View>

        <View className="mb-5 flex-row gap-4">
          <ProfileField label="Full name" value={name} onChangeText={setName} />
          <ProfileField
            label="Email address"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View className="mb-5 flex-row gap-4">
          <ProfileField
            label="Employee ID"
            value={employeeId}
            onChangeText={setEmployeeId}
          />
          <ProfileField
            label="Department"
            value={department}
            onChangeText={setDepartment}
          />
        </View>

        <View className="flex-row gap-4">
          <ProfileField label="Phone" value={phone} onChangeText={setPhone} />
          <ProfileField
            label="Location"
            value={location}
            onChangeText={setLocation}
          />
        </View>
      </View>
    </ScrollView>
  );
}

export default function ProfileScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 1024;

  return isMobile ? <MobileProfile /> : <DesktopProfile />;
}
