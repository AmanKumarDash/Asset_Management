export type ReportMismatchTone = "missing" | "extra";

export type ReportMismatchItem = {
  id: string;
  title: string;
  subtitle: string;
  tone: ReportMismatchTone;
  icon: "minus-square" | "plus-square";
};

export const auditReportSummary = {
  title: "Audit Report",
  location: "Server Room - Equipment",
  mobileMeta: "Server Room - 20 Mar 2026",
  desktopMeta: "Server Room - Equipment - 20 Mar 2026",
  status: "Completed",
  found: 23,
  missing: 3,
  extra: 2,
  expected: 28,
} as const;

export const reportMismatches: ReportMismatchItem[] = [
  {
    id: "AST-00312",
    title: "Cisco Router",
    subtitle: "AST-00312 - Last seen: 15 Mar",
    tone: "missing",
    icon: "minus-square",
  },
  {
    id: "AST-00289",
    title: "UPS Battery Pack",
    subtitle: "AST-00289 - Last seen: 12 Mar",
    tone: "missing",
    icon: "minus-square",
  },
  {
    id: "AST-00301",
    title: "Rack Mount Server",
    subtitle: "AST-00301 - Last seen: 10 Mar",
    tone: "missing",
    icon: "minus-square",
  },
  {
    id: "EXTRA-001",
    title: "Unregistered Monitor",
    subtitle: "No tag - Found near workstation 14",
    tone: "extra",
    icon: "plus-square",
  },
  {
    id: "EXTRA-002",
    title: "Unlabelled Keyboard",
    subtitle: "No tag - Found at server rack 3",
    tone: "extra",
    icon: "plus-square",
  },
];
