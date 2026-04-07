import {
  AssetWarehouseStagingItem,
  AuditSubmitRequest,
  AuditSubmitResponse,
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

export type WarehouseApiRecord = Record<string, unknown>;

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

  // Loads organization details for the currently authenticated user after the bearer token is attached.
  async getOrganizationDetails(): Promise<OrganizationDetails> {
    assertApiBaseUrlConfigured();

    const response = await this.api.get<
      ApiEnvelope<OrganizationDetails> | OrganizationDetails
    >(ENDPOINTS.ORG.GET_DETAILS);

    return extractResponseData<OrganizationDetails>(response.data);
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
    stagingList: AssetWarehouseStagingItem[]
  ): Promise<AuditSubmitResponse> {
    assertApiBaseUrlConfigured();

    const payload: AuditSubmitRequest = {
      StagingList: stagingList,
    };

    const response = await this.api.post<
      ApiEnvelope<AuditSubmitResponse> | AuditSubmitResponse
    >(ENDPOINTS.WAREHOUSE.ASSET_WAREHOUSE_STAGING, payload);

    return extractResponseData<AuditSubmitResponse>(response.data) ?? {};
  }
}

export const apiService = new ApiService();


