import ExcelJS from "exceljs";
import JSZip from "jszip";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildFmeaFinalTablePdfDocument, buildFmeaFinalTableWorkbook, buildFmeaFinalTableWordDocument, buildFmeaPdfLines, buildFmeaReportPdfDocument, buildFmeaWorkbook, buildFmeaWordDocument, buildPdfDocument, buildRegisteredReportSummaries, buildRulaPdfLines, buildRulaReportPdfDocument, buildRulaWorkbook, buildRulaWordDocument, FMEA_FINAL_TABLE_HEADERS, type FmeaReportData, type FmeaReportPayload, type RulaReportData, type RulaReportExport } from "./modules/reports.js";
import { actionPriority, summariseFmea } from "./fmea-report.js";
import { pdfTextRuns } from "./modules/reports.js";

const fmea: FmeaReportData = {
  title: "Production line FMEA",
  code: "FMEA-001",
  status: "COMPLETED",
  createdAt: new Date("2026-09-01T10:00:00.000Z"),
  updatedAt: new Date("2026-09-02T10:00:00.000Z"),
  approvedAt: null,
  project: { name: "Safety project" },
  organization: { nameFa: "شرکت ایمنی", nameEn: "Safety Company" },
  department: "Production",
  activityDescription: "Move material to the production line",
  equipment: ["Forklift"],
  materials: ["Raw material"],
  existingControls: ["Training"],
  specialConditions: null,
  jobCatalog: { titleFa: "اپراتور خط تولید", titleEn: "Production line operator" },
  items: [{ rowNumber: 1, processStep: "Loading", failureMode: "Dropped load", effect: "Injury", cause: "Unstable load", preventiveControls: "Inspection", detectionControls: "Supervisor check", severity: 8, occurrence: 4, detection: 3, rpn: 96, riskLevel: "HIGH", recommendation: "Add a load restraint" }],
  actions: [{ title: "Install restraint", description: "Install and inspect a restraint before loading", priority: "HIGH", status: "OPEN", progress: 25, assigneeName: "Safety lead", dueDate: new Date("2026-09-10T00:00:00.000Z"), fmeaItemId: "item-1", fmeaItem: { rowNumber: 1, failureMode: "Dropped load" } }],
};

const rula: RulaReportData = {
  title: "Packing posture",
  project: { name: "Ergonomics project" },
  score: 6,
  actionLevel: 3,
  explanation: "Needs review",
  bodySide: "RIGHT",
  activityInfo: { jobTitle: "Packing operator", taskDescription: "Pack finished products", durationPerOccurrence: 15, durationUnit: "MINUTE", repetitionsPerShift: 24, postureHoldDuration: 20, postureHoldUnit: "SECOND", loadWeight: 8, loadUnit: "KG", postureDescription: "The operator reaches forward to place the load." },
  postureAnalysis: {
    upperArm: { angle: 32, score: 3, detected: true, source: "AI", confirmedByUser: false },
    lowerArm: { angle: 48, score: 2, detected: true, source: "AI", confirmedByUser: false },
    wrist: { angle: 18, score: 2, detected: true, source: "AI", confirmedByUser: false },
    wristTwist: { angle: 10, score: 1, detected: false, source: "AI", confirmedByUser: false },
    neck: { angle: 24, score: 3, detected: true, source: "AI", confirmedByUser: false },
    trunk: { angle: 28, score: 3, detected: true, source: "AI", confirmedByUser: false },
    legs: { angle: 0, score: 1, detected: true, source: "AI", confirmedByUser: false },
  },
};
const rulaReport: RulaReportExport = {
  assessment: rula,
  factors: [{ key: "neck", angle: 24, detected: true, score: 3, impactPercent: 43, impactLevel: "HIGH", source: "AI" }],
  suggestedActions: [{ id: "adjust-work-surface", titleFa: "تنظیم ارتفاع سطح کار", titleEn: "Adjust work surface", descriptionFa: "ارتفاع سطح کار را تنظیم کنید.", descriptionEn: "Raise the work surface", priority: "HIGH", scoreReduction: 2, affectedParts: ["neck", "trunk"], bodySide: "RIGHT", source: "AI" }],
  actions: [{ title: "Adjust work surface", description: "Raise the work surface", priority: "HIGH", status: "OPEN", rulaImpact: { scoreReduction: 2, affectedParts: ["neck", "trunk"] } }],
  predictedScore: 4,
};

const normalizedFmeaItem = { ...fmea.items[0]!, id: "item-1", rpn: 96, riskLevel: "LOW" };
const fmeaReportItems = [{ ...normalizedFmeaItem, actionPriority: actionPriority(normalizedFmeaItem.riskLevel), correctiveActions: [{ id: "action-1", title: "Install restraint", status: "OPEN", priority: "HIGH" }] }];
const fmeaPageReport: FmeaReportPayload = {
  riskThresholds: { medium: 101, high: 201, critical: 401 },
  assessment: {
    id: "assessment-1", title: fmea.title, code: fmea.code, status: fmea.status, version: 1,
    createdAt: fmea.createdAt, updatedAt: fmea.updatedAt, approvedAt: null, fmeaDetailSeeded: true, method: "FMEA",
    processName: { fa: "اپراتور خط تولید", en: "Production line operator" },
    companyName: { fa: "شرکت ایمنی", en: "Safety Company" },
    project: { id: "project-1", name: fmea.project.name, code: "P-1" },
    evaluationTeam: [{ id: "user-1", displayName: "Safety lead", email: "lead@example.com", role: "HSE_MANAGER" }],
  },
  summary: summariseFmea([normalizedFmeaItem]),
  items: fmeaReportItems,
  topFailureModes: fmeaReportItems,
  suggestedActions: [{ id: "suggestion-1", title: "Review the loading procedure", description: "Update and retrain the loading procedure.", fmeaItemId: "item-1", failureMode: "Dropped load", priority: "MEDIUM", status: "SUGGESTED", source: "FALLBACK" }],
  actions: fmea.actions.map((action) => ({ ...action, id: "action-1", fmeaItemId: "item-1" })),
};

