import AccessGuard from "@/features/auth/components/AccessGuard";
import AddEmployeeScreen from "@/features/employees/screens/AddEmployeeScreen";

export default function AddEmployee() {
  return (
    <AccessGuard allowedRoles={["admin"]} requiredPermissions={["manage_employees"]}>
      <AddEmployeeScreen />
    </AccessGuard>
  );
}
