import { router } from "expo-router";
import { Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { employees } from "@/features/employees/data/employeeData";
import { currentUser } from "@/features/profile/data/currentUser";
import { adminTheme } from "@/theme/adminTheme";

const stats = [
  {
    label: "Total employees",
    value: "6",
    color: "#1f5ea8",
  },
  {
    label: "Audits assigned",
    value: "4",
    color: "#4f7d1f",
  },
  {
    label: "Pending submission",
    value: "2",
    color: "#9c6306",
  },
  {
    label: "Asset mismatches",
    value: "17",
    color: "#a3262d",
  },
] as const;

const auditCards = [
  {
    title: "Floor 3 - IT Assets",
    meta: "Block A - 48 assets - Aman",
    status: "Submitted",
    statusTone: "info",
    progress: 1,
    progressLabel: "48 / 48 scanned",
    footer: "20 Mar - 9:30 AM",
  },
  {
    title: "Warehouse - Furniture",
    meta: "Block B - 112 assets - Naman",
    status: "In progress",
    statusTone: "warning",
    progress: 0.18,
    progressLabel: "20 / 112 scanned",
    footer: "18% complete",
  },
  {
    title: "Server Room - Equipment",
    meta: "Block C - 28 assets - jatin",
    status: "Completed",
    statusTone: "success",
    progress: 1,
    progressLabel: "28 / 28 scanned",
    footer: "19 Mar",
  },
  {
    title: "Reception - Furniture",
    meta: "Block D - 34 assets - Unassigned",
    status: "Not started",
    statusTone: "muted",
    progress: 0,
    progressLabel: "0 / 34 scanned",
    footer: "No assignee yet",
  },
] as const;

type Tone = "info" | "warning" | "success" | "muted";

function getPillStyles(tone: Tone) {
  switch (tone) {
    case "info":
      return { bg: adminTheme.infoBg, text: adminTheme.primary };
    case "warning":
      return { bg: adminTheme.warningBg, text: adminTheme.warningText };
    case "success":
      return { bg: adminTheme.successBg, text: adminTheme.successText };
    default:
      return { bg: adminTheme.mutedBg, text: adminTheme.mutedText };
  }
}

function getProgressColor(tone: Tone) {
  switch (tone) {
    case "info":
      return adminTheme.primary;
    case "warning":
      return adminTheme.warningText;
    case "success":
      return adminTheme.successText;
    default:
      return adminTheme.border;
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

function MobileHeader() {
  return (
    <View className="mb-5 border-b px-4 pb-4 pt-3" style={{ borderColor: adminTheme.border }}>
      <View className="mb-4 items-center">
        {/* <View className="rounded-full bg-[#f6e6c7] px-5 py-2">
          <Text className="text-xs font-medium tracking-[0.4px] text-[#8a5b11]">
            Screen 2 - Admin dashboard
          </Text>
        </View> */}
      </View>

      <View className="flex-row items-start justify-between">
        <View>
          <View className="self-start rounded-full px-3 py-1" style={{ backgroundColor: adminTheme.accentGoldSoft }}>
            <Text className="text-xs font-medium" style={{ color: adminTheme.accentGold }}>
              {currentUser.roleBadge}
            </Text>
          </View>
          <Text className="mt-3 text-[30px] font-semibold" style={{ color: adminTheme.slate }}>
            {currentUser.name}
          </Text>
        </View>

        <Pressable
          onPress={() => router.push("/profile")}
          className="h-12 w-12 items-center justify-center rounded-full"
          style={{ backgroundColor: currentUser.avatarBg }}
        >
          <Text
            className="text-base font-semibold"
            style={{ color: currentUser.avatarText }}
          >
            {currentUser.initials}
          </Text>
        </Pressable>
      </View>
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

function MobileStatsGrid({ width }: { width: number }) {
  const horizontalPadding = 32;
  const columnGap = 10;
  const cardWidth = (width - horizontalPadding - columnGap) / 2;

  return (
    <View className="mb-6 flex-row flex-wrap justify-between px-4">
      {stats.map((stat, index) => (
        <View
          key={stat.label}
          className="rounded-[16px] border px-4 py-4"
          style={{
            width: cardWidth,
            marginBottom: index < stats.length - 2 ? columnGap : 0,
            backgroundColor: adminTheme.surfaceAlt,
            borderColor: adminTheme.border,
          }}
        >
          <Text
            className="text-[22px] font-semibold"
            style={{ color: stat.color }}
          >
            {stat.value}
          </Text>
          <Text className="mt-1 text-sm" style={{ color: adminTheme.muted }}>
            {stat.label
              .replace("Total ", "")
              .replace(" submission", "")
              .replace("Asset ", "")}
          </Text>
        </View>
      ))}
    </View>
  );
}

function DashboardTable({ onAddEmployee }: { onAddEmployee: () => void }) {
  return (
    <View className="overflow-hidden rounded-[20px] border bg-white" style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}>
      <View className="flex-row items-center justify-between border-b px-4 py-3.5" style={{ borderColor: adminTheme.border }}>
        <Text className="text-[20px] font-semibold" style={{ color: adminTheme.slate }}>Employees</Text>
        <Pressable
          onPress={onAddEmployee}
          className="rounded-xl px-3.5 py-2.5"
          style={{ backgroundColor: adminTheme.primary }}
        >
          <Text className="text-xs font-semibold text-white">+ Add</Text>
        </Pressable>
      </View>

      <View className="border-b px-4 py-3" style={{ borderColor: adminTheme.border }}>
        <View className="flex-row">
          <Text className="flex-[1.6] text-xs font-medium" style={{ color: adminTheme.muted }}>Name</Text>
          <Text className="flex-[1.5] text-xs font-medium" style={{ color: adminTheme.muted }}>Department</Text>
          <Text className="flex-[2] text-xs font-medium" style={{ color: adminTheme.muted }}>Assigned audit</Text>
          <Text className="flex-[1.1] text-xs font-medium" style={{ color: adminTheme.muted }}>Status</Text>
          <Text className="flex-[1] text-xs font-medium" style={{ color: adminTheme.muted }}>Last active</Text>
        </View>
      </View>

      {employees.map((employee, index) => (
        <View
          key={employee.name}
          className={`px-4 py-3.5 ${index < employees.length - 1 ? "border-b" : ""}`}
          style={index < employees.length - 1 ? { borderColor: adminTheme.border } : undefined}
        >
          <View className="flex-row items-center">
            <View className="flex-[1.6] flex-row items-center">
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
              <Text className="text-sm font-medium" style={{ color: adminTheme.slate }}>{employee.name}</Text>
            </View>
            <Text className="flex-[1.5] text-sm" style={{ color: adminTheme.slate }}>{employee.department}</Text>
            <Text className="flex-[2] text-sm" style={{ color: adminTheme.slate }}>{employee.audit}</Text>
            <View className="flex-[1.1]">
              <StatusPill label={employee.status} tone={employee.statusTone} />
            </View>
            <Text className="flex-[1] text-sm" style={{ color: adminTheme.slate }}>{employee.activeAt}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function MobileEmployeeCards({ onAddEmployee }: { onAddEmployee: () => void }) {
  return (
    <View className="mb-6 px-4">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-[18px] font-semibold" style={{ color: adminTheme.slate }}>Employees</Text>
        <Pressable onPress={onAddEmployee}>
          <Text className="text-base font-medium" style={{ color: adminTheme.primary }}>+ Add</Text>
        </Pressable>
      </View>

      {employees.map((employee, index) => (
        <View
          key={employee.name}
          className={`rounded-[18px] border bg-white p-4 ${
            index < employees.length - 1 ? "mb-3" : ""
          }`}
          style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
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
              <View>
                <Text className="text-[18px] font-medium" style={{ color: adminTheme.slate }}>{employee.name}</Text>
                <Text className="text-sm" style={{ color: adminTheme.muted }}>
                  {employee.audit === "-" ? "No audit assigned" : employee.audit.toLowerCase()}
                </Text>
              </View>
            </View>
            <StatusPill label={employee.status} tone={employee.statusTone} />
          </View>
        </View>
      ))}
    </View>
  );
}

function MobileAuditCards() {
  return (
    <View className="px-4 pb-2">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-[18px] font-semibold" style={{ color: adminTheme.slate }}>
          Audit submissions
        </Text>
        <Pressable>
          <Text className="text-base font-medium" style={{ color: adminTheme.primary }}>View all</Text>
        </Pressable>
      </View>

      {auditCards.slice(0, 2).map((card, index) => (
        <View
          key={card.title}
          className={`rounded-[18px] border bg-white p-4 ${
            index === 0 ? "mb-3" : ""
          }`}
          style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
        >
          <View className="mb-2 flex-row items-start justify-between gap-3">
            <Text className="flex-1 text-[18px] font-semibold" style={{ color: adminTheme.slate }}>
              {card.title}
            </Text>
            <StatusPill label={card.status} tone={card.statusTone} />
          </View>

          <Text className="text-sm" style={{ color: adminTheme.muted }}>
            {card.meta.split(" - ")[0]}
          </Text>
          <Text className="mt-2 text-sm" style={{ color: adminTheme.muted }}>
            {card.title === "Floor 3 - IT Assets"
              ? "by Aman - 20 Mar - 9:30 AM"
              : "assigned to Subhasmita"}
          </Text>
        </View>
      ))}
    </View>
  );
}

function MobileDashboard() {
  const { width } = useWindowDimensions();
  const openAddEmployee = () => router.push("/employees/new");

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <MobileHeader />
      <MobileStatsGrid width={width} />
      <MobileEmployeeCards onAddEmployee={openAddEmployee} />
      <MobileAuditCards />
    </ScrollView>
  );
}

function DesktopDashboard({ width }: { width: number }) {
  const isWide = width >= 1280;
  const openAddEmployee = () => router.push("/employees/new");

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="mb-5">
        <View
          className="flex-row items-center justify-between"
          style={{ flexWrap: width < 900 ? "wrap" : "nowrap", rowGap: 14 }}
        >
          <View>
            <Text className="text-[28px] font-semibold" style={{ color: adminTheme.slate }}>Dashboard</Text>
            <Text className="mt-1 text-sm" style={{ color: adminTheme.muted }}>
              Overview of all audits and employees
            </Text>
          </View>

          <View className="flex-row gap-3">
            <SectionButton title="Export" />
            <SectionButton
              title="+ Add Employee"
              filled
              onPress={openAddEmployee}
            />
          </View>
        </View>
      </View>

      <View className="mb-5 flex-row flex-wrap gap-3">
        {stats.map((stat) => (
          <View
            key={stat.label}
            className="min-w-[180px] flex-1 rounded-[18px] border px-4 py-4"
            style={{ backgroundColor: adminTheme.surfaceAlt, borderColor: adminTheme.border }}
          >
            <Text
              className="text-[28px] font-semibold"
              style={{ color: stat.color }}
            >
              {stat.value}
            </Text>
            <Text className="mt-1 text-sm" style={{ color: adminTheme.muted }}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View className="mb-5 flex-row flex-wrap gap-3">
        {auditCards.map((card) => (
          <View
            key={card.title}
            className="rounded-[18px] border bg-white p-4"
            style={{ width: isWide ? "49%" : "100%", borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
          >
            <View className="mb-1 flex-row items-start justify-between gap-4">
              <View className="flex-1">
                <Text className="text-[22px] font-semibold" style={{ color: adminTheme.slate }}>
                  {card.title}
                </Text>
                <Text className="mt-1 text-sm" style={{ color: adminTheme.muted }}>{card.meta}</Text>
              </View>
              <StatusPill label={card.status} tone={card.statusTone} />
            </View>

            <View className="mt-4 h-[4px] rounded-full" style={{ backgroundColor: adminTheme.border }}>
              <View
                className="h-[4px] rounded-full"
                style={{
                  width: `${card.progress * 100}%`,
                  backgroundColor: getProgressColor(card.statusTone),
                }}
              />
            </View>

            <View className="mt-3 flex-row items-center justify-between">
              <Text className="text-sm" style={{ color: adminTheme.slateSoft }}>{card.progressLabel}</Text>
              <Text className="text-sm" style={{ color: adminTheme.muted }}>{card.footer}</Text>
            </View>
          </View>
        ))}
      </View>

      <DashboardTable onAddEmployee={openAddEmployee} />

      
    </ScrollView>
  );
}

export default function DashboardScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 1024;

  return isMobile ? <MobileDashboard /> : <DesktopDashboard width={width} />;
}
