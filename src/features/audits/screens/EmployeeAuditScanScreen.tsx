import { Feather } from "@expo/vector-icons";
import { Href, router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import {
  employeeInitialScanItems,
  employeeScanOverview,
} from "../data/employeeAuditData";
import { AuditItemTone, AuditScanItem } from "../data/auditScanData";
import { adminTheme } from "@/theme/adminTheme";

function getToneStyles(tone: AuditItemTone) {
  switch (tone) {
    case "found":
      return {
        iconBg: "#EAF5DB",
        icon: "#5D8B1F",
        badgeBg: "#EAF5DB",
        badgeIcon: "#5D8B1F",
      };
    case "missing":
      return {
        iconBg: "#FCE8E8",
        icon: "#C0392B",
        badgeBg: "#FCE8E8",
        badgeIcon: "#C0392B",
      };
    default:
      return {
        iconBg: "#FFF1DB",
        icon: "#B7791F",
        badgeBg: "#FFF1DB",
        badgeIcon: "#B7791F",
      };
  }
}

function getStatusIconName(tone: AuditItemTone): "check" | "x" | "plus" {
  switch (tone) {
    case "found":
      return "check";
    case "missing":
      return "x";
    default:
      return "plus";
  }
}

function useEmployeeScanState() {
  const [isScanning, setIsScanning] = useState(false);
  const [manualAssetId, setManualAssetId] = useState("");
  const [items, setItems] = useState<AuditScanItem[]>(employeeInitialScanItems);

  const summary = useMemo(() => {
    if (!isScanning) {
      return { found: 0, missing: 0, extra: 0, scanned: 0 };
    }

    const dynamicExtra = items.filter((item) => item.tone === "extra").length - 1;

    return {
      found: 32,
      missing: 2,
      extra: 1 + Math.max(dynamicExtra, 0),
      scanned: 35 + Math.max(dynamicExtra, 0),
    };
  }, [isScanning, items]);

  const startAudit = () => setIsScanning(true);

  const addManualAsset = () => {
    const value = manualAssetId.trim();

    if (!value || !isScanning) {
      return;
    }

    setItems((current) => [
      {
        id: value,
        title: "Manual Asset Entry",
        subtitle: `${value} - Added manually`,
        tone: "extra",
        icon: "plus-circle",
      },
      ...current,
    ]);
    setManualAssetId("");
  };

  return {
    isScanning,
    manualAssetId,
    setManualAssetId,
    items,
    summary,
    startAudit,
    addManualAsset,
  };
}

function EmployeeScanningIndicator({ isActive }: { isActive: boolean }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const ripple = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isActive) {
      pulse.stopAnimation();
      ripple.stopAnimation();
      pulse.setValue(1);
      ripple.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1.08,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 1,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(ripple, {
            toValue: 1,
            duration: 1400,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(ripple, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [isActive, pulse, ripple]);

  return (
    <View className="mb-5 h-[84px] w-[84px] items-center justify-center">
      <Animated.View
        className="absolute h-[84px] w-[84px] rounded-full"
        style={{
          backgroundColor: "rgba(15, 110, 86, 0.14)",
          opacity: ripple.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 0.42],
          }),
          transform: [
            {
              scale: ripple.interpolate({
                inputRange: [0, 1],
                outputRange: [0.72, 1.8],
              }),
            },
          ],
        }}
      />
      <Animated.View
        className="h-[62px] w-[62px] items-center justify-center rounded-full border"
        style={{
          backgroundColor: adminTheme.surfaceAlt,
          borderColor: "#B9DFD3",
          transform: [{ scale: pulse }],
        }}
      >
        <Feather
          name={isActive ? "radio" : "play-circle"}
          size={28}
          color={adminTheme.employeePrimary}
        />
      </Animated.View>
    </View>
  );
}

