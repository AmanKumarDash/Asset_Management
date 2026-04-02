import { useAuthSession } from "@/features/auth/hooks/useAuthSession";
import { OrganizationAddress } from "@/models/organization";
import { WarehouseSummary } from "@/models/warehouse";
import { apiService, WarehouseApiRecord } from "@/network/ApiService";
import { getApiErrorMessage } from "@/network/responses";
import { appLogger } from "@/utils/appLogger";
import { useCallback, useEffect, useMemo, useState } from "react";

function pickString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function pickId(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function getAddressSubtitle(address: unknown) {
  if (!address || typeof address !== "object") {
    return null;
  }

  const addressRecord = address as OrganizationAddress & Record<string, unknown>;
  const parts = [
    pickString(addressRecord, ["Address1"]),
    pickString(addressRecord, ["Address2"]),
    pickString(addressRecord, ["CityName"]),
    pickString(addressRecord, ["StateName"]),
    pickString(addressRecord, ["CountryName"]),
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" - ") : null;
}

function normalizeWarehouse(record: WarehouseApiRecord, index: number): WarehouseSummary {
  const id = pickId(record, ["Id", "ID", "WarehouseId", "warehouseId"]) ??
    `warehouse-${index + 1}`;
  const name =
    pickString(record, [
      "Name",
      "WarehouseName",
      "Title",
      "ShortName",
      "warehouseName",
    ]) ?? `Warehouse ${index + 1}`;
  const code = pickString(record, [
    "Code",
    "WarehouseCode",
    "ShortName",
    "ReferenceId",
    "warehouseCode",
  ]);
  const subtitle =
    [
      code,
      pickString(record, ["CityName", "cityName"]),
      pickString(record, ["StateName", "stateName"]),
      getAddressSubtitle(record.Address),
    ].filter(Boolean).join(" - ") || null;

  return {
    id,
    name,
    code,
    subtitle,
    raw: record,
  };
}

function normalizeWarehouses(records: WarehouseApiRecord[]) {
  const seen = new Set<string>();

  return records
    .map((record, index) => normalizeWarehouse(record, index))
    .filter((warehouse) => {
      if (seen.has(warehouse.id)) {
        return false;
      }

      seen.add(warehouse.id);
      return true;
    });
}

export function useAuditSetup() {
  const { user, organization, refreshOrganization } = useAuthSession();
  const [warehouses, setWarehouses] = useState<WarehouseSummary[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      const warehouseRecords = await apiService.getWarehouses(1, 50);
      const normalizedWarehouses = normalizeWarehouses(warehouseRecords);

      setWarehouses(normalizedWarehouses);
      setSelectedWarehouseId((current) =>
        current && normalizedWarehouses.some((warehouse) => warehouse.id === current)
          ? current
          : null
      );

      appLogger.info("AuditSetup", "Loaded organization and warehouse setup.", {
        organizationId: resolvedOrganization.Id,
        warehouseCount: normalizedWarehouses.length,
      });
    } catch (setupError) {
      const message = getApiErrorMessage(
        setupError,
        "Unable to load organization and warehouse details."
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
  }, [organization, refreshOrganization, user]);

  useEffect(() => {
    void loadAuditSetup();
  }, [loadAuditSetup]);

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
