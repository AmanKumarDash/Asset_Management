import AccessGuard from "@/features/auth/components/AccessGuard";
import { APP_PERMISSIONS, USER_ROLES } from "@/constants/auth";
import EmployeesScreen from "@/features/employees/screens/EmployeesScreen";

export default function Employees() {
  return (
    <AccessGuard
      allowedRoles={[USER_ROLES.ADMIN]}
      requiredPermissions={[APP_PERMISSIONS.MANAGE_EMPLOYEES]}
    >
      <EmployeesScreen />
    </AccessGuard>
  );
}
