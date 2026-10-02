export const testSession = {
  accessToken: "e2e-access-token",
  refreshToken: "e2e-refresh-token",
  user: {
    id: "user-e2e-1",
    email: "qa@nivasafe.test",
    username: "qa_engineer",
    displayName: "کاربر آزمون ریسپانسیو",
    locale: "fa",
    globalRole: "SUPER_ADMIN",
  },
  organizations: [{
    id: "org-e2e-1",
    nameFa: "سازمان آزمایشی ایمنی",
    nameEn: "Synthetic Safety Organization",
    role: "ORG_ADMIN",
    active: true,
    subscriptionPlan: "ENTERPRISE",
    subscriptionStatus: "ACTIVE",
  }],
};

export const testProject = {
  id: "project-e2e-1",
  name: "فرایند مونتاژ تجهیزات ایمنی — Synthetic Assembly Process",
  nameFa: "فرایند مونتاژ تجهیزات ایمنی",
  nameEn: "Synthetic Safety Equipment Assembly",
  code: "PRJ-E2E-01",
};

const row = (score: number, angle: number, source: "AI" | "USER" = "AI", confirmedByUser = source === "USER") => ({ angle, score, detected: true, source, confirmedByUser, confidence: source === "AI" ? 0.94 : null });
const rightAnalysis = { upperArm: row(4, 72), lowerArm: row(2, 96), wrist: row(3, 24), wristTwist: row(2, 18), neck: row(3, 28), trunk: row(4, 36), legs: row(2, 12) };
const leftAnalysis = { upperArm: row(3, 58), lowerArm: row(2, 88), wrist: row(2, 18), wristTwist: row(1, 8), neck: row(2, 20), trunk: row(3, 24), legs: row(1, 5) };

export const rulaPostureAnalysis = {
  ...rightAnalysis,
  sideAnalyses: { RIGHT: rightAnalysis, LEFT: leftAnalysis },
  sideImageOverlays: {
    RIGHT: { points: { head: { x: 0.52, y: 0.18, confidence: 0.94 }, shoulder: { x: 0.48, y: 0.32, confidence: 0.93 } } },
    LEFT: { points: { head: { x: 0.48, y: 0.18, confidence: 0.92 }, shoulder: { x: 0.52, y: 0.32, confidence: 0.91 } } },
  },
};

const rulaFactors = (analysis: typeof rightAnalysis) => [
  { key: "neck", angle: analysis.neck.angle, detected: true, score: analysis.neck.score, impactPercent: 32, impactLevel: "HIGH", source: analysis.neck.source, reviewed: false },
  { key: "upperArm", angle: analysis.upperArm.angle, detected: true, score: analysis.upperArm.score, impactPercent: 36, impactLevel: "HIGH", source: analysis.upperArm.source, reviewed: false },
  { key: "trunk", angle: analysis.trunk.angle, detected: true, score: analysis.trunk.score, impactPercent: 32, impactLevel: "HIGH", source: analysis.trunk.source, reviewed: false },
];
const rulaSideResult = (score: number, actionLevel: number, groupA: number, groupB: number) => ({ score, actionLevel, explanation: "Synthetic RULA result for deterministic browser coverage.", trace: [`Group A: ${groupA}`, `Group B: ${groupB}`, `Final score: ${score}`], groupA, groupB, adjustment: 1 });

export const rulaSuggestions = [
  { id: "rula-action-work-surface", titleFa: "تنظیم ارتفاع سطح کار", titleEn: "Adjust work-surface height", descriptionFa: "ارتفاع سطح کار و محل قرارگیری بار را اصلاح کنید.", descriptionEn: "Adjust the work-surface height and load position.", priority: "HIGH", scoreReduction: 2, affectedParts: ["trunk", "neck"], bodySide: "RIGHT", source: "FALLBACK" },
  { id: "rula-action-upper-limb", titleFa: "حمایت از اندام فوقانی", titleEn: "Support the upper limb", descriptionFa: "ابزار و تکیه‌گاه مناسب فراهم کنید.", descriptionEn: "Provide suitable tool and upper-limb support.", priority: "MEDIUM", scoreReduction: 1, affectedParts: ["upperArm", "wrist"], bodySide: "LEFT", source: "FALLBACK" },
];

