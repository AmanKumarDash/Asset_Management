import { useAuthSession } from "@/features/auth/hooks/useAuthSession";
import { WarehouseSummary } from "@/models/warehouse";
import { getApiErrorMessage } from "@/network/responses";
import { appLogger } from "@/utils/appLogger";
import { useCallback, useEffect, useMemo, useState } from "react";

// Loads the organization and warehouse data needed before a user can start an audit session.
export function useAuditSetup() {
  const {
    user,
    organization,
    accessibleWarehouses,
    refreshOrganization,
    refreshWarehouseAccess,
  } = useAuthSession();
  const [warehouses, setWarehouses] = useState<WarehouseSummary[]>([]);
  const [selectedWarehouseIds, setSelectedWarehouseIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refreshes the setup screen by ensuring org details exist first, then loading warehouses for that org.
  const loadAuditSetup = useCallback(async () => {
    if (!user) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const resolvedOrganization = organization ?? (await refreshOrganization());

      if (!resolvedOrganization) {
        setWarehouses([]);
        setSelectedWarehouseIds([]);
        setError("Unable to load organization details for this account.");
        return;
      }

      const resolvedWarehouseAccess =
        accessibleWarehouses.length > 0
          ? accessibleWarehouses
          : await refreshWarehouseAccess();

      setWarehouses(resolvedWarehouseAccess);
      setSelectedWarehouseIds((current) =>
        current.filter((warehouseId) =>
          resolvedWarehouseAccess.some((warehouse) => warehouse.id === warehouseId)
        )
      );

      appLogger.info("AuditSetup", "Loaded organization and warehouse setup.", {
        organizationId: resolvedOrganization.Id,
        warehouseCount: resolvedWarehouseAccess.length,
      });
    } catch (setupError) {
      const message = getApiErrorMessage(
        setupError,
        "Unable to load warehouse access for this account."
      );

      setWarehouses([]);
      setSelectedWarehouseIds([]);
      setError(message);

      appLogger.warn("AuditSetup", "Failed to load setup details.", {
        message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [accessibleWarehouses, organization, refreshOrganization, refreshWarehouseAccess, user]);

  // Auto-load setup data whenever the authenticated user context becomes available.
  useEffect(() => {
    void loadAuditSetup();
  }, [loadAuditSetup]);

  // Exposes the full selected warehouse object so screens do not have to re-lookup it by id.
  const selectedWarehouse = useMemo(
    () =>
      warehouses.find((warehouse) => warehouse.id === selectedWarehouseIds[0]) ?? null,
    [selectedWarehouseIds, warehouses]
  );

  const selectedWarehouses = useMemo(
    () =>
      selectedWarehouseIds
        .map((warehouseId) =>
          warehouses.find((warehouse) => warehouse.id === warehouseId)
        )
        .filter((warehouse): warehouse is WarehouseSummary => Boolean(warehouse)),
    [selectedWarehouseIds, warehouses]
  );

  const selectedWarehouseId = selectedWarehouseIds[0] ?? null;

  const setSelectedWarehouseId = useCallback((warehouseId: string | null) => {
    setSelectedWarehouseIds(warehouseId ? [warehouseId] : []);
  }, []);

  const toggleSelectedWarehouseId = useCallback((warehouseId: string) => {
    setSelectedWarehouseIds((current) =>
      current.includes(warehouseId)
        ? current.filter((id) => id !== warehouseId)
        : [...current, warehouseId]
    );
  }, []);

  return {
    organization,
    warehouses,
    selectedWarehouseId,
    selectedWarehouseIds,
    selectedWarehouse,
    selectedWarehouses,
    setSelectedWarehouseId,
    setSelectedWarehouseIds,
    toggleSelectedWarehouseId,
    isLoading,
    error,
    refreshSetup: loadAuditSetup,
  };
}
