import {
  AuditSubmitRequest,
  AuditSubmitResponse,
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

export type WarehouseApiRecord = Record<string, unknown>;

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axiosInstance;
  }

  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    assertApiBaseUrlConfigured();

    const response = await this.api.post<ApiEnvelope<LoginResponse> | LoginResponse>(
      ENDPOINTS.AUTH.LOGIN,
      credentials
    );

    return extractResponseData<LoginResponse>(response.data);
  }

  async getOrganizationDetails(): Promise<OrganizationDetails> {
    assertApiBaseUrlConfigured();

    const response = await this.api.get<
      ApiEnvelope<OrganizationDetails> | OrganizationDetails
    >(ENDPOINTS.ORG.GET_DETAILS);

    return extractResponseData<OrganizationDetails>(response.data);
  }

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

  async searchInventoryBarcodeScanMode(
    searchText: string
  ): Promise<InventoryBarcodeScanDetail[]> {
    assertApiBaseUrlConfigured();

    const response = await this.api.get<
      ApiEnvelope<InventoryBarcodeScanDetail[]> | InventoryBarcodeScanDetail[]
    >(ENDPOINTS.INVENTORY.SEARCH_BARCODE_SCAN_MODE(searchText));

    return extractResponseData<InventoryBarcodeScanDetail[]>(response.data);
  }

  async submitScannedAuditTags(tagIds: string[]): Promise<AuditSubmitResponse> {
    assertApiBaseUrlConfigured();

    const payload: AuditSubmitRequest = {
      TAG_IDs: tagIds,
    };

    const response = await this.api.post<
      ApiEnvelope<AuditSubmitResponse> | AuditSubmitResponse
    >(ENDPOINTS.AUDIT.SUBMIT_SCANNED_TAGS, payload);

    return extractResponseData<AuditSubmitResponse>(response.data);
  }
}

export const apiService = new ApiService();
