# Application API inventory

This inventory covers the HTTP endpoints called by the app, plus the MQTT broker used for live RFID scans. HTTP requests use the base URL configured by `EXPO_PUBLIC_API_URL`; it is normalized in `src/config/env.ts`. Most requests use the shared Axios client in `src/network/ApiService.ts`. The mail request uses `fetch` with multipart form data.

## HTTP endpoints

| Method | Endpoint | Purpose / app usage |
|---|---|---|
| POST | `/api/Account/validatelogin` | Authenticate a user. |
| POST | `/api/Account/RefreshToken` | Refresh an expired access token; called automatically by the Axios response interceptor. |
| GET | `/api/Account/GetUserDetails?UserId={userId}&pageNo={pageNo}&rowCount={rowCount}&sortOrder=ASC&sortColumn=UserTypeId` | Load user/employee details, including paged employee lists. |
| POST | `/api/Account/UpdateUserData?UserId={userId}` | Update a user's profile. |
| POST | `/api/Account/sendmail` | Send report email, optionally with an attachment (multipart/form-data). |
| POST | `/api/Admin/createuser` | Create an employee/admin user. |
| GET | `/api/ajax/IsBarcodeOrTag?TagNo={value}&Barcode={value}` | Classify scanned values as RFID tags or barcodes. The app calls this once per unique scanned value. |
| GET | `/api/org/GetDetails` | Get the authenticated organization's details. |
| GET | `/api/SaleOrderDetails/GetAllCartDetailsByOrg?sortOrder=desc&sortColumn=CreatedOn&pageNo=1&rowCount=100` | Get carts/RFID machines for the organization and derive scanner topics. |
| GET | `/api/warehouse/getwarehousebyOrg?pageNo={pageNo}&rowCount={rowCount}` | List organization warehouses. |
| POST | `/api/warehouse/WarehouseAccess` | Assign warehouse access to an employee. |
| POST | `/api/warehouse/deleteemployeewarehouse?UserId={userId}` | Remove an employee's warehouse assignment. |
| GET | `/api/warehouse/GetWarehouseAccessByUser?UserId={userId}` | Get warehouses assigned to a user. |
| GET | `/api/warehouse/GetWareHousetagno?WarehouseId={warehouseId}` | Get the warehouse's expected RFID/tag baseline for audit. |
| GET | `/api/warehouse/GetWarehouseDetailsbyWarehouseId?WarehouseId={warehouseId}[&referanceId={referenceId}][&StartDate={startDate}][&EndDate={endDate}]` | Get warehouse inventory/details or comparison data. The same endpoint supports both report/detail and comparison flows. |
| POST | `/api/warehouse/AssetWarehouseStaging` | Submit scanned audit tags and status; returns an audit reference. |
| POST | `/api/warehouse/TagProductMappingOfMissingProducts` | Save product details/mapping for a missing or unrecognized scanned tag. |
| GET | `/api/warehouse/GetWarehouseAuditData?referanceId={referenceId}` | Load audit comparison data for a submitted audit reference. |
| GET | `/api/warehouse/GetWarehouseIdAccessByTagId?TagId={commaSeparatedTagIds}` | Resolve scanned tags to their warehouse locations; results are cached/deduplicated in the service. |
| GET | `/api/warehouse/GetReportByEmployee?userid={userId}[&FromDate={fromDate}][&ToDate={toDate}][&SessionId={sessionId}]` | Load employee audit report rows, optionally filtered by date/session. |
| GET | `/api/warehouse/GetReportByDateWiseAsset?StartDate={startDate}&EndDate={endDate}` | Load date-range asset/audit report rows. |
| GET | `/api/InventoryManagement/Search_InventoryBarcodeScanMode?searchText={value}&isTaxable=true&isGSTtype=true&IsRestrict=false&IsProforma=false&IsTagWise=true` | Resolve a scanned tag/barcode to inventory/product details. |

## Live scan connection

| Protocol | Address | Purpose |
|---|---|---|
| MQTT over WebSocket (WSS) | `EXPO_PUBLIC_MQTT_BROKER`, default `wss://no-counter.smaketsolutions.com:9002` | Receive RFID scan messages. The app subscribes to the selected machine's topic (derived as `{Machine_No}p`). Credentials are read from `EXPO_PUBLIC_MQTT_USERNAME` and `EXPO_PUBLIC_MQTT_PASSWORD`. |

## Source of truth

- Endpoint paths and query construction: `src/network/endpoints.ts`
- HTTP methods, payloads, and API wrappers: `src/network/ApiService.ts`
- Base URL and timeout: `src/config/env.ts`
- Token refresh and authorization headers: `src/network/axiosConfig.ts`
- MQTT connection: `src/network/mqttService.ts`
