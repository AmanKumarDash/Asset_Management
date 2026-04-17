import { USER_ROLES } from "@/constants/auth";
import AuditSetupPanel from "@/features/audits/components/AuditSetupPanel";
import { useAuditSetup } from "@/features/audits/hooks/useAuditSetup";
import { AuditPhase } from "@/features/audits/types/audit";
import { useAuthSession } from "@/features/auth/hooks/useAuthSession";
import { WarehouseSummary } from "@/models/warehouse";
import { MqttConnectionStatus } from "@/network/mqttService";
import { adminTheme } from "@/theme/adminTheme";
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
} from "../data/auditScanData";
import { useAuditScanState } from "../hooks/useAuditScanState";
import EmployeeAuditScanScreen from "./EmployeeAuditScanScreen";

// Returns the color and icon styling for a scan list row based on its tone.
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

// Chooses the small status icon for a scan list row depending on the result tone.
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

// Generates the main heading shown in the scan panel for the current audit phase.
function getScanPanelHeading(
  phase: AuditPhase,
  connectionStatus: MqttConnectionStatus
) {
  if (phase === "idle") {
    return "Ready to Start Audit";
  }

  if (phase === "submitting") {
    return "Submitting audit snapshot...";
  }

  if (phase === "submitted") {
    return "Audit report ready";
  }

  if (phase === "submitError") {
    return "Audit submission failed";
  }

  if (connectionStatus === "connected") {
    return "Scanning for RFID...";
  }

  if (connectionStatus === "error") {
    return "Scanner connection failed";
  }

  return "Connecting to scanner...";
}

// Builds the descriptive text beneath the scan panel heading, including errors and connection guidance.
function getScanPanelDescription(
  phase: AuditPhase,
  connectionStatus: MqttConnectionStatus,
  submitError: string | null
) {
  if (phase === "idle") {
    return "Tap Start Audit to activate RFID scanning for this room and begin logging assets.";
  }

  if (phase === "submitting") {
    return "MQTT has been disconnected and the scanned snapshot is frozen. We are sending the warehouse staging payload to the backend now.";
  }

  if (phase === "submitted") {
    return "MQTT is disconnected and the warehouse staging request has been submitted. The list below reflects the final scanned snapshot.";
  }

  if (phase === "submitError") {
    return (
      submitError ??
      "MQTT is already disconnected and the scanned snapshot is frozen. Retry submit once the audit API is available."
    );
  }

  if (submitError) {
    return submitError;
  }

  if (connectionStatus === "connected") {
    return "Hold the RFID reader near an asset tag. Live tag IDs will appear below as they are scanned.";
  }

  if (connectionStatus === "error") {
    return "Unable to connect to the MQTT scanner right now. Check the broker settings and try again.";
  }

  return "Opening the live MQTT scanner connection for this audit.";
}

// Chooses the text shown on the submit button depending on the audit state.
function getSubmitButtonLabel(phase: AuditPhase) {
  if (phase === "submitting") {
    return "Submitting...";
  }

  if (phase === "submitted") {
    return "Report Ready";
  }

  if (phase === "submitError") {
    return "Retry Submit";
  }

  return "Proceed to Submit";
}

// Chooses the heading text for the scan result list based on the current phase.
function getListHeading(phase: AuditPhase) {
  if (phase === "submitted") {
    return "Audit report";
  }

  if (phase === "submitting") {
    return "Submitting snapshot";
  }

  if (phase === "submitError") {
    return "Frozen submission snapshot";
  }

  return "Scanned so far";
}

type StatusFilter = "all" | AuditItemTone;

function filterAuditItems(
  items: AuditScanItem[],
  searchTerm: string,
  statusFilter: StatusFilter
): AuditScanItem[] {
  const normalizedQuery = searchTerm.trim().toLowerCase();

  return items.filter((item) => {
    const matchesStatus =
      statusFilter === "all" || item.tone === statusFilter;

    const matchesSearch =
      normalizedQuery.length === 0 ||
      item.id.toLowerCase().includes(normalizedQuery) ||
      item.title.toLowerCase().includes(normalizedQuery) ||
      item.subtitle.toLowerCase().includes(normalizedQuery);

    return matchesStatus && matchesSearch;
  });
}

