import { InventoryBarcodeScanDetail } from "./inventory";

export type AuditPhase =
  | "idle"
  | "scanning"
  | "submitting"
  | "submitted"
  | "submitError";

export type AuditReportTone = "found" | "missing" | "extra";

export type AuditSubmitRequest = {
  StagingList: AssetWarehouseStagingItem[];
};

export type AssetWarehouseStagingItem = {
  TagId: number | string;
  ProductId: number;
  WareHouseId: number;
  UserId: string;
};

export type WarehouseTagBaselineItem = {
  ProductName?: string;
  ProductId: number;
  TagId: number | string;
  ProductCode?: string;
  WarehouseId: number;
};

export type AuditReportAsset = Partial<InventoryBarcodeScanDetail> & {
  TAG_ID?: string;
  TagID?: string;
  tagId?: string;
  Title?: string;
  Name?: string;
  ItemName?: string;
  Subtitle?: string;
  Description?: string;
  StatusText?: string;
};

export type AuditSubmitResponse = {
  FoundAssets?: AuditReportAsset[];
  FoundItems?: AuditReportAsset[];
  Found?: AuditReportAsset[];
  MissingAssets?: AuditReportAsset[];
  MissingItems?: AuditReportAsset[];
  Missing?: AuditReportAsset[];
  ExtraAssets?: AuditReportAsset[];
  ExtraItems?: AuditReportAsset[];
  Extra?: AuditReportAsset[];
  FoundCount?: number;
  MissingCount?: number;
  ExtraCount?: number;
  ExpectedCount?: number;
  Reference?: string;
  Location?: string;
  ObservedAt?: string;
};


