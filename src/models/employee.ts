export type EmployeeStatusTone = "success" | "muted";

export type Employee = {
  initials: string;
  name: string;
  email: string;
  employeeId: string;
  department: string;
};

export type EmployeeListItem = Employee & {
  audit: string;
  status: string;
  statusTone: EmployeeStatusTone;
  activeAt: string;
  avatarColor: string;
  avatarText: string;
};
