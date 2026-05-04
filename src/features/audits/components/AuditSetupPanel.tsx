import { OrganizationDetails } from "@/models/organization";
import { WarehouseSummary } from "@/models/warehouse";
import { adminTheme } from "@/theme/adminTheme";
import { Feather } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

function formatOrganizationSubtitle(organization: OrganizationDetails | null) {
  if (!organization) {
    return "Organization details will appear here once the authenticated setup call succeeds.";
  }

  const parts = [
    organization.ShortName?.trim(),
    organization.ContactPerson?.trim(),
    organization.Address?.CityName?.trim(),
    organization.Address?.StateName?.trim(),
  ].filter(Boolean);

  return parts.length > 0
    ? parts.join(" - ")
    : "Organization details loaded from the authenticated account.";
}

function SetupStateBanner({
  message,
  isError = false,
  onRetry,
  primaryColor,
}: {
  message: string;
  isError?: boolean;
  onRetry?: () => void;
  primaryColor: string;
}) {
  return (
    <View
      className="mt-4 rounded-[16px] border px-4 py-3"
      style={{
        borderColor: isError ? "#F5C2C7" : adminTheme.border,
        backgroundColor: isError ? "#FFF5F5" : adminTheme.surfaceAlt,
      }}
    >
      <View className="flex-row items-center justify-between" style={{ gap: 12 }}>
        <View className="flex-1 flex-row items-center">
          <Feather
            name={isError ? "alert-circle" : "loader"}
            size={18}
            color={isError ? "#C0392B" : primaryColor}
          />
          <Text
            className="ml-3 flex-1 text-sm"
            style={{ color: isError ? "#A83D3D" : adminTheme.slateSoft }}
          >
            {message}
          </Text>
        </View>
        {isError && onRetry ? (
          <Pressable onPress={onRetry}>
            <Text className="text-sm font-semibold" style={{ color: primaryColor }}>
              Retry
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export default function AuditSetupPanel({
  organization,
  warehouses,
  selectedWarehouseId,
  selectedWarehouseIds,
  onSelectWarehouse,
  onToggleWarehouse,
  isLoading,
  error,
  onRetry,
  primaryColor = adminTheme.primary,
  selectionLocked = false,
}: {
  organization: OrganizationDetails | null;
  warehouses: WarehouseSummary[];
  selectedWarehouseId?: string | null;
  selectedWarehouseIds?: string[];
  onSelectWarehouse?: (warehouseId: string) => void;
  onToggleWarehouse?: (warehouseId: string) => void;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  primaryColor?: string;
  selectionLocked?: boolean;
}) {
  const selectedIds = selectedWarehouseIds ?? (selectedWarehouseId ? [selectedWarehouseId] : []);
  const isMultiSelect = Boolean(onToggleWarehouse || selectedWarehouseIds);

  return (
    <View
      className="rounded-[20px] border p-5"
      style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surface }}
    >
      <Text className="text-[18px] font-semibold" style={{ color: adminTheme.slate }}>
        Audit Setup
      </Text>
      <Text className="mt-1 text-sm leading-5" style={{ color: adminTheme.slateSoft }}>
        Load the organization context and select one or more warehouses for this audit.
        Each selected warehouse can be scanned in the same reconciliation session.
      </Text>

      {isLoading ? (
        <SetupStateBanner
          message="Loading organization details and warehouses..."
          primaryColor={primaryColor}
        />
      ) : null}

      {!isLoading && error ? (
        <SetupStateBanner
          message={error}
          isError
          onRetry={onRetry}
          primaryColor={primaryColor}
        />
      ) : null}

      <View
        className="mt-4 rounded-[18px] border px-4 py-4"
        style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surfaceAlt }}
      >
        <Text className="text-xs font-medium uppercase" style={{ color: adminTheme.muted }}>
          Organization
        </Text>
        <Text className="mt-2 text-[18px] font-semibold" style={{ color: adminTheme.slate }}>
          {organization?.Name?.trim() || "Organization not loaded yet"}
        </Text>
        <Text className="mt-1 text-sm leading-5" style={{ color: adminTheme.slateSoft }}>
          {formatOrganizationSubtitle(organization)}
        </Text>
      </View>

      <View className="mt-4 flex-row items-center justify-between">
        <Text className="text-[16px] font-semibold" style={{ color: adminTheme.slate }}>
          Warehouses
        </Text>
        <Text className="text-xs" style={{ color: adminTheme.muted }}>
          {selectedIds.length > 0
            ? `${selectedIds.length} selected`
            : `${warehouses.length} loaded`}
        </Text>
      </View>

      {warehouses.length > 0 ? (
        <View className="mt-3 flex-row flex-wrap gap-3">
          {warehouses.map((warehouse) => {
            const isSelected = selectedIds.includes(warehouse.id);

            return (
              <Pressable
                key={warehouse.id}
                onPress={() =>
                  isMultiSelect
                    ? onToggleWarehouse?.(warehouse.id)
                    : onSelectWarehouse?.(warehouse.id)
                }
                disabled={selectionLocked}
                className="min-w-[180px] flex-1 rounded-[16px] border px-4 py-4"
                style={{
                  borderColor: isSelected ? primaryColor : adminTheme.border,
                  backgroundColor: isSelected ? adminTheme.infoBg : adminTheme.surface,
                  opacity: selectionLocked && !isSelected ? 0.68 : 1,
                }}
              >
                <View className="flex-row items-start justify-between" style={{ gap: 8 }}>
                  <View className="flex-1">
                    <Text className="text-[15px] font-semibold" style={{ color: adminTheme.slate }}>
                      {warehouse.name}
                    </Text>
                    {warehouse.subtitle ? (
                      <Text className="mt-1 text-sm leading-5" style={{ color: adminTheme.slateSoft }}>
                        {warehouse.subtitle}
                      </Text>
                    ) : null}
                  </View>
                  {isSelected ? (
                    <View
                      className="h-7 w-7 items-center justify-center rounded-full"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <Feather name="check" size={14} color="#FFFFFF" />
                    </View>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : !isLoading && !error ? (
        <View
          className="mt-3 rounded-[16px] border px-4 py-4"
          style={{ borderColor: adminTheme.border, backgroundColor: adminTheme.surfaceAlt }}
        >
          <Text className="text-sm leading-5" style={{ color: adminTheme.slateSoft }}>
            No warehouses are assigned to this account yet.
          </Text>
        </View>
      ) : null}

      <View
        className="mt-4 rounded-[16px] px-4 py-3"
        style={{ backgroundColor: adminTheme.warningBg }}
      >
        <Text className="text-sm leading-5" style={{ color: adminTheme.warningText }}>
          {selectionLocked
            ? "Warehouse selection is locked for the current audit session. Finish or restart the audit before changing it."
            : selectedIds.length > 0
              ? "Selected warehouses will be scanned one by one in the same reconciliation session."
              : "Select at least one warehouse first, then the audit workspace will unlock and scanning can start."}
        </Text>
      </View>
    </View>
  );
}
