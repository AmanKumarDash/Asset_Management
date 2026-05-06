import { AuditScanItem } from "@/features/audits/data/auditScanData";
import { AuditSummary } from "@/features/audits/types/audit";
import { storage } from "@/storage/storage";
import { useEffect, useSyncExternalStore } from "react";

const STORAGE_KEY = "latest-audit-report";

export type LatestAuditReport = {
  title: string;
  location: string;
  mobileMeta: string;
  desktopMeta: string;
  status: string;
  sessionId?: string | null;
  referenceId: string | null;
  observedAt: string | null;
  summary: AuditSummary;
  items: AuditScanItem[];
};

let latestAuditReport: LatestAuditReport | null = null;
let hasHydrated = false;
let hydrationPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

async function hydrateLatestAuditReport() {
  if (hasHydrated) {
    return;
  }

  if (hydrationPromise) {
    return hydrationPromise;
  }

  hydrationPromise = storage
    .getObject<LatestAuditReport>(STORAGE_KEY)
    .then((storedReport) => {
      latestAuditReport = storedReport;
      hasHydrated = true;
      emitChange();
    })
    .finally(() => {
      hydrationPromise = null;
    });

  return hydrationPromise;
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return latestAuditReport;
}

export function setLatestAuditReport(report: LatestAuditReport) {
  latestAuditReport = report;
  hasHydrated = true;
  emitChange();
  void storage.setObject(STORAGE_KEY, report);
}

export function clearLatestAuditReport() {
  latestAuditReport = null;
  hasHydrated = true;
  emitChange();
  void storage.removeItem(STORAGE_KEY);
}

export function useLatestAuditReport() {
  const report = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    void hydrateLatestAuditReport();
  }, []);

  return report;
}
