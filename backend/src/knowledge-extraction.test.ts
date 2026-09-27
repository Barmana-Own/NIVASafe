import ExcelJS from "exceljs";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { appendKnowledgeText, extractKnowledgeText } from "./knowledge-extraction.js";

describe("knowledge attachment extraction", () => {
  it("extracts plain text attachments", async () => {
    await expect(extractKnowledgeText(Buffer.from("LOTO procedure\nVerify isolation."), "text/plain")).resolves.toContain("LOTO procedure");
  });

  it("extracts text from DOCX and XLSX attachments", async () => {
    const docx = new JSZip();
    docx.file("word/document.xml", '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Emergency response plan</w:t></w:r></w:p></w:body></w:document>');
    const docxBuffer = await docx.generateAsync({ type: "nodebuffer" });
    await expect(extractKnowledgeText(docxBuffer, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")).resolves.toContain("Emergency response plan");

    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet("Controls").addRow(["Engineering control", "Guarding"]);
    const xlsxBuffer = Buffer.from(await workbook.xlsx.writeBuffer());
    await expect(extractKnowledgeText(xlsxBuffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")).resolves.toContain("Engineering control | Guarding");
  });

  it("appends extracted content without duplicating an existing index", () => {
    const appended = appendKnowledgeText("Base guidance", "Extracted guidance", "guide\n.txt");
    expect(appended).toContain("[محتوای استخراج‌شده از guide.txt]");
    expect(appendKnowledgeText(appended, "Extracted guidance", "guide.txt")).toBe(appended);
  });
});
