import { ReactNode } from "react";
import { Feather } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { DashboardPeriod } from "@/features/dashboard/hooks/useDashboardData";
import { adminTheme } from "@/theme/adminTheme";

export const DASHBOARD_PERIOD_OPTIONS: DashboardPeriod[] = [
  "daily",
  "weekly",
  "monthly",
];

type DashboardStatTone =
  | "primary"
  | "success"
  | "warning"
  | "gold"
  | "employee";

export type DashboardStatItem = {
  label: string;
  value: string;
  helper: string;
  tone: DashboardStatTone;
};

export type DashboardBarItem = {
  label: string;
  value: number;
  helper?: string;
  color?: string;
};

export type DashboardColumnItem = {
  label: string;
  value: number;
  caption?: string;
  color?: string;
};

function getToneColor(tone: DashboardStatTone) {
  switch (tone) {
    case "success":
      return adminTheme.successText;
    case "warning":
      return adminTheme.warningText;
    case "gold":
      return adminTheme.accentGold;
    case "employee":
      return adminTheme.employeePrimary;
    default:
      return adminTheme.primary;
  }
}

function getColumnCount(width: number, isDesktop: boolean) {
  if (isDesktop) {
    return 4;
  }

  return 2;
}

export function PeriodSwitch({
  value,
  onChange,
  accentColor,
}: {
  value: DashboardPeriod;
  onChange: (value: DashboardPeriod) => void;
  accentColor: string;
}) {
  return (
    <View
      className="flex-row flex-wrap self-start rounded-[18px] border p-1"
      style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
    >
      {DASHBOARD_PERIOD_OPTIONS.map((option) => {
        const selected = option === value;

        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            className="rounded-[14px] px-4 py-2.5"
            style={{ backgroundColor: selected ? accentColor : "transparent" }}
          >
            <Text
              className="text-sm font-semibold capitalize"
              style={{ color: selected ? "#ffffff" : adminTheme.slate }}
            >
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ActionButton({
  label,
  icon,
  filled = false,
  accentColor,
  onPress,
  fullWidth = false,
}: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  filled?: boolean;
  accentColor: string;
  onPress: () => void;
  fullWidth?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-center rounded-[16px] border px-4 py-3"
      style={{
        borderColor: filled ? accentColor : adminTheme.border,
        backgroundColor: filled ? accentColor : adminTheme.surface,
        flexGrow: fullWidth ? 1 : 0,
        flexBasis: fullWidth ? 0 : undefined,
      }}
    >
      <Feather
        name={icon}
        size={16}
        color={filled ? "#ffffff" : adminTheme.slate}
      />
      <Text
        className="ml-2 text-sm font-semibold"
        style={{ color: filled ? "#ffffff" : adminTheme.slate }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function ProfileShortcut({
  initials,
  avatarBg,
  avatarText,
  onPress,
}: {
  initials: string;
  avatarBg: string;
  avatarText: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Open profile"
      className="flex-row items-center rounded-full border py-1.5 pl-2 pr-3"
      style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
    >
      <View
        className="mr-2 h-8 w-8 items-center justify-center rounded-full"
        style={{ backgroundColor: avatarBg }}
      >
        <Text className="text-xs font-bold" style={{ color: avatarText }}>
          {initials}
        </Text>
      </View>
      <Text className="text-sm font-semibold" style={{ color: adminTheme.slate }}>
        Profile
      </Text>
    </Pressable>
  );
}

function StatCard({
  label,
  value,
  helper,
  tone,
}: DashboardStatItem) {
  return (
    <View
      className="min-h-[126px] rounded-[20px] border px-4 py-4"
      style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
    >
      <Text className="text-sm font-medium" style={{ color: adminTheme.muted }}>
        {label}
      </Text>
      <Text
        className="mt-3 text-[30px] font-semibold"
        style={{ color: getToneColor(tone) }}
      >
        {value}
      </Text>
      <Text className="mt-2 text-sm leading-5" style={{ color: adminTheme.slateSoft }}>
        {helper}
      </Text>
    </View>
  );
}

export function DashboardStatsGrid({
  stats,
  width,
  isDesktop,
}: {
  stats: DashboardStatItem[];
  width: number;
  isDesktop: boolean;
}) {
  const gap = 12;
  const horizontalPadding = isDesktop ? 40 : 32;
  const columnCount = getColumnCount(width, isDesktop);
  const availableWidth = Math.max(width - horizontalPadding - gap * (columnCount - 1), 0);
  const cardWidth = availableWidth / columnCount;

  return (
    <View className="mt-5 flex-row flex-wrap" style={{ gap }}>
      {stats.map((stat) => (
        <View
          key={stat.label}
          style={{
            width: isDesktop ? undefined : cardWidth,
            flexBasis: isDesktop ? "24%" : undefined,
            flexGrow: isDesktop ? 1 : 0,
          }}
        >
          <StatCard {...stat} />
        </View>
      ))}
    </View>
  );
}

export function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <View
      className="rounded-[24px] border p-5"
      style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
    >
      <Text className="text-[20px] font-semibold" style={{ color: adminTheme.slate }}>
        {title}
      </Text>
      <Text className="mt-1 text-sm leading-5" style={{ color: adminTheme.slateSoft }}>
        {subtitle}
      </Text>
      <View className="mt-5">{children}</View>
    </View>
  );
}

export function EmptyBlock({ message }: { message: string }) {
  return (
    <View
      className="rounded-[18px] border px-4 py-5"
      style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surfaceAlt }}
    >
      <Text className="text-sm leading-5" style={{ color: adminTheme.slateSoft }}>
        {message}
      </Text>
    </View>
  );
}

export function DashboardError({
  message,
  onRetry,
  accentColor,
  borderColor,
  backgroundColor,
}: {
  message: string;
  onRetry: () => void;
  accentColor: string;
  borderColor: string;
  backgroundColor: string;
}) {
  return (
    <View
      className="rounded-[22px] border px-5 py-5"
      style={{ borderColor, backgroundColor }}
    >
      <Text className="text-base font-semibold" style={{ color: accentColor }}>
        Dashboard unavailable
      </Text>
      <Text className="mt-2 text-sm leading-5" style={{ color: adminTheme.slateSoft }}>
        {message}
      </Text>
      <Pressable
        onPress={onRetry}
        className="mt-4 self-start rounded-[14px] px-4 py-2.5"
        style={{ backgroundColor: accentColor }}
      >
        <Text className="text-sm font-semibold text-white">Retry</Text>
      </Pressable>
    </View>
  );
}

export function LoadingState({
  label,
  accentColor,
}: {
  label: string;
  accentColor: string;
}) {
  return (
    <View className="items-center justify-center py-16">
      <Feather name="bar-chart-2" size={28} color={accentColor} />
      <Text className="mt-4 text-sm" style={{ color: adminTheme.slateSoft }}>
        Loading {label.toLowerCase()} data...
      </Text>
    </View>
  );
}

export function HorizontalBarChart({
  title,
  subtitle,
  items,
  accentColor,
  emptyMessage,
}: {
  title: string;
  subtitle: string;
  items: DashboardBarItem[];
  accentColor: string;
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return (
      <SectionCard title={title} subtitle={subtitle}>
        <EmptyBlock message={emptyMessage} />
      </SectionCard>
    );
  }

  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <SectionCard title={title} subtitle={subtitle}>
      {items.map((item, index) => {
        const width = Math.max((item.value / maxValue) * 100, item.value > 0 ? 8 : 0);

        return (
          <View key={`${item.label}-${index}`} className={index < items.length - 1 ? "mb-4" : ""}>
            <View className="mb-2 flex-row items-center justify-between gap-3">
              <Text className="flex-1 text-sm font-semibold" style={{ color: adminTheme.slate }}>
                {item.label}
              </Text>
              <Text className="text-sm font-semibold" style={{ color: item.color ?? accentColor }}>
                {item.value}
              </Text>
            </View>
            <View
              className="h-3 overflow-hidden rounded-full"
              style={{ backgroundColor: adminTheme.mutedBg }}
            >
              <View
                className="h-3 rounded-full"
                style={{
                  width: `${width}%`,
                  backgroundColor: item.color ?? accentColor,
                }}
              />
            </View>
            {item.helper ? (
              <Text className="mt-2 text-xs leading-5" style={{ color: adminTheme.slateSoft }}>
                {item.helper}
              </Text>
            ) : null}
          </View>
        );
      })}
    </SectionCard>
  );
}

export function ColumnChart({
  title,
  subtitle,
  items,
  accentColor,
  emptyMessage,
}: {
  title: string;
  subtitle: string;
  items: DashboardColumnItem[];
  accentColor: string;
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return (
      <SectionCard title={title} subtitle={subtitle}>
        <EmptyBlock message={emptyMessage} />
      </SectionCard>
    );
  }

  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <SectionCard title={title} subtitle={subtitle}>
      <View className="flex-row items-end justify-between" style={{ gap: 10, minHeight: 180 }}>
        {items.map((item, index) => {
          const height = Math.max((item.value / maxValue) * 120, item.value > 0 ? 24 : 8);

          return (
            <View key={`${item.label}-${index}`} className="flex-1 items-center">
              <Text
                className="mb-2 text-xs font-semibold"
                style={{ color: item.color ?? accentColor }}
                numberOfLines={1}
              >
                {item.value}
              </Text>
              <View
                className="w-full rounded-t-[16px]"
                style={{
                  height,
                  backgroundColor: item.color ?? accentColor,
                  opacity: 0.9,
                }}
              />
              <Text
                className="mt-3 text-center text-xs font-medium"
                style={{ color: adminTheme.slate }}
                numberOfLines={2}
              >
                {item.label}
              </Text>
              {item.caption ? (
                <Text
                  className="mt-1 text-center text-[11px]"
                  style={{ color: adminTheme.muted }}
                  numberOfLines={2}
                >
                  {item.caption}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </SectionCard>
  );
}

export function ProgressInsightCard({
  title,
  subtitle,
  valueLabel,
  progress,
  accentColor,
  helper,
}: {
  title: string;
  subtitle: string;
  valueLabel: string;
  progress: number;
  accentColor: string;
  helper: string;
}) {
  const safeProgress = Math.max(0, Math.min(progress, 1));

  return (
    <SectionCard title={title} subtitle={subtitle}>
      <Text className="text-[28px] font-semibold" style={{ color: accentColor }}>
        {valueLabel}
      </Text>
      <View
        className="mt-4 h-3 overflow-hidden rounded-full"
        style={{ backgroundColor: adminTheme.mutedBg }}
      >
        <View
          className="h-3 rounded-full"
          style={{ width: `${safeProgress * 100}%`, backgroundColor: accentColor }}
        />
      </View>
      <Text className="mt-3 text-sm leading-5" style={{ color: adminTheme.slateSoft }}>
        {helper}
      </Text>
    </SectionCard>
  );
}
