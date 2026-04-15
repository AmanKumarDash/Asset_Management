export const ENDPOINTS = {
  ADMIN: {
    CREATE_USER: "/api/Admin/createuser",
  },
  AUTH: {
    LOGIN: "/api/Account/validatelogin",
    REFRESH: "/api/Account/RefreshToken",
  },
  ORG: {
    GET_DETAILS: "/api/org/GetDetails",
  },
  WAREHOUSE: {
    GET_BY_ORG: (pageNo = 1, rowCount = 50) =>
      `/api/warehouse/getwarehousebyOrg?pageNo=${pageNo}&rowCount=${rowCount}`,
    GET_TAGS_BY_WAREHOUSE: (warehouseId: number | string) =>
      `/api/warehouse/GetWareHousetagno?WarehouseId=${encodeURIComponent(String(warehouseId))}`,
    ASSET_WAREHOUSE_STAGING: "/api/warehouse/AssetWarehouseStaging",
    GET_AUDIT_DATA: (referenceId: string) =>
      `/api/warehouse/GetWarehouseAuditData?referanceId=${encodeURIComponent(referenceId)}`,
  },
  INVENTORY: {
    SEARCH_BARCODE_SCAN_MODE: (searchText: string) =>
      `/api/InventoryManagement/Search_InventoryBarcodeScanMode?searchText=${encodeURIComponent(
        searchText
      )}&isTaxable=true&isGSTtype=true&IsRestrict=false&IsProforma=false&IsTagWise=true`,
  },
} as const;