function getSelectedWarehouseTotalAssets(
  selectedWarehouse: WarehouseSummary | null,
  fallbackCount: number
) {
  if (typeof fallbackCount === "number" && Number.isFinite(fallbackCount) && fallbackCount > 0) {
    return fallbackCount;
  }

  const rawCount = selectedWarehouse?.raw?.totalRowCount;

  if (typeof rawCount === "number" && Number.isFinite(rawCount)) {
    return rawCount;
  }

  if (typeof rawCount === "string" && rawCount.trim()) {
    const parsed = Number(rawCount.trim());
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallbackCount;
}

// Returns the empty-state message shown when there are no scan items to display.
function getEmptyStateDescription(phase: AuditPhase) {
  if (phase === "submitted") {
    return "The audit report is ready, but no items were returned for display.";
  }

  if (phase === "submitting" || phase === "submitError") {
    return "The scan snapshot has been frozen, but there are no submitted items to display yet.";
  }

  return "Start the audit to activate scanning and populate asset results.";
}

// Renders the small legend explaining the audit item tones shown in the list.
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

// Renders the animated scanner indicator circle, active when scanning is live.
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

// Shows the main scan control panel with status text and the start-audit action.
function ScanPanel({
  phase,
  connectionStatus,
  onStartAudit,
  submitError,
}: {
  phase: AuditPhase;
  connectionStatus: MqttConnectionStatus;
  onStartAudit: () => void;
  submitError: string | null;
}) {
  const showStartButton =
    phase === "idle" || phase === "submitted" || phase === "submitError";

  return (
    <View
      className="items-center justify-center rounded-[22px] border px-6 py-10"
      style={{
        borderColor: adminTheme.border,
        borderStyle: "dashed",
        backgroundColor: adminTheme.surface,
      }}
    >
      <ScanningIndicator isActive={phase === "scanning"} />
      <Text
        className="text-[18px] font-semibold"
        style={{ color: adminTheme.primary }}
      >
        {getScanPanelHeading(phase, connectionStatus)}
      </Text>
      <Text
        className="mt-2 text-center text-base leading-6"
        style={{ color: adminTheme.slateSoft, maxWidth: 520 }}
      >
        {getScanPanelDescription(phase, connectionStatus, submitError)}
      </Text>

      {showStartButton ? (
        <Pressable
          onPress={onStartAudit}
          className="mt-5 rounded-[14px] px-6 py-3.5"
          style={{ backgroundColor: adminTheme.primary }}
        >
          <Text className="text-base font-semibold text-white">
            {phase === "idle" ? "Start Audit" : "Start New Audit"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// Renders the manual asset entry row so users can type in a tag or ID when scanning is active.
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

// Displays the list of scanned audit items, including found, missing, and extra rows.
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

// Renders the submit action button and disables it when submission is not allowed.
function SubmitActionButton({
  phase,
  canSubmit,
  onSubmitAudit,
  mobile = false,
}: {
  phase: AuditPhase;
  canSubmit: boolean;
  onSubmitAudit: () => void;
  mobile?: boolean;
}) {
  const disabled =
    phase === "submitting" || phase === "submitted" || !canSubmit;

  return (
    <Pressable
      onPress={onSubmitAudit}
      disabled={disabled}
      className={`items-center rounded-[14px] ${
        mobile ? "px-5 py-4" : "px-4 py-4"
      }`}
      style={{
        backgroundColor: disabled ? adminTheme.mutedBg : adminTheme.primary,
      }}
    >
      <Text
        className={`${mobile ? "text-base" : "text-[18px]"} font-semibold`}
        style={{ color: disabled ? adminTheme.mutedText : "#FFFFFF" }}
      >
        {getSubmitButtonLabel(phase)}
      </Text>
    </Pressable>
  );
}

// Renders the desktop-only progress summary card with scan counts and a submit button.
function DesktopProgressCard({
  phase,
  scanned,
  found,
  missing,
  extra,
  canSubmit,
  totalAssets,
  onSubmitAudit,
}: {
  phase: AuditPhase;
  scanned: number;
  found: number;
  missing: number;
  extra: number;
  canSubmit: boolean;
  totalAssets: number;
  onSubmitAudit: () => void;
}) {
  const progress = totalAssets > 0 ? Math.min(scanned / totalAssets, 1) : 0;

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
          {scanned} / {totalAssets}
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

      <View className="mt-4">
        <SubmitActionButton
          phase={phase}
          canSubmit={canSubmit}
          onSubmitAudit={onSubmitAudit}
        />
      </View>
    </View>
  );
}

// Shows a boxed notice describing current warehouse selection status and back navigation.
function WarehouseSelectionNotice({
  warehouseName,
  onBack,
}: {
  warehouseName?: string | null;
  onBack?: () => void;
}) {
  return (
    <View
      className="rounded-[20px] border px-5 py-5"
      style={{
        borderColor: adminTheme.border,
        backgroundColor: adminTheme.surface,
      }}
    >
      <View className="flex-row items-center justify-between" style={{ gap: 16 }}>
        <View className="flex-1 flex-row items-center">
          <View
            className="mr-3 h-10 w-10 items-center justify-center rounded-[12px]"
            style={{ backgroundColor: adminTheme.infoBg }}
          >
            <Feather name="package" size={18} color={adminTheme.primary} />
          </View>
          <View className="flex-1">
            <Text className="text-[16px] font-semibold" style={{ color: adminTheme.slate }}>
              {warehouseName
                ? `${warehouseName} selected`
                : "Select a warehouse to continue"}
            </Text>
            <Text className="mt-1 text-sm leading-5" style={{ color: adminTheme.slateSoft }}>
              {warehouseName
                ? "The warehouse-specific scan screen is active now. Use back to return to the warehouse list."
                : "Choose a warehouse first. After that, only the scanning screen will be shown."}
            </Text>
          </View>
        </View>

        {warehouseName && onBack ? (
          <Pressable
            onPress={onBack}
            className="rounded-[14px] border px-4 py-3"
            style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surfaceAlt }}
          >
            <Text className="text-sm font-semibold" style={{ color: adminTheme.slate }}>
              Back
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

// Mobile-specific audit screen layout that uses the scan hook and setup hook together.
function MobileAuditScan() {
  const {
    items,
    isScanning,
    auditPhase,
    canSubmit,
    submitError,
    connectionStatus,
    manualAssetId,
    setManualAssetId,
    prepareWarehouseAudit,
    startAudit,
    addManualAsset,
    submitAudit,
    resetAudit,
    summary,
    auditWarehouseId,
    expectedAssetCount,
    isPreparingWarehouse,
  } = useAuditScanState();
  const {
    organization,
    warehouses,
    selectedWarehouse,
    selectedWarehouseId,
    setSelectedWarehouseId,
    isLoading,
    error,
    refreshSetup,
  } = useAuditSetup();
  const selectionLocked =
    auditPhase === "scanning" ||
    auditPhase === "submitting" ||
    isPreparingWarehouse;
  const activeWarehouseId = selectedWarehouseId ?? auditWarehouseId;
  const hasSelectedWarehouse = Boolean(activeWarehouseId);
  const totalAssets = hasSelectedWarehouse
    ? getSelectedWarehouseTotalAssets(selectedWarehouse, expectedAssetCount)
    : auditScanOverview.totalAssets;
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);

  const filteredItems = useMemo(
    () => filterAuditItems(items, searchTerm, statusFilter),
    [items, searchTerm, statusFilter]
  );

  const handleSelectWarehouse = (warehouseId: string) => {
    setSelectedWarehouseId(warehouseId);
    void prepareWarehouseAudit(warehouseId);
  };

  const goBackToWarehouseSelection = () => {
    resetAudit();
    setSelectedWarehouseId(null);
  };

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
              if (hasSelectedWarehouse) {
                goBackToWarehouseSelection();
                return;
              }

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
              {hasSelectedWarehouse
                ? selectedWarehouse?.name ?? auditScanOverview.title
                : auditScanOverview.title}
            </Text>
            <Text className="mt-1 text-sm" style={{ color: adminTheme.slateSoft }}>
              {hasSelectedWarehouse
                ? "Warehouse scan"
                : auditScanOverview.subtitle}
            </Text>
          </View>
        </View>
      </View>

      {!hasSelectedWarehouse ? (
        <>
          <View className="px-4 pt-4">
            <AuditSetupPanel
              organization={organization}
              warehouses={warehouses}
              selectedWarehouseId={selectedWarehouseId}
              onSelectWarehouse={handleSelectWarehouse}
              isLoading={isLoading}
              error={error}
              onRetry={refreshSetup}
              selectionLocked={selectionLocked}
            />
          </View>

          <View className="px-4 pt-4">
            <WarehouseSelectionNotice />
          </View>
        </>
      ) : (
        <>
          <View className="px-4 pt-4">
            <WarehouseSelectionNotice
              warehouseName={selectedWarehouse?.name}
              onBack={goBackToWarehouseSelection}
            />
          </View>

          <View className="px-4 pt-4">
            <ScanPanel
              phase={auditPhase}
              connectionStatus={connectionStatus}
              onStartAudit={() => {
                if (activeWarehouseId) {
                  startAudit(activeWarehouseId);
                }
              }}
              submitError={submitError}
            />
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
                {getListHeading(auditPhase)}
              </Text>
              <View
                className="rounded-full px-3 py-1"
                style={{ backgroundColor: adminTheme.infoBg }}
              >
                <Text
                  className="text-sm font-medium"
                  style={{ color: adminTheme.primary }}
                >
                  {summary.scanned} / {totalAssets}
                </Text>
              </View>
            </View>

            <View className="mb-4">
              <View className="flex-row items-center" style={{ gap: 10 }}>
                <View
                  className="flex-1 rounded-[14px] border px-3 py-2"
                  style={{
                    borderColor: adminTheme.border,
                    backgroundColor: adminTheme.surface,
                  }}
                >
                  <TextInput
                    value={searchTerm}
                    onChangeText={setSearchTerm}
                    placeholder="Search products, tags, or details"
                    placeholderTextColor="#94A3B8"
                    className="text-base"
                    style={{ color: adminTheme.slate }}
                  />
                </View>

                <View className="relative">
                  <Pressable
                    onPress={() => setStatusMenuOpen((current) => !current)}
                    className="flex-row items-center rounded-[14px] border px-3 py-2"
                    style={{
                      borderColor: adminTheme.border,
                      backgroundColor: adminTheme.surface,
                    }}
                  >
                    <Text className="text-base" style={{ color: adminTheme.slate }}>
                      {statusFilter === "all"
                        ? "All statuses"
                        : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                    </Text>
                    <Feather
                      name="chevron-down"
                      size={18}
                      color={adminTheme.slateSoft}
                      style={{ marginLeft: 8 }}
                    />
                  </Pressable>

                  {statusMenuOpen ? (
                    <View
                      className="absolute right-0 mt-2 w-44 rounded-[16px] border bg-white shadow"
                      style={{ borderColor: adminTheme.border }}
                    >
                      {(["all", "found", "missing", "extra"] as StatusFilter[]).map(
                        (option) => (
                          <Pressable
                            key={option}
                            onPress={() => {
                              setStatusFilter(option);
                              setStatusMenuOpen(false);
                            }}
                            className="px-4 py-3"
                          >
                            <Text
                              style={{
                                color:
                                  statusFilter === option
                                    ? adminTheme.primary
                                    : adminTheme.slate,
                              }}
                            >
                              {option === "all"
                                ? "All"
                                : option.charAt(0).toUpperCase() + option.slice(1)}
                            </Text>
                          </Pressable>
                        )
                      )}
                    </View>
                  ) : null}
                </View>
              </View>
              <Text className="mt-2 text-sm" style={{ color: adminTheme.slateSoft }}>
                Showing {filteredItems.length} of {items.length} results
              </Text>
            </View>

            {auditPhase !== "idle" && items.length > 0 ? (
              filteredItems.length > 0 ? (
                <AuditScanList items={filteredItems} />
              ) : (
                <View
                  className="rounded-[18px] border px-4 py-5"
                  style={{
                    borderColor: adminTheme.border,
                    backgroundColor: adminTheme.surface,
                  }}
                >
                  <Text className="text-sm" style={{ color: adminTheme.slateSoft }}>
                    No audit items match the current search or status filter.
                  </Text>
                </View>
              )
            ) : (
              <View
                className="rounded-[18px] border px-4 py-5"
                style={{
                  borderColor: adminTheme.border,
                  backgroundColor: adminTheme.surface,
                }}
              >
                <Text className="text-sm" style={{ color: adminTheme.slateSoft }}>
                  {getEmptyStateDescription(auditPhase)}
                </Text>
              </View>
            )}
          </View>

          <View className="px-4 pt-4">
            <SubmitActionButton
              phase={auditPhase}
              canSubmit={canSubmit}
              onSubmitAudit={submitAudit}
              mobile
            />
          </View>

          <View className="px-4 pt-4">
            <View
              className="flex-row items-center justify-center rounded-[16px] px-4 py-3"
              style={{ backgroundColor: adminTheme.surface }}
            >
              <LegendRow />
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

// Desktop-specific audit screen layout that uses wider page space for progress and scan panels.
function DesktopAuditScan({ width }: { width: number }) {
  const {
    items,
    isScanning,
    auditPhase,
    canSubmit,
    submitError,
    connectionStatus,
    manualAssetId,
    setManualAssetId,
    prepareWarehouseAudit,
    startAudit,
    addManualAsset,
    submitAudit,
    resetAudit,
    summary,
    auditWarehouseId,
    expectedAssetCount,
    isPreparingWarehouse,
  } = useAuditScanState();
  const {
    organization,
    warehouses,
    selectedWarehouse,
    selectedWarehouseId,
    setSelectedWarehouseId,
    isLoading,
    error,
    refreshSetup,
  } = useAuditSetup();
  const twoColumn = width >= 1340;
  const selectionLocked =
    auditPhase === "scanning" ||
    auditPhase === "submitting" ||
    isPreparingWarehouse;
  const activeWarehouseId = selectedWarehouseId ?? auditWarehouseId;
  const hasSelectedWarehouse = Boolean(activeWarehouseId);
  const totalAssets = hasSelectedWarehouse
    ? getSelectedWarehouseTotalAssets(selectedWarehouse, expectedAssetCount)
    : auditScanOverview.totalAssets;
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);

  const filteredItems = useMemo(
    () => filterAuditItems(items, searchTerm, statusFilter),
    [items, searchTerm, statusFilter]
  );

  const handleSelectWarehouse = (warehouseId: string) => {
    setSelectedWarehouseId(warehouseId);
    void prepareWarehouseAudit(warehouseId);
  };

  const goBackToWarehouseSelection = () => {
    resetAudit();
    setSelectedWarehouseId(null);
  };

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
            {hasSelectedWarehouse
              ? selectedWarehouse?.name ?? auditScanOverview.title
              : auditScanOverview.title}
          </Text>
          <Text className="mt-1 text-base" style={{ color: adminTheme.slateSoft }}>
            {hasSelectedWarehouse
              ? "Warehouse scan"
              : auditScanOverview.desktopMeta}
          </Text>
        </View>
        <Text className="text-[16px]" style={{ color: adminTheme.slateSoft }}>
          {summary.scanned} / {totalAssets} scanned
        </Text>
      </View>

      {!hasSelectedWarehouse ? (
        <>
          <View className="mb-5">
            <AuditSetupPanel
              organization={organization}
              warehouses={warehouses}
              selectedWarehouseId={selectedWarehouseId}
              onSelectWarehouse={handleSelectWarehouse}
              isLoading={isLoading}
              error={error}
              onRetry={refreshSetup}
              selectionLocked={selectionLocked}
            />
          </View>

          <WarehouseSelectionNotice />
        </>
      ) : (
        <>
          <View className="mb-5">
            <WarehouseSelectionNotice
              warehouseName={selectedWarehouse?.name}
              onBack={goBackToWarehouseSelection}
            />
          </View>

          <View
            className="mb-4 flex-row"
            style={{ gap: 18, alignItems: "flex-start" }}
          >
            <View style={{ flex: 1.25 }}>
              <ScanPanel
                phase={auditPhase}
                connectionStatus={connectionStatus}
                onStartAudit={() => {
                  if (activeWarehouseId) {
                    startAudit(activeWarehouseId);
                  }
                }}
                submitError={submitError}
              />
            </View>
            <View style={{ width: twoColumn ? 300 : 260 }}>
              <DesktopProgressCard
                phase={auditPhase}
                scanned={summary.scanned}
                found={summary.found}
                missing={summary.missing}
                extra={summary.extra}
                canSubmit={canSubmit}
                totalAssets={totalAssets}
                onSubmitAudit={submitAudit}
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

          {auditPhase !== "idle" && items.length > 0 ? (
            <>
              <View className="mb-3">
                <View className="mb-3 flex-row items-center justify-between">
                  <Text
                    className="text-[18px] font-semibold"
                    style={{ color: adminTheme.slate }}
                  >
                    {getListHeading(auditPhase)}
                  </Text>
                  <View
                    className="rounded-full px-3 py-1"
                    style={{ backgroundColor: adminTheme.infoBg }}
                  >
                    <Text
                      className="text-sm font-medium"
                      style={{ color: adminTheme.primary }}
                    >
                      {summary.scanned} / {totalAssets}
                    </Text>
                  </View>
                </View>

                <View className="mb-4">
                  <View className="flex-row items-center" style={{ gap: 10 }}>
                    <View
                      className="flex-1 rounded-[14px] border px-3 py-2"
                      style={{
                        borderColor: adminTheme.border,
                        backgroundColor: adminTheme.surface,
                      }}
                    >
                      <TextInput
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                        placeholder="Search products, tags, or details"
                        placeholderTextColor="#94A3B8"
                        className="text-base"
                        style={{ color: adminTheme.slate }}
                      />
                    </View>

                    <View className="relative">
                      <Pressable
                        onPress={() => setStatusMenuOpen((current) => !current)}
                        className="flex-row items-center rounded-[14px] border px-3 py-2"
                        style={{
                          borderColor: adminTheme.border,
                          backgroundColor: adminTheme.surface,
                        }}
                      >
                        <Text className="text-base" style={{ color: adminTheme.slate }}>
                          {statusFilter === "all"
                            ? "All statuses"
                            : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                        </Text>
                        <Feather
                          name="chevron-down"
                          size={18}
                          color={adminTheme.slateSoft}
                          style={{ marginLeft: 8 }}
                        />
                      </Pressable>

                      {statusMenuOpen ? (
                        <View
                          className="absolute right-0 mt-2 w-44 rounded-[16px] border bg-white shadow"
                          style={{ borderColor: adminTheme.border }}
                        >
                          {(["all", "found", "missing", "extra"] as StatusFilter[]).map(
                            (option) => (
                              <Pressable
                                key={option}
                                onPress={() => {
                                  setStatusFilter(option);
                                  setStatusMenuOpen(false);
                                }}
                                className="px-4 py-3"
                              >
                                <Text
                                  style={{
                                    color:
                                      statusFilter === option
                                        ? adminTheme.primary
                                        : adminTheme.slate,
                                  }}
                                >
                                  {option === "all"
                                    ? "All"
                                    : option.charAt(0).toUpperCase() + option.slice(1)}
                                </Text>
                              </Pressable>
                            )
                          )}
                        </View>
                      ) : null}
                    </View>
                  </View>
                  <Text className="mt-2 text-sm" style={{ color: adminTheme.slateSoft }}>
                    Showing {filteredItems.length} of {items.length} results
                  </Text>
                </View>
              </View>

              {filteredItems.length > 0 ? (
                <AuditScanList items={filteredItems} />
              ) : (
                <View
                  className="rounded-[20px] border px-5 py-5"
                  style={{
                    borderColor: adminTheme.border,
                    backgroundColor: adminTheme.surface,
                  }}
                >
                  <Text className="text-base" style={{ color: adminTheme.slateSoft }}>
                    No audit items match the current search or status filter.
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View
              className="rounded-[20px] border px-5 py-5"
              style={{
                borderColor: adminTheme.border,
                backgroundColor: adminTheme.surface,
              }}
            >
              <Text className="text-base" style={{ color: adminTheme.slateSoft }}>
                {getEmptyStateDescription(auditPhase)}
              </Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

// Main audit screen entry component that chooses between mobile, desktop, or employee audit views.
export default function AuditScanScreen() {
  const { user } = useAuthSession();
  const { width } = useWindowDimensions();
  const isMobile = width < 1024;

  if (!user) {
    return null;
  }

  if (user.role === USER_ROLES.EMPLOYEE) {
    return <EmployeeAuditScanScreen />;
  }

  return isMobile ? <MobileAuditScan /> : <DesktopAuditScan width={width} />;
}






