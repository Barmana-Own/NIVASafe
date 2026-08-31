import type { FastifyInstance, FastifyReply } from "fastify";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { z } from "zod";
import { authenticate } from "../auth-guard.js";
import { parse, prisma, requireOrg, requirePermission } from "../core.js";

const paramsSchema = z.object({ type: z.enum(["fmea", "rula"]), id: z.string().uuid(), format: z.enum(["pdf", "xlsx"]) });
function sendPdf(reply: FastifyReply, title: string, lines: string[]) { const doc = new PDFDocument({ margin: 48 }); const chunks: Buffer[] = []; doc.on("data", (chunk) => chunks.push(Buffer.from(chunk))); const complete = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks)))); doc.fontSize(20).text(title); doc.moveDown(); for (const line of lines) doc.fontSize(10).text(line); doc.end(); return complete.then((buffer) => reply.header("content-type", "application/pdf").header("content-disposition", `attachment; filename=${title.replace(/\W/g, "-")}.pdf`).send(buffer)); }

export async function registerReportRoutes(app: FastifyInstance) {
  app.get("/api/v1/reports/:type/:id.:format", { preHandler: authenticate }, async (request, reply) => {
    const organizationId = requireOrg(request); requirePermission(request, "reports.generate"); const { type, id, format } = parse(paramsSchema, request.params);
    const data = type === "fmea" ? await prisma.fmeaAssessment.findFirst({ where: { id, organizationId, deletedAt: null }, include: { project: true, items: { orderBy: { rowNumber: "asc" } } } }) : await prisma.rulaAssessment.findFirst({ where: { id, organizationId }, include: { project: true } });
    if (!data) throw Object.assign(new Error("Assessment not found"), { statusCode: 404, code: "NOT_FOUND" });
    if (format === "pdf") { const lines = "items" in data ? [`Code: ${data.code}`, `Project: ${data.project.name}`, ...data.items.map((item: { rowNumber: number; failureMode: string; rpn: number; riskLevel: string }) => `${item.rowNumber}. ${item.failureMode} | RPN ${item.rpn} | ${item.riskLevel}`)] : [`Project: ${data.project.name}`, `Score: ${data.score}`, `Action level: ${data.actionLevel}`, `Explanation: ${data.explanation}`]; return sendPdf(reply, `NIVASafe-${type.toUpperCase()}`, lines); }
    const workbook = new ExcelJS.Workbook(); const sheet = workbook.addWorksheet(type.toUpperCase());
    if (type === "fmea" && "items" in data) { sheet.columns = [{ header: "Row", key: "row" }, { header: "Process", key: "process" }, { header: "Failure mode", key: "failure" }, { header: "Effect", key: "effect" }, { header: "Cause", key: "cause" }, { header: "S", key: "s" }, { header: "O", key: "o" }, { header: "D", key: "d" }, { header: "RPN", key: "rpn" }, { header: "Risk", key: "risk" }]; data.items.forEach((item: { rowNumber: number; processStep: string; failureMode: string; effect: string; cause: string; severity: number; occurrence: number; detection: number; rpn: number; riskLevel: string }) => sheet.addRow({ row: item.rowNumber, process: item.processStep, failure: item.failureMode, effect: item.effect, cause: item.cause, s: item.severity, o: item.occurrence, d: item.detection, rpn: item.rpn, risk: item.riskLevel })); }
    else { sheet.addRows([["Title", data.title], ["Project", data.project.name], ["Score", "score" in data ? data.score : ""], ["Action level", "actionLevel" in data ? data.actionLevel : ""], ["Explanation", "explanation" in data ? data.explanation : ""]]); }
    const buffer = await workbook.xlsx.writeBuffer(); return reply.header("content-type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet").header("content-disposition", `attachment; filename=NIVASafe-${type}.xlsx`).send(Buffer.from(buffer));
  });
}
