export const ENDPOINTS = {
  AUTH: {
    LOGIN: "/api/Account/validatelogin",
    REFRESH: "/api/Account/RefreshToken",
  },
  INVENTORY: {
    SEARCH_BARCODE_SCAN_MODE: (searchText: string) =>
      `/api/InventoryManagement/Search_InventoryBarcodeScanMode?searchText=${encodeURIComponent(
        searchText
      )}&isTaxable=true&isGSTtype=true&IsRestrict=false&IsProforma=false&IsTagWise=true`,
  },
  AUDIT: {
    SUBMIT_SCANNED_TAGS: "/api/Audit/SubmitScannedTags",
  },
} as const;
