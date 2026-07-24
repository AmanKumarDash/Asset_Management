import { OrganizationAddress } from "@/models/organization";
import { WarehouseSummary } from "@/models/warehouse";

type WarehouseRecord = Record<string, unknown>;

function pickString(record: WarehouseRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function pickId(record: WarehouseRecord, keys: string[]) {
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

function normalizeStatusValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();
  const parsed = Number(normalizedValue);

  if (Number.isFinite(parsed)) {
    return parsed;
  }

  if (["running", "in progress", "in-progress", "started", "active", "pending"].includes(normalizedValue)) {
    return 1;
  }

  if (["done", "completed", "complete", "submitted", "finished", "closed"].includes(normalizedValue)) {
    return 0;
  }

  return null;
}

function pickStatus(record: WarehouseRecord) {
  const candidates = [
    record.Status,
    record.status,
    record.StatusName,
    record.statusName,
    record.StatusId,
    record.statusId,
    record.AuditStatus,
    record.auditStatus,
    record.AuditStatusName,
    record.auditStatusName,
    record.WarehouseStatus,
    record.warehouseStatus,
    record.WareHouseStatus,
    record.wareHouseStatus,
  ];

  for (const value of candidates) {
    const statusValue = normalizeStatusValue(value);

    if (statusValue !== null) {
      return statusValue;
    }
  }

  return null;
}

function getAddressSubtitle(address: unknown) {
  if (!address || typeof address !== "object") {
    return null;
  }

  const addressRecord = address as OrganizationAddress & WarehouseRecord;
  const parts = [
    pickString(addressRecord, ["Address1"]),
    pickString(addressRecord, ["Address2"]),
    pickString(addressRecord, ["CityName"]),
    pickString(addressRecord, ["StateName"]),
    pickString(addressRecord, ["CountryName"]),
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" - ") : null;
}

function normalizeWarehouse(record: WarehouseRecord, index: number): WarehouseSummary {
  const id =
    pickId(record, ["Id", "ID", "WarehouseId", "warehouseId", "WareHouseId", "wareHouseId"]) ??
    `warehouse-${index + 1}`;
  const name =
    pickString(record, [
      "WareHouseName",
      "WarehouseName",
      "Name",
      "Title",
      "ShortName",
      "warehouseName",
    ]) ?? "";
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
    ]
      .filter(Boolean)
      .join(" - ") || null;
  const auditStatusValue = pickStatus(record);

  return {
    id,
    name,
    code,
    subtitle,
    auditStatus:
      auditStatusValue === 1 ? "running" : auditStatusValue === 0 ? "done" : null,
    auditStatusValue,
    raw: record,
  };
}

export function normalizeWarehouses(records: WarehouseRecord[]) {
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