function EmployeeScanPanel({
  isScanning,
  onStartAudit,
  mobile = false,
}: {
  isScanning: boolean;
  onStartAudit: () => void;
  mobile?: boolean;
}) {
  return (
    <View
      className="items-center justify-center rounded-[22px] border px-6 py-10"
      style={{
        borderColor: adminTheme.border,
        borderStyle: "dashed",
        backgroundColor: adminTheme.surface,
      }}
    >
      <EmployeeScanningIndicator isActive={isScanning} />
      <Text
        className="text-[18px] font-semibold"
        style={{ color: adminTheme.employeePrimary }}
      >
        {isScanning ? "Scanning for RFID..." : "Ready to Start Audit"}
      </Text>
      <Text
        className="mt-2 text-center leading-6"
        style={{
          color: adminTheme.slateSoft,
          maxWidth: mobile ? 280 : 520,
          fontSize: mobile ? 14 : 16,
        }}
      >
        {isScanning
          ? "Hold the RFID reader near an asset tag, or enter asset ID manually"
          : "Start the assigned audit to begin tracking assets for this location."}
      </Text>

      {!isScanning ? (
        <Pressable
          onPress={onStartAudit}
          className="mt-5 rounded-[14px] px-6 py-3.5"
          style={{ backgroundColor: adminTheme.employeePrimary }}
        >
          <Text className="text-base font-semibold text-white">Start Audit</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ScanList({ items }: { items: AuditScanItem[] }) {
  return (
    <View>
      {items.map((item, index) => {
        const styles = getToneStyles(item.tone);

        return (
          <View
            key={`${item.id}-${index}`}
          className={`flex-row items-center rounded-[18px] border bg-white px-4 py-4 ${
              index < items.length - 1 ? "mb-3" : ""
            }`}
            style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
          >
            <View
              className="mr-3 h-10 w-10 items-center justify-center rounded-[12px]"
              style={{ backgroundColor: styles.iconBg }}
            >
              <Feather name={item.icon} size={18} color={styles.icon} />
            </View>
            <View className="flex-1">
              <Text className="text-[16px] font-semibold" style={{ color: adminTheme.slate }}>
                {item.title}
              </Text>
              <Text className="mt-1 text-sm" style={{ color: adminTheme.slateSoft }}>
                {item.subtitle}
              </Text>
            </View>
            <View
              className="ml-3 h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: styles.badgeBg }}
            >
              <Feather
                name={getStatusIconName(item.tone)}
                size={16}
                color={styles.badgeIcon}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function DesktopEmployeeAuditScan() {
  const {
    isScanning,
    manualAssetId,
    setManualAssetId,
    items,
    summary,
    startAudit,
    addManualAsset,
  } = useEmployeeScanState();

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="mb-5 flex-row items-start justify-between">
        <View>
          <Text className="text-[28px] font-semibold" style={{ color: adminTheme.slate }}>
            {employeeScanOverview.title}
          </Text>
          <Text className="mt-1 text-base" style={{ color: adminTheme.slateSoft }}>
            {employeeScanOverview.desktopMeta}
          </Text>
        </View>
        <Text className="text-sm" style={{ color: adminTheme.slateSoft }}>
          {summary.scanned} / {employeeScanOverview.totalAssets} scanned
        </Text>
      </View>

      <View className="mb-5 flex-row" style={{ gap: 18, alignItems: "flex-start" }}>
        <View style={{ flex: 1.25 }}>
          <EmployeeScanPanel isScanning={isScanning} onStartAudit={startAudit} />
        </View>

        <View
          className="w-[280px] rounded-[20px] border p-5"
          style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
        >
          <Text className="text-[18px] font-semibold" style={{ color: adminTheme.slate }}>
            Scan progress
          </Text>
          <View className="mt-5 flex-row items-center justify-between">
            <Text className="text-base" style={{ color: adminTheme.slateSoft }}>
              Scanned
            </Text>
            <Text className="text-[18px] font-semibold" style={{ color: adminTheme.slate }}>
              {summary.scanned} / {employeeScanOverview.totalAssets}
            </Text>
          </View>
          <View className="mt-3 h-[4px] rounded-full" style={{ backgroundColor: adminTheme.border }}>
            <View
              className="h-[4px] rounded-full"
              style={{
                width: `${(summary.scanned / employeeScanOverview.totalAssets) * 100}%`,
                backgroundColor: adminTheme.employeePrimary,
              }}
            />
          </View>

          <View className="mt-4 flex-row" style={{ gap: 10 }}>
            {[
              { label: "Found", value: summary.found, bg: "#EAF5DB", color: "#5D8B1F" },
              { label: "Missing", value: summary.missing, bg: "#FCE8E8", color: "#C0392B" },
              { label: "Extra", value: summary.extra, bg: "#FFF1DB", color: "#B7791F" },
            ].map((item) => (
              <View
                key={item.label}
                className="flex-1 items-center rounded-[16px] py-4"
                style={{ backgroundColor: item.bg }}
              >
                <Text className="text-[18px] font-semibold" style={{ color: item.color }}>
                  {item.value}
                </Text>
                <Text className="mt-1 text-xs" style={{ color: item.color }}>
                  {item.label}
                </Text>
              </View>
            ))}
          </View>

          <Pressable
            onPress={() => router.push("/audits/submit" as Href)}
            disabled={!isScanning}
            className="mt-4 items-center rounded-[14px] px-4 py-4"
            style={{
              backgroundColor: isScanning
                ? adminTheme.employeePrimary
                : adminTheme.mutedBg,
            }}
          >
            <Text
              className="text-base font-semibold"
              style={{ color: isScanning ? "#ffffff" : adminTheme.mutedText }}
            >
              {"Proceed to Submit"}
            </Text>
          </Pressable>
        </View>
      </View>

      <View className="mb-5 flex-row items-center" style={{ gap: 10 }}>
        <View
          className="flex-1 flex-row items-center rounded-[14px] border px-4"
          style={{
            borderColor: adminTheme.border,
            backgroundColor: isScanning ? adminTheme.surface : adminTheme.surfaceAlt,
          }}
        >
          <Feather name="search" size={18} color={adminTheme.muted} />
          <TextInput
            value={manualAssetId}
            editable={isScanning}
            onChangeText={setManualAssetId}
            placeholder="Enter asset ID manually (e.g. AST-00182)"
            placeholderTextColor="#94A3B8"
            className="flex-1 py-3 pl-3 text-base"
            style={{ color: adminTheme.slate }}
          />
        </View>
        <Pressable
          onPress={addManualAsset}
          disabled={!isScanning}
          className="rounded-[14px] px-6 py-3.5"
          style={{
            backgroundColor: isScanning
              ? adminTheme.employeePrimary
              : adminTheme.mutedBg,
          }}
        >
          <Text
            className="text-base font-semibold"
            style={{ color: isScanning ? "#ffffff" : adminTheme.mutedText }}
          >
            Add Asset
          </Text>
        </Pressable>
      </View>

      {isScanning ? (
        <ScanList items={items} />
      ) : (
        <View
          className="rounded-[20px] border px-5 py-5"
          style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
        >
          <Text className="text-base" style={{ color: adminTheme.slateSoft }}>
            Start the audit to activate scanning, manual entry, and progress tracking.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function MobileEmployeeAuditScan() {
  const {
    isScanning,
    manualAssetId,
    setManualAssetId,
    items,
    summary,
    startAudit,
    addManualAsset,
  } = useEmployeeScanState();

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="border-b px-4 pb-4 pt-3" style={{ borderColor: adminTheme.border }}>
        <View className="flex-row items-start">
          <Pressable
            onPress={() => router.push("/dashboard")}
            className="mr-3 mt-1 h-9 w-9 items-center justify-center rounded-[12px] border"
            style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
          >
            <Feather name="chevron-left" size={18} color={adminTheme.slateSoft} />
          </Pressable>
          <View className="flex-1">
            <Text className="text-[18px] font-semibold" style={{ color: adminTheme.slate }}>
              {employeeScanOverview.title}
            </Text>
            <Text className="mt-1 text-sm" style={{ color: adminTheme.slateSoft }}>
              {employeeScanOverview.subtitle}
            </Text>
          </View>
        </View>
      </View>

      <View className="px-4 pt-4">
        <EmployeeScanPanel
          isScanning={isScanning}
          onStartAudit={startAudit}
          mobile
        />
      </View>

      <View className="px-4 pt-3">
        <View className="flex-row items-center" style={{ gap: 10 }}>
          <View
            className="flex-1 rounded-[14px] border px-4"
            style={{
              borderColor: adminTheme.border,
              backgroundColor: isScanning ? adminTheme.surface : adminTheme.surfaceAlt,
            }}
          >
            <TextInput
              value={manualAssetId}
              editable={isScanning}
              onChangeText={setManualAssetId}
              placeholder="Enter asset ID manually"
              placeholderTextColor="#94A3B8"
              className="py-3 text-base"
              style={{ color: adminTheme.slate }}
            />
          </View>
          <Pressable
            onPress={addManualAsset}
            disabled={!isScanning}
            className="rounded-[14px] px-5 py-3"
            style={{
              backgroundColor: isScanning
                ? adminTheme.employeePrimary
                : adminTheme.mutedBg,
            }}
          >
            <Text
              className="text-base font-semibold"
              style={{ color: isScanning ? "#ffffff" : adminTheme.mutedText }}
            >
              Add
            </Text>
          </Pressable>
        </View>
      </View>

      <View className="px-4 pt-4">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-[18px] font-semibold" style={{ color: adminTheme.slate }}>
            Scanned so far
          </Text>
          <View
            className="rounded-full px-3 py-1"
            style={{ backgroundColor: adminTheme.employeePrimarySoft }}
          >
            <Text className="text-sm font-medium" style={{ color: adminTheme.employeePrimary }}>
              {summary.scanned} / {employeeScanOverview.totalAssets}
            </Text>
          </View>
        </View>

        {isScanning ? (
          <ScanList items={items} />
        ) : (
          <View
            className="rounded-[18px] border px-4 py-5"
            style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
          >
            <Text className="text-sm" style={{ color: adminTheme.slateSoft }}>
              Start the audit to view scanned asset results.
            </Text>
          </View>
        )}
      </View>

      {isScanning ? (
        <View className="px-4 pt-4">
          <Pressable
            onPress={() => router.push("/audits/submit" as Href)}
            className="items-center rounded-[18px] px-5 py-4"
            style={{ backgroundColor: adminTheme.employeePrimary }}
          >
            <Text className="text-base font-semibold text-white">
              Proceed to Submit
            </Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

export default function EmployeeAuditScanScreen() {
  const { width } = useWindowDimensions();

  return width < 1024 ? <MobileEmployeeAuditScan /> : <DesktopEmployeeAuditScan />;
}
