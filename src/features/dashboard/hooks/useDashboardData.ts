import { useAuthSession } from "@/features/auth/hooks/useAuthSession";
import { UserDetails, apiService, EmployeeReportApiItem } from "@/network/ApiService";
import { WarehouseSummary } from "@/models/warehouse";
import { useCallback, useEffect, useMemo, useState } from "react";

export type DashboardPeriod = "daily" | "weekly" | "monthly";

export type DashboardAuditRow = {
  id: string;
  referenceId: string;
  title: string;
  location: string;
  completedAt: string | null;
  scannedCount: number;
  warehouseIds: string[];
  employeeName?: string;
};

export type DashboardEmployeeActivity = {
  id: string;
  name: string;
  reportCount: number;
  scannedAssets: number;
  lastSubmittedAt: string | null;
};

export type AdminDashboardData = {
  employeeCount: number;
  activeAuditorCount: number;
  submittedAuditCount: number;
  scannedAssetCount: number;
  locationCount: number;
  recentAudits: DashboardAuditRow[];
  teamActivity: DashboardEmployeeActivity[];
};

export type EmployeeDashboardData = {
  assignedLocationCount: number;
  submittedAuditCount: number;
  scannedAssetCount: number;
  auditedLocationCount: number;
  lastSubmittedAt: string | null;
  recentAudits: DashboardAuditRow[];
  accessibleWarehouses: WarehouseSummary[];
};

