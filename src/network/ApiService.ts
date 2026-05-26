import {
  AssetWarehouseStagingItem,
  AuditComparisonResponse,
  AuditSubmitRequest,
  AuditSubmitResponse,
  WarehouseTagLocationItem,
  WarehouseTagBaselineItem,
} from "@/features/audits/types/audit";
import { InventoryBarcodeScanDetail } from "@/features/audits/types/inventory";
import { LoginResponse } from "@/features/auth/types/authApi";
import { OrganizationDetails } from "@/models/organization";
import { AxiosInstance } from "axios";
import { assertApiBaseUrlConfigured, axiosInstance } from "./axiosConfig";
import { ENDPOINTS } from "./endpoints";
import {
  ApiCollectionEnvelope,
  ApiEnvelope,
  extractResponseCollection,
  extractResponseData,
} from "./responses";

export type LoginCredentials = {
  Username: string;
  Password: string;
};

export type UserDetails = {
  UserId: string;
  FirstName: string;
  MiddleName?: string;
  LastName: string;
  EmailId?: string;
  Mobile: string;
  UserType: number;
  IsActive: boolean;
  UserStatus: number;
  Type?: string;
  CompanyName?: string;
  GSTNo?: string;
} & Record<string, unknown>;

export type CreateUserRequest = {
  UserId?: string;
  FirstName: string;
  MiddleName?: string;
  LastName: string;
  UserType: number;
  Address?: {
    Id: number;
    Address1: string;
    Address2: string;
    City: number;
    CityName: string;
    DistrictId: number;
    DistrictName: string;
    StateId: number;
    StateName: string;
    CountryId: number;
    CountryName: string;
    Pin: number;
  };
  EmailId?: string;
  Mobile: string;
  CompanyName?: string;
  GSTNo?: string;
  OpeningBalance?: number;
  GSTTypeID?: number;
  GSTType?: string; // 
  Offline_Id?: string;
};

export type WarehouseAccessRequest = {
  AssignTo: string;
  WareHouseId: string;
  Description?: string;
};

export type WarehouseApiRecord = Record<string, unknown>;

export type WarehouseAccessApiItem = {
  WareHouseId?: number | string;
  WarehouseId?: number | string;
  WareHouseName?: string | null;
  WarehouseName?: string | null;
} & Record<string, unknown>;

export type EmployeeReportApiItem = {
  WareHouseId: number | string;
  ProductId: number | string;
  ProductCode?: string | null;
  TagId?: string | number | null;
  SessionId?: string | null;
  sessionId?: string | null;
  RefrenceId?: string | null;
  ReferenceId?: string | null;
  ScanningDate?: string | null;
};

