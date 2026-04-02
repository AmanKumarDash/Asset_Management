import { InventoryBarcodeScanDetail } from "@/features/audits/types/inventory";
import { LoginResponse } from "@/features/auth/types/authApi";
import { AxiosInstance } from "axios";
import { assertApiBaseUrlConfigured, axiosInstance } from "./axiosConfig";
import { ENDPOINTS } from "./endpoints";
import { ApiEnvelope, extractResponseData } from "./responses";

export type LoginCredentials = {
  Username: string;
  Password: string;
};

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

  async searchInventoryBarcodeScanMode(
    searchText: string
  ): Promise<InventoryBarcodeScanDetail[]> {
    assertApiBaseUrlConfigured();

    const response = await this.api.get<
      ApiEnvelope<InventoryBarcodeScanDetail[]> | InventoryBarcodeScanDetail[]
    >(ENDPOINTS.INVENTORY.SEARCH_BARCODE_SCAN_MODE(searchText));

    return extractResponseData<InventoryBarcodeScanDetail[]>(response.data);
  }
}

export const apiService = new ApiService();
