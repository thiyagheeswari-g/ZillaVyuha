import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import i18n from "../i18n/i18n";
import { useStore } from "../store/useStore";
import { translateDynamicText } from "./translateText";

const FONT_URLS: Record<string, string> = {
  "hi-IN": "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/unhinted/ttf/NotoSansDevanagari/NotoSansDevanagari-Regular.ttf",
  "ta-IN": "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/unhinted/ttf/NotoSansTamil/NotoSansTamil-Regular.ttf",
  "te-IN": "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/unhinted/ttf/NotoSansTelugu/NotoSansTelugu-Regular.ttf",
  "kn-IN": "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/unhinted/ttf/NotoSansKannada/NotoSansKannada-Regular.ttf",
  "ml-IN": "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/unhinted/ttf/NotoSansMalayalam/NotoSansMalayalam-Regular.ttf",
};

const SCRIPT_FONTS: Record<string, string> = {
  "hi-IN": "NotoSansDevanagari",
  "ta-IN": "NotoSansTamil",
  "te-IN": "NotoSansTelugu",
  "kn-IN": "NotoSansKannada",
  "ml-IN": "NotoSansMalayalam",
};

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

async function applyLanguageFont(doc: jsPDF, langCode: string) {
  const fontName = SCRIPT_FONTS[langCode];
  const url = FONT_URLS[langCode];
  if (fontName && url) {
    try {
      const res = await fetch(url);
      const buffer = await res.arrayBuffer();
      const base64Font = arrayBufferToBase64(buffer);
      doc.addFileToVFS(`${fontName}.ttf`, base64Font);
      doc.addFont(`${fontName}.ttf`, fontName, "normal");
      doc.setFont(fontName);
    } catch (e) {
      console.error("Failed to load font", e);
    }
  }
}

