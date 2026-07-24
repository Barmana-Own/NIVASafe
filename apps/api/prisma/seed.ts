import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { calculateRpn, calculateRula, riskLevel } from "@nivasafe/domain";
const db = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Demo seed is disabled in production");
  const passwordHash = await bcrypt.hash("Demo123!", 12);
  const definitions = [["admin@nivasafe.local", "مدیر NIVASafe", Role.ORG_ADMIN], ["hse@nivasafe.local", "مدیر HSE", Role.HSE_MANAGER], ["assessor@nivasafe.local", "ارزیاب", Role.ASSESSOR], ["viewer@nivasafe.local", "مشاهده‌گر", Role.VIEWER]] as const;
  const users = await Promise.all(definitions.map(([email, displayName]) => db.user.upsert({ where: { email }, update: { displayName }, create: { email, displayName, passwordHash } })));
  const org = await db.organization.upsert({ where: { nationalId: "DEMO-A" }, update: {}, create: { nameFa: "شرکت ایمن‌گستر", nameEn: "Safe Growth Co.", nationalId: "DEMO-A", industry: "Manufacturing" } });
  const isolationOrg = await db.organization.upsert({ where: { nationalId: "DEMO-B" }, update: {}, create: { nameFa: "سازمان آزمایشی دوم", nameEn: "Isolation Test Org", nationalId: "DEMO-B", industry: "Construction" } });
  for (let index = 0; index < users.length; index++) await db.organizationMember.upsert({ where: { organizationId_userId: { organizationId: org.id, userId: users[index]!.id } }, update: { role: definitions[index]![2], active: true }, create: { organizationId: org.id, userId: users[index]!.id, role: definitions[index]![2] } });
  await db.organizationMember.upsert({ where: { organizationId_userId: { organizationId: isolationOrg.id, userId: users[0]!.id } }, update: { role: Role.ORG_ADMIN }, create: { organizationId: isolationOrg.id, userId: users[0]!.id, role: Role.ORG_ADMIN } });
  const permissions = ["users.read", "users.manage", "organizations.manage", "projects.read", "projects.manage", "assessments.create", "assessments.update", "assessments.delete", "assessments.approve", "reports.generate", "knowledge.manage", "ai.configure", "audit.read"];
  for (const key of permissions) await db.permission.upsert({ where: { key }, update: {}, create: { key } });
  const project = await db.project.upsert({ where: { organizationId_code: { organizationId: org.id, code: "MFG-01" } }, update: {}, create: { organizationId: org.id, name: "خط تولید نمونه", code: "MFG-01", description: "پروژه نمایشی ارزیابی ریسک" } });
  let workProcess = await db.process.findFirst({ where: { organizationId: org.id, projectId: project.id, name: "مونتاژ" } }); workProcess ??= await db.process.create({ data: { organizationId: org.id, projectId: project.id, name: "مونتاژ", description: "فرایند مونتاژ قطعات" } });
  let activity = await db.activity.findFirst({ where: { organizationId: org.id, projectId: project.id, title: "جابه‌جایی دستی قطعات" } }); activity ??= await db.activity.create({ data: { organizationId: org.id, projectId: project.id, processId: workProcess.id, title: "جابه‌جایی دستی قطعات", jobTitle: "اپراتور مونتاژ", hazards: "ارگونومی، سقوط بار" } });
  let fmea = await db.fmeaAssessment.findFirst({ where: { organizationId: org.id, code: "FMEA-001", version: 1 } }); fmea ??= await db.fmeaAssessment.create({ data: { organizationId: org.id, projectId: project.id, activityId: activity.id, title: "ارزیابی ریسک خط مونتاژ", code: "FMEA-001", status: "IN_PROGRESS" } });
  if (!(await db.fmeaItem.count({ where: { assessmentId: fmea.id } }))) { const rpn = calculateRpn(8, 5, 6); await db.fmeaItem.create({ data: { assessmentId: fmea.id, rowNumber: 1, processStep: "بلند کردن قطعه", failureMode: "سقوط قطعه", effect: "آسیب اندام", cause: "گرفتن نامناسب", preventiveControls: "آموزش", detectionControls: "بازرسی سرپرست", severity: 8, occurrence: 5, detection: 6, rpn, riskLevel: riskLevel(rpn), recommendation: "استفاده از ابزار بالابر" } }); }
  await db.fmeaVersion.upsert({ where: { assessmentId_version: { assessmentId: fmea.id, version: 1 } }, update: {}, create: { assessmentId: fmea.id, version: 1, snapshot: { title: fmea.title, code: fmea.code }, createdBy: users[0]!.id } });
  const inputs = { upperArm: 4, lowerArm: 3, wrist: 3, wristTwist: 2, neck: 4, trunk: 5, legs: 2, muscleUse: true, force: 2 }; const result = calculateRula(inputs);
  let rula = await db.rulaAssessment.findFirst({ where: { organizationId: org.id, title: "RULA اپراتور مونتاژ" } }); rula ??= await db.rulaAssessment.create({ data: { organizationId: org.id, projectId: project.id, activityId: activity.id, title: "RULA اپراتور مونتاژ", subjectCode: "OP-01", bodySide: "RIGHT", inputs, score: result.score, actionLevel: result.actionLevel, explanation: result.explanation, status: "APPROVED" } });
  await db.rulaVersion.upsert({ where: { assessmentId_version: { assessmentId: rula.id, version: 1 } }, update: {}, create: { assessmentId: rula.id, version: 1, snapshot: { title: rula.title, score: rula.score }, createdBy: users[0]!.id } });
  if (!(await db.correctiveAction.count({ where: { organizationId: org.id } }))) await db.correctiveAction.create({ data: { organizationId: org.id, projectId: project.id, fmeaId: fmea.id, title: "تأمین ابزار بالابر", description: "انتخاب و نصب ابزار جابه‌جایی مکانیکی", priority: "HIGH", assigneeName: "مدیر تولید", dueDate: new Date(Date.now() + 14 * 86400000) } });
  if (!(await db.knowledgeDocument.count({ where: { organizationId: org.id } }))) await db.knowledgeDocument.create({ data: { organizationId: org.id, title: "راهنمای کنترل ریسک", content: "برای کنترل ریسک ابتدا حذف خطر، سپس جایگزینی، کنترل مهندسی، کنترل اداری و تجهیزات حفاظت فردی را بررسی کنید.", tags: ["HSE", "risk"] } });
  if (!(await db.notification.count({ where: { organizationId: org.id, userId: users[0]!.id } }))) await db.notification.create({ data: { organizationId: org.id, userId: users[0]!.id, title: "ریسک بحرانی شناسایی شد", message: "FMEA-001 نیازمند بازبینی اقدام اصلاحی است.", link: "/fmea" } });
  console.info("Seed complete. Demo password for all accounts: Demo123!");
}
main().finally(() => db.$disconnect());
