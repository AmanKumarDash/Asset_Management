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

  return {
    id,
    name,
    code,
    subtitle,
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
