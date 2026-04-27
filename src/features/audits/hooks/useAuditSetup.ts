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
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);
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
        setSelectedWarehouseId(null);
        setError("Unable to load organization details for this account.");
        return;
      }

      const resolvedWarehouseAccess =
        accessibleWarehouses.length > 0
          ? accessibleWarehouses
          : await refreshWarehouseAccess();

      setWarehouses(resolvedWarehouseAccess);
      setSelectedWarehouseId((current) =>
        current && resolvedWarehouseAccess.some((warehouse) => warehouse.id === current)
          ? current
          : null
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
      setSelectedWarehouseId(null);
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
      warehouses.find((warehouse) => warehouse.id === selectedWarehouseId) ?? null,
    [selectedWarehouseId, warehouses]
  );

  return {
    organization,
    warehouses,
    selectedWarehouseId,
    selectedWarehouse,
    setSelectedWarehouseId,
    isLoading,
    error,
    refreshSetup: loadAuditSetup,
  };
}