export const rulaRecord = {
  id: "rula-e2e-1",
  title: "ارزیابی وضعیت مونتاژ طولانی با متن انگلیسی طولانی برای بررسی چیدمان",
  subjectCode: "RULA-E2E-01",
  bodySide: "BOTH",
  inputs: { force: 1, muscleUse: true },
  score: 6,
  actionLevel: 3,
  explanation: "Synthetic RULA assessment.",
  status: "DRAFT",
  version: 1,
  createdAt: "2026-01-15T08:30:00.000Z",
  updatedAt: "2026-01-16T10:45:00.000Z",
  project: testProject,
  postureReviewComplete: true,
  activityInfo: { jobTitle: "اپراتور مونتاژ تجهیزات ایمنی", taskDescription: "برداشتن، چرخاندن و نصب قطعات سنگین در چرخه‌های تکراری همراه با کنترل دیداری و ثبت نتایج.", postureDescription: "Synthetic posture description for visual tests.", durationPerOccurrence: 5, durationUnit: "MINUTE", repetitionsPerShift: 80, postureHoldDuration: 12, postureHoldUnit: "SECOND", loadWeight: 4, loadUnit: "KG" },
  postureAnalysis: rulaPostureAnalysis,
};

export const rulaReport = {
  assessment: { id: rulaRecord.id, title: rulaRecord.title, project: testProject, score: 6, actionLevel: 3, explanation: rulaRecord.explanation, status: "DRAFT", updatedAt: rulaRecord.updatedAt, bodySide: "BOTH", postureReviewComplete: true, activityInfo: rulaRecord.activityInfo, postureAnalysis: rulaPostureAnalysis },
  factors: rulaFactors(rightAnalysis),
  sideResults: { RIGHT: rulaSideResult(6, 3, 5, 5), LEFT: rulaSideResult(4, 2, 4, 4) },
  sideFactors: { RIGHT: rulaFactors(rightAnalysis), LEFT: rulaFactors(leftAnalysis) },
  suggestedActions: rulaSuggestions,
  actions: [],
  predictedScore: 4,
  predictedSideScores: { RIGHT: 4, LEFT: 3 },
};

const fmeaItem = (rowNumber: number, riskLevel: string, rpn: number) => ({
  id: `fmea-item-e2e-${rowNumber}`,
  rowNumber,
  processStep: "مونتاژ و کنترل نهایی تجهیزات",
  failureMode: `حالت خرابی ${rowNumber}: عدم کنترل کامل قطعه با شرح طولانی برای آزمون نمایش کارت موبایل`,
  effect: "آسیب احتمالی به کاربر و توقف فرایند در صورت شناسایی‌نشدن به‌موقع.",
  cause: "آموزش ناکافی، فشار زمانی و نبود کنترل استاندارد در شیفت کاری.",
  preventiveControls: "دستورالعمل مدون، آموزش دوره‌ای و کنترل پیشگیرانه تجهیزات.",
  detectionControls: "بازرسی دو مرحله‌ای، چک‌لیست روزانه و ثبت سوابق قابل ردیابی.",
  severity: 8,
  occurrence: 6,
  detection: 5,
  rpn,
  riskLevel,
  actionPriority: riskLevel,
  recommendation: "بازبینی کنترل‌ها و ثبت اقدام اصلاحی با مسئول مشخص.",
  correctiveActions: [{ id: `fmea-action-e2e-${rowNumber}`, title: "بازبینی دستورالعمل و آموزش اپراتور", status: "OPEN", priority: "HIGH" }],
});
export const fmeaItems = [fmeaItem(1, "CRITICAL", 420), fmeaItem(2, "HIGH", 240), fmeaItem(3, "MEDIUM", 144), fmeaItem(4, "LOW", 72)];

export const fmeaRecord = {
  id: "fmea-e2e-1",
  title: "ارزیابی ریسک فرایند مونتاژ با عنوان بسیار طولانی برای آزمون ریسپانسیو",
  code: "FMEA-E2E-01",
  scope: "فرایند مونتاژ تجهیزات ایمنی",
  department: "تولید و کنترل کیفیت",
  activityDescription: "ثبت فعالیت آزمایشی با مقدار طولانی برای بررسی شکست‌نخوردن محتوا در جدول و کارت.",
  equipment: ["ابزار مونتاژ", "تجهیزات کنترل کیفیت"],
  materials: ["قطعه نمونه"],
  existingControls: ["چک‌لیست"],
  specialConditions: "شرایط خاص آزمون ریسپانسیو",
  status: "DRAFT",
  version: 1,
  project: testProject,
  items: fmeaItems,
};

