export const ENDPOINTS = {
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
    ASSET_WAREHOUSE_STAGING: "/api/warehouse/AssetWarehouseStaging",
  },
  INVENTORY: {
    SEARCH_BARCODE_SCAN_MODE: (searchText: string) =>
      `/api/InventoryManagement/Search_InventoryBarcodeScanMode?searchText=${encodeURIComponent(
        searchText
      )}&isTaxable=true&isGSTtype=true&IsRestrict=false&IsProforma=false&IsTagWise=true`,
  },
} as const;
