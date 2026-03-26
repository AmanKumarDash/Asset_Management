import { AuditScanItem } from "./auditScanData";

export type EmployeeCompletedAudit = {
  id: string;
  title: string;
  location: string;
  completedAt: string;
  scannedLabel: string;
  matchRate: string;
  status: "Submitted";
};

export const employeeAssignedAudit = {
  id: "floor-3-it-assets",
  title: "Floor 3 - IT Assets",
  location: "Block A",
  assets: 48,
  assignedBy: "Alka Sharma",
  dueText: "Due today",
  scanned: 0,
  status: "Assigned",
} as const;

export const employeeCompletedAudits: EmployeeCompletedAudit[] = [
  {
    id: "server-room-equipment",
    title: "Server Room - Equipment",
    location: "Block C",
    completedAt: "19 Mar - 3:12 PM",
    scannedLabel: "28 / 28",
    matchRate: "82%",
    status: "Submitted",
  },
  {
    id: "floor-2-furniture",
    title: "Floor 2 - Furniture",
    location: "Block B",
    completedAt: "15 Mar - 11:45 AM",
    scannedLabel: "23 / 23",
    matchRate: "96%",
    status: "Submitted",
  },
];

export const employeeScanOverview = {
  title: "Scan Assets",
  subtitle: "Floor 3 - IT Assets",
  desktopMeta: "Floor 3 - IT Assets - Block A - 48 assets",
  totalAssets: 48,
} as const;

export const employeeInitialScanItems: AuditScanItem[] = [
  {
    id: "AST-00182",
    title: "Dell Laptop",
    subtitle: "AST-00182 - IT Equipment",
    tone: "found",
    icon: "plus-square",
  },
  {
    id: "AST-00190",
    title: "HP Printer",
    subtitle: "AST-00190 - Peripherals",
    tone: "missing",
    icon: "briefcase",
  },
  {
    id: "AST-00201",
    title: "Network Switch",
    subtitle: "AST-00201 - Networking",
    tone: "extra",
    icon: "plus-circle",
  },
];

export const employeeSubmitSummary = {
  found: 42,
  missing: 4,
  extra: 2,
  expected: 48,
  location: "Floor 3, Block A - Server Corridor",
  reference: "AUD-2026-0034",
  observedAt: "20 Mar 2026 - 9:41 AM",
  observation:
    "HP Printer not found at its assigned location. Unregistered monitor and keyboard found near workstation 14. Recommend cross-checking inventory movement logs with the IT team.",
} as const;

export const employeeMismatchPreview = [
  "HP Printer (AST-00190) - Missing",
  "UPS Battery Pack (AST-00289) - Missing",
  "Network Switch (AST-00201) - Missing",
  "Unregistered Monitor - Extra",
  "Unlabelled Keyboard - Extra",
] as const;
