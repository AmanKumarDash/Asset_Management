export type EmployeeStatusTone = "success" | "muted";

export type EmployeeRecord = {
  initials: string;
  name: string;
  department: string;
  audit: string;
  status: string;
  statusTone: EmployeeStatusTone;
  activeAt: string;
  avatarColor: string;
  avatarText: string;
  email: string;
  employeeId: string;
};

export const employees: EmployeeRecord[] = [
  {
    initials: "AM",
    name: "Aman",
    department: "Frontend Dev",
    audit: "Floor 3 - IT Assets",
    status: "Active",
    statusTone: "success",
    activeAt: "Today 9:41",
    avatarColor: "#dbeafe",
    avatarText: "#1f5ea8",
    email: "aman@company.com",
    employeeId: "EMP-0001",
  },
  {
    initials: "SB",
    name: "Suambhu",
    department: "Analyst",
    audit: "Warehouse - Furniture",
    status: "Active",
    statusTone: "success",
    activeAt: "Today 8:55",
    avatarColor: "#d9f3ea",
    avatarText: "#12755b",
    email: "suambhu@company.com",
    employeeId: "EMP-0002",
  },
  {
    initials: "K",
    name: "kartik",
    department: "Billing",
    audit: "-",
    status: "Idle",
    statusTone: "muted",
    activeAt: "19 Mar",
    avatarColor: "#efe8df",
    avatarText: "#8b6a2b",
    email: "kartik@company.com",
    employeeId: "EMP-0003",
  },
  {
    initials: "NK",
    name: "Naman",
    department: "Asset Mgmt",
    audit: "-",
    status: "Idle",
    statusTone: "muted",
    activeAt: "18 Mar",
    avatarColor: "#dff4ef",
    avatarText: "#14806c",
    email: "naman@company.com",
    employeeId: "EMP-0004",
  },
];
