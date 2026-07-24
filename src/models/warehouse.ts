export type WarehouseSummary = {
  id: string;
  name: string;
  code: string | null;
  subtitle: string | null;
  auditStatus: "done" | "running" | null;
  auditStatusValue: number | null;
  raw: Record<string, unknown>;
};