export const fmeaReport = {
  assessment: { id: fmeaRecord.id, title: fmeaRecord.title, code: fmeaRecord.code, status: "DRAFT", version: 1, createdAt: "2026-01-15T08:30:00.000Z", updatedAt: "2026-01-16T10:45:00.000Z", approvedAt: null, fmeaDetailSeeded: true, method: "FMEA", processName: { fa: "فرایند مونتاژ تجهیزات ایمنی", en: "Safety equipment assembly" }, companyName: { fa: "سازمان آزمایشی ایمنی", en: "Synthetic Safety Organization" }, project: { id: testProject.id, name: testProject.name, code: testProject.code }, evaluationTeam: [{ id: "user-e2e-1", displayName: "کاربر آزمون ریسپانسیو", email: "qa@nivasafe.test", role: "ORG_ADMIN" }] },
  summary: { totalFailureModes: 4, highPriorityRisks: 2, correctiveActionsNeeded: 3, immediateActions: 1, distribution: { CRITICAL: 1, HIGH: 1, MEDIUM: 1, LOW: 1, VERY_LOW: 0 } },
  items: fmeaItems,
  topFailureModes: fmeaItems,
  suggestedActions: [{ id: "fmea-suggestion-e2e-1", title: "استانداردسازی کنترل نهایی", description: "اقدام اصلاحی پیشنهادی برای ریسک نمونه.", fmeaItemId: fmeaItems[0].id, failureMode: fmeaItems[0].failureMode, priority: "HIGH", status: "SUGGESTED" }],
  actions: [{ id: "fmea-action-e2e-1", title: "بازبینی دستورالعمل و آموزش اپراتور", description: "شرح اقدام اصلاحی آزمایشی.", priority: "HIGH", status: "OPEN", progress: 25, assigneeName: "کاربر آزمون ریسپانسیو", dueDate: "2026-02-15", fmeaItemId: fmeaItems[0].id, fmeaItem: { rowNumber: 1, failureMode: fmeaItems[0].failureMode } }],
};

export const dashboard = {
  counters: { projects: 3, fmeas: 4, rulas: 2, openActions: 5, overdueActions: 1, criticalItems: 1, members: 8, knowledgeDocs: 6, pendingAI: 0 },
  riskDistribution: [{ riskLevel: "CRITICAL", _count: 1 }, { riskLevel: "HIGH", _count: 2 }, { riskLevel: "MEDIUM", _count: 3 }, { riskLevel: "LOW", _count: 4 }],
  actionDistribution: [{ status: "OPEN", _count: 3 }, { status: "IN_PROGRESS", _count: 1 }, { status: "COMPLETED", _count: 2 }],
  recent: { fmeas: [{ id: fmeaRecord.id, title: fmeaRecord.title, code: fmeaRecord.code, status: "DRAFT" }], rulas: [{ id: rulaRecord.id, title: rulaRecord.title, score: rulaRecord.score, actionLevel: rulaRecord.actionLevel, updatedAt: rulaRecord.updatedAt }] },
};

export const adminOverview = {
  users: { total: 8, active: 7, inactive: 1, superAdmins: 2 },
  organizations: { total: 2, active: 2, inactive: 0 },
  activeMemberships: 8,
  pendingInvitations: 1,
  pendingMemberRequests: 0,
  recentUsers: [{ id: "user-e2e-1", displayName: "کاربر آزمون ریسپانسیو", email: "qa@nivasafe.test", username: "qa_engineer", active: true, globalRole: "SUPER_ADMIN", createdAt: "2026-01-01T10:00:00.000Z" }],
};