function worksheetValues(sheet: ExcelJS.Worksheet) {
  const values: unknown[] = [];
  sheet.eachRow((row) => values.push(...row.values as unknown[]));
  return values;
}

function processEnvQaDirectory() {
  return process.env.RULA_REPORT_QA_DIR;
}

function dashboardMetricValue(sheet: ExcelJS.Worksheet, label: string) {
  let labelRow = 0;
  let labelColumn = 0;
  sheet.eachRow((row, rowNumber) => {
    if (labelRow) return;
    for (const column of [1, 3, 5, 7]) {
      if (row.getCell(column).value === label) {
        labelRow = rowNumber;
        labelColumn = column;
        return;
      }
    }
  });
  return labelRow ? sheet.getCell(labelRow + 1, labelColumn).value : undefined;
}

describe("assessment report exports", () => {
  it("keeps Persian and Arabic date digits in logical LTR order beside RTL labels", () => {
    for (const date of ["۱۴۰۵/۰۶/۱۱", "١٤٠٥/٠٦/١١", "2026-09-02"]) {
      const layout = pdfTextRuns(`تاریخ: ${date}`);
      expect(layout.baseDirection).toBe("rtl");
      expect(layout.runs).toContainEqual({ direction: "ltr", text: date });
      expect(layout.runs[0]).toEqual({ direction: "rtl", text: "تاریخ: " });
    }
  });
  it("exports complete Persian FMEA guidance, recommendations and editable risk tables", async () => {
    const description = "اپراتور بسته‌بندی مسئول آماده‌سازی، تنظیم و راه‌اندازی دستگاه‌های بسته‌بندی، قراردهی و نصب کالاها در بسته‌بندی مناسب، کنترل کیفیت بصری بسته‌ها، برچسب‌زنی و ثبت اطلاعات تولید، تعویض رول‌ها و مواد بسته‌بندی، انجام تنظیمات جهت حفظ نرخ تولید و حداقل ضایعات، و همکاری در نظافت و نگهداری پایه‌ای تجهیزات طبق دستورالعمل‌های ایمنی و کیفیت است.";
    const scores = [[6, 4, 5], [7, 2, 6], [7, 3, 5], [8, 3, 5], [8, 3, 5], [8, 3, 4], [7, 3, 5], [8, 3, 4], [7, 2, 6], [6, 4, 5]];
    const data: FmeaReportData = {
      ...fmea, title: "ارزیابی ریسک اپراتور بسته‌بندی", code: "FMEA-MUMF88P3", activityDescription: description,
      jobCatalog: { titleFa: "اپراتور بسته‌بندی", titleEn: "Packing operator" },
      items: scores.map(([severity, occurrence, detection], index) => ({
        ...fmea.items[0]!, id: `risk-${index + 1}`, rowNumber: index + 1,
        processStep: "بسته‌بندی محصول", failureMode: `خطر مرحله بسته‌بندی ${index + 1}`,
        effect: "آسیب شغلی یا خسارت به تجهیز و توقف کار", cause: "محافظ‌گذاری یا محدوده ممنوعه کافی نیست",
        preventiveControls: "محافظ‌گذاری، ایزولاسیون و علامت‌گذاری محدوده", detectionControls: "بازرسی پیش از استفاده و تأیید سرپرست",
        recommendation: `کنترل‌های مرحله ${index + 1} را پیش از شروع تأیید کنید`,
        severity: severity!, occurrence: occurrence!, detection: detection!, rpn: severity! * occurrence! * detection!,
      })),
      actions: [{ ...fmea.actions[0]!, title: "بازبینی حفاظ دستگاه", description: description, progress: 37, assigneeName: "مسئول ایمنی", fmeaItemId: "risk-1", fmeaItem: { rowNumber: 1, failureMode: "خطر مرحله بسته‌بندی 1" } }],
    };
    const reportItems = data.items.map((item) => ({ ...item, id: item.id!, riskLevel: item.rpn >= 101 ? "MEDIUM" : "LOW", actionPriority: "MEDIUM", correctiveActions: [] }));
    const report: FmeaReportPayload = {
      ...fmeaPageReport, assessment: { ...fmeaPageReport.assessment, title: data.title, code: data.code },
      items: reportItems, topFailureModes: reportItems, summary: summariseFmea(reportItems),
      actions: data.actions.map((action) => ({ ...action, id: "action-1", fmeaItemId: action.fmeaItemId! })),
      suggestedActions: reportItems.slice(0, 8).map((item, index) => ({ ...fmeaPageReport.suggestedActions[0]!, id: `suggestion-${index}`, fmeaItemId: item.id, failureMode: item.failureMode, title: `پیشنهاد اصلاح مرحله ${index + 1}` })),
    };
    const word = await buildFmeaWordDocument(data, "fa", report);
    const archive = await JSZip.loadAsync(word);
    const xml = await archive.file("word/document.xml")!.async("string");
    const text = xml.replace(/<[^>]+>/g, "");
    expect(text.indexOf("خلاصه مدیریتی ریسک")).toBeLessThan(text.indexOf("مشخصات ارزیابی"));
    expect(text).toContain("راهنمای خواندن گزارش");
    expect(text).toContain("RPN = S × O × D.");
    expect(text).toContain("پیشنهاد اصلاح مرحله 8");
    expect(text).toContain(description);
    expect(xml).toContain('<w:jc w:val="center"/>');
    expect(xml).toContain('<w:rtl w:val="0"/>');
    expect(xml).toContain('<w:rtl w:val="1"/>');
    const excel = await buildFmeaWorkbook(data, "fa", report);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(excel as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    expect(workbook.getWorksheet("FMEA")!.rowCount).toBe(11);
    expect(workbook.getWorksheet("PROPOSED ACTIONS")!.rowCount).toBe(9);
    expect(workbook.getWorksheet("ACTIONS")!.getCell("G2").value).toBe(37);
    expect(workbook.getWorksheet("ACTIONS")!.getCell("G2").numFmt).toBe('0"%"');
    expect(workbook.getWorksheet("RISK DISTRIBUTION")!.getCell("C4").value).toBe(0.6);
    expect(workbook.getWorksheet("RISK DISTRIBUTION")!.getCell("C4").numFmt).toBe("0.0%");
    expect(worksheetValues(workbook.getWorksheet("PROCESS")!)).toContain(description);
    expect(workbook.getWorksheet("FMEA")!.views[0]!.rightToLeft).toBe(true);
    expect(worksheetValues(workbook.getWorksheet("SUMMARY")!).join(" ")).toContain("بحرانی از 401");
    const pdf = await buildFmeaReportPdfDocument(data, report, "fa");
    const finalPdf = await buildFmeaFinalTablePdfDocument(data, "fa");
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    if (process.env.FMEA_REPORT_QA_DIR) {
      const directory = process.env.FMEA_REPORT_QA_DIR;
      await mkdir(directory, { recursive: true });
      await Promise.all([
        writeFile(path.join(directory, "FMEA-fa.pdf"), pdf),
        writeFile(path.join(directory, "FMEA-final-fa.pdf"), finalPdf),
        writeFile(path.join(directory, "FMEA-fa.docx"), word),
        writeFile(path.join(directory, "FMEA-fa.xlsx"), excel),
      ]);
    }
  });
  it("preserves mixed Persian identifiers and long descriptions in editable RULA exports", async () => {
    const task = "اپراتور تصفیه‌خانه طی شیفت کاری با ایستادن یا نشستن در کنار دستگاه‌ها و پنل‌ها، کارهای کنترلی و نظارتی را انجام می‌دهد؛ شامل مشاهده نمایشگرها، تنظیم دسته‌ها و سوئیچ‌ها، برداشتن و گذاشتن ابزار یا نمونه‌ها با دست‌ها و مداخله دستی محدود در اتصالات و شلنگ‌ها که نیاز به حرکت مکرر بازوها، خم شدن جزئی تنه و تغییر موقعیت مچ و گردن برای دیدن نمایشگرها دارد.";
    const data: RulaReportData = { ...rula, title: "ارزیابی اپراتور تصفیه‌خانه RULA-001", project: { name: "پروژه ایمنی" }, activityInfo: { ...rula.activityInfo!, taskDescription: task } };
    const report = { ...rulaReport, assessment: data };
    const word = await buildRulaWordDocument(data, report, "fa");
    const zip = await JSZip.loadAsync(word);
    const document = await zip.file("word/document.xml")!.async("string");
    const styles = await zip.file("word/styles.xml")!.async("string");
    expect(document).toContain('<w:rtl w:val="0"/>');
    expect(document).toContain('<w:rtl w:val="1"/>');
    expect(document).toContain('>RULA-001</w:t>');
    expect(document).toContain(task);
    expect(styles).toContain('w:cs="Tahoma"');
    expect(styles).toContain('<w:szCs w:val="22"/>');
    expect(styles).toContain('<w:keepNext/>');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await buildRulaWorkbook(data, report, "fa") as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    const process = workbook.getWorksheet("PROCESS")!;
    const overview = workbook.getWorksheet("RULA")!;
    let found = false;
    for (const sheet of [process, overview]) {
      sheet.eachRow((row) => row.eachCell((cell) => {
        if (cell.value !== task) return;
        found = true;
        expect(cell.font.name).toBe("Tahoma");
        expect(cell.alignment.readingOrder).toBe("rtl");
        expect(cell.alignment.wrapText).toBe(true);
        expect(row.height).toBeGreaterThan(42);
      }));
      expect(sheet.pageSetup.fitToHeight).toBe(0);
    }
    expect(found).toBe(true);
    const postureRows = workbook.getWorksheet("RULA DATA")!;
    let neckShare: unknown;
    postureRows.eachRow((row) => { if (row.getCell(3).value === "گردن") neckShare = row.getCell(7).value; });
    expect(neckShare).toBe("20%");
    const reloaded = new ExcelJS.Workbook();
    const excel = await workbook.xlsx.writeBuffer();
    await reloaded.xlsx.load(excel);
    expect(worksheetValues(reloaded.getWorksheet("PROCESS")!)).toContain(task);
    const pdf = await buildRulaReportPdfDocument(data, report, "fa");
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    // Optional local visual QA artifacts, never enabled during normal test runs or production.
    const qaDirectory = processEnvQaDirectory();
    if (qaDirectory) {
      await mkdir(qaDirectory, { recursive: true });
      await Promise.all([
        writeFile(path.join(qaDirectory, "RULA-fa.pdf"), pdf),
        writeFile(path.join(qaDirectory, "RULA-fa.docx"), word),
        writeFile(path.join(qaDirectory, "RULA-fa.xlsx"), Buffer.from(excel)),
      ]);
    }
  });
  it("orders registered FMEA and RULA reports by finalization date", () => {
    const reports = buildRegisteredReportSummaries(
      [{ id: "fmea-1", title: "FMEA one", code: "FMEA-1", projectName: "Project one", projectCode: "P-1", finalizedAt: new Date("2026-09-20T10:00:00.000Z") }],
      [{ id: "rula-1", title: "RULA one", code: "RULA-1", projectName: "Project two", projectCode: "P-2", finalizedAt: new Date("2026-09-21T10:00:00.000Z") }],
    );
    expect(reports.map((report) => `${report.type}:${report.id}`)).toEqual(["RULA:rula-1", "FMEA:fmea-1"]);
    expect(reports[0]?.finalizedAt).toBe("2026-09-21T10:00:00.000Z");
  });

  it("creates a readable FMEA Excel workbook that mirrors the report and preserves extended data", async () => {
    const buffer = await buildFmeaWorkbook(fmea, "en", fmeaPageReport);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(["OVERVIEW", "FMEA", "FMEA DATA", "SUMMARY", "PROCESS", "RISK DISTRIBUTION", "TOP RISKS", "PROPOSED ACTIONS", "ACTIONS"]);
    expect((workbook.getWorksheet("FMEA")?.getRow(1).values as unknown[]).slice(1)).toEqual([...FMEA_FINAL_TABLE_HEADERS]);
    expect(workbook.getWorksheet("FMEA")?.getRow(2).values).toContain("Dropped load");
    expect(workbook.getWorksheet("FMEA")?.getRow(2).values).toContain("Inspection\nSupervisor check");
    expect(workbook.getWorksheet("FMEA")?.getRow(2).values).toContain("Add a load restraint\nInstall restraint (OPEN, HIGH)");
    expect(workbook.getWorksheet("FMEA DATA")?.getRow(1).values).toContain("Process / activity");
    expect(workbook.getWorksheet("TOP RISKS")?.getRow(2).values).toContain("Dropped load");
    expect(workbook.getWorksheet("PROPOSED ACTIONS")?.getRow(2).values).toContain("Review the loading procedure");
    expect(workbook.getWorksheet("SUMMARY")?.getRow(8).values).toContain(1);
    expect(workbook.getWorksheet("FMEA")?.autoFilter).toBeTruthy();
    const overview = workbook.getWorksheet("OVERVIEW")!;
    const overviewValues = worksheetValues(overview);
    expect(overviewValues).toEqual(expect.arrayContaining([
      "Executive risk summary", "Risk-level distribution", "Average corrective-action progress",
      "Top failure modes", "Proposed corrective actions / controls", "Corrective-action register",
    ]));
    expect(overview.getCell("A2").fill).toMatchObject({ type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F7FC" } });
    const injectionBuffer = await buildFmeaWorkbook({ ...fmea, title: "=HYPERLINK(\"https://example.invalid\")" }, "en", fmeaPageReport);
    const injectionWorkbook = new ExcelJS.Workbook();
    await injectionWorkbook.xlsx.load(injectionBuffer as unknown as Parameters<typeof injectionWorkbook.xlsx.load>[0]);
    expect(injectionWorkbook.getWorksheet("SUMMARY")?.getCell("B2").value).toBe("'=HYPERLINK(\"https://example.invalid\")");
  });

  it("uses report thresholds and canonical report actions consistently in every full FMEA export", async () => {
    const reportRisk = { ...fmeaReportItems[0]!, riskLevel: "HIGH", actionPriority: actionPriority("HIGH") };
    const canonicalAction = {
      ...fmeaPageReport.actions[0]!,
      title: "Canonical report action",
      description: "Action supplied by the report payload",
      status: "COMPLETED",
      progress: 100,
    };
    const report: FmeaReportPayload = {
      ...fmeaPageReport,
      riskThresholds: { medium: 50, high: 90, critical: 180 },
      summary: summariseFmea([reportRisk]),
      items: [reportRisk],
      topFailureModes: [reportRisk],
      actions: [canonicalAction],
    };

    const workbook = new ExcelJS.Workbook();
    const workbookBuffer = await buildFmeaWorkbook(fmea, "en", report);
    await workbook.xlsx.load(workbookBuffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    expect(workbook.getWorksheet("FMEA")?.getCell(2, 10).value).toBe("HIGH");
    expect(worksheetValues(workbook.getWorksheet("OVERVIEW")!).join(" ")).toContain("Canonical report action");
    expect(worksheetValues(workbook.getWorksheet("ACTIONS")!).join(" ")).toContain("Canonical report action");
    expect(worksheetValues(workbook.getWorksheet("ACTIONS")!).join(" ")).not.toContain("Install restraint");

    const wordBuffer = await buildFmeaWordDocument(fmea, "en", report);
    const archive = await JSZip.loadAsync(wordBuffer);
    const document = await archive.file("word/document.xml")!.async("string");
    expect(document).toContain("Canonical report action");
    expect(document).toContain("HIGH");
    expect(document).not.toContain("Install restraint");
  });

  it("limits the FMEA overview to the report's initial five risks while retaining every detailed row", async () => {
    const manyItems = Array.from({ length: 7 }, (_, index) => ({
      ...fmea.items[0]!,
      id: `item-${index + 1}`,
      rowNumber: index + 1,
      failureMode: `Failure mode ${index + 1}`,
      severity: 5,
      occurrence: 5,
      detection: 5,
      rpn: 125,
      riskLevel: "MEDIUM",
    }));
    const manyReportItems = manyItems.map((item) => ({
      ...item,
      actionPriority: actionPriority(item.riskLevel),
      correctiveActions: [],
    }));
    const report: FmeaReportPayload = {
      ...fmeaPageReport,
      summary: summariseFmea(manyReportItems),
      items: manyReportItems,
      topFailureModes: manyReportItems,
      suggestedActions: [],
      actions: [],
    };
    const workbook = new ExcelJS.Workbook();
    const buffer = await buildFmeaWorkbook({ ...fmea, items: manyItems, actions: [] }, "en", report);
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    const overviewValues = worksheetValues(workbook.getWorksheet("OVERVIEW")!).join(" ");
    const detailsValues = worksheetValues(workbook.getWorksheet("FMEA")!).join(" ");
    expect(overviewValues).toContain("Failure mode 5");
    expect(overviewValues).not.toContain("Failure mode 6");
    expect(detailsValues).toContain("Failure mode 7");
    expect(workbook.getWorksheet("FMEA")?.rowCount).toBe(8);
  });

  it("exports the final FMEA table with identical columns and row order in Excel, Word, and PDF", async () => {
    const workbookBuffer = await buildFmeaFinalTableWorkbook(fmea);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(workbookBuffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(["FMEA", "DETAILS"]);
    const sheet = workbook.getWorksheet("FMEA")!;
    expect((sheet.getRow(1).values as unknown[]).slice(1)).toEqual([...FMEA_FINAL_TABLE_HEADERS]);
    expect((sheet.getRow(2).values as unknown[]).slice(1)).toEqual([1, "Dropped load", "Injury", "Unstable load", "Inspection\nSupervisor check", 8, 4, 3, 96, "LOW", "Add a load restraint\nInstall restraint (OPEN, HIGH)"]);

    const wordBuffer = await buildFmeaFinalTableWordDocument(fmea);
    const wordArchive = await JSZip.loadAsync(wordBuffer);
    const wordDocument = await wordArchive.file("word/document.xml")!.async("string");
    expect(wordDocument).toContain("Final FMEA assessment table");
    expect(wordDocument).toContain("Recommended corrective action");
    expect(wordDocument).toContain("Dropped load");
    expect(wordDocument).not.toContain("Process / activity");

    const pdfBuffer = await buildFmeaFinalTablePdfDocument(fmea);
    expect(pdfBuffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    expect(pdfBuffer.byteLength).toBeGreaterThan(1_000);
  });

  it("creates a readable RULA Excel workbook with factor and action sections", async () => {
    const buffer = await buildRulaWorkbook(rula, rulaReport);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(["RULA", "SUMMARY", "PROCESS", "IMPACT", "FACTORS", "RULA DATA", "CORRECTIONS", "ACTIONS"]);
    expect(workbook.getWorksheet("RULA")?.getColumn(2).values).toContain(4);
    expect(workbook.getWorksheet("FACTORS")?.getCell("A2").value).toBe("neck");
    expect(workbook.getWorksheet("ACTIONS")?.getRow(2).values).toContain("Adjust work surface");
    expect(workbook.getWorksheet("ACTIONS")?.getRow(2).values).toContain("Selected");
    expect(workbook.getWorksheet("ACTIONS")?.getRow(2).values).toContain("neck, trunk");
    expect(workbook.getWorksheet("PROCESS")?.getRow(2).values).toContain("Packing operator");
    expect(workbook.getWorksheet("FACTORS")?.getRow(1).values).toEqual([undefined, "Main factor", "Angle", "Detected", "Score", "Contribution", "Effect", "Source"]);
    expect(workbook.getWorksheet("RULA DATA")?.getColumn(3).values).toContain("Neck");
    expect(workbook.getWorksheet("CORRECTIONS")?.getRow(2).values).toContain("Adjust work surface");
    expect(workbook.getWorksheet("CORRECTIONS")?.getRow(2).values).toContain("Selected");
    const overview = workbook.getWorksheet("RULA")!;
    const overviewValues = worksheetValues(overview);
    expect(overviewValues).toEqual(expect.arrayContaining([
      "Factor score distribution", "Corrective-action selection status", "Main factors",
      "Proposed corrective actions", "Predicted effect", "RULA assessment data", "Selected corrective actions",
    ]));
    expect(dashboardMetricValue(overview, "Score")).toBe(6);
    expect(overview.getCell("A2").fill).toMatchObject({ type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F7FC" } });

    const weightedReport: RulaReportExport = {
      ...rulaReport,
      factors: [
        { key: "neck", angle: 24, detected: true, score: 3, impactPercent: 50, impactLevel: "HIGH", source: "AI" },
        { key: "trunk", angle: 28, detected: true, score: 2, impactPercent: 33, impactLevel: "MEDIUM", source: "AI" },
        { key: "wrist", angle: 18, detected: true, score: 1, impactPercent: 17, impactLevel: "LOW", source: "AI" },
      ],
    };
    const weightedWorkbook = new ExcelJS.Workbook();
    const weightedBuffer = await buildRulaWorkbook(rula, weightedReport);
    await weightedWorkbook.xlsx.load(weightedBuffer as unknown as Parameters<typeof weightedWorkbook.xlsx.load>[0]);
    const weightedOverview = weightedWorkbook.getWorksheet("RULA")!;
    const distributionRow = (label: string) => {
      let match: ExcelJS.Row | undefined;
      weightedOverview.eachRow((row) => {
        if (row.getCell(1).value === label) match = row;
      });
      return match;
    };
    expect([3, 4, 5].map((column) => distributionRow("High-impact factors")?.getCell(column).value)).toEqual([1, 3, "50%"]);
    expect([3, 4, 5].map((column) => distributionRow("Medium-impact factors")?.getCell(column).value)).toEqual([1, 2, "33%"]);
    expect([3, 4, 5].map((column) => distributionRow("Low-impact factors")?.getCell(column).value)).toEqual([1, 1, "17%"]);

    const incompleteReport: RulaReportExport = {
      ...rulaReport,
      assessment: { ...rula, postureReviewComplete: false },
      factors: [{ ...rulaReport.factors[0]!, reviewed: false }],
    };
    const incompleteBuffer = await buildRulaWorkbook(rula, incompleteReport);
    const incompleteWorkbook = new ExcelJS.Workbook();
    await incompleteWorkbook.xlsx.load(incompleteBuffer as unknown as Parameters<typeof incompleteWorkbook.xlsx.load>[0]);
    expect(dashboardMetricValue(incompleteWorkbook.getWorksheet("RULA")!, "Score")).toBe("-");
  });

  it("exports independent RULA side scores and factors for BOTH assessments", async () => {
    const bothReport: RulaReportExport = {
      ...rulaReport,
      assessment: { ...rula, bodySide: "BOTH" },
      sideResults: {
        RIGHT: { score: 6, actionLevel: 3, explanation: "Right needs review", groupA: 4, groupB: 5, adjustment: 1, trace: ["RIGHT score: 6"] },
        LEFT: { score: 3, actionLevel: 2, explanation: "Left is acceptable", groupA: 2, groupB: 3, adjustment: 0, trace: ["LEFT score: 3"] },
      },
      sideFactors: {
        RIGHT: [{ key: "neck", angle: 32, detected: true, score: 4, impactPercent: 57, impactLevel: "HIGH", source: "AI", reviewed: true }],
        LEFT: [{ key: "neck", angle: 12, detected: true, score: 2, impactPercent: 40, impactLevel: "LOW", source: "AI", reviewed: true }],
      },
      actions: [
        ...rulaReport.actions,
        { title: "Right-only neck support", description: "Support the right side.", priority: "HIGH", status: "IN_PROGRESS", bodySide: "RIGHT", rulaImpact: { scoreReduction: 1, affectedParts: ["neck"] } },
      ],
    };
    const workbookBuffer = await buildRulaWorkbook(rula, bothReport);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(workbookBuffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    expect(worksheetValues(workbook.getWorksheet("RULA")!)).toContain("RIGHT score");
    expect(worksheetValues(workbook.getWorksheet("RULA")!)).toContain("LEFT score");
    expect(workbook.getWorksheet("FACTORS")?.getColumn(1).values).toContain("RIGHT");
    expect(workbook.getWorksheet("FACTORS")?.getColumn(1).values).toContain("LEFT");
    expect(workbook.getWorksheet("FACTORS")?.getColumn(2).values).toContain("RIGHT / neck");
    expect(workbook.getWorksheet("FACTORS")?.getColumn(2).values).toContain("LEFT / neck");
    const dataSheet = workbook.getWorksheet("RULA DATA")!;
    let rightNeckActions: unknown;
    let leftNeckActions: unknown;
    dataSheet.eachRow((row) => {
      if (row.getCell(4).value !== "Neck") return;
      if (row.getCell(1).value === "RIGHT") rightNeckActions = row.getCell(9).value;
      if (row.getCell(1).value === "LEFT") leftNeckActions = row.getCell(9).value;
    });
    expect(rightNeckActions).toContain("Right-only neck support");
    expect(leftNeckActions).not.toContain("Right-only neck support");

    const wordBuffer = await buildRulaWordDocument(rula, bothReport);
    const archive = await JSZip.loadAsync(wordBuffer);
    const document = await archive.file("word/document.xml")!.async("string");
    expect(document).toContain("RIGHT score");
    expect(document).toContain("LEFT score");
  });
  it("keeps selected RULA corrections without posture-part mappings in exported results", async () => {
    const generalActionReport: RulaReportExport = {
      ...rulaReport,
      actions: [
        ...rulaReport.actions,
        { title: "Rotate staff between stations", description: "Add scheduled rotation to the task plan.", priority: "MEDIUM", status: "IN_PROGRESS", bodySide: "RIGHT", rulaImpact: { scoreReduction: 1, affectedParts: [] } },
      ],
    };
    const workbook = new ExcelJS.Workbook();
    const workbookBuffer = await buildRulaWorkbook(rula, generalActionReport);
    await workbook.xlsx.load(workbookBuffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    const exportedRulaRows = worksheetValues(workbook.getWorksheet("RULA DATA")!);
    expect(exportedRulaRows).toContain("General corrective actions");
    expect(exportedRulaRows).toContain("Rotate staff between stations (MEDIUM)");
    expect(worksheetValues(workbook.getWorksheet("ACTIONS")!).join(" ")).toContain("Rotate staff between stations");
    expect(worksheetValues(workbook.getWorksheet("RULA")!).join(" ")).toContain("Factor score distribution");

    const wordBuffer = await buildRulaWordDocument(rula, generalActionReport);
    const archive = await JSZip.loadAsync(wordBuffer);
    const document = await archive.file("word/document.xml")!.async("string");
    expect(document).toContain("General corrective actions");
    expect(document).toContain("Rotate staff between stations");
    expect(buildRulaPdfLines(rula, generalActionReport).join("\n")).toContain("Rotate staff between stations");
    expect((await buildRulaReportPdfDocument(rula, generalActionReport)).subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });

  it("keeps RULA Excel and Word exports aligned", async () => {
    const parityReport: RulaReportExport = {
      ...rulaReport,
      assessment: { ...rula, status: "IN_REVIEW" },
      predictedNote: "Reassess after controls",
    };
    const workbookBuffer = await buildRulaWorkbook(rula, parityReport);
    const wordBuffer = await buildRulaWordDocument(rula, parityReport);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(workbookBuffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    const overviewValues = worksheetValues(workbook.getWorksheet("RULA")!);
    expect(dashboardMetricValue(workbook.getWorksheet("RULA")!, "Score")).toBe(6);
    expect(dashboardMetricValue(workbook.getWorksheet("RULA")!, "Action level")).toBe(3);
    expect(dashboardMetricValue(workbook.getWorksheet("RULA")!, "Predicted score (estimate)")).toBe(4);
    expect(overviewValues).toContain("Reassess after controls");
    expect(worksheetValues(workbook.getWorksheet("SUMMARY")!)).toContain("IN_REVIEW");

    const archive = await JSZip.loadAsync(wordBuffer);
    const document = await archive.file("word/document.xml")!.async("string");
    for (const value of ["Status", "IN_REVIEW", "Predicted score (estimate)", "Reassess after controls", "neck", "43%", "Adjust work surface", "neck, trunk", "Selected", "Process information", "RULA assessment data", "Proposed corrective actions", "Packing operator", "Factor score distribution", "Corrective-action selection status", "Total factor score"]) {
      expect(document).toContain(value);
    }
    expect(document).toContain("<w:shd w:fill=\"F1F7FC\"/>");
  });

  it("renders complete Persian RULA exports with FMEA-style report sections", async () => {
    const localizedRula = { ...rula, id: "rula-001", subjectCode: "RULA-001", version: 2, createdAt: new Date("2026-09-01T10:00:00.000Z"), updatedAt: new Date("2026-09-02T10:00:00.000Z") };
    const lines = buildRulaPdfLines(localizedRula, rulaReport, "fa");
    expect(lines.join("\n")).toContain("جزئیات ارزیابی");
    expect(lines.join("\n")).toContain("تاریخ انجام ارزیابی");
    expect(lines.join("\n")).toContain("اطلاعات فرآیند");
    expect(lines.join("\n")).toContain("جدول داده‌های ارزیابی RULA");
    const pdfBuffer = await buildPdfDocument("NIVASafe — ارزیابی ارگونومی RULA", lines, "NIVASafe - گزارش RULA");
    expect(pdfBuffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");

    const wordBuffer = await buildRulaWordDocument(localizedRula, { ...rulaReport, assessment: localizedRula }, "fa");
    const wordArchive = await JSZip.loadAsync(wordBuffer);
    const wordDocument = await wordArchive.file("word/document.xml")!.async("string");
    expect(wordDocument.replace(/<[^>]+>/g, "")).toContain("NIVASafe — ارزیابی ارگونومی RULA");
    expect(wordDocument.replace(/<[^>]+>/g, "")).toContain("جدول داده‌های ارزیابی RULA");
    expect(wordDocument).toContain("تاریخ انجام ارزیابی");

    const workbookBuffer = await buildRulaWorkbook(localizedRula, { ...rulaReport, assessment: localizedRula }, "fa");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(workbookBuffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(["RULA", "SUMMARY", "PROCESS", "IMPACT", "FACTORS", "RULA DATA", "CORRECTIONS", "ACTIONS"]);
    expect(workbook.getWorksheet("SUMMARY")?.getColumn(1).values).toContain("تاریخ انجام ارزیابی");
    expect(workbook.getWorksheet("RULA DATA")?.getRow(1).values).toContain("عضو بدن");
    expect(workbook.getWorksheet("ACTIONS")?.getRow(2).values).toContain("گردن، تنه");
  });

  it("creates valid Office Open XML Word documents instead of mislabeled HTML files", async () => {
    const fmeaBuffer = await buildFmeaWordDocument(fmea);
    const rulaBuffer = await buildRulaWordDocument(rula, rulaReport);
    for (const [buffer, expectedText] of [[fmeaBuffer, "Dropped load"], [rulaBuffer, "Adjust work surface"]] as const) {
      expect(buffer.subarray(0, 2).toString("ascii")).toBe("PK");
      const archive = await JSZip.loadAsync(buffer);
      expect(archive.file("[Content_Types].xml")).toBeTruthy();
      expect(archive.file("word/document.xml")).toBeTruthy();
      const contentTypes = await archive.file("[Content_Types].xml")!.async("string");
      expect(contentTypes).toContain("wordprocessingml.document.main+xml");
      const document = await archive.file("word/document.xml")!.async("string");
      expect(document).toContain(expectedText);
    }
    const fmeaArchive = await JSZip.loadAsync(fmeaBuffer);
    const fmeaDocument = await fmeaArchive.file("word/document.xml")!.async("string");
    for (const section of ["Risk-level distribution", "Top failure modes", "Proposed corrective actions / controls", "Full FMEA details", "Corrective actions"]) {
      expect(fmeaDocument).toContain(section);
    }
    const pdfLines = buildFmeaPdfLines({ ...fmea, evaluationTeam: [{ displayName: "Safety lead", email: "lead@example.com", role: "HSE_MANAGER" }] });
    expect(pdfLines.join("\n")).toContain("REPORT HEADER");
    expect(pdfLines.join("\n")).toContain("EXECUTIVE RISK SUMMARY");
    expect(pdfLines.join("\n")).toContain("Average corrective-action progress: 25%");
    expect(pdfLines.join("\n")).toContain("RISK-LEVEL DISTRIBUTION");
    expect(pdfLines.join("\n")).toContain("TOP FAILURE MODES");
    expect(pdfLines.join("\n")).toContain("CORRECTIVE ACTIONS / CONTROLS");
    expect(pdfLines.join("\n")).toContain("FULL FMEA DETAILS");
    expect(pdfLines.join("\n")).toContain("Safety lead (HSE_MANAGER)");
    const pdfBuffer = await buildPdfDocument("NIVASafe — FMEA", [
      ...pdfLines,
      "شرح فعالیت: بسته‌بندی محصولات و کنترل ایمنی در سالن تولید",
      "علت خطر: عدم استفاده از تجهیزات حفاظت فردی",
    ]);
    expect(pdfBuffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    expect(pdfBuffer.byteLength).toBeGreaterThan(1_000);
    const pdfSource = pdfBuffer.toString("latin1");
    expect(pdfSource).toContain("/FontFile");
    expect(pdfSource).toContain("/Type0");
  });

  it("renders complete styled report PDFs and editable, direction-aware Word tables", async () => {
    const fmeaPdf = await buildFmeaReportPdfDocument(fmea, fmeaPageReport);
    const localizedFmeaPdf = await buildFmeaReportPdfDocument(fmea, fmeaPageReport, "fa");
    const rulaPdf = await buildRulaReportPdfDocument(rula, rulaReport);
    expect(fmeaPdf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    expect(localizedFmeaPdf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    expect(rulaPdf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    expect(fmeaPdf.byteLength).toBeGreaterThan(2_000);
    expect(localizedFmeaPdf.byteLength).toBeGreaterThan(2_000);
    expect(rulaPdf.byteLength).toBeGreaterThan(2_000);

    const fmeaDocx = await buildFmeaWordDocument(fmea, "fa", fmeaPageReport);
    const fmeaArchive = await JSZip.loadAsync(fmeaDocx);
    const fmeaXml = await fmeaArchive.file("word/document.xml")!.async("string");
    expect(fmeaXml).toContain("<w:bidiVisual/>");
    expect(fmeaXml).toContain("<w:color w:val=\"FFFFFF\"/>");
    expect(fmeaXml).toContain("<w:br/>");
    expect(fmeaXml.replace(/<[^>]+>/g, "")).toContain("جزئیات کامل FMEA");
    expect(fmeaXml).toContain("Review the loading procedure");

    const hostileWord = await buildFmeaWordDocument({ ...fmea, project: { name: "<script>alert('x')</script>" } });
    const hostileArchive = await JSZip.loadAsync(hostileWord);
    const hostileXml = await hostileArchive.file("word/document.xml")!.async("string");
    expect(hostileXml).toContain("&lt;script&gt;alert(&apos;x&apos;)&lt;/script&gt;");
    expect(hostileXml).not.toContain("<script>");

    const rulaDocx = await buildRulaWordDocument({ ...rula, bodySide: "BOTH" }, { ...rulaReport, assessment: { ...rula, bodySide: "BOTH" } }, "fa");
    const rulaArchive = await JSZip.loadAsync(rulaDocx);
    const rulaXml = await rulaArchive.file("word/document.xml")!.async("string");
    expect(rulaXml).toContain("<w:bidiVisual/>");
    expect(rulaXml).toContain("سهم امتیاز");
  });

  it("localizes FMEA exports and includes assessment details in Persian output", async () => {
    const localizedLines = buildFmeaPdfLines({ ...fmea, evaluationTeam: [{ displayName: "Safety lead", email: "lead@example.com", role: "HSE_MANAGER" }] }, "fa");
    expect(localizedLines.join("\n")).toContain("جدول نهایی ارزیابی FMEA");
    expect(localizedLines.join("\n")).toContain("نام فرآیند / شغل");
    expect(localizedLines.join("\n")).toContain("تاریخ ارزیابی");

    const wordBuffer = await buildFmeaWordDocument(fmea, "fa");
    const wordArchive = await JSZip.loadAsync(wordBuffer);
    const wordDocument = await wordArchive.file("word/document.xml")!.async("string");
    expect(wordDocument.replace(/<[^>]+>/g, "")).toContain("NIVASafe — ارزیابی ریسک FMEA");
    expect(wordDocument).toContain("مشخصات ارزیابی");
    expect(wordDocument).toContain("تاریخ ارزیابی");
    expect(wordDocument).toContain("حالت خرابی");

    const finalWordBuffer = await buildFmeaFinalTableWordDocument(fmea, "fa");
    const finalWordArchive = await JSZip.loadAsync(finalWordBuffer);
    const finalWordDocument = await finalWordArchive.file("word/document.xml")!.async("string");
    expect(finalWordDocument.replace(/<[^>]+>/g, "")).toContain("جدول نهایی ارزیابی FMEA");
    expect(finalWordDocument).toContain("جزئیات ارزیابی");
    expect(finalWordDocument).toContain("نام فرآیند / شغل");

    const workbookBuffer = await buildFmeaFinalTableWorkbook(fmea, "fa");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(workbookBuffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(["FMEA", "DETAILS"]);
    expect(workbook.getWorksheet("FMEA")?.getRow(1).values).toContain("حالت خرابی");
    expect(workbook.getWorksheet("FMEA")?.views[0]?.rightToLeft).toBe(true);
    expect(workbook.getWorksheet("DETAILS")?.getColumn(1).values).toContain("تاریخ ارزیابی");

    const pdfBuffer = await buildFmeaFinalTablePdfDocument(fmea, "fa");
    expect(pdfBuffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });
});
