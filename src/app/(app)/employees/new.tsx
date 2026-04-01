import AccessGuard from "@/features/auth/components/AccessGuard";
import { APP_PERMISSIONS, USER_ROLES } from "@/constants/auth";
import AddEmployeeScreen from "@/features/employees/screens/AddEmployeeScreen";

export default function AddEmployee() {
  return (
    <AccessGuard
      allowedRoles={[USER_ROLES.ADMIN]}
      requiredPermissions={[APP_PERMISSIONS.MANAGE_EMPLOYEES]}
    >
      <AddEmployeeScreen />
    </AccessGuard>
  );
}