export async function exportDistrictReportPDF(report: any, langCode = i18n.language) {
  const t = i18n.getFixedT(langCode);
  const doc = new jsPDF();
  
  await applyLanguageFont(doc, langCode);

  const state = useStore.getState();
  const data = state.clinicalFindings;
  const recommendations = state.validationResult?.final_recommendations || state.resourcePlan?.recommendations || [];
  const stratAnalysis = state.validationResult?.strategic_analysis || [];

  const PAGE_WIDTH = doc.internal.pageSize.getWidth();
  const PAGE_HEIGHT = doc.internal.pageSize.getHeight();
  const BG_COLOR: [number, number, number] = [255, 255, 255]; // #ffffff
  const TEXT_PRIMARY: [number, number, number] = [30, 30, 30]; // #1e1e1e
  const TEXT_SECONDARY: [number, number, number] = [100, 100, 100]; // #646464
  const CARD_BG: [number, number, number] = [245, 245, 245]; // #f5f5f5
  
  const drawPageBackground = () => {
    doc.setFillColor(BG_COLOR[0], BG_COLOR[1], BG_COLOR[2]);
    doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');
  };

  const originalAddPage = doc.addPage.bind(doc);
  doc.addPage = function(...args: any[]) {
    originalAddPage(...args);
    drawPageBackground();
    return this;
  };

  drawPageBackground(); // Fill page 1

  // ----------------------------------------------------
  // PAGE 1: COVER & SUMMARY & KPI & STATUS & RECS
  // ----------------------------------------------------
  doc.setTextColor(TEXT_PRIMARY[0], TEXT_PRIMARY[1], TEXT_PRIMARY[2]);
  doc.setFontSize(22);
  doc.text(t("export.report_title", "District health status report"), 14, 22);

  doc.setTextColor(TEXT_SECONDARY[0], TEXT_SECONDARY[1], TEXT_SECONDARY[2]);
  doc.setFontSize(10);
  const dateStr = new Date().toLocaleDateString(langCode, { day: '2-digit', month: 'short', year: 'numeric' });
  doc.text(`Coimbatore district • Daily snapshot • ${dateStr}`, 14, 29);
  doc.text(`Report ID\n${report.id || 'ZV-CBE-2026-07-R008'}`, PAGE_WIDTH - 14, 22, { align: 'right' });

  // Executive Summary
  doc.setTextColor(TEXT_SECONDARY[0], TEXT_SECONDARY[1], TEXT_SECONDARY[2]);
  doc.setFontSize(12);
  doc.text(t("export.executive_summary", "Executive summary"), 14, 42);

  doc.setTextColor(TEXT_PRIMARY[0], TEXT_PRIMARY[1], TEXT_PRIMARY[2]);
  doc.setFontSize(11);
  const translatedSummary = await translateDynamicText(report.content || "No summary available.", langCode);
  const splitSummary = doc.splitTextToSize(translatedSummary, PAGE_WIDTH - 28);
  doc.text(splitSummary, 14, 49);

  let startY = 49 + (splitSummary.length * 5) + 5;

  // KPI Metrics computation
  let totalDocs = 0; let presentDocs = 0;
  let bedOccupancy = 0; let bedFacilitiesCount = 0;
  let criticalFacilitiesCount = 0;
  const facilitiesList: any[] = [];
  const attendanceRows: any[] = [];
  const bedRows: any[] = [];
  const medRows: any[] = [];
  const labRows: any[] = [];
  const demandRows: any[] = [];

  // Parse attendance
  data?.attendance_findings?.forEach((af: any) => {
    Object.entries(af.attendance_by_phc || {}).forEach(([phc, info]: any) => {
      totalDocs += (info.present + info.absent);
      presentDocs += info.present;
      const attPct = info.present + info.absent > 0 ? Math.round((info.present / (info.present + info.absent)) * 100) : 0;
      facilitiesList.push({ name: phc, doctors: `${info.present}/${info.present + info.absent}`, beds: 'N/A', status: info.present === 0 ? 'CRITICAL_NO_DOCTOR' : (attPct < 100 ? 'UNDERSTAFFED' : 'NORMAL') });
      attendanceRows.push([phc, dateStr, info.present + info.absent, info.present, 'GDMO', `${attPct}%`]);
    });
  });

  // Parse beds
  data?.bed_findings?.forEach((bf: any) => {
    Object.entries(bf.bed_status_by_chc || {}).forEach(([chc, info]: any) => {
      bedOccupancy += info.occupancy_rate || 0;
      bedFacilitiesCount++;
      const available = info.total_beds - info.occupied;
      const occPct = Math.round((info.occupancy_rate || 0) * 100);
      bedRows.push([chc, info.total_beds, info.occupied, available, `${occPct}%`]);
      
      const existing = facilitiesList.find(f => f.name === chc);
      if (existing) {
        existing.beds = `${info.occupied}/${info.total_beds}`;
        if (info.occupancy_rate > 0.85) existing.status = 'BED_SHORTAGE';
      } else {
        facilitiesList.push({ name: chc, doctors: 'N/A', beds: `${info.occupied}/${info.total_beds}`, status: info.occupancy_rate > 0.85 ? 'BED_SHORTAGE' : 'NORMAL' });
      }
    });
  });

  // Parse medicines
  let stockOutsCount = 0;
  data?.medicine_findings?.forEach((mf: any) => {
    Object.entries(mf.inventory_by_phc || {}).forEach(([phc, items]: any) => {
      items.forEach((i: any) => {
        const reorder = i.avg_daily_consumption * 5;
        let flag = t("export.normal", "Normal");
        if (i.current_stock === 0) { flag = "Stock-out"; stockOutsCount++; }
        else if (i.current_stock < reorder) flag = "Low stock";
        medRows.push([phc, i.medicine_name, i.current_stock, reorder, flag]);
        demandRows.push([phc, i.medicine_name, `${i.avg_daily_consumption.toFixed(1)}/day`, (i.current_stock / i.avg_daily_consumption).toFixed(1), flag === "Stock-out" ? "Already out" : "Future"]);
      });
    });
  });

  // Parse labs
  data?.lab_findings?.forEach((lf: any) => {
    Object.entries(lf.lab_status_by_phc || {}).forEach(([phc, status]: any) => {
      const avail = status.coverage_pct > 0 ? "Yes" : "No";
      labRows.push([phc, "Blood sugar", avail, avail]); // mock specific tests
      labRows.push([phc, "Hemoglobin", avail, avail]);
    });
  });

  const avgBedOccupancy = bedFacilitiesCount > 0 ? Math.round((bedOccupancy / bedFacilitiesCount) * 100) : 0;
  criticalFacilitiesCount = facilitiesList.filter(f => f.status === 'CRITICAL_NO_DOCTOR' || f.status === 'BED_SHORTAGE').length;
  
  const cardWidth = (PAGE_WIDTH - 28 - 15) / 4;
  const cards = [
    { title: t("export.doctors_present", "Doctors present"), val: `${presentDocs}/${totalDocs}` },
    { title: t("export.bed_occupancy", "Bed occupancy"), val: `${avgBedOccupancy}%` },
    { title: t("export.stock_outs", "Stock-outs"), val: stockOutsCount.toString() },
    { title: t("export.critical_facilities", "Critical facilities"), val: criticalFacilitiesCount.toString() }
  ];

  cards.forEach((c, i) => {
    const x = 14 + (i * (cardWidth + 5));
    doc.setFillColor(CARD_BG[0], CARD_BG[1], CARD_BG[2]);
    doc.roundedRect(x, startY, cardWidth, 22, 2, 2, 'F');
    doc.setTextColor(TEXT_SECONDARY[0], TEXT_SECONDARY[1], TEXT_SECONDARY[2]);
    doc.setFontSize(9);
    doc.text(c.title, x + 4, startY + 8);
    doc.setTextColor(TEXT_PRIMARY[0], TEXT_PRIMARY[1], TEXT_PRIMARY[2]);
    doc.setFontSize(16);
    doc.text(c.val, x + 4, startY + 18);
  });
  startY += 32;

  const getStatusInfo = (s: string) => {
    switch (s) {
      case "CRITICAL_NO_DOCTOR": return [{ text: t("export.no_doctor", "No doctor"), color: [168, 41, 41] }];
      case "BED_SHORTAGE": return [{ text: t("export.critical", "Critical"), color: [168, 41, 41] }, { text: t("export.bed_shortage", "Bed shortage"), color: [168, 110, 41] }];
      case "UNDERSTAFFED": return [{ text: t("export.understaffed", "Understaffed"), color: [168, 110, 41] }];
      default: return [{ text: t("export.normal", "Normal"), color: [41, 108, 41] }];
    }
  };

  doc.setTextColor(TEXT_SECONDARY[0], TEXT_SECONDARY[1], TEXT_SECONDARY[2]);
  doc.setFontSize(12);
  doc.text(t("export.facility_wise_status", "Facility-wise status"), 14, startY);
  startY += 4;

  autoTable(doc, {
    startY,
    head: [[t("export.facility", "Facility"), t("export.doctors", "Doctors"), t("export.beds", "Beds"), t("export.status", "Status")]],
    body: facilitiesList.slice(0, 5).map(f => [ f.name, f.doctors, f.beds, f.status ]),
    theme: 'plain',
    styles: { fillColor: BG_COLOR, textColor: TEXT_PRIMARY, font: SCRIPT_FONTS[langCode] || 'helvetica', lineColor: [220, 220, 220] as [number, number, number], lineWidth: { bottom: 0.1 } },
    headStyles: { textColor: TEXT_SECONDARY, fontStyle: 'bold' },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        const tags = getStatusInfo(facilitiesList[data.row.index].status);
        doc.setFillColor(BG_COLOR[0], BG_COLOR[1], BG_COLOR[2]);
        doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height - 0.2, 'F');
        
        let cx = data.cell.x + 2;
        tags.forEach(tag => {
          doc.setFontSize(8);
          doc.setFillColor(tag.color[0], tag.color[1], tag.color[2]);
          doc.roundedRect(cx, data.cell.y + 2, doc.getTextWidth(tag.text) + 12, data.cell.height - 4, 3, 3, 'F');
          doc.setTextColor(255, 255, 255);
          doc.text(tag.text, cx + 6, data.cell.y + data.cell.height / 2, { baseline: 'middle' });
          cx += doc.getTextWidth(tag.text) + 16;
        });
      }
    }
  });

  startY = (doc as any).lastAutoTable.finalY + 12;

  doc.setTextColor(TEXT_SECONDARY[0], TEXT_SECONDARY[1], TEXT_SECONDARY[2]);
  doc.setFontSize(12);
  doc.text(t("export.ai_recommendations", "Ai-driven recommendations"), 14, startY);
  startY += 4;

  const translatedRecs = await Promise.all(recommendations.slice(0, 3).map(async (r: any) => {
    const act = await translateDynamicText(r.action, langCode);
    return [ r.priority, r.facility_code || r.facility || "Facility", act ];
  }));

  autoTable(doc, {
    startY,
    head: [[t("export.priority", "Priority"), t("export.facility", "Facility"), t("export.action", "Action")]],
    body: translatedRecs,
    theme: 'plain',
    styles: { fillColor: BG_COLOR, textColor: TEXT_PRIMARY, font: SCRIPT_FONTS[langCode] || 'helvetica', lineColor: [220, 220, 220] as [number, number, number], lineWidth: { bottom: 0.1 } },
    headStyles: { textColor: TEXT_SECONDARY, fontStyle: 'bold' },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 0) {
        const prio = translatedRecs[data.row.index][0];
        doc.setFillColor(BG_COLOR[0], BG_COLOR[1], BG_COLOR[2]);
        doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height - 0.2, 'F');
        doc.setTextColor(prio === 'CRITICAL' || prio === 'HIGH' || prio === 'High' ? 220 : 200, prio === 'CRITICAL' || prio === 'HIGH' || prio === 'High' ? 80 : 150, 80);
        doc.text(prio, data.cell.x + 2, data.cell.y + data.cell.height / 2, { baseline: 'middle' });
      }
    }
  });

  // ----------------------------------------------------
  // PAGE 2: PROBLEMS IDENTIFIED & ATTENDANCE
  // ----------------------------------------------------
  doc.addPage();
  startY = 20;
  
  doc.setTextColor(TEXT_SECONDARY[0], TEXT_SECONDARY[1], TEXT_SECONDARY[2]);
  doc.setFontSize(12);
  doc.text("Problems identified", 14, startY);
  startY += 10;

  const problems = stratAnalysis.length > 0 ? stratAnalysis : [
    "Staffing: Critical gaps observed in several PHCs.",
    "Medicine stock: Multiple stock-out warnings detected.",
    "Infrastructure: High bed occupancy across CHCs."
  ];

  for (const prob of problems) {
    const translatedProb = await translateDynamicText(prob, langCode);
    doc.setTextColor(TEXT_PRIMARY[0], TEXT_PRIMARY[1], TEXT_PRIMARY[2]);
    doc.setFontSize(11);
    const splitProb = doc.splitTextToSize(translatedProb, PAGE_WIDTH - 28);
    doc.text(splitProb, 14, startY);
    startY += (splitProb.length * 5) + 6;
  }

  startY += 10;
  doc.setTextColor(TEXT_SECONDARY[0], TEXT_SECONDARY[1], TEXT_SECONDARY[2]);
  doc.setFontSize(12);
  doc.text("Doctor attendance detail", 14, startY);
  startY += 4;

  autoTable(doc, {
    startY,
    head: [["Facility", "Date", "Required", "Present", "Roles present", "Attendance"]],
    body: attendanceRows,
    theme: 'plain',
    styles: { fillColor: BG_COLOR, textColor: TEXT_PRIMARY, font: SCRIPT_FONTS[langCode] || 'helvetica', lineColor: [60, 60, 60] as [number, number, number], lineWidth: { bottom: 0.1 } },
    headStyles: { textColor: TEXT_SECONDARY, fontStyle: 'bold' }
  });

  // ----------------------------------------------------
  // PAGE 3: BEDS & MEDICINE
  // ----------------------------------------------------
  doc.addPage();
  startY = 20;

  doc.setTextColor(TEXT_SECONDARY[0], TEXT_SECONDARY[1], TEXT_SECONDARY[2]);
  doc.setFontSize(12);
  doc.text("Bed availability detail", 14, startY);
  startY += 4;

  autoTable(doc, {
    startY,
    head: [["Facility", "Beds total", "Occupied", "Available", "Occupancy"]],
    body: bedRows,
    theme: 'plain',
    styles: { fillColor: BG_COLOR, textColor: TEXT_PRIMARY, font: SCRIPT_FONTS[langCode] || 'helvetica', lineColor: [60, 60, 60] as [number, number, number], lineWidth: { bottom: 0.1 } },
    headStyles: { textColor: TEXT_SECONDARY, fontStyle: 'bold' },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        const occStr = bedRows[data.row.index][4];
        const occNum = parseInt(occStr);
        if (occNum > 85) {
          doc.setFillColor(BG_COLOR[0], BG_COLOR[1], BG_COLOR[2]);
          doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height - 0.2, 'F');
          doc.setTextColor(220, 80, 80);
          doc.text(occStr, data.cell.x + 2, data.cell.y + data.cell.height / 2 + 2);
        }
      }
    }
  });

  startY = (doc as any).lastAutoTable.finalY + 12;
  doc.setTextColor(TEXT_SECONDARY[0], TEXT_SECONDARY[1], TEXT_SECONDARY[2]);
  doc.setFontSize(12);
  doc.text("Medicine stock detail", 14, startY);
  startY += 4;

  autoTable(doc, {
    startY,
    head: [["Facility", "Medicine", "Closing stock", "Reorder level", "Flag"]],
    body: medRows,
    theme: 'plain',
    styles: { fillColor: BG_COLOR, textColor: TEXT_PRIMARY, font: SCRIPT_FONTS[langCode] || 'helvetica', lineColor: [60, 60, 60] as [number, number, number], lineWidth: { bottom: 0.1 } },
    headStyles: { textColor: TEXT_SECONDARY, fontStyle: 'bold' },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        const flag = medRows[data.row.index][4];
        doc.setFillColor(BG_COLOR[0], BG_COLOR[1], BG_COLOR[2]);
        doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height - 0.2, 'F');
        
        let color = [41, 108, 41];
        if (flag === 'Stock-out') color = [168, 41, 41];
        else if (flag === 'Low stock') color = [168, 110, 41];
        
        doc.setFontSize(8);
        doc.setFillColor(color[0], color[1], color[2]);
        doc.roundedRect(data.cell.x + 2, data.cell.y + 2, doc.getTextWidth(flag) + 12, data.cell.height - 4, 3, 3, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text(flag, data.cell.x + 6, data.cell.y + data.cell.height / 2, { baseline: 'middle' });
      }
    }
  });

  // ----------------------------------------------------
  // PAGE 4: LABS & FORECAST
  // ----------------------------------------------------
  doc.addPage();
  startY = 20;

  doc.setTextColor(TEXT_SECONDARY[0], TEXT_SECONDARY[1], TEXT_SECONDARY[2]);
  doc.setFontSize(12);
  doc.text("Test availability detail", 14, startY);
  startY += 4;

  autoTable(doc, {
    startY,
    head: [["Facility", "Test", "Available", "Lab tech present"]],
    body: labRows,
    theme: 'plain',
    styles: { fillColor: BG_COLOR, textColor: TEXT_PRIMARY, font: SCRIPT_FONTS[langCode] || 'helvetica', lineColor: [60, 60, 60] as [number, number, number], lineWidth: { bottom: 0.1 } },
    headStyles: { textColor: TEXT_SECONDARY, fontStyle: 'bold' },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 2) {
        const flag = labRows[data.row.index][2];
        doc.setFillColor(BG_COLOR[0], BG_COLOR[1], BG_COLOR[2]);
        doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height - 0.2, 'F');
        const color = flag === 'Yes' ? [41, 108, 41] : [168, 41, 41];
        doc.setFontSize(8);
        doc.setFillColor(color[0], color[1], color[2]);
        doc.roundedRect(data.cell.x + 2, data.cell.y + 2, doc.getTextWidth(flag) + 12, data.cell.height - 4, 3, 3, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text(flag, data.cell.x + (doc.getTextWidth(flag) + 12) / 2 + 2, data.cell.y + data.cell.height / 2, { align: 'center', baseline: 'middle' });
      }
    }
  });

  startY = (doc as any).lastAutoTable.finalY + 12;
  doc.setTextColor(TEXT_SECONDARY[0], TEXT_SECONDARY[1], TEXT_SECONDARY[2]);
  doc.setFontSize(12);
  doc.text("Demand forecast & trend", 14, startY);
  startY += 4;

  autoTable(doc, {
    startY,
    head: [["Facility", "Medicine", "Avg daily use", "Days remaining", "Forecasted stock-out"]],
    body: demandRows,
    theme: 'plain',
    styles: { fillColor: BG_COLOR, textColor: TEXT_PRIMARY, font: SCRIPT_FONTS[langCode] || 'helvetica', lineColor: [60, 60, 60] as [number, number, number], lineWidth: { bottom: 0.1 } },
    headStyles: { textColor: TEXT_SECONDARY, fontStyle: 'bold' },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        const out = demandRows[data.row.index][4];
        if (out === 'Already out') {
          doc.setFillColor(BG_COLOR[0], BG_COLOR[1], BG_COLOR[2]);
          doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height - 0.2, 'F');
          doc.setTextColor(220, 80, 80);
          doc.text(out, data.cell.x + 2, data.cell.y + data.cell.height / 2, { baseline: 'middle' });
        }
      }
    }
  });

  // Footer on all pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    doc.text("Generated from ZillaVyuha real-time reporting system", 14, PAGE_HEIGHT - 10);
    doc.text(`Page ${i} of ${pageCount}`, PAGE_WIDTH - 14, PAGE_HEIGHT - 10, { align: 'right' });
  }

  doc.save(`ZillaVyuha_Report_${langCode}.pdf`);
}