export const adminUsers = [{ id: "user-e2e-1", email: "qa@nivasafe.test", username: "qa_engineer", displayName: "کاربر آزمون ریسپانسیو", active: true, globalRole: "SUPER_ADMIN", lastLoginAt: "2026-01-16T10:45:00.000Z", jobTitle: "مدیر ایمنی", phone: "09120000000", createdAt: "2026-01-01T10:00:00.000Z", memberships: [{ id: "membership-e2e-1", role: "ORG_ADMIN", active: true, organization: { id: "org-e2e-1", nameFa: "سازمان آزمایشی ایمنی", nameEn: "Synthetic Safety Organization", active: true } }] }, { id: "user-e2e-2", email: "operator@nivasafe.test", username: "operator", displayName: "اپراتور با نام طولانی برای جدول کاربران", active: true, globalRole: "USER", lastLoginAt: null, jobTitle: "کارشناس کنترل کیفیت", phone: null, createdAt: "2026-01-03T10:00:00.000Z", memberships: [{ id: "membership-e2e-2", role: "HSE_SPECIALIST", active: true, organization: { id: "org-e2e-1", nameFa: "سازمان آزمایشی ایمنی", nameEn: "Synthetic Safety Organization", active: true } }] }];

export const files = [{ id: "file-e2e-1", originalName: "تصویر-وضعیت-کاری-با-نام-بسیار-طولانی-برای-آزمون-ریسپانسیو.png", mimeType: "image/png", size: 4096, kind: "IMAGE", createdAt: "2026-01-16T10:45:00.000Z", reference: { type: "RULA", title: rulaRecord.title, code: "RULA-E2E-01" } }];
export const notifications = [{ id: "notification-e2e-1", title: "نتیجه ارزیابی آماده است", message: "گزارش آزمایشی برای بررسی ریسپانسیو آماده شده است.", createdAt: "2026-01-16T10:45:00.000Z", readAt: null }];
export const actions = [{ id: "action-e2e-1", title: "بازبینی دستورالعمل کنترل نهایی با عنوان طولانی برای آزمون", description: "شرح اقدام اصلاحی نمونه با متن فارسی و English text to stress wrapping behavior.", bodySide: "RIGHT", priority: "HIGH", status: "OPEN", progress: 35, assigneeName: "کاربر آزمون ریسپانسیو", dueDate: "2026-02-15", project: testProject, rula: { id: rulaRecord.id, title: rulaRecord.title } }];
export const members = [{ id: "membership-e2e-1", role: "ORG_ADMIN", active: true, user: adminUsers[0], organization: { id: "org-e2e-1", nameFa: "سازمان آزمایشی ایمنی", nameEn: "Synthetic Safety Organization" } }];
export const profile = { ...testSession.user, phone: "09120000000", jobTitle: "مدیر ایمنی و ارگونومی", locale: "fa" };
export const knowledgeQuota = { plan: "ENTERPRISE", tokenLimit: 100000, usedTokens: 1200, remainingTokens: 98800, maxFileBytes: 5 * 1024 * 1024, maxFileSizeLabel: "۵ مگابایت", canUpload: true };
export const knowledgeDocuments = [{ id: "knowledge-e2e-1", title: "راهنمای کنترل ریسک با عنوان بسیار طولانی برای آزمون شکست‌نخوردن کارت", content: "متن ساختگی پایگاه دانش برای بررسی نمایش صحیح محتوای طولانی در موبایل.", tags: ["ایمنی", "ریسپانسیو"], published: true, aiReadable: true, isGlobal: false, visibility: "ALL", visibleUserIds: [], visibleOrganizationIds: [], version: 1, updatedAt: "2026-01-16T10:45:00.000Z", attachments: [{ id: "attachment-e2e-1", originalName: "راهنمای-ایمنی-با-نام-بسیار-طولانی-برای-آزمون.pdf", mimeType: "application/pdf", size: 4096, downloadPath: "/files/attachment-e2e-1/download" }] }];
export const notificationPreferences = { emailEnabled: true, pushEnabled: true, riskAlerts: true, dueReminders: true };
const longUnbrokenIdentifier = "UNBROKEN-IDENTIFIER-000000000000000000000000000000000000000000000000000000000000000000000000";
export const activityLog = [{ id: "activity-e2e-1", action: "RULA_CREATE", category: "ASSESSMENT", entityType: "RULA", entityId: rulaRecord.id, metadata: { source: "playwright", longIdentifier: longUnbrokenIdentifier }, requestId: "req-e2e-1", ipAddress: "127.0.0.1", userAgent: `Playwright Chromium ${longUnbrokenIdentifier}`, createdAt: "2026-01-16T10:45:00.000Z", assessment: { type: "RULA", id: rulaRecord.id, title: rulaRecord.title, code: "RULA-E2E-01" }, user: { id: "user-e2e-1", displayName: "کاربر آزمون ریسپانسیو", email: "qa@nivasafe.test" } }];
