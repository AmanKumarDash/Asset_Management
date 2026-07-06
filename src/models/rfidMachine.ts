export type RfidMachineSummary = {
  id: string;
  machineNo: string;
  topic: string;
  label: string;
  subtitle?: string;
  raw?: Record<string, unknown>;
};