function extractAuditReferenceId(
  payload: AuditSubmitResponse | string | null | undefined
): string {
  if (typeof payload === "string" && payload.trim()) {
    return payload.trim();
  }

  if (!payload || typeof payload !== "object") {
    return "";
  }

  const record = payload as Record<string, unknown>;
  const candidates = [
    record.Reference,
    record.reference,
    record.ReferenceId,
    record.referenceId,
    record.referanceId,
  ];

  const referenceId = candidates.find(
    (value): value is string => typeof value === "string" && value.trim().length > 0
  );

  return referenceId?.trim() ?? "";
}

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axiosInstance;
  }

  // Authenticates the user and returns the normalized login payload used to build app session state.
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    assertApiBaseUrlConfigured();

    const response = await this.api.post<ApiEnvelope<LoginResponse> | LoginResponse>(
      ENDPOINTS.AUTH.LOGIN,
      credentials
    );

    return extractResponseData<LoginResponse>(response.data);
  }

  async getUserDetails(
  userId = "",
  pageNo = 1,
  rowCount = 10
): Promise<UserDetails[]> {
  assertApiBaseUrlConfigured();

  const response = await this.api.get<
    ApiCollectionEnvelope<UserDetails> | UserDetails[]
  >(ENDPOINTS.AUTH.GET_USER_DETAILS(userId, pageNo, rowCount));

  const data = extractResponseCollection<UserDetails>(response.data);

  //  IMPORTANT: filter UserType = 3
  return data.filter((user) => user.UserType === 3);
}

  // Loads organization details for the currently authenticated user after the bearer token is attached.
  async getOrganizationDetails(): Promise<OrganizationDetails> {
    assertApiBaseUrlConfigured();

    const response = await this.api.get<
      ApiEnvelope<OrganizationDetails> | OrganizationDetails
    >(ENDPOINTS.ORG.GET_DETAILS);

    return extractResponseData<OrganizationDetails>(response.data);
  }

  // Creates an employee/admin user record for the current organization from the add-user screen.
  async createUser(payload: CreateUserRequest): Promise<unknown> {
    assertApiBaseUrlConfigured();

    const response = await this.api.post<ApiEnvelope<unknown> | unknown>(
      ENDPOINTS.ADMIN.CREATE_USER,
      payload
    );

    return extractResponseData<unknown>(response.data);
  }

  // Assigns one or more warehouses to an employee using the dedicated warehouse access API.
  async updateWarehouseAccess(payload: WarehouseAccessRequest): Promise<unknown> {
    assertApiBaseUrlConfigured();

    const response = await this.api.post<ApiEnvelope<unknown> | unknown>(
      ENDPOINTS.WAREHOUSE.ACCESS,
      payload
    );

    return extractResponseData<unknown>(response.data);
  }

  // Deletes an employee warehouse assignment/user through the warehouse delete API.
  async deleteEmployeeWarehouse(userId: string): Promise<unknown> {
    assertApiBaseUrlConfigured();

    const response = await this.api.post<ApiEnvelope<unknown> | unknown>(
      ENDPOINTS.WAREHOUSE.DELETE_EMPLOYEE_WAREHOUSE(userId)
    );

    return extractResponseData<unknown>(response.data);
  }

  // Loads the warehouse list assigned to a specific user so audit access can be limited per login.
  async getWarehouseAccessByUser(
    userId: string
  ): Promise<WarehouseAccessApiItem[]> {
    assertApiBaseUrlConfigured();

    const response = await this.api.get<
      ApiCollectionEnvelope<WarehouseAccessApiItem> | WarehouseAccessApiItem[]
    >(ENDPOINTS.WAREHOUSE.GET_ACCESS_BY_USER(userId));

    return extractResponseCollection<WarehouseAccessApiItem>(response.data);
  }

  // Fetches all warehouses visible to the logged-in organization for the audit setup screen.
  async getWarehouses(
    pageNo = 1,
    rowCount = 50
  ): Promise<WarehouseApiRecord[]> {
    assertApiBaseUrlConfigured();

    const response = await this.api.get<
      ApiCollectionEnvelope<WarehouseApiRecord> | WarehouseApiRecord[]
    >(ENDPOINTS.WAREHOUSE.GET_BY_ORG(pageNo, rowCount));

    return extractResponseCollection<WarehouseApiRecord>(response.data);
  }

  // Resolves a scanned RFID/barcode tag into product details so the audit UI can show readable item data.
  async searchInventoryBarcodeScanMode(
    searchText: string
  ): Promise<InventoryBarcodeScanDetail[]> {
    assertApiBaseUrlConfigured();

    const response = await this.api.get<
      | ApiCollectionEnvelope<InventoryBarcodeScanDetail>
      | ApiEnvelope<InventoryBarcodeScanDetail[]>
      | InventoryBarcodeScanDetail[]
    >(ENDPOINTS.INVENTORY.SEARCH_BARCODE_SCAN_MODE(searchText));

    return extractResponseCollection<InventoryBarcodeScanDetail>(response.data);
  }

  // Loads the warehouse baseline tag list so the audit can compare expected vs scanned assets.
  async getWarehouseTagBaseline(
    warehouseId: number | string
  ): Promise<WarehouseTagBaselineItem[]> {
    assertApiBaseUrlConfigured();

    const response = await this.api.get<
      ApiCollectionEnvelope<WarehouseTagBaselineItem> | WarehouseTagBaselineItem[]
    >(ENDPOINTS.WAREHOUSE.GET_TAGS_BY_WAREHOUSE(warehouseId));

    return extractResponseCollection<WarehouseTagBaselineItem>(response.data);
  }

  // Sends the scanned warehouse staging payload so backend can attach each scanned asset to the selected warehouse.
  async submitScannedAuditTags(
    sessionId: string,
    stagingList: AssetWarehouseStagingItem[]
  ): Promise<string> {
    assertApiBaseUrlConfigured();

    const payload: AuditSubmitRequest = {
      SessionId: sessionId,
      StagingList: stagingList,
    };

    const response = await this.api.post<
      ApiEnvelope<AuditSubmitResponse | string> | AuditSubmitResponse | string
    >(ENDPOINTS.WAREHOUSE.ASSET_WAREHOUSE_STAGING, payload);

    const responseData = extractResponseData<AuditSubmitResponse | string>(
      response.data
    );

    return extractAuditReferenceId(responseData);
  }

  // Loads the warehouse audit comparison payload for a staged audit reference id.
  async getWarehouseAuditData(
    referenceId: string
  ): Promise<AuditComparisonResponse> {
    assertApiBaseUrlConfigured();

    const response = await this.api.get<
      ApiEnvelope<AuditComparisonResponse> | AuditComparisonResponse
    >(ENDPOINTS.WAREHOUSE.GET_AUDIT_DATA(referenceId));

    return extractResponseData<AuditComparisonResponse>(response.data) ?? {};
  }

  // Resolves scanned extra tag ids to their current/original warehouse assignment for reconciliation.
  async getWarehouseIdAccessByTagId(
    tagIds: (number | string)[]
  ): Promise<WarehouseTagLocationItem[]> {
    assertApiBaseUrlConfigured();

    const normalizedTagIds = Array.from(
      new Set(
        tagIds
          .map((tagId) => String(tagId).trim())
          .filter((tagId) => tagId.length > 0)
      )
    );

    if (normalizedTagIds.length === 0) {
      return [];
    }

    const response = await this.api.get<
      | ApiCollectionEnvelope<WarehouseTagLocationItem>
      | ApiEnvelope<WarehouseTagLocationItem[]>
      | ApiEnvelope<WarehouseTagLocationItem>
      | WarehouseTagLocationItem[]
      | WarehouseTagLocationItem
    >(ENDPOINTS.WAREHOUSE.GET_ACCESS_BY_TAG_ID(normalizedTagIds.join(",")));

    const collection = extractResponseCollection<WarehouseTagLocationItem>(
      response.data as ApiCollectionEnvelope<WarehouseTagLocationItem> | WarehouseTagLocationItem[]
    );

    if (collection.length > 0) {
      return collection;
    }

    const singleItem = extractResponseData<WarehouseTagLocationItem>(
      response.data as ApiEnvelope<WarehouseTagLocationItem> | WarehouseTagLocationItem
    );

    return singleItem && typeof singleItem === "object" && !Array.isArray(singleItem)
      ? [singleItem]
      : [];
  }

  // Loads submitted employee report rows, optionally constrained to a date range.
  async getReportByEmployee(
    userId: string,
    options?: {
      fromDate?: string;
      toDate?: string;
      sessionId?: string;
    }
  ): Promise<EmployeeReportApiItem[]> {
    assertApiBaseUrlConfigured();

    const response = await this.api.get<
      ApiCollectionEnvelope<EmployeeReportApiItem> | EmployeeReportApiItem[]
    >(
      ENDPOINTS.WAREHOUSE.GET_REPORT_BY_EMPLOYEE(
        userId,
        options?.fromDate,
        options?.toDate,
        options?.sessionId
      )
    );

    return extractResponseCollection<EmployeeReportApiItem>(response.data);
  }

  // Fetches audit scan records between a date range for a given organization.
  async getReportByDateWiseAsset(
    startDate: string,
    endDate: string
  ): Promise<any[]> {
    assertApiBaseUrlConfigured();

    const response = await this.api.get<
      ApiCollectionEnvelope<any> | any[]
    >(ENDPOINTS.WAREHOUSE.GET_REPORT_BY_DATE(startDate, endDate));

    return extractResponseCollection<any>(response.data);
  }
}

export const apiService = new ApiService();


