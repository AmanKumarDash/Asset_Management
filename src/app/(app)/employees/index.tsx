import AccessGuard from "@/features/auth/components/AccessGuard";
import EmployeesScreen from "@/features/employees/screens/EmployeesScreen";

export default function Employees() {
  return (
    <AccessGuard allowedRoles={["admin"]} requiredPermissions={["manage_employees"]}>
      <EmployeesScreen />
    </AccessGuard>
  );
}
