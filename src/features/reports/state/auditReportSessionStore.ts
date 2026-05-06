import { storage } from "@/storage/storage";
import { LatestAuditReport } from "./latestAuditReportStore";

const STORAGE_KEY = "audit-report-sessions";

export type PersistedAuditReportSession = {
  id: string;
  sessionId?: string | null;
  userId: string;
  referenceIds: string[];
  warehouseIds: string[];
  observedAt: string | null;
  report: LatestAuditReport;
};

async function getAuditReportSessions() {
  return (await storage.getObject<PersistedAuditReportSession[]>(STORAGE_KEY)) ?? [];
}

export async function saveAuditReportSession(
  session: PersistedAuditReportSession
) {
  const sessions = await getAuditReportSessions();
  const referenceSet = new Set(session.referenceIds);
  const nextSessions = [
    session,
    ...sessions.filter(
      (storedSession) =>
        storedSession.userId !== session.userId ||
        !storedSession.referenceIds.some((referenceId) =>
          referenceSet.has(referenceId)
        )
    ),
  ].slice(0, 50);

  await storage.setObject(STORAGE_KEY, nextSessions);
}

export async function getAuditReportSessionsForUser(userId: string) {
  const sessions = await getAuditReportSessions();

  return sessions.filter((session) => session.userId === userId);
}
