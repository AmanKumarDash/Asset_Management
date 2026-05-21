export type AuditItemTone = "found" | "missing" | "extra";

export type AuditScanItem = {
  id: string;
  title: string;
  subtitle: string;
  tone: AuditItemTone;
  icon: "plus-square" | "briefcase" | "plus-circle";
};

export const auditScanOverview = {
  title: "Scan Assets",
  subtitle: "Server Room - Equipment",
  desktopMeta: "",
  totalAssets: 28,
} as const;

export const initialAuditScanItems: AuditScanItem[] = [
  {
    id: "AST-00312",
    title: "Cisco Router",
    subtitle: "AST-00312 - Networking",
    tone: "found",
    icon: "plus-square",
  },
  {
    id: "AST-00289",
    title: "UPS Battery Pack",
    subtitle: "AST-00289 - Power",
    tone: "missing",
    icon: "briefcase",
  },
  {
    id: "EXTRA-001",
    title: "Unregistered Monitor",
    subtitle: "No tag - Extra found",
    tone: "extra",
    icon: "plus-circle",
  },
];
