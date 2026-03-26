import AccessGuard from "@/features/auth/components/AccessGuard";
import EmployeeSubmitAuditScreen from "@/features/audits/screens/EmployeeSubmitAuditScreen";

export default function SubmitAudit() {
  return (
    <AccessGuard allowedRoles={["employee"]} requiredPermissions={["submit_audit"]}>
      <EmployeeSubmitAuditScreen />
    </AccessGuard>
  );
}
