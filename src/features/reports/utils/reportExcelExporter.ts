import {
  LatestAuditReport,
  LatestAuditReportExcelRow,
  LatestAuditReportWarehouseSection,
} from "@/features/reports/state/latestAuditReportStore";
import { File, Paths } from "expo-file-system";
import { shareAsync } from "expo-sharing";
import { Platform } from "react-native";

const EXCEL_HEADERS = [
  "Sno",
  "New Cost Centre",
  "Cost Centre Description",
  "New Functional Location",
  "Asset No",
  "Plant No",
  "Plant Identification",
  "Rfid Tagging Position",
  "Quantity",
  "Audit Start",
  "Audit End",
] as const;

function escapeCell(value: string | number | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getReportSections(
  report: LatestAuditReport
): LatestAuditReportWarehouseSection[] {
  if (report.warehouseSections?.length) {
    return report.warehouseSections;
  }

  return [
    {
      warehouseId: null,
      warehouseName: report.location,
      referenceId: report.referenceId,
      observedAt: report.observedAt,
      summary: report.summary,
      items: report.items,
      excelRows: report.excelRows,
    },
  ];
}

function parseProductCodeFromSubtitle(subtitle: string) {
  const parts = subtitle
    .split(" - ")
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.length > 1 ? parts[1] : "";
}

function buildFallbackRows(report: LatestAuditReport): LatestAuditReportExcelRow[] {
  return getReportSections(report).flatMap((section) =>
    section.items.map((item, index) => ({
      sno: index + 1,
      newCostCentre: section.warehouseName || report.location,
      costCentreDescription: section.warehouseId ?? "",
      newFunctionalLocation:
        item.tone === "missing" ? "" : section.warehouseName || report.location,
      assetNo: parseProductCodeFromSubtitle(item.subtitle),
      plantNo: "",
      plantIdentification: item.title,
      rfidTaggingPosition: item.id,
      quantity: "1",
      auditStart: section.observedAt ?? report.observedAt ?? "",
      auditEnd: section.observedAt ?? report.observedAt ?? "",
    }))
  );
}

function getExcelRows(report: LatestAuditReport): LatestAuditReportExcelRow[] {
  const sectionRows = getReportSections(report).flatMap(
    (section) => section.excelRows ?? []
  );
  const rows = sectionRows.length > 0 ? sectionRows : report.excelRows ?? [];

  if (rows.length > 0) {
    return rows.map((row, index) => ({
      ...row,
      sno: index + 1,
    }));
  }

  return buildFallbackRows(report).map((row, index) => ({
    ...row,
    sno: index + 1,
  }));
}

function buildExcelHtml(report: LatestAuditReport) {
  const rows = getExcelRows(report);
  const headerHtml = EXCEL_HEADERS.map(
    (header) => `<th>${escapeCell(header)}</th>`
  ).join("");
  const rowHtml = rows
    .map(
      (row) => `
        <tr>
          <td>${escapeCell(row.sno)}</td>
          <td>${escapeCell(row.newCostCentre)}</td>
          <td>${escapeCell(row.costCentreDescription)}</td>
          <td>${escapeCell(row.newFunctionalLocation)}</td>
          <td>${escapeCell(row.assetNo)}</td>
          <td>${escapeCell(row.plantNo)}</td>
          <td>${escapeCell(row.plantIdentification)}</td>
          <td>${escapeCell(row.rfidTaggingPosition)}</td>
          <td>${escapeCell(row.quantity)}</td>
          <td>${escapeCell(row.auditStart)}</td>
          <td>${escapeCell(row.auditEnd)}</td>
        </tr>
      `
    )
    .join("");

  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8" />
        <style>
          table { border-collapse: collapse; }
          th, td { border: 1px solid #999; padding: 8px; mso-number-format:"\\@"; }
          th { font-weight: 700; background: #e8eef8; }
        </style>
      </head>
      <body>
        <table>
          <thead><tr>${headerHtml}</tr></thead>
          <tbody>${rowHtml}</tbody>
        </table>
      </body>
    </html>
  `;
}

function downloadExcelWeb(html: string, fileName: string) {
  if (typeof window === "undefined") {
    return;
  }

  const blob = new Blob([html], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportAuditReportAsExcel(report: LatestAuditReport) {
  const html = buildExcelHtml(report);
  const fileName = `Audit-Report-${Date.now()}`;

  if (Platform.OS === "web") {
    downloadExcelWeb(html, fileName);
    return;
  }

  const file = new File(Paths.document, `${fileName}.xls`);
  file.write(html);
  await shareAsync(file.uri, {
    mimeType: "application/vnd.ms-excel",
    dialogTitle: "Audit Excel Report",
    UTI: "com.microsoft.excel.xls",
  });
}