function getToday(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getStartOfWeek(date = new Date()) {
  const current = getToday(date);
  const day = current.getDay();
  const offset = day === 0 ? 6 : day - 1;
  current.setDate(current.getDate() - offset);
  return current;
}

function getStartOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function formatDateForApi(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getPeriodRange(period: DashboardPeriod) {
  const now = new Date();
  const endDate = getToday(now);

  if (period === "daily") {
    return { startDate: endDate, endDate };
  }

  if (period === "weekly") {
    return { startDate: getStartOfWeek(now), endDate };
  }

  return { startDate: getStartOfMonth(now), endDate };
}

export function getPeriodLabel(period: DashboardPeriod) {
  if (period === "daily") {
    return "Today";
  }

  if (period === "weekly") {
    return "This week";
  }

  return "This month";
}

export function formatDashboardDate(value: string | null) {
  if (!value) {
    return "No submissions yet";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleString("en-US", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getUserDisplayName(user: UserDetails) {
  const fullName = [user.FirstName, user.MiddleName, user.LastName]
    .filter((part): part is string => Boolean(part?.trim()))
    .map((part) => part.trim())
    .join(" ");

  return fullName || user.EmailId?.trim() || user.UserId?.trim() || "Unknown employee";
}

function resolveReferenceId(item: EmployeeReportApiItem, index: number) {
  const directReference =
    (typeof item.RefrenceId === "string" && item.RefrenceId.trim()) ||
    (typeof item.ReferenceId === "string" && item.ReferenceId.trim());

  if (directReference) {
    return directReference;
  }

  const scannedAt = item.ScanningDate ?? `row-${index}`;
  return `warehouse-${String(item.WareHouseId)}-${scannedAt}`;
}

function getSortableTime(value: string | null) {
  return new Date(value ?? "").getTime() || 0;
}

function getRowScanKey(item: EmployeeReportApiItem, index: number) {
  const tagId = item.TagId;

  if (typeof tagId === "number" && Number.isFinite(tagId)) {
    return `tag:${String(tagId)}`;
  }

  if (typeof tagId === "string" && tagId.trim()) {
    return `tag:${tagId.trim()}`;
  }

  return `product:${String(item.ProductId)}:${index}`;
}

function buildAuditTitle(warehouseIds: string[]) {
  if (warehouseIds.length === 1) {
    return `Warehouse ${warehouseIds[0]} Audit`;
  }

  if (warehouseIds.length > 1) {
    return "Multi-location Audit";
  }

  return "Audit Submission";
}

function buildAuditLocation(warehouseIds: string[]) {
  if (warehouseIds.length === 1) {
    return `Warehouse ${warehouseIds[0]}`;
  }

  if (warehouseIds.length > 1) {
    return `${warehouseIds.length} warehouses`;
  }

  return "Unknown location";
}

function buildAuditRows(items: EmployeeReportApiItem[]): DashboardAuditRow[] {
  if (items.length === 0) {
    return [];
  }

  const groupedReports = new Map<string, EmployeeReportApiItem[]>();

  items.forEach((item, index) => {
    const referenceId = resolveReferenceId(item, index);
    const existingItems = groupedReports.get(referenceId) ?? [];
    existingItems.push(item);
    groupedReports.set(referenceId, existingItems);
  });

  return Array.from(groupedReports.entries())
    .map(([referenceId, reportItems]) => {
      const sortedItems = [...reportItems].sort(
        (left, right) =>
          getSortableTime(right.ScanningDate ?? null) -
          getSortableTime(left.ScanningDate ?? null)
      );
      const latestItem = sortedItems[0];
      const warehouseIds = Array.from(
        new Set(sortedItems.map((item) => String(item.WareHouseId)).filter(Boolean))
      );
      const scannedKeys = new Set(
        sortedItems.map((item, index) => getRowScanKey(item, index))
      );

      return {
        id: referenceId,
        referenceId,
        title: buildAuditTitle(warehouseIds),
        location: buildAuditLocation(warehouseIds),
        completedAt: latestItem?.ScanningDate ?? null,
        scannedCount: scannedKeys.size,
        warehouseIds,
      };
    })
    .sort((left, right) => getSortableTime(right.completedAt) - getSortableTime(left.completedAt));
}

function sumScannedAssets(rows: DashboardAuditRow[]) {
  return rows.reduce((sum, row) => sum + row.scannedCount, 0);
}

export function useEmployeeDashboardData(period: DashboardPeriod) {
  const { user, accessibleWarehouses } = useAuthSession();
  const [recentAudits, setRecentAudits] = useState<DashboardAuditRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  const { startDate, endDate } = useMemo(() => getPeriodRange(period), [period]);
  const reload = useCallback(() => setReloadCount((current) => current + 1), []);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      if (!user?.employeeId?.trim()) {
        if (isMounted) {
          setRecentAudits([]);
          setErrorMessage(null);
          setIsLoading(false);
        }

        return;
      }

      if (isMounted) {
        setIsLoading(true);
        setErrorMessage(null);
      }

      try {
        const response = await apiService.getReportByEmployee(user.employeeId.trim(), {
          fromDate: formatDateForApi(startDate),
          toDate: formatDateForApi(endDate),
        });

        if (!isMounted) {
          return;
        }

        setRecentAudits(buildAuditRows(response));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        console.warn("Failed to load employee dashboard data:", error);
        setRecentAudits([]);
        setErrorMessage("Unable to load your dashboard right now.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [endDate, reloadCount, startDate, user?.employeeId]);

  const data = useMemo<EmployeeDashboardData>(
    () => ({
      assignedLocationCount: accessibleWarehouses.length,
      submittedAuditCount: recentAudits.length,
      scannedAssetCount: sumScannedAssets(recentAudits),
      auditedLocationCount: new Set(recentAudits.flatMap((audit) => audit.warehouseIds)).size,
      lastSubmittedAt: recentAudits[0]?.completedAt ?? null,
      recentAudits,
      accessibleWarehouses,
    }),
    [accessibleWarehouses, recentAudits]
  );

  return {
    data,
    isLoading,
    errorMessage,
    periodLabel: getPeriodLabel(period),
    reload,
  };
}

export function useAdminDashboardData(period: DashboardPeriod) {
  const { user } = useAuthSession();
  const [data, setData] = useState<AdminDashboardData>({
    employeeCount: 0,
    activeAuditorCount: 0,
    submittedAuditCount: 0,
    scannedAssetCount: 0,
    locationCount: 0,
    recentAudits: [],
    teamActivity: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  const { startDate, endDate } = useMemo(() => getPeriodRange(period), [period]);
  const reload = useCallback(() => setReloadCount((current) => current + 1), []);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      if (!user?.employeeId?.trim()) {
        if (isMounted) {
          setData({
            employeeCount: 0,
            activeAuditorCount: 0,
            submittedAuditCount: 0,
            scannedAssetCount: 0,
            locationCount: 0,
            recentAudits: [],
            teamActivity: [],
          });
          setErrorMessage(null);
          setIsLoading(false);
        }

        return;
      }

      if (isMounted) {
        setIsLoading(true);
        setErrorMessage(null);
      }

      try {
        const dateOptions = {
          fromDate: formatDateForApi(startDate),
          toDate: formatDateForApi(endDate),
        };
        const [employees, adminReports] = await Promise.all([
          apiService.getUserDetails(""),
          apiService.getReportByEmployee(user.employeeId.trim(), dateOptions).catch(() => []),
        ]);
        const filteredEmployees = employees.filter(
          (employee) => employee.UserId?.trim() && employee.UserId?.trim() !== user.employeeId.trim()
        );
        const employeeReportResponses = await Promise.all(
          filteredEmployees.map(async (employee) => ({
            employee,
            reports: await apiService.getReportByEmployee(employee.UserId.trim(), dateOptions).catch(() => []),
          }))
        );

        if (!isMounted) {
          return;
        }

        const teamActivity = employeeReportResponses
          .map(({ employee, reports }) => {
            const auditRows = buildAuditRows(reports);

            return {
              id: employee.UserId.trim(),
              name: getUserDisplayName(employee),
              reportCount: auditRows.length,
              scannedAssets: sumScannedAssets(auditRows),
              lastSubmittedAt: auditRows[0]?.completedAt ?? null,
            };
          })
          .sort((left, right) => {
            if (right.reportCount !== left.reportCount) {
              return right.reportCount - left.reportCount;
            }

            return getSortableTime(right.lastSubmittedAt) - getSortableTime(left.lastSubmittedAt);
          });

        const teamAuditRows = employeeReportResponses.flatMap(({ employee, reports }) =>
          buildAuditRows(reports).map((row) => ({
            ...row,
            employeeName: getUserDisplayName(employee),
          }))
        );
        const adminAuditRows = buildAuditRows(adminReports).map((row) => ({
          ...row,
          employeeName: "You",
        }));
        const allAuditRows = [...teamAuditRows, ...adminAuditRows].sort(
          (left, right) => getSortableTime(right.completedAt) - getSortableTime(left.completedAt)
        );

        setData({
          employeeCount: filteredEmployees.length,
          activeAuditorCount: teamActivity.filter((item) => item.reportCount > 0).length,
          submittedAuditCount: allAuditRows.length,
          scannedAssetCount: sumScannedAssets(allAuditRows),
          locationCount: new Set(allAuditRows.flatMap((audit) => audit.warehouseIds)).size,
          recentAudits: allAuditRows.slice(0, 6),
          teamActivity: teamActivity.slice(0, 6),
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        console.warn("Failed to load admin dashboard data:", error);
        setData({
          employeeCount: 0,
          activeAuditorCount: 0,
          submittedAuditCount: 0,
          scannedAssetCount: 0,
          locationCount: 0,
          recentAudits: [],
          teamActivity: [],
        });
        setErrorMessage("Unable to load the dashboard right now.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [endDate, reloadCount, startDate, user?.employeeId]);

  return {
    data,
    isLoading,
    errorMessage,
    periodLabel: getPeriodLabel(period),
    reload,
  };
}
