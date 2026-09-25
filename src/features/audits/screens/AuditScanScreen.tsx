import AuditSetupPanel from "@/features/audits/components/AuditSetupPanel";
import { useAuditSetup } from "@/features/audits/hooks/useAuditSetup";
import { AuditPhase } from "@/features/audits/types/audit";
import { WarehouseSummary } from "@/models/warehouse";
import { MqttConnectionStatus } from "@/network/mqttService";
import { adminTheme } from "@/theme/adminTheme";
import { Feather } from "@expo/vector-icons";
import { BarcodeScanningResult, CameraView, useCameraPermissions } from "expo-camera";
import { ComponentProps, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import {
  AuditExtraProductDetails,
  AuditItemTone,
  AuditScanItem,
  auditScanOverview,
} from "../data/auditScanData";
import { useAuditScanState } from "../hooks/useAuditScanState";

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

// Chooses the text shown on the submit button depending on the audit state.
function getSubmitButtonLabel(phase: AuditPhase) {
  if (phase === "submitting") {
    return "Submitting...";
  }

  if (phase === "submitted") {
    return "Report Ready";
  }

  if (phase === "paused") {
    return "Submit Saved Audit";
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

  if (phase === "paused") {
    return "Paused scan snapshot";
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

function getWarehouseById(warehouses: WarehouseSummary[], warehouseId?: string | null) {
  return warehouses.find((warehouse) => warehouse.id === warehouseId) ?? null;
}

function getSelectedWarehouseSummary(
  warehouses: WarehouseSummary[],
  selectedWarehouseIds: string[]
) {
  const selectedNames = selectedWarehouseIds
    .map((warehouseId) => getWarehouseById(warehouses, warehouseId)?.name)
    .filter(Boolean);

  if (selectedNames.length === 0) {
    return null;
  }

  if (selectedNames.length === 1) {
    return selectedNames[0];
  }

  return `${selectedNames[0]} +${selectedNames.length - 1} more`;
}

// Returns the empty-state message shown when there are no scan items to display.
function getEmptyStateDescription(phase: AuditPhase) {
  if (phase === "submitted") {
    return "The audit report is ready, but no items were returned for display.";
  }

  if (phase === "submitting" || phase === "submitError") {
    return "The scan snapshot has been frozen, but there are no submitted items to display yet.";
  }

  if (phase === "paused") {
    return "The paused scan snapshot has no items to display yet.";
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

type ScanSource = "manual" | "camera" | "gun";
type ScanPanelMode = "rfid" | "camera" | "gun";
type FeatherIconName = ComponentProps<typeof Feather>["name"];

function SourceStatusCard({
  icon,
  title,
  subtitle,
  active,
  onPress,
  compact = false,
}: {
  icon: FeatherIconName;
  title: string;
  subtitle: string;
  active: boolean;
  onPress?: () => void;
  compact?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className="rounded-[8px] border"
      style={{
        width: "100%",
        paddingHorizontal: compact ? 6 : 12,
        paddingVertical: compact ? 9 : 12,
        borderColor: active ? adminTheme.primary : adminTheme.border,
        backgroundColor: active ? "#E8F2FF" : adminTheme.surface,
      }}
    >
      <View className="flex-row items-center" style={{ minWidth: 0 }}>
        <Feather
          name={icon}
          size={compact ? 12 : 15}
          color={active ? adminTheme.primary : adminTheme.slateSoft}
        />
        <Text
          numberOfLines={1}
          className="ml-1.5 font-semibold"
          style={{
            color: active ? adminTheme.primary : adminTheme.slate,
            flexShrink: 1,
            fontSize: compact ? 11 : 14,
          }}
        >
          {title}
        </Text>
      </View>
      <Text
        numberOfLines={1}
        className="mt-1.5 font-medium"
        style={{
          color: active ? adminTheme.primary : adminTheme.slateSoft,
          fontSize: compact ? 10 : 12,
        }}
      >
        {subtitle}
      </Text>
    </Pressable>
  );
}

function CameraBarcodeFeed({
  isScanning,
  enabled,
  onToggle,
  onScanCode,
}: {
  isScanning: boolean;
  enabled: boolean;
  onToggle: () => void;
  onScanCode: (value: string, source: ScanSource) => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const lastCameraScanRef = useRef<{ value: string; scannedAt: number } | null>(null);
  const canShowCamera = isScanning && enabled && permission?.granted;

  useEffect(() => {
    if (isScanning && enabled && permission?.granted === undefined) {
      void requestPermission();
    }
  }, [enabled, isScanning, permission?.granted, requestPermission]);

  const handleToggleCamera = () => {
    if (!isScanning) {
      return;
    }

    if (!permission?.granted) {
      void requestPermission();
    }

    onToggle();
  };

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    const value = result.data?.trim();

    if (!value) {
      return;
    }

    const now = Date.now();
    const lastScan = lastCameraScanRef.current;

    if (lastScan && lastScan.value === value && now - lastScan.scannedAt < 1400) {
      return;
    }

    lastCameraScanRef.current = { value, scannedAt: now };
    onScanCode(value, "camera");
  };

  return (
    <View
      className="rounded-[8px] border p-4"
      style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
    >
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-xs font-semibold uppercase" style={{ color: adminTheme.slate }}>
          Live camera feed
        </Text>
        <Pressable
          onPress={handleToggleCamera}
          disabled={!isScanning}
          className="rounded-[8px] border px-3 py-2"
          style={{
            borderColor: enabled ? adminTheme.primary : adminTheme.border,
            backgroundColor: enabled ? "#E8F2FF" : adminTheme.surfaceAlt,
            opacity: isScanning ? 1 : 0.7,
          }}
        >
          <Text
            className="text-xs font-semibold"
            style={{ color: enabled ? adminTheme.primary : adminTheme.slate }}
          >
            {enabled ? "Camera on" : "Open camera"}
          </Text>
        </Pressable>
      </View>

      <View
        className="h-[150px] overflow-hidden rounded-[8px] border border-dashed"
        style={{ borderColor: "#CBD5E1", backgroundColor: "#050505" }}
      >
        {canShowCamera ? (
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            onBarcodeScanned={handleBarcodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: [
                "aztec",
                "ean13",
                "ean8",
                "qr",
                "pdf417",
                "upc_e",
                "datamatrix",
                "code39",
                "code93",
                "itf14",
                "codabar",
                "code128",
                "upc_a",
              ],
            }}
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Feather
              name={permission?.granted === false ? "camera-off" : "crosshair"}
              size={30}
              color="#CBD5E1"
            />
            <Text className="mt-2 text-xs font-semibold" style={{ color: "#E2E8F0" }}>
              {permission?.granted === false
                ? "Camera permission needed"
                : enabled
                  ? "Starting camera..."
                  : "Point at a barcode to auto-capture"}
            </Text>
          </View>
        )}
      </View>

      <Text className="mt-2 text-xs font-semibold" style={{ color: adminTheme.slate }}>
        Point at a barcode to auto-capture
      </Text>
    </View>
  );
}

function GunScannerCapture({
  isScanning,
  onScanCode,
}: {
  isScanning: boolean;
  onScanCode: (value: string, source: ScanSource) => void;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!isScanning) {
      return;
    }

    const focusTimer = setTimeout(() => {
      inputRef.current?.focus();
    }, 120);

    return () => {
      clearTimeout(focusTimer);
    };
  }, [isScanning]);

  const submitValue = () => {
    const normalizedValue = value.trim();

    if (!normalizedValue || !isScanning) {
      return;
    }

    onScanCode(normalizedValue, "gun");
    setValue("");
  };

  return (
    <View
      className="rounded-[8px] border p-4"
      style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
    >
      <Text className="text-xs font-semibold uppercase" style={{ color: adminTheme.slate }}>
        Gun scanner input
      </Text>
      <View
        className="mt-3 flex-row items-center rounded-[8px] border px-3"
        style={{
          borderColor: adminTheme.border,
          backgroundColor: isScanning ? "#FFFFFF" : adminTheme.surfaceAlt,
          opacity: isScanning ? 1 : 0.7,
        }}
      >
        <Feather name="maximize" size={16} color={adminTheme.slateSoft} />
        <TextInput
          ref={inputRef}
          value={value}
          editable={isScanning}
          autoFocus={isScanning}
          focusable={isScanning}
          onChangeText={setValue}
          onSubmitEditing={submitValue}
          blurOnSubmit={false}
          placeholder="Focus here, scan barcode, press Enter"
          placeholderTextColor="#94A3B8"
          className="flex-1 py-3 pl-3 text-sm"
          style={{ color: adminTheme.slate }}
        />
        <Pressable
          onPress={submitValue}
          disabled={!isScanning || !value.trim()}
          className="rounded-[8px] px-3 py-2"
          style={{
            backgroundColor:
              isScanning && value.trim() ? adminTheme.primary : adminTheme.mutedBg,
          }}
        >
          <Feather
            name="plus"
            size={16}
            color={isScanning && value.trim() ? "#FFFFFF" : adminTheme.mutedText}
          />
        </Pressable>
      </View>
    </View>
  );
}

function MultiSourceScanWorkspace({
  phase,
  connectionStatus,
  onStartAudit,
  submitError,
  scanned,
  found = 0,
  missing = 0,
  extra = 0,
  totalAssets = 0,
  onScanCode,
  mobile = false,
}: {
  phase: AuditPhase;
  connectionStatus: MqttConnectionStatus;
  onStartAudit: () => void;
  submitError: string | null;
  scanned: number;
  found?: number;
  missing?: number;
  extra?: number;
  totalAssets?: number;
  onScanCode: (value: string, source: ScanSource) => void;
  mobile?: boolean;
}) {
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [selectedMode, setSelectedMode] = useState<ScanPanelMode>("rfid");
  const isLive = phase === "scanning";
  const showStartButton =
    phase === "idle" || phase === "paused" || phase === "submitted" || phase === "submitError";
  const selectMode = (mode: ScanPanelMode) => {
    setSelectedMode(mode);

    if (mode === "camera" && isLive) {
      setCameraEnabled(true);
    }
  };

  return (
    <View
      className="rounded-[8px] border p-4"
      style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surfaceAlt }}
    >
      <View className="flex-row" style={{ gap: mobile ? 6 : 10 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <SourceStatusCard
            icon="wifi"
            title={mobile ? "RFID" : "RFID reader"}
            subtitle={
              connectionStatus === "connected"
                ? mobile
                  ? `${scanned} found`
                  : `Listening - ${scanned} found`
                : connectionStatus === "error"
                  ? mobile
                    ? "Failed"
                    : "Connection failed"
                  : isLive
                    ? "Connecting..."
                    : mobile
                      ? "Ready"
                      : "Ready with audit"
            }
            active={selectedMode === "rfid"}
            onPress={() => selectMode("rfid")}
            compact={mobile}
          />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <SourceStatusCard
            icon="camera"
            title={mobile ? "Camera" : "Camera barcode"}
            subtitle={
              selectedMode === "camera" && cameraEnabled && isLive
                ? mobile
                  ? "Live"
                  : "Live view on"
                : isLive
                  ? mobile
                    ? "Open"
                    : "Tap to open"
                  : mobile
                    ? "Starts"
                    : "Starts with audit"
            }
            active={selectedMode === "camera"}
            onPress={() => selectMode("camera")}
            compact={mobile}
          />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <SourceStatusCard
            icon="maximize"
            title={mobile ? "Gun" : "Gun scanner"}
            subtitle={isLive ? (mobile ? "Input" : "Ready for input") : mobile ? "Focus" : "Focus after start"}
            active={selectedMode === "gun"}
            onPress={() => selectMode("gun")}
            compact={mobile}
          />
        </View>
      </View>

      {selectedMode === "camera" ? (
        <View className="mt-4">
          <CameraBarcodeFeed
            isScanning={isLive}
            enabled={cameraEnabled}
            onToggle={() => setCameraEnabled((current) => !current)}
            onScanCode={onScanCode}
          />
        </View>
      ) : null}

      {selectedMode === "gun" ? (
        <View className="mt-4">
          <GunScannerCapture isScanning={isLive} onScanCode={onScanCode} />
        </View>
      ) : null}

      {showStartButton ? (
        <View className="mt-4 items-start">
          <Pressable
            onPress={onStartAudit}
            className="rounded-[8px] px-5 py-3"
            style={{ backgroundColor: adminTheme.primary }}
          >
            <Text className="text-sm font-semibold text-white">
              {phase === "idle"
                ? "Start multi-source scan"
                : phase === "paused"
                  ? "Resume scan"
                  : "Start new scan"}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {submitError ? (
        <Text className="mt-3 text-sm" style={{ color: "#D64545" }}>
          {submitError}
        </Text>
      ) : (
        <Text className="mt-3 text-sm" style={{ color: adminTheme.slateSoft }}>
          RFID, mobile camera barcode, and gun scanner input can run together in one audit.
        </Text>
      )}
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
        {/* <Text
          className="text-base font-semibold"
          style={{ color: isScanning ? "#FFFFFF" : adminTheme.mutedText }}
        >
          {mobile ? "Add" : "Add Asset"}
        </Text> */}
      </Pressable>
    </View>
  );
}

// Displays the list of scanned audit items, including found, missing, and extra rows.
type ExtraDetailsLoader = (tagId: string) => Promise<AuditExtraProductDetails>;
type ExtraDetailsSaver = (
  details: AuditExtraProductDetails
) => Promise<AuditExtraProductDetails>;

function getExtraProductNameFromItem(item: AuditScanItem) {
  const title = item.title.trim();

  if (
    !title ||
    title === "Unmatched RFID Asset" ||
    title === "Manual Asset Entry" ||
    title === "Extra Asset"
  ) {
    return "";
  }

  return title;
}

function createEmptyExtraProductDetails(
  item: AuditScanItem
): AuditExtraProductDetails {
  return {
    TagIdNumber: item.id,
    ProductName:
      item.extraProductDetails?.ProductName ?? getExtraProductNameFromItem(item),
    WareHouseId: item.extraProductDetails?.WareHouseId ?? "",
    WareHouseName: item.extraProductDetails?.WareHouseName ?? "",
    HSNCode: item.extraProductDetails?.HSNCode ?? item.reportFields?.hsnCode ?? "",
    ProductCode:
      item.extraProductDetails?.ProductCode ?? item.reportFields?.productCode ?? "",
    ModelNo:
      item.extraProductDetails?.ModelNo ??
      item.reportFields?.modelNoAndCatelog ??
      "",
  };
}

function ExtraTagProductForm({
  item,
  onLoadDetails,
  onSaveDetails,
  onSaved,
}: {
  item: AuditScanItem;
  onLoadDetails: ExtraDetailsLoader;
  onSaveDetails: ExtraDetailsSaver;
  onSaved: () => void;
}) {
  const [details, setDetails] = useState<AuditExtraProductDetails>(() =>
    item.extraProductDetails ?? createEmptyExtraProductDetails(item)
  );
  const [isLoading, setIsLoading] = useState(!item.extraProductDetails);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (item.extraProductDetails) {
      return;
    }

    setIsLoading(true);
    onLoadDetails(item.id)
      .then((loadedDetails) => {
        if (isMounted) {
          setDetails((current) => ({
            ...current,
            ...loadedDetails,
            ProductName:
              current.ProductName ||
              loadedDetails.ProductName ||
              getExtraProductNameFromItem(item),
            HSNCode: current.HSNCode || loadedDetails.HSNCode,
            ProductCode: current.ProductCode || loadedDetails.ProductCode,
            ModelNo: current.ModelNo || loadedDetails.ModelNo,
          }));
          setMessage(null);
        }
      })
      .catch(() => {
        if (isMounted) {
          setMessage("Warehouse details could not be loaded for this tag.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [item.extraProductDetails, item.id, onLoadDetails]);

  const updateField = (field: keyof AuditExtraProductDetails, value: string) => {
    setDetails((current) => ({ ...current, [field]: value }));
  };
  const canSave = details.ProductName.trim().length > 0 && !isLoading && !isSaving;

  const handleSave = () => {
    if (!canSave) {
      setMessage("Product name is required.");
      return;
    }

    setIsSaving(true);
    setMessage(null);
    onSaveDetails(details)
      .then((savedDetails) => {
        setDetails(savedDetails);
        setMessage("Product details added.");
        onSaved();
      })
      .catch((error) => {
        setMessage(
          error instanceof Error
            ? error.message
            : "Product details could not be saved."
        );
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  const fields = [
    { key: "ProductName", label: "Product name", editable: true },
    { key: "TagIdNumber", label: "Tag ID number", editable: false },
    { key: "WareHouseName", label: "Warehouse name", editable: false },
    { key: "WareHouseId", label: "Warehouse ID", editable: false },
    { key: "HSNCode", label: "HSN code", editable: true },
    { key: "ProductCode", label: "Product code", editable: true },
    { key: "ModelNo", label: "Model no", editable: true },
  ] as const;

  return (
    <View
      className="mt-4 rounded-[14px] border p-3"
      style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
    >
      <View className="flex-row flex-wrap" style={{ gap: 10 }}>
        {fields.map((field) => (
          <View
            key={field.key}
            style={{
              minWidth: field.key === "ProductName" ? 220 : 160,
              flexGrow: field.key === "ProductName" ? 1.4 : 1,
              flexBasis: field.key === "ProductName" ? 220 : 160,
            }}
          >
            <Text className="mb-1 text-xs font-semibold" style={{ color: adminTheme.slateSoft }}>
              {field.label}
            </Text>
            <TextInput
              value={details[field.key]}
              editable={field.editable && !isSaving}
              onChangeText={(value) => updateField(field.key, value)}
              placeholder={field.label}
              placeholderTextColor="#94A3B8"
              className="rounded-[12px] border px-3 py-2 text-sm"
              style={{
                borderColor: adminTheme.border,
                backgroundColor: field.editable ? "#FFFFFF" : adminTheme.surfaceAlt,
                color: adminTheme.slate,
              }}
            />
          </View>
        ))}
      </View>

      <View className="mt-3 flex-row items-center justify-between" style={{ gap: 10 }}>
        <Text className="flex-1 text-xs" style={{ color: adminTheme.slateSoft }}>
          {isLoading ? "Loading warehouse details..." : message ?? ""}
        </Text>
        <Pressable
          onPress={handleSave}
          disabled={!canSave}
          className="flex-row items-center rounded-[12px] px-4 py-2.5"
          style={{
            gap: 8,
            backgroundColor: canSave ? adminTheme.primary : adminTheme.mutedBg,
          }}
        >
          <Feather
            name="save"
            size={16}
            color={canSave ? "#FFFFFF" : adminTheme.mutedText}
          />
          <Text
            className="text-sm font-semibold"
            style={{ color: canSave ? "#FFFFFF" : adminTheme.mutedText }}
          >
            {isSaving ? "Saving..." : "Save"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function AuditScanRow({
  item,
  index,
  isLast,
  onLoadExtraDetails,
  onSaveExtraDetails,
}: {
  item: AuditScanItem;
  index: number;
  isLast: boolean;
  onLoadExtraDetails: ExtraDetailsLoader;
  onSaveExtraDetails: ExtraDetailsSaver;
}) {
  const styles = getToneStyles(item.tone);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const canAddExtraDetails = item.tone === "extra";

  return (
    <View
      key={`${item.id}-${index}`}
      className={`rounded-[18px] border px-4 py-4 ${!isLast ? "mb-3" : ""}`}
      style={{
        borderColor: styles.dot,
        backgroundColor: styles.iconBg,
      }}
    >
      <View className="flex-row items-center">
        <View
          className="mr-3 h-10 w-10 items-center justify-center rounded-[12px]"
          style={{ backgroundColor: adminTheme.surface }}
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

        {canAddExtraDetails ? (
          <Pressable
            onPress={() => setIsFormOpen((current) => !current)}
            className="ml-3 h-8 w-8 items-center justify-center rounded-full"
            style={{ backgroundColor: adminTheme.surface }}
          >
            <Feather
              name={isFormOpen ? "minus" : "plus"}
              size={16}
              color={styles.statusIcon}
            />
          </Pressable>
        ) : (
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
        )}
      </View>

      {isFormOpen && canAddExtraDetails ? (
        <ExtraTagProductForm
          item={item}
          onLoadDetails={onLoadExtraDetails}
          onSaveDetails={onSaveExtraDetails}
          onSaved={() => setIsFormOpen(false)}
        />
      ) : null}
    </View>
  );
}

function AuditScanList({
  items,
  onLoadExtraDetails,
  onSaveExtraDetails,
}: {
  items: AuditScanItem[];
  onLoadExtraDetails: ExtraDetailsLoader;
  onSaveExtraDetails: ExtraDetailsSaver;
}) {
  return (
    <View>
      {items.map((item, index) => (
        <AuditScanRow
          key={`${item.id}-${index}`}
          item={item}
          index={index}
          isLast={index >= items.length - 1}
          onLoadExtraDetails={onLoadExtraDetails}
          onSaveExtraDetails={onSaveExtraDetails}
        />
      ))}
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

function PauseActionButton({
  canPause,
  isPausing,
  onPauseAudit,
  mobile = false,
}: {
  canPause: boolean;
  isPausing: boolean;
  onPauseAudit: () => void;
  mobile?: boolean;
}) {
  const disabled = !canPause || isPausing;

  return (
    <Pressable
      onPress={onPauseAudit}
      disabled={disabled}
      className={`items-center rounded-[14px] border ${
        mobile ? "px-5 py-4" : "px-4 py-4"
      }`}
      style={{
        borderColor: disabled ? adminTheme.border : adminTheme.primary,
        backgroundColor: adminTheme.surface,
      }}
    >
      <Text
        className={`${mobile ? "text-base" : "text-[16px]"} font-semibold`}
        style={{ color: disabled ? adminTheme.mutedText : adminTheme.primary }}
      >
        {isPausing ? "Pausing..." : "Pause Audit"}
      </Text>
    </Pressable>
  );
}

function ProceedNextWarehouseButton({
  show,
  onProceed,
  mobile = false,
}: {
  show: boolean;
  onProceed: () => void;
  mobile?: boolean;
}) {
  if (!show) {
    return null;
  }

  return (
    <Pressable
      onPress={onProceed}
      className={`mt-3 items-center rounded-[14px] border ${
        mobile ? "px-5 py-4" : "px-4 py-4"
      }`}
      style={{
        borderColor: adminTheme.primary,
        backgroundColor: adminTheme.surface,
      }}
    >
      <Text
        className={`${mobile ? "text-base" : "text-[16px]"} font-semibold`}
        style={{ color: adminTheme.primary }}
      >
        Proceed to next warehouse
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
  canPause,
  isPausingAudit,
  totalAssets,
  onPauseAudit,
  onSubmitAudit,
  hasNextWarehouse,
  onProceedNextWarehouse,
}: {
  phase: AuditPhase;
  scanned: number;
  found: number;
  missing: number;
  extra: number;
  canSubmit: boolean;
  canPause: boolean;
  isPausingAudit: boolean;
  totalAssets: number;
  onPauseAudit: () => void;
  onSubmitAudit: () => void;
  hasNextWarehouse: boolean;
  onProceedNextWarehouse: () => void;
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
        <PauseActionButton
          canPause={canPause}
          isPausing={isPausingAudit}
          onPauseAudit={onPauseAudit}
        />
        <View className="mt-3" />
        <SubmitActionButton
          phase={phase}
          canSubmit={canSubmit}
          onSubmitAudit={onSubmitAudit}
        />
        <ProceedNextWarehouseButton
          show={phase === "submitted" && hasNextWarehouse}
          onProceed={onProceedNextWarehouse}
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
        {/* <View className="flex-1 flex-row items-center">
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
        </View> */}

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
    auditPhase,
    canSubmit,
    canPause,
    isPausingAudit,
    submitError,
    connectionStatus,
    prepareMultiWarehouseAudit,
    startAudit,
    scanAssetCode,
    loadExtraTagProductDetails,
    saveExtraTagProductDetails,
    pauseAudit,
    submitAudit,
    proceedToNextWarehouse,
    resetAudit,
    summary,
    auditWarehouseId,
    hasNextWarehouse,
    expectedAssetCount,
    isPreparingWarehouse,
  } = useAuditScanState();
  const {
    organization,
    warehouses,
    rfidMachines,
    selectedWarehouse,
    selectedWarehouseIds,
    selectedMachine,
    selectedMachineId,
    setSelectedWarehouseId,
    setSelectedMachineId,
    toggleSelectedWarehouseId,
    isLoading,
    error,
    refreshSetup,
  } = useAuditSetup();
  const selectionLocked =
    auditPhase === "scanning" ||
    auditPhase === "paused" ||
    auditPhase === "submitting" ||
    isPreparingWarehouse;
  const activeWarehouseId = auditWarehouseId;
  const activeWarehouse = getWarehouseById(warehouses, activeWarehouseId) ?? selectedWarehouse;
  const hasSelectedWarehouse = Boolean(activeWarehouseId);
  const totalAssets = hasSelectedWarehouse
    ? getSelectedWarehouseTotalAssets(activeWarehouse, expectedAssetCount)
    : auditScanOverview.totalAssets;
  const selectedWarehouseSummary = getSelectedWarehouseSummary(
    warehouses,
    selectedWarehouseIds
  );
  const canPrepareAudit =
    selectedWarehouseIds.length > 0 && Boolean(selectedMachine) && !isPreparingWarehouse;
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);

  const filteredItems = useMemo(
    () => filterAuditItems(items, searchTerm, statusFilter),
    [items, searchTerm, statusFilter]
  );

  const handleSelectWarehouse = (warehouseId: string) => {
    toggleSelectedWarehouseId(warehouseId);
  };

  const startSelectedWarehouseSession = () => {
    void prepareMultiWarehouseAudit(
      selectedWarehouseIds,
      selectedWarehouseIds.map((warehouseId) => ({
        id: warehouseId,
        name: getWarehouseById(warehouses, warehouseId)?.name,
      }))
    );
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
      {!hasSelectedWarehouse ? (
        <>
          <View className="px-4 pt-4">
            <AuditSetupPanel
              organization={organization}
              warehouses={warehouses}
              machines={rfidMachines}
              selectedWarehouseIds={selectedWarehouseIds}
              selectedMachineId={selectedMachineId}
              onSelectWarehouse={handleSelectWarehouse}
              onToggleWarehouse={handleSelectWarehouse}
              onSelectMachine={setSelectedMachineId}
              isLoading={isLoading}
              error={error}
              onRetry={refreshSetup}
              selectionLocked={selectionLocked}
            />
          </View>

          <View className="px-4 pt-4">
            <Pressable
              onPress={startSelectedWarehouseSession}
              disabled={!canPrepareAudit}
              className="items-center rounded-[18px] px-5 py-4"
              style={{
                backgroundColor:
                  canPrepareAudit
                    ? adminTheme.primary
                    : adminTheme.mutedBg,
              }}
            >
              <Text
                className="text-base font-semibold"
                style={{
                  color:
                    canPrepareAudit
                      ? "#FFFFFF"
                      : adminTheme.mutedText,
                }}
              >
                {isPreparingWarehouse
                  ? "Preparing warehouses..."
                  : selectedWarehouseSummary && selectedMachine
                    ? `Start audit for ${selectedWarehouseSummary}`
                    : "Select warehouses and machine to start"}
              </Text>
            </Pressable>
          </View>
 
          <View className="px-4 pt-4">
            <WarehouseSelectionNotice />
          </View>
        </>
      ) : (
        <>
          <View className="px-4 pt-4">
            <WarehouseSelectionNotice
              warehouseName={activeWarehouse?.name}
              onBack={goBackToWarehouseSelection}
            />
          </View>

          <View className="px-4 pt-4">
            <MultiSourceScanWorkspace
              phase={auditPhase}
              connectionStatus={connectionStatus}
              onStartAudit={() => {
                if (activeWarehouseId) {
                  startAudit(activeWarehouseId, selectedMachine?.topic);
                }
              }}
              submitError={submitError}
              scanned={summary.scanned}
              found={summary.found}
              missing={summary.missing}
              extra={summary.extra}
              totalAssets={totalAssets}
              onScanCode={scanAssetCode}
              mobile
            />
          </View>

          <View className="px-4 pt-3">
            <View className="mb-3">
              <Text
                className="text-[18px] font-semibold"
                style={{ color: adminTheme.slate }}
              >
                {getListHeading(auditPhase)}
              </Text>
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
                <AuditScanList
                  items={filteredItems}
                  onLoadExtraDetails={loadExtraTagProductDetails}
                  onSaveExtraDetails={saveExtraTagProductDetails}
                />
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
            <View className="mt-3" />
            <PauseActionButton
              canPause={canPause}
              isPausing={isPausingAudit}
              onPauseAudit={pauseAudit}
              mobile
            />
            <ProceedNextWarehouseButton
              show={auditPhase === "submitted" && hasNextWarehouse}
              onProceed={proceedToNextWarehouse}
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
    auditPhase,
    canSubmit,
    canPause,
    isPausingAudit,
    submitError,
    connectionStatus,
    prepareMultiWarehouseAudit,
    startAudit,
    scanAssetCode,
    loadExtraTagProductDetails,
    saveExtraTagProductDetails,
    pauseAudit,
    submitAudit,
    proceedToNextWarehouse,
    resetAudit,
    summary,
    auditWarehouseId,
    hasNextWarehouse,
    expectedAssetCount,
    isPreparingWarehouse,
  } = useAuditScanState();
  const {
    organization,
    warehouses,
    rfidMachines,
    selectedWarehouse,
    selectedWarehouseIds,
    selectedMachine,
    selectedMachineId,
    setSelectedWarehouseId,
    setSelectedMachineId,
    toggleSelectedWarehouseId,
    isLoading,
    error,
    refreshSetup,
  } = useAuditSetup();
  const twoColumn = width >= 1340;
  const selectionLocked =
    auditPhase === "scanning" ||
    auditPhase === "paused" ||
    auditPhase === "submitting" ||
    isPreparingWarehouse;
  const activeWarehouseId = auditWarehouseId;
  const activeWarehouse = getWarehouseById(warehouses, activeWarehouseId) ?? selectedWarehouse;
  const hasSelectedWarehouse = Boolean(activeWarehouseId);
  const totalAssets = hasSelectedWarehouse
    ? getSelectedWarehouseTotalAssets(activeWarehouse, expectedAssetCount)
    : auditScanOverview.totalAssets;
  const selectedWarehouseSummary = getSelectedWarehouseSummary(
    warehouses,
    selectedWarehouseIds
  );
  const canPrepareAudit =
    selectedWarehouseIds.length > 0 && Boolean(selectedMachine) && !isPreparingWarehouse;
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);

  const filteredItems = useMemo(
    () => filterAuditItems(items, searchTerm, statusFilter),
    [items, searchTerm, statusFilter]
  );

  const handleSelectWarehouse = (warehouseId: string) => {
    toggleSelectedWarehouseId(warehouseId);
  };

  const startSelectedWarehouseSession = () => {
    void prepareMultiWarehouseAudit(
      selectedWarehouseIds,
      selectedWarehouseIds.map((warehouseId) => ({
        id: warehouseId,
        name: getWarehouseById(warehouses, warehouseId)?.name,
      }))
    );
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
              ? activeWarehouse?.name ?? auditScanOverview.title
              : auditScanOverview.title}
          </Text>
          <Text className="mt-1 text-base" style={{ color: adminTheme.slateSoft }}>
            {hasSelectedWarehouse
              ? "Warehouse scan"
              : auditScanOverview.desktopMeta}
          </Text>
        </View>
      </View>

      {!hasSelectedWarehouse ? (
        <>
          <View className="mb-5">
            <AuditSetupPanel
              organization={organization}
              warehouses={warehouses}
              machines={rfidMachines}
              selectedWarehouseIds={selectedWarehouseIds}
              selectedMachineId={selectedMachineId}
              onSelectWarehouse={handleSelectWarehouse}
              onToggleWarehouse={handleSelectWarehouse}
              onSelectMachine={setSelectedMachineId}
              isLoading={isLoading}
              error={error}
              onRetry={refreshSetup}
              selectionLocked={selectionLocked}
            />
          </View>

          <View className="mb-5">
            <Pressable
              onPress={startSelectedWarehouseSession}
              disabled={!canPrepareAudit}
              className="items-center rounded-[18px] px-5 py-4"
              style={{
                backgroundColor:
                  canPrepareAudit
                    ? adminTheme.primary
                    : adminTheme.mutedBg,
              }}
            >
              <Text
                className="text-base font-semibold"
                style={{
                  color:
                    canPrepareAudit
                      ? "#FFFFFF"
                      : adminTheme.mutedText,
                }}
              >
                {isPreparingWarehouse
                  ? "Preparing warehouses..."
                  : selectedWarehouseSummary && selectedMachine
                    ? `Start audit for ${selectedWarehouseSummary}`
                    : "Select warehouses and machine to start"}
              </Text>
            </Pressable>
          </View>

          <WarehouseSelectionNotice />
        </>
      ) : (
        <>
          <View className="mb-5">
            <WarehouseSelectionNotice
              warehouseName={activeWarehouse?.name}
              onBack={goBackToWarehouseSelection}
            />
          </View>

          <View
            className="mb-4 flex-row"
            style={{ gap: 18, alignItems: "flex-start" }}
          >
            <View style={{ flex: 1.25 }}>
              <MultiSourceScanWorkspace
                phase={auditPhase}
                connectionStatus={connectionStatus}
                onStartAudit={() => {
                  if (activeWarehouseId) {
                    startAudit(activeWarehouseId, selectedMachine?.topic);
                  }
                }}
                submitError={submitError}
                scanned={summary.scanned}
                found={summary.found}
                missing={summary.missing}
                extra={summary.extra}
                totalAssets={totalAssets}
                onScanCode={scanAssetCode}
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
                canPause={canPause}
                isPausingAudit={isPausingAudit}
                totalAssets={totalAssets}
                onPauseAudit={pauseAudit}
                onSubmitAudit={submitAudit}
                hasNextWarehouse={hasNextWarehouse}
                onProceedNextWarehouse={proceedToNextWarehouse}
              />
            </View>
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
                <AuditScanList
                  items={filteredItems}
                  onLoadExtraDetails={loadExtraTagProductDetails}
                  onSaveExtraDetails={saveExtraTagProductDetails}
                />
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
  const { width } = useWindowDimensions();
  const isMobile = width < 1024;

  return isMobile ? <MobileAuditScan /> : <DesktopAuditScan width={width} />;
}






