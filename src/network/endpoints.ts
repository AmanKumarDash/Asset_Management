export const ENDPOINTS = {
  ADMIN: {
    CREATE_USER: "/api/Admin/createuser",
  },
  AUTH: {
    LOGIN: "/api/Account/validatelogin",
    REFRESH: "/api/Account/RefreshToken",
    GET_USER_DETAILS: (
      userId = "",
      pageNo = 1,
      rowCount = 10,
      sortOrder = "ASC",
      sortColumn = "UserTypeId"
    ) =>
      `/api/Account/GetUserDetails?UserId=${encodeURIComponent(
        userId
      )}&pageNo=${pageNo}&rowCount=${rowCount}&sortOrder=${sortOrder}&sortColumn=${sortColumn}`,
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
    GET_REPORT_BY_EMPLOYEE: (
      userId: string,
      fromDate?: string,
      toDate?: string
    ) => {
      const params = new URLSearchParams({
        userid: userId,
      });

      if (fromDate) {
        params.set("FromDate", fromDate);
      }

      if (toDate) {
        params.set("ToDate", toDate);
      }

      return `/api/warehouse/GetReportByEmployee?${params.toString()}`;
    },
    GET_REPORT_BY_DATE: (startDate: string, endDate: string) =>
      `/api/warehouse/GetReportByDateWiseAsset?StartDate=${startDate}&EndDate=${endDate}`,
  },
  INVENTORY: {
    SEARCH_BARCODE_SCAN_MODE: (searchText: string) =>
      `/api/InventoryManagement/Search_InventoryBarcodeScanMode?searchText=${encodeURIComponent(
        searchText
      )}&isTaxable=true&isGSTtype=true&IsRestrict=false&IsProforma=false&IsTagWise=true`,
  },
} as const;
