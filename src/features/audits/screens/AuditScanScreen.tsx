import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
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
  AuditItemTone,
  AuditScanItem,
  auditScanOverview,
  initialAuditScanItems,
} from "../data/auditScanData";
import { adminTheme } from "@/theme/adminTheme";

function getToneStyles(tone: AuditItemTone) {
  switch (tone) {
    case "found":
      return {
        dot: "#78A22F",
        iconBg: "#EAF5DB",
        icon: "#78A22F",
        statusBg: "#EAF5DB",
        statusIcon: "#78A22F",
      };
    case "missing":
      return {
        dot: "#D64545",
        iconBg: "#FCE8E8",
        icon: "#A83D3D",
        statusBg: "#FCE8E8",
        statusIcon: "#D64545",
      };
    default:
      return {
        dot: "#C78A2A",
        iconBg: "#FFF1DB",
        icon: "#B97818",
        statusBg: "#FFF1DB",
        statusIcon: "#C78A2A",
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

function useAuditScanState() {
  const [manualAssetId, setManualAssetId] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [items, setItems] = useState(initialAuditScanItems);

  const summary = useMemo(() => {
    if (!isScanning) {
      return { found: 0, missing: 0, extra: 0, scanned: 0 };
    }

    const found = items.filter((item) => item.tone === "found").length + 19;
    const missing = items.filter((item) => item.tone === "missing").length;
    const extra = items.filter((item) => item.tone === "extra").length + 1;
    const scanned = found + missing + extra;

    return { found, missing, extra, scanned };
  }, [isScanning, items]);

  const startAudit = () => {
    setIsScanning(true);
  };

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
    items,
    isScanning,
    manualAssetId,
    setManualAssetId,
    startAudit,
    addManualAsset,
    summary,
  };
}

function LegendRow() {
  const items = [
    { label: "Found", tone: "found" as const },
    { label: "Missing", tone: "missing" as const },
    { label: "Extra", tone: "extra" as const },
  ];

  return (
    <View className="flex-row items-center" style={{ gap: 18 }}>
      {items.map((item) => {
        const styles = getToneStyles(item.tone);

        return (
          <View key={item.label} className="flex-row items-center">
            <View
              className="mr-2 h-3 w-3 rounded-full border"
              style={{ borderColor: styles.dot }}
            />
            <Text className="text-sm" style={{ color: adminTheme.slateSoft }}>
              {item.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function ScanningIndicator({ isActive }: { isActive: boolean }) {
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
          backgroundColor: "rgba(111, 166, 233, 0.18)",
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
          borderColor: "#C7DCF8",
          transform: [{ scale: pulse }],
        }}
      >
        <Feather
          name={isActive ? "radio" : "play-circle"}
          size={28}
          color={isActive ? "#6FA6E9" : adminTheme.primary}
        />
      </Animated.View>
    </View>
  );
}

function ScanPanel({
  isScanning,
  onStartAudit,
}: {
  isScanning: boolean;
  onStartAudit: () => void;
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
      <ScanningIndicator isActive={isScanning} />
      <Text
        className="text-[18px] font-semibold"
        style={{ color: adminTheme.primary }}
      >
        {isScanning ? "Scanning for RFID..." : "Ready to Start Audit"}
      </Text>
      <Text
        className="mt-2 text-center text-base leading-6"
        style={{ color: adminTheme.slateSoft, maxWidth: 520 }}
      >
        {isScanning
          ? "Hold the RFID reader near an asset tag, or enter asset ID manually"
          : "Tap Start Audit to activate RFID scanning for this room and begin logging assets."}
      </Text>

      {!isScanning ? (
        <Pressable
          onPress={onStartAudit}
          className="mt-5 rounded-[14px] px-6 py-3.5"
          style={{ backgroundColor: adminTheme.primary }}
        >
          <Text className="text-base font-semibold text-white">
            Start Audit
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ManualEntryRow({
  value,
  onChange,
  onAdd,
  isScanning,
  mobile = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onAdd: () => void;
  isScanning: boolean;
  mobile?: boolean;
}) {
  return (
    <View className="flex-row items-center" style={{ gap: 10 }}>
      <View
        className="flex-1 flex-row items-center rounded-[14px] border px-4"
        style={{
          borderColor: adminTheme.border,
          backgroundColor: isScanning
            ? adminTheme.surface
            : adminTheme.surfaceAlt,
          opacity: isScanning ? 1 : 0.72,
        }}
      >
        <Feather name="search" size={18} color={adminTheme.muted} />
        <TextInput
          value={value}
          editable={isScanning}
          onChangeText={onChange}
          placeholder={
            mobile
              ? "Enter asset ID manually"
              : "Enter asset ID manually (e.g. AST-00312)"
          }
          placeholderTextColor="#94A3B8"
          className="flex-1 py-3 pl-3 text-base"
          style={{ color: adminTheme.slate }}
        />
      </View>
      <Pressable
        onPress={onAdd}
        disabled={!isScanning}
        className={`items-center justify-center rounded-[14px] ${
          mobile ? "px-5 py-3" : "px-6 py-3.5"
        }`}
        style={{
          backgroundColor: isScanning
            ? adminTheme.primary
            : adminTheme.mutedBg,
        }}
      >
        <Text
          className="text-base font-semibold"
          style={{ color: isScanning ? "#FFFFFF" : adminTheme.mutedText }}
        >
          {mobile ? "Add" : "Add Asset"}
        </Text>
      </Pressable>
    </View>
  );
}

function AuditScanList({ items }: { items: AuditScanItem[] }) {
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
            style={{
              borderColor: adminTheme.border,
              backgroundColor: adminTheme.surface,
            }}
          >
            <View
              className="mr-3 h-10 w-10 items-center justify-center rounded-[12px]"
              style={{ backgroundColor: styles.iconBg }}
            >
              <Feather name={item.icon} size={18} color={styles.icon} />
            </View>

            <View className="flex-1">
              <Text
                className="text-[16px] font-semibold"
                style={{ color: adminTheme.slate }}
              >
                {item.title}
              </Text>
              <Text
                className="mt-1 text-sm"
                style={{ color: adminTheme.slateSoft }}
              >
                {item.subtitle}
              </Text>
            </View>

            <View
              className="ml-3 h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: styles.statusBg }}
            >
              <Feather
                name={getStatusIconName(item.tone)}
                size={16}
                color={styles.statusIcon}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function DesktopProgressCard({
  isScanning,
  scanned,
  found,
  missing,
  extra,
}: {
  isScanning: boolean;
  scanned: number;
  found: number;
  missing: number;
  extra: number;
}) {
  const progress = Math.min(scanned / auditScanOverview.totalAssets, 1);

  const cards = [
    { label: "Found", value: found, bg: "#EAF5DB", text: "#5D8B1F" },
    { label: "Missing", value: missing, bg: "#FCE8E8", text: "#C0392B" },
    { label: "Extra", value: extra, bg: "#FFF1DB", text: "#B7791F" },
  ] as const;

  return (
    <View
      className="rounded-[20px] border p-5"
      style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
    >
      <Text
        className="text-[18px] font-semibold"
        style={{ color: adminTheme.slate }}
      >
        Scan progress
      </Text>

      <View className="mt-5 flex-row items-center justify-between">
        <Text className="text-base" style={{ color: adminTheme.slateSoft }}>
          Scanned
        </Text>
        <Text
          className="text-[18px] font-semibold"
          style={{ color: adminTheme.slate }}
        >
          {scanned} / {auditScanOverview.totalAssets}
        </Text>
      </View>

      <View
        className="mt-3 h-[4px] rounded-full"
        style={{ backgroundColor: adminTheme.border }}
      >
        <View
          className="h-[4px] rounded-full"
          style={{
            width: `${progress * 100}%`,
            backgroundColor: adminTheme.primary,
          }}
        />
      </View>

      <View className="mt-4 flex-row" style={{ gap: 10 }}>
        {cards.map((card) => (
          <View
            key={card.label}
            className="flex-1 items-center rounded-[16px] py-4"
            style={{ backgroundColor: card.bg }}
          >
            <Text
              className="text-[18px] font-semibold"
              style={{ color: card.text }}
            >
              {card.value}
            </Text>
            <Text className="mt-1 text-xs" style={{ color: card.text }}>
              {card.label}
            </Text>
          </View>
        ))}
      </View>

      <Pressable
        disabled={!isScanning}
        className="mt-4 items-center rounded-[14px] px-4 py-4"
        style={{
          backgroundColor: isScanning
            ? adminTheme.primary
            : adminTheme.mutedBg,
        }}
      >
        <Text
          className="text-[18px] font-semibold"
          style={{ color: isScanning ? "#FFFFFF" : adminTheme.mutedText }}
        >
          Proceed to Submit
        </Text>
      </Pressable>
    </View>
  );
}

function MobileAuditScan() {
  const {
    items,
    isScanning,
    manualAssetId,
    setManualAssetId,
    startAudit,
    addManualAsset,
    summary,
  } = useAuditScanState();

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <View
        className="border-b px-4 pb-4 pt-3"
        style={{ borderColor: adminTheme.border }}
      >
        <View className="flex-row items-start">
          <Pressable
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.push("/dashboard");
              }
            }}
            className="mr-3 mt-1 h-9 w-9 items-center justify-center rounded-[12px] border"
            style={{
              borderColor: adminTheme.border,
              backgroundColor: adminTheme.surface,
            }}
          >
            <Feather
              name="chevron-left"
              size={18}
              color={adminTheme.slateSoft}
            />
          </Pressable>

          <View className="flex-1">
            <Text
              className="text-[18px] font-semibold"
              style={{ color: adminTheme.slate }}
            >
              {auditScanOverview.title}
            </Text>
            <Text className="mt-1 text-sm" style={{ color: adminTheme.slateSoft }}>
              {auditScanOverview.subtitle}
            </Text>
          </View>
        </View>
      </View>

      <View className="px-4 pt-4">
        <ScanPanel isScanning={isScanning} onStartAudit={startAudit} />
      </View>

      <View className="px-4 pt-3">
        <ManualEntryRow
          value={manualAssetId}
          onChange={setManualAssetId}
          onAdd={addManualAsset}
          isScanning={isScanning}
          mobile
        />
      </View>

      <View className="px-4 pt-3">
        <View className="mb-3 flex-row items-center justify-between">
          <Text
            className="text-[18px] font-semibold"
            style={{ color: adminTheme.slate }}
          >
            Scanned so far
          </Text>
          <View
            className="rounded-full px-3 py-1"
            style={{ backgroundColor: adminTheme.infoBg }}
          >
            <Text
              className="text-sm font-medium"
              style={{ color: adminTheme.primary }}
            >
              {summary.scanned} / {auditScanOverview.totalAssets}
            </Text>
          </View>
        </View>

        {isScanning ? (
          <AuditScanList items={items} />
        ) : (
          <View
            className="rounded-[18px] border px-4 py-5"
            style={{
              borderColor: adminTheme.border,
              backgroundColor: adminTheme.surface,
            }}
          >
            <Text className="text-sm" style={{ color: adminTheme.slateSoft }}>
              Start the audit to activate scanning and populate asset results.
            </Text>
          </View>
        )}
      </View>

      <View className="px-4 pt-4">
        <View
          className="flex-row items-center justify-center rounded-[16px] px-4 py-3"
          style={{ backgroundColor: adminTheme.surface }}
        >
          <LegendRow />
        </View>
      </View>
    </ScrollView>
  );
}

function DesktopAuditScan({ width }: { width: number }) {
  const {
    items,
    isScanning,
    manualAssetId,
    setManualAssetId,
    startAudit,
    addManualAsset,
    summary,
  } = useAuditScanState();
  const twoColumn = width >= 1340;

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="mb-5 flex-row items-start justify-between">
        <View>
          <Text
            className="text-[28px] font-semibold"
            style={{ color: adminTheme.slate }}
          >
            {auditScanOverview.title}
          </Text>
          <Text className="mt-1 text-base" style={{ color: adminTheme.slateSoft }}>
            {auditScanOverview.desktopMeta}
          </Text>
        </View>
        <Text className="text-[16px]" style={{ color: adminTheme.slateSoft }}>
          {summary.scanned} / {auditScanOverview.totalAssets} scanned
        </Text>
      </View>

      <View
        className="mb-4 flex-row"
        style={{ gap: 18, alignItems: "flex-start" }}
      >
        <View style={{ flex: 1.25 }}>
          <ScanPanel isScanning={isScanning} onStartAudit={startAudit} />
        </View>
        <View style={{ width: twoColumn ? 300 : 260 }}>
          <DesktopProgressCard
            isScanning={isScanning}
            scanned={summary.scanned}
            found={summary.found}
            missing={summary.missing}
            extra={summary.extra}
          />
        </View>
      </View>

      <View className="mb-5">
        <ManualEntryRow
          value={manualAssetId}
          onChange={setManualAssetId}
          onAdd={addManualAsset}
          isScanning={isScanning}
        />
      </View>

      <View className="mb-3">
        <LegendRow />
      </View>

      {isScanning ? (
        <AuditScanList items={items} />
      ) : (
        <View
          className="rounded-[20px] border px-5 py-5"
          style={{
            borderColor: adminTheme.border,
            backgroundColor: adminTheme.surface,
          }}
        >
          <Text className="text-base" style={{ color: adminTheme.slateSoft }}>
            Start the audit to activate live scanning, manual asset search, and
            result tracking for this location.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

export default function AuditScanScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 1024;

  return isMobile ? <MobileAuditScan /> : <DesktopAuditScan width={width} />;
}
