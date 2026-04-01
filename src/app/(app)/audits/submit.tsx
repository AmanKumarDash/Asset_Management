import AccessGuard from "@/features/auth/components/AccessGuard";
import { APP_PERMISSIONS, USER_ROLES } from "@/constants/auth";
import EmployeeSubmitAuditScreen from "@/features/audits/screens/EmployeeSubmitAuditScreen";

export default function SubmitAudit() {
  return (
    <AccessGuard
      allowedRoles={[USER_ROLES.EMPLOYEE]}
      requiredPermissions={[APP_PERMISSIONS.SUBMIT_AUDIT]}
    >
      <EmployeeSubmitAuditScreen />
    </AccessGuard>
  );
}
