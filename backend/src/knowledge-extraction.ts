import ExcelJS from "exceljs";
import JSZip from "jszip";
import { inflateSync } from "node:zlib";

const MAX_EXTRACTED_KNOWLEDGE_CHARS = 80_000;

function decodeXml(value: string) {
  return value.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)));
}

function cleanExtractedText(value: string) {
  return decodeXml(value)
    .replace(/\u0000/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_EXTRACTED_KNOWLEDGE_CHARS);
}

async function extractDocx(buffer: Buffer) {
  const archive = await JSZip.loadAsync(buffer);
  const document = archive.file("word/document.xml");
  if (!document) return "";
  const xml = await document.async("string");
  return cleanExtractedText(xml
    .replace(/<w:tab[^>]*\/?>(?:<\/w:tab>)?/g, "\t")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<\/w:tr>/g, "\n")
    .replace(/<[^>]+>/g, " "));
}

function spreadsheetCellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value !== "object") return "";
  const cell = value as { text?: unknown; result?: unknown; richText?: Array<{ text?: unknown }> };
  if (typeof cell.text === "string") return cell.text;
  if (typeof cell.result === "string" || typeof cell.result === "number") return String(cell.result);
  if (Array.isArray(cell.richText)) return cell.richText.map((part) => typeof part.text === "string" ? part.text : "").join("");
  return "";
}

async function extractXlsx(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  const lines: string[] = [];
  for (const worksheet of workbook.worksheets) {
    lines.push(`[${worksheet.name}]`);
    worksheet.eachRow({ includeEmpty: false }, (row) => {
      const values = (row.values as unknown[]).slice(1).map(spreadsheetCellText).filter(Boolean);
      if (values.length) lines.push(values.join(" | "));
    });
  }
  return cleanExtractedText(lines.join("\n"));
}

function decodePdfLiteral(value: string) {
  return value.replace(/\\([\\()nrtbf])/g, (_, code: string) => ({ "\\": "\\", "(": "(", ")": ")", n: "\n", r: "\r", t: "\t", b: "\b", f: "\f" }[code] ?? code));
}

function extractPdfText(buffer: Buffer) {
  const source = buffer.toString("latin1");
  const chunks = [source];
  for (const match of source.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    try {
      const inflated = inflateSync(Buffer.from(match[1] ?? "", "latin1"), { maxOutputLength: 4_000_000 }).toString("latin1");
      chunks.push(inflated);
    } catch {
      // Uncompressed or unsupported PDF streams are skipped safely.
    }
  }
  const text = chunks.flatMap((chunk) => [...chunk.matchAll(/\(((?:\\.|[^\\()]){1,2000})\)\s*T[Jj]/g)].map((match) => decodePdfLiteral(match[1] ?? ""))).join("\n");
  return cleanExtractedText(text);
}

export async function extractKnowledgeText(buffer: Buffer, mimeType: string) {
  try {
    if (mimeType === "text/plain" || mimeType === "text/csv") return cleanExtractedText(buffer.toString("utf8"));
    if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return await extractDocx(buffer);
    if (mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") return await extractXlsx(buffer);
    if (mimeType === "application/pdf") return extractPdfText(buffer);
  } catch {
    return "";
  }
  return "";
}

export function appendKnowledgeText(existing: string, extracted: string, filename: string) {
  const cleanExisting = existing.trim();
  const cleanExtracted = extracted.trim();
  if (!cleanExtracted || cleanExisting.includes(cleanExtracted)) return cleanExisting;
  const safeFilename = filename.replace(/[^\p{L}\p{N}._ -]+/gu, " ").replace(/\s+/g, " ").replace(/\s+\./g, ".").trim().slice(0, 120) || "attachment";
  return [cleanExisting, `[محتوای استخراج‌شده از ${safeFilename}]`, cleanExtracted].filter(Boolean).join("\n\n").slice(0, MAX_EXTRACTED_KNOWLEDGE_CHARS);
}
