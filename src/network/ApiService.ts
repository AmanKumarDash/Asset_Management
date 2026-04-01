import { AxiosInstance } from "axios";
import { LoginResponse } from "@/features/auth/types/authApi";
import { axiosInstance, assertApiBaseUrlConfigured } from "./axiosConfig";
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
}

export const apiService = new ApiService();
