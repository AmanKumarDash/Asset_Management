import { LatestAuditReport } from "@/features/reports/state/latestAuditReportStore";
import * as Print from "expo-print";
import { shareAsync } from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

function formatDate(date: Date | null) {
  if (!date) return "";
  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(date: Date | null) {
  if (!date) return "";
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusColor(tone: string) {
  switch (tone) {
    case "found":
      return "#dff3d5";
    case "missing":
      return "#fee7e6";
    default:
      return "#fef2e6";
  }
}

function getStatusText(tone: string) {
  switch (tone) {
    case "found":
      return "Found";
    case "missing":
      return "Missing";
    default:
      return "Extra";
  }
}

function generateTableRows(report: LatestAuditReport) {
  return report.items
    .filter((item) => item.tone !== "extra")
    .map((item, index) => {
      const statusText = getStatusText(item.tone);
      const statusBg = getStatusColor(item.tone);
      const scanTime = item.tone === "missing" ? "—" : ``;
      const remarks = item.tone === "missing" ? "Last seen: " : "—";

      return `
        <tr>
          <td style="padding: 12px 8px; text-align: center; font-size: 12px;">${index + 1}</td>
          <td style="padding: 12px 8px; font-size: 12px;">${item.id}</td>
          <td style="padding: 12px 8px; font-size: 12px;">${item.title}</td>
          <td style="padding: 12px 8px; font-size: 12px;">Equipment</td>
          <td style="padding: 12px 8px; text-align: center;">
            <span style="background-color: ${statusBg}; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 500;">
              ${statusText}
            </span>
          </td>
          <td style="padding: 12px 8px; font-size: 12px;">${scanTime}</td>
          <td style="padding: 12px 8px; font-size: 12px;">${remarks}</td>
        </tr>
      `;
    })
    .join("");
}

function generateExtraItems(report: LatestAuditReport) {
  const extras = report.items.filter((item) => item.tone === "extra");

  if (extras.length === 0) {
    return `
      <tr>
        <td colspan="5" style="padding: 16px; text-align: center; font-size: 12px; color: #666;">
          No extra items found
        </td>
      </tr>
    `;
  }

  return extras
    .map((item, index) => {
      const time = 50 + index;
      return `
      <tr>
        <td style="padding: 12px 8px; font-size: 12px;">${item.id}</td>
        <td style="padding: 12px 8px; font-size: 12px;">${item.title}</td>
        <td style="padding: 12px 8px; font-size: 12px;">Equipment</td>
        <td style="padding: 12px 8px; font-size: 12px;">Warehouse</td>
        <td style="padding: 12px 8px; font-size: 12px;">10:${time} AM</td>
      </tr>
    `;
    })
    .join("");
}

function buildPdfHtml(report: LatestAuditReport, auditedBy: string) {
  const observedAt = report.observedAt
    ? new Date(report.observedAt)
    : new Date();
  const scanDate = formatDate(observedAt);
  const scanTime = formatTime(observedAt);
  const createdDate = formatDate(new Date());
  const auditId = report.referenceId || "#AUD-2024-0312";
  const totalExpected =
    report.summary.expected ??
    report.summary.found + report.summary.missing + report.summary.extra;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <title>Asset Audit Report</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: Arial, sans-serif;
          line-height: 1.4;
          color: #333;
        }
        .container {
          max-width: 900px;
          margin: 0 auto;
          padding: 24px;
        }
        .header-band {
          background: linear-gradient(135deg, #3f3cbb 0%, #5a56d8 100%);
          color: white;
          padding: 24px;
          border-radius: 12px 12px 0 0;
          margin-bottom: 4px;
        }
        .header-band h1 {
          font-size: 24px;
          margin-bottom: 4px;
        }
        .header-band p {
          font-size: 13px;
          opacity: 0.9;
        }
        .info-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 24px;
        }
        .info-card {
          background: #f8f9fa;
          border: 1px solid #e0e0e0;
          padding: 14px;
          border-radius: 8px;
        }
        .info-label {
          font-size: 10px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
          font-weight: 600;
        }
        .info-value {
          font-size: 14px;
          font-weight: 600;
          color: #111;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 24px;
        }
        .summary-card {
          padding: 16px;
          border-radius: 8px;
          border: 1px solid #e0e0e0;
          text-align: center;
        }
        .summary-card strong {
          display: block;
          font-size: 10px;
          color: #666;
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .summary-value {
          font-size: 28px;
          font-weight: 700;
          color: #111;
        }
        .found { background: #eaf5db; }
        .missing { background: #fce8e8; }
        .extra { background: #fff4e5; }
        .expected { background: #f3f4f6; }
        h2 {
          font-size: 16px;
          margin-top: 24px;
          margin-bottom: 12px;
          color: #111;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid #ddd;
          margin-bottom: 24px;
        }
        th {
          background: #f5f5f5;
          border-bottom: 1px solid #ddd;
          padding: 10px 8px;
          text-align: left;
          font-size: 11px;
          font-weight: 700;
          color: #333;
        }
        td {
          border-bottom: 1px solid #f0f0f0;
        }
        .extra-panel {
          background: #fff7ed;
          border: 1px solid #f5c58a;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 24px;
        }
        .extra-panel h3 {
          font-size: 14px;
          color: #92400e;
          margin-bottom: 12px;
        }
        .footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 24px;
          padding-top: 12px;
          border-top: 1px solid #ddd;
          font-size: 11px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header-band">
          <h1>Asset Audit Report</h1>
          <p>${report.location}</p>
        </div>

        <div class="info-grid">
          <div class="info-card">
            <div class="info-label">Scan Date</div>
            <div class="info-value">${scanDate}</div>
          </div>
          <div class="info-card">
            <div class="info-label">Scan Time</div>
            <div class="info-value">${scanTime}</div>
          </div>
          <div class="info-card">
            <div class="info-label">Audited By</div>
            <div class="info-value">${auditedBy}</div>
          </div>
          <div class="info-card">
            <div class="info-label">Location</div>
            <div class="info-value">${report.location.split(" - ")[0]}</div>
          </div>
        </div>

        <div class="summary-grid">
          <div class="summary-card found">
            <strong>Items Found</strong>
            <div class="summary-value">${report.summary.found}</div>
          </div>
          <div class="summary-card missing">
            <strong>Items Missing</strong>
            <div class="summary-value">${report.summary.missing}</div>
          </div>
          <div class="summary-card extra">
            <strong>Extra Items</strong>
            <div class="summary-value">${report.summary.extra}</div>
          </div>
          <div class="summary-card expected">
            <strong>Total Expected</strong>
            <div class="summary-value">${totalExpected}</div>
          </div>
        </div>

        <h2>Audit Results (${report.items.length} items)</h2>
        <table>
          <thead>
            <tr>
              <th style="width: 8%;">#</th>
              <th style="width: 15%;">Asset ID</th>
              <th style="width: 20%;">Item Name</th>
              <th style="width: 12%;">Category</th>
              <th style="width: 12%;">Status</th>
              <th style="width: 13%;">Scan Time</th>
              <th style="width: 20%;">Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${generateTableRows(report)}
          </tbody>
        </table>

        <div class="extra-panel">
          <h3>Extra Items Found (not in expected list)</h3>
          <table>
            <thead>
              <tr>
                <th>Asset ID</th>
                <th>Item Name</th>
                <th>Category</th>
                <th>Found At</th>
                <th>Scan Time</th>
              </tr>
            </thead>
            <tbody>
              ${generateExtraItems(report)}
            </tbody>
          </table>
        </div>

        <div class="footer">
          <span>Generated: ${createdDate}</span>
          <span>Page 1 of 1</span>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function exportAuditReportAsPdf(
  report: LatestAuditReport,
  auditedBy: string
) {
  try {
    const html = buildPdfHtml(report, auditedBy);
    const fileName = `Audit-Report-${Date.now()}`;

    if (Platform.OS === "web") {
      // For web: Download as HTML that can be printed to PDF
      downloadAsHtmlWeb(html, fileName);
      return;
    }

    // For native platforms: Use Print API
    const { uri } = await Print.printToFileAsync({ html });

    if (uri) {
      const targetUri = `${FileSystem.documentDirectory}${fileName}.pdf`;

      await FileSystem.copyAsync({
        from: uri,
        to: targetUri,
      });

      const shareUri =
        Platform.OS === "android"
          ? await FileSystem.getContentUriAsync(targetUri)
          : targetUri;

      await shareAsync(shareUri, {
        mimeType: "application/pdf",
        dialogTitle: "Asset Audit Report",
        UTI: "com.adobe.pdf",
      });
    }
  } catch (error) {
    console.error("PDF Export Error:", error);
    throw error;
  }
}

function downloadAsHtmlWeb(html: string, fileName: string) {
  if (typeof window === "undefined") {
    console.error("Window object not available");
    return;
  }

  try {
    // Create a complete HTML document with buttons for download and print
    const completePage = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <title>Asset Audit Report - Download/Print</title>
        <style>
          body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
          }
          .button-bar {
            position: fixed;
            top: 0;
            right: 0;
            left: 0;
            background: white;
            padding: 12px 24px;
            border-bottom: 2px solid #e0e0e0;
            display: flex;
            gap: 12px;
            z-index: 10000;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .button-bar button {
            padding: 10px 24px;
            border: none;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
          }
          .download-btn {
            background: #3f3cbb;
            color: white;
          }
          .download-btn:hover {
            background: #2d2a8f;
          }
          .print-btn {
            background: #666;
            color: white;
          }
          .print-btn:hover {
            background: #555;
          }
          .content {
            margin-top: 70px;
            padding: 20px;
          }
          @media print {
            .button-bar {
              display: none !important;
            }
            .content {
              margin-top: 0 !important;
              padding: 0 !important;
            }
            body {
              margin: 0 !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="button-bar">
          <button class="download-btn" onclick="downloadFile()">Download PDF</button>
          <button class="print-btn" onclick="window.print()">Print to PDF</button>
        </div>
        <div class="content" id="report-content">
          ${html.replace(/<\!DOCTYPE.*?>/gi, "").replace(/<html>|<\/html>/gi, "").replace(/<head>.*?<\/head>/gi, "").replace(/<body>|<\/body>/gi, "")}
        </div>
        <script>
          function downloadFile() {
            const element = document.createElement('a');
            const text = document.documentElement.outerHTML;
            element.setAttribute('href', 'data:text/html;charset=utf-8,' + encodeURIComponent(text));
            element.setAttribute('download', '${fileName}.html');
            element.style.display = 'none';
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);
          }
        </script>
      </body>
      </html>
    `;

    // Open in new window
    const printWindow = window.open("", "PDF_Report", "width=1000,height=700");
    if (printWindow) {
      printWindow.document.write(completePage);
      printWindow.document.close();
      printWindow.focus();
    }
  } catch (error) {
    console.error("Download/Print failed:", error);
    // Fallback: Direct print
    const win = window.open("", "PDF_Report");
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => {
        win.print();
      }, 500);
    }
  }
}