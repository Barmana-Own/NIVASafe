import ExcelJS from "exceljs";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { buildFmeaPdfLines, buildFmeaWorkbook, buildFmeaWordDocument, buildPdfDocument, buildRulaWorkbook, buildRulaWordDocument, type FmeaReportData, type RulaReportData, type RulaReportExport } from "./modules/reports.js";

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

const rula: RulaReportData = { title: "Packing posture", project: { name: "Ergonomics project" }, score: 6, actionLevel: 3, explanation: "Needs review" };
const rulaReport: RulaReportExport = {
  assessment: rula,
  factors: [{ key: "neck", angle: 24, detected: true, score: 3, impactPercent: 43, impactLevel: "HIGH", source: "AI" }],
  actions: [{ title: "Adjust work surface", description: "Raise the work surface", priority: "HIGH", status: "OPEN", rulaImpact: { scoreReduction: 2, affectedParts: ["neck", "trunk"] } }],
  predictedScore: 4,
};

describe("assessment report exports", () => {
  it("creates a readable FMEA Excel workbook with separate report sheets", async () => {
    const buffer = await buildFmeaWorkbook(fmea);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(["FMEA", "SUMMARY", "PROCESS", "ACTIONS"]);
    expect(workbook.getWorksheet("FMEA")?.getRow(1).values).toContain("Failure mode");
    expect(workbook.getWorksheet("FMEA")?.getRow(2).values).toContain("Dropped load");
    expect(workbook.getWorksheet("FMEA")?.getRow(2).values).toContain("Add a load restraint | Install restraint (OPEN, HIGH)");
    expect(workbook.getWorksheet("SUMMARY")?.getRow(8).values).toContain(1);
    expect(workbook.getWorksheet("FMEA")?.autoFilter).toBeTruthy();
    const injectionBuffer = await buildFmeaWorkbook({ ...fmea, title: "=HYPERLINK(\"https://example.invalid\")" });
    const injectionWorkbook = new ExcelJS.Workbook();
    await injectionWorkbook.xlsx.load(injectionBuffer as unknown as Parameters<typeof injectionWorkbook.xlsx.load>[0]);
    expect(injectionWorkbook.getWorksheet("SUMMARY")?.getCell("B2").value).toBe("'=HYPERLINK(\"https://example.invalid\")");
  });

  it("creates a readable RULA Excel workbook with factor and action sections", async () => {
    const buffer = await buildRulaWorkbook(rula, rulaReport);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(["RULA", "FACTORS", "ACTIONS"]);
    expect(workbook.getWorksheet("RULA")?.getColumn(2).values).toContain(4);
    expect(workbook.getWorksheet("FACTORS")?.getRow(2).values).toContain("neck");
    expect(workbook.getWorksheet("ACTIONS")?.getRow(2).values).toContain("Adjust work surface");
    expect(workbook.getWorksheet("ACTIONS")?.getRow(2).values).toContain("Selected");
    expect(workbook.getWorksheet("ACTIONS")?.getRow(2).values).toContain("neck, trunk");

    const incompleteReport: RulaReportExport = {
      ...rulaReport,
      assessment: { ...rula, postureReviewComplete: false },
      factors: [{ ...rulaReport.factors[0]!, reviewed: false }],
    };
    const incompleteBuffer = await buildRulaWorkbook(rula, incompleteReport);
    const incompleteWorkbook = new ExcelJS.Workbook();
    await incompleteWorkbook.xlsx.load(incompleteBuffer as unknown as Parameters<typeof incompleteWorkbook.xlsx.load>[0]);
    expect(incompleteWorkbook.getWorksheet("RULA")?.getColumn(2).values).toContain("-");
    expect(incompleteWorkbook.getWorksheet("RULA")?.getColumn(2).values).not.toContain(6);
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
    const summaryRows = workbook.getWorksheet("RULA")?.getRows(2, 7)?.map((row) => [row.getCell(1).value, row.getCell(2).value]);
    expect(summaryRows).toEqual([
      ["Title", "Packing posture"],
      ["Project", "Ergonomics project"],
      ["Score", 6],
      ["Action level", 3],
      ["Status", "IN_REVIEW"],
      ["Explanation", "Needs review"],
      ["Predicted score (estimate)", 4],
    ]);
    expect(workbook.getWorksheet("RULA")?.getRow(9).values).toContain("Reassess after controls");

    const archive = await JSZip.loadAsync(wordBuffer);
    const document = await archive.file("word/document.xml")!.async("string");
    for (const value of ["Status", "IN_REVIEW", "Predicted score (estimate)", "Reassess after controls", "neck", "43%", "Adjust work surface", "neck, trunk", "Selected"]) {
      expect(document).toContain(value);
    }
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
    const pdfLines = buildFmeaPdfLines({ ...fmea, evaluationTeam: [{ displayName: "Safety lead", email: "lead@example.com", role: "HSE_MANAGER" }] });
    expect(pdfLines.join("\n")).toContain("REPORT HEADER");
    expect(pdfLines.join("\n")).toContain("EXECUTIVE RISK SUMMARY");
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
});
