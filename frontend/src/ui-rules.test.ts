import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { calculateRpn, riskLevel } from "@nivasafe/domain";

const appSource = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
const apiClientSource = readFileSync(new URL("./api/client.ts", import.meta.url), "utf8");
const appLayoutSource = readFileSync(new URL("./layout/AppLayout.tsx", import.meta.url), "utf8");
const uiSource = readFileSync(new URL("./components/UI.tsx", import.meta.url), "utf8");
const overlaySource = readFileSync(new URL("./components/Overlay.tsx", import.meta.url), "utf8");
const generalPagesSource = readFileSync(new URL("./features/general/GeneralPages.tsx", import.meta.url), "utf8");
const accountPagesSource = readFileSync(new URL("./features/account/AccountPages.tsx", import.meta.url), "utf8");
const registrationPagesSource = readFileSync(new URL("./features/account/RegistrationPage.tsx", import.meta.url), "utf8");
const assessmentShellSource = readFileSync(new URL("./features/assessments/AssessmentPages.tsx", import.meta.url), "utf8");
const assessmentSharedSource = readFileSync(new URL("./features/assessments/assessmentShared.tsx", import.meta.url), "utf8");
const fmeaFeatureSource = readFileSync(new URL("./features/assessments/fmea/FmeaFeature.tsx", import.meta.url), "utf8");
const fmeaReportComponentsSource = readFileSync(new URL("./features/assessments/fmea/FmeaReportComponents.tsx", import.meta.url), "utf8");
const rulaFeatureSource = readFileSync(new URL("./features/assessments/rula/RulaFeature.tsx", import.meta.url), "utf8");
const assessmentPagesSource = `${assessmentShellSource}\n${assessmentSharedSource}\n${fmeaFeatureSource}\n${fmeaReportComponentsSource}\n${rulaFeatureSource}`;
const filesPageSource = readFileSync(new URL("./features/files/FilesPage.tsx", import.meta.url), "utf8");
const stylesEntrySource = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
const stylesIndexUrl = new URL("./styles/index.css", import.meta.url);
const stylesIndexSource = readFileSync(stylesIndexUrl, "utf8");
const stylesModuleSources = Array.from(stylesIndexSource.matchAll(/@import\s+"([^"]+)"/g), ([, importPath]) =>
  readFileSync(new URL(importPath, stylesIndexUrl), "utf8"),
);
const stylesSource = `${stylesEntrySource}\n${stylesIndexSource}\n${stylesModuleSources.join("\n")}`;
const indexHtmlSource = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const i18nSource = readFileSync(new URL("./i18n.tsx", import.meta.url), "utf8");
const themeSource = readFileSync(new URL("./theme.ts", import.meta.url), "utf8");
const requiredFieldValidationSource = readFileSync(new URL("./forms/requiredFieldValidation.tsx", import.meta.url), "utf8");
const autoSaveSource = readFileSync(new URL("./forms/AutoSaveForm.tsx", import.meta.url), "utf8");
const autoSaveRulesSource = readFileSync(new URL("./forms/autoSave.ts", import.meta.url), "utf8");
const assistantPageSource = readFileSync(new URL("./features/assistant/AssistantPage.tsx", import.meta.url), "utf8");
const adminPageSource = readFileSync(new URL("./features/admin/AdminPanelPage.tsx", import.meta.url), "utf8");
const adminModuleSource = readFileSync(new URL("../../backend/src/modules/admin.ts", import.meta.url), "utf8");
const fmeaApiSource = readFileSync(new URL("../../backend/src/modules/assessments.ts", import.meta.url), "utf8");
const filesApiSource = readFileSync(new URL("../../backend/src/modules/files.ts", import.meta.url), "utf8");
const fmeaProcessSource = readFileSync(new URL("../../backend/src/fmea-process.ts", import.meta.url), "utf8");
const reportsSource = readFileSync(new URL("../../backend/src/modules/reports.ts", import.meta.url), "utf8");
const actionsSource = readFileSync(new URL("../../backend/src/modules/actions.ts", import.meta.url), "utf8");
const actionProgressSource = readFileSync(new URL("../../backend/src/action-progress.ts", import.meta.url), "utf8");
const fmeaReportHelpersSource = readFileSync(new URL("../../backend/src/fmea-report.ts", import.meta.url), "utf8");

describe("FMEA module boundaries", () => {
  it("keeps route exports stable while isolating process and report modules", () => {
    expect(assessmentShellSource).toContain('export { FmeaPage, FmeaReportPage } from "./fmea/FmeaFeature";');
    expect(assessmentShellSource).not.toContain("function FmeaProcessPage");
    expect(assessmentShellSource).not.toContain("function FmeaReportPage");
    expect(fmeaFeatureSource).toContain('from "./FmeaReportComponents"');
    expect(fmeaFeatureSource).toContain("export function FmeaPage");
    expect(fmeaFeatureSource).toContain("function FmeaProcessPage");
    expect(fmeaReportComponentsSource).toContain("export function FmeaRiskDistributionChart");
    expect(fmeaReportComponentsSource).toContain("export function FmeaScoreGuide");
  });
});

describe("RULA module boundaries", () => {
  it("keeps route exports stable while isolating the RULA feature module", () => {
    expect(assessmentShellSource).toContain('export { RulaPage, RulaReportPage } from "./rula/RulaFeature";');
    expect(assessmentShellSource).not.toContain("function RulaPage");
    expect(assessmentShellSource).not.toContain("function RulaReportPage");
    expect(rulaFeatureSource).toContain("export function RulaPage");
    expect(rulaFeatureSource).toContain("export function RulaReportPage");
    expect(rulaFeatureSource).toContain("function RulaPostureAnalysisStep");
    expect(rulaFeatureSource).toContain("function RulaReportDataTable");
  });
});

describe("RULA responsive posture data", () => {
  it("keeps side state and review provenance explicit while using shared phone cards", () => {
    expect(rulaFeatureSource).toContain("sideAnalyses");
    expect(rulaFeatureSource).toContain("confirmedByUser");
    expect(rulaFeatureSource).toContain("isRulaPostureResultReviewed");
    expect(rulaFeatureSource).toContain('data-label={t("assessment.detectedStatus")}');
    expect(rulaFeatureSource).toContain('data-label={t("assessment.rulaActionBodySide")}');
    expect(stylesSource).toContain('.responsive-table-container[data-responsive="cards"] > table.rula-analysis-table > tbody > tr > td:first-child');
    expect(stylesSource).toContain('.responsive-table-container[data-responsive="cards"] > table.rula-report-data-table > tbody > tr > td:nth-child(8)');
    expect(stylesSource).toContain('.responsive-table-container[data-responsive="cards"] > table.rula-correction-table > tbody > tr > td:nth-child(2)');
  });
});

describe("FMEA live preview", () => {
  it("uses the same shared rule as the API", () => {
    expect(calculateRpn(7, 4, 5)).toBe(140);
    expect(riskLevel(50)).toBe("VERY_LOW");
    expect(riskLevel(51)).toBe("LOW");
    expect(riskLevel(101)).toBe("MEDIUM");
    expect(riskLevel(201)).toBe("HIGH");
    expect(riskLevel(401)).toBe("CRITICAL");
    expect(assessmentPagesSource).toContain("function fmeaRiskValues");
    expect(assessmentPagesSource).toContain("const previewRiskLevel = preview.riskLevel");
    expect(assessmentPagesSource).toContain("riskLevel(rpn, thresholds)");
    expect(assessmentPagesSource).toContain("const fmeaRiskThresholds = DEFAULT_THRESHOLDS");
    expect(assessmentPagesSource).not.toContain("fmeaRiskThresholdsFromSettings");
    expect(fmeaApiSource).toContain("riskLevel(rpn, DEFAULT_THRESHOLDS)");
    expect(reportsSource).toContain("function fmeaReferenceRiskThresholds(): RiskThresholds");
    expect(reportsSource).toContain("return normaliseFmeaItems(data.items, DEFAULT_THRESHOLDS)");
    expect(assessmentPagesSource).toContain('<StatusBadge value={previewRiskLevel}/>');
    expect(assessmentPagesSource).toContain('<option value="VERY_LOW">{t("status.veryLow")}</option>');
    expect(uiSource).toContain('VERY_LOW: { key: "status.veryLow"');
  });
});

describe("organization file assessment references", () => {
  it("shows the assessment reference and resolved assessment title on each file card", () => {
    expect(filesPageSource).toContain("fileReferenceLabel");
    expect(filesPageSource).toContain('className="file-reference"');
    expect(filesPageSource).toContain('t("files.referenceLabel")');
    expect(filesApiSource).toContain("addAttachmentReferenceMetadata");
    expect(filesApiSource).toContain('type: "FMEA"');
    expect(filesApiSource).toContain('type: "RULA"');
    expect(stylesSource).toContain(".file-copy .file-reference");
    expect(i18nSource).toContain('"files.referenceFmea": "ارزیابی FMEA"');
  });
});

describe("registered assessment reports", () => {
  it("keeps finalized reports separate from general file management and opens the saved report", () => {
    expect(filesPageSource).toContain('useLoad<RegisteredReport[]>(canViewReports ? "/reports/registered" : null)');
    expect(filesPageSource).toContain('title={t("files.reportsSection")}');
    expect(filesPageSource).toContain('className="registered-report-card"');
    expect(filesPageSource).toContain('navigate(`/${report.type.toLowerCase()}/${encodeURIComponent(report.id)}/report`)');
    expect(reportsSource).toContain('app.get("/api/v1/reports/registered"');
    expect(reportsSource).toContain('status: "APPROVED"');
    expect(reportsSource).toContain('isRulaPostureAnalysisReviewed');
    expect(stylesSource).toContain(".registered-report-list");
    expect(stylesSource).toContain(".registered-report-card:hover");
    expect(i18nSource).toContain('"files.reportsSection": "گزارش‌های نهایی ارزیابی"');
    expect(i18nSource).toContain('"files.reportsSection": "Final assessment reports"');
  });
});

describe("authenticated header controls", () => {
  it("keeps sign-out in the sidebar while the topbar stays focused on utility controls", () => {
    expect(appLayoutSource).not.toContain("className={`online");
    expect(appLayoutSource).not.toContain("admin-mode-badge");
    expect(appLayoutSource).not.toContain("<StyledSelect");
    expect(appLayoutSource).not.toContain('className="ghost logout"');
    expect(appLayoutSource).toContain('className="side-logout"');
    expect(appLayoutSource).toContain("function NotificationBell()");
    expect(appLayoutSource).toContain('useLoad<HeaderNotification[]>("/notifications")');
    expect(appLayoutSource).toContain('data-testid="header-notifications"');
    expect(stylesSource).toContain(".header-notifications");
    expect(stylesSource).toContain(".notification-badge");
    expect(stylesSource).not.toContain(".header-actions .logout");
    expect(i18nSource).toContain('"shell.themeBlue": "تیره"');
    expect(i18nSource).toContain('"shell.themeWhite": "روشن"');
    expect(i18nSource).toContain('"shell.themeBlue": "Dark"');
    expect(i18nSource).toContain('"shell.themeWhite": "Light"');
  });
});

describe("touch and keyboard accessibility contract", () => {
  it("keeps shell navigation keyboard-reachable and provides a skip target", () => {
    expect(appLayoutSource).toContain('className="skip-link" href="#main-content"');
    expect(appLayoutSource).toContain('id="main-content" className="workspace" tabIndex={-1}');
    expect(appLayoutSource).toContain('document.documentElement.style.overflow = "hidden"');
    expect(appLayoutSource).toContain('type="button" className="sidebar-backdrop"');
    expect(i18nSource).toContain('"shell.skipToContent": "رفتن به محتوای اصلی"');
    expect(i18nSource).toContain('"shell.skipToContent": "Skip to main content"');
    expect(stylesSource).toContain(".skip-link:focus-visible");
    expect(stylesSource).toContain("#main-content");
  });

  it("gives icon actions contextual names and exposes password visibility state", () => {
    expect(assistantPageSource).toContain('aria-label={t("assistant.newConversation")}');
    expect(generalPagesSource).toContain('aria-label={`${t("notifications.markRead")}: ${item.title}`}');
    expect(generalPagesSource).toContain('aria-label={`${t("common.download")}: ${file.originalName}`}');
    expect(generalPagesSource).toContain('aria-label={`${t("common.delete")}: ${file.originalName}`}');
    expect(accountPagesSource).toContain('aria-pressed={showPassword}');
    expect(registrationPagesSource).toContain('aria-pressed={showPassword}');
    expect(registrationPagesSource).toContain('aria-pressed={showConfirmPassword}');
  });

  it("uses semantic controls for assessment cards and image previews", () => {
    expect(assessmentPagesSource).toContain('className="assessment-card-main"');
    expect(assessmentPagesSource).toContain('aria-label={`${t("assessment.operations")}: ${item.title}`}');
    expect(assessmentPagesSource).not.toContain('role="link" tabIndex={0}');
    expect(assessmentPagesSource).not.toContain('role="button" tabIndex={0}');
    expect(assessmentPagesSource).toContain('className="fmea-process-image-preview-button"');
    expect(stylesSource).toContain(".assessment-card-main:focus-visible");
    expect(stylesSource).toContain(".fmea-selected-items button:focus-visible");
    expect(stylesSource).toContain("min-block-size: var(--control-height-compact)");
  });

  it("keeps non-text report status available to assistive technology", () => {
    expect(assessmentPagesSource).toContain('role="progressbar" aria-label={t("assessment.rulaFactorContribution"');
    expect(assessmentPagesSource).toContain('role="img" aria-label={t("report.riskDistribution")}');
    expect(stylesSource).toContain("@media (prefers-reduced-motion: reduce)");
  });
});

describe("account shortcut", () => {
  it("makes the signed-in user card open account settings", () => {
    expect(appLayoutSource).toContain('<Link className="side-user" to="/profile"');
    expect(appLayoutSource).toContain('aria-label={t("nav.profile")}');
    expect(stylesSource).toContain(".side-user:hover, .side-user:focus-visible");
    expect(i18nSource).toContain('"nav.profile": "تنظیمات حساب"');
    expect(i18nSource).toContain('"nav.profile": "Account settings"');
  });
});

describe("planned safety modules", () => {
  it("exposes checklist and incident routes with an explicit coming-soon state", () => {
    expect(appLayoutSource).toContain('path: "/checklists", labelKey: "nav.checklists"');
    expect(appLayoutSource).toContain('path: "/incidents", labelKey: "nav.incidents"');
    expect(appLayoutSource).toContain('safety: "group.safety"');
    expect(appSource).toContain('path="checklists" element={<ComingSoonPage');
    expect(appSource).toContain('path="incidents" element={<ComingSoonPage');
    expect(generalPagesSource).toContain('t("comingSoon.status")');
    expect(generalPagesSource).toContain('t("comingSoon.message")');
    expect(i18nSource).toContain('"nav.checklists": "چک‌لیست و ممیزها"');
    expect(i18nSource).toContain('"nav.incidents": "ثبت و مدیریت حوادث"');
    expect(i18nSource).toContain('"comingSoon.message": "این بخش در حال توسعه است و پس از آماده‌سازی در دسترس شما قرار می‌گیرد."');
  });
});

describe("styled select controls", () => {
  it("renders an accessible, theme-aware menu instead of the browser popup", () => {
    expect(uiSource).toContain("export function StyledSelect");
    expect(uiSource).toContain('role="listbox"');
    expect(uiSource).toContain('role="option"');
    expect(uiSource).toContain('onKeyDown={handleTriggerKeyDown}');
    expect(stylesSource).toContain(".styled-select-menu {");
    expect(stylesSource).toContain(".styled-select-option:hover:not(:disabled)");
    expect(stylesSource).toContain('.app[data-theme="blue"] .styled-select-menu');
    expect(stylesSource).toContain('.app[data-theme="white"] .styled-select-menu');
  });
});

describe("viewport-safe overlay architecture", () => {
  it("portals floating controls, positions them within the viewport and removes overflow workarounds", () => {
    expect(overlaySource).toContain("createPortal");
    expect(overlaySource).toContain('OVERLAY_ROOT_ID = "nivasafe-overlay-root"');
    expect(overlaySource).toContain("getBoundingClientRect");
    expect(overlaySource).toContain('window.addEventListener("scroll", update, true)');
    expect(uiSource).toContain("OverlayPortal");
    expect(uiSource).toContain("useFloatingPosition");
    expect(assessmentPagesSource).toContain("function OverlayDialogFrame");
    expect(assessmentPagesSource).toContain("function ReportInlineDetails");
    expect(assessmentPagesSource).toContain("<OverlayDialogFrame");
    expect(assessmentPagesSource).toContain("<ReportInlineDetails");
    expect(overlaySource).toContain("focusableElements");
    expect(overlaySource).toContain("hasOpenFloatingOverlay");
    expect(overlaySource).toContain("focusScopeElements");
    expect(overlaySource).toContain("isInFocusScope");
    expect(overlaySource).toContain("document.documentElement.style.overflow = \"hidden\"");
    expect(stylesSource).toContain("#nivasafe-overlay-root");
    expect(stylesSource).toContain(".report-inline-details-popover { position: fixed");
    expect(stylesSource).not.toContain(".report-inline-details > summary");
    expect(stylesSource).not.toContain(".surface:has(.styled-select.is-open)");
    expect(stylesSource).not.toContain(".surface:has(.localized-date-input.is-open)");
    expect(stylesSource).not.toContain(".table-wrap:has(.styled-select.is-open)");
  });

  it("keeps dialogs focus-trapped and body-scroll-safe", () => {
    expect(overlaySource).toContain("useBodyScrollLock(open)");
    expect(overlaySource).toContain('event.key !== "Tab"');
    expect(overlaySource).toContain('document.addEventListener("keydown", onKeyDown, true)');
    expect(uiSource).toContain('aria-modal="true"');
    expect(uiSource).toContain('describedBy="dialog-message"');
    expect(overlaySource).toContain("document.body.style.paddingInlineEnd");
  });

  it("keeps file previews in-app and releases object URLs", () => {
    expect(filesPageSource).toContain("<Modal open={Boolean(filePreview)}");
    expect(filesPageSource).toContain('filePreview.mode === "image"');
    expect(filesPageSource).toContain('filePreview.mode === "video"');
    expect(filesPageSource).toContain('filePreview.mode === "pdf"');
    expect(filesPageSource).toContain('<object data={filePreview.url} type="application/pdf"');
    expect(filesPageSource).toContain("URL.revokeObjectURL");
    expect(filesPageSource).not.toContain("window.open");
    expect(stylesSource).toContain(".file-preview-dialog");
    expect(stylesSource).toContain(".file-preview-content object");
    expect(stylesSource).toContain("max-height: calc(100dvh");
  });
});

describe("shared UI design system", () => {
  it("exposes the reusable interaction, form, feedback and modal primitives", () => {
    expect(uiSource).toContain("export function Button");
    expect(uiSource).toContain("IconButton = forwardRef");
    expect(uiSource).toContain("export function FormField");
    expect(uiSource).toContain("export function Alert");
    expect(uiSource).toContain("export function LoadingState");
    expect(uiSource).toContain("export function Badge");
    expect(uiSource).toContain("export function Modal");
    expect(uiSource).toContain("export function PageActions");
    expect(uiSource).toContain("export function Surface");
    expect(uiSource).toContain('aria-busy={loading || undefined}');
    expect(uiSource).toContain('aria-label={label}');
    expect(uiSource).toContain('disabled={disabled || loading}');
  });

  it("keeps the sizing, focus and layering contract in one stylesheet", () => {
    expect(stylesSource).toContain("--control-height-compact: 44px");
    expect(stylesSource).toContain("--touch-target: 44px");
    expect(stylesSource).toContain("--focus-ring:");
    expect(stylesSource).toContain("--z-dialog: 120");
    expect(stylesSource).toContain(".ui-button-primary, .primary");
    expect(stylesSource).toContain(".ui-icon-button, .icon-button");
    expect(stylesSource).toContain(".ui-alert > span");
    expect(stylesSource).toContain("@media (prefers-reduced-motion: reduce)");
    expect(filesPageSource).toContain("Button");
    expect(filesPageSource).toContain("IconButton");
    expect(generalPagesSource).toContain("LoadingState");
    expect(adminPageSource).toContain("UiLoadingState");
    expect(stylesSource).toContain('.app[data-theme="blue"] .theme-option');
    expect(stylesSource).toContain('.app[data-theme="white"] .theme-option');
  });
});

describe("form interaction ergonomics", () => {
  it("moves through the next available field with Enter and scrolls newly opened inline panels into view", () => {
    expect(appSource).toContain("<FormInteractionEnhancer/>");
    expect(uiSource).toContain("export function FormInteractionEnhancer");
    expect(uiSource).toContain('event.key !== "Enter"');
    expect(uiSource).toContain("nextField.focus({ preventScroll: true })");
    expect(uiSource).toContain('document.addEventListener("click", scrollToOpenedPanel)');
    expect(uiSource).toContain("[data-scroll-target]");
    expect(generalPagesSource).toContain('id="dashboard-layout-controls"');
    expect(generalPagesSource).toContain('data-scroll-target="#dashboard-layout-controls"');
    expect(accountPagesSource).toContain('data-scroll-target={`#member-edit-${member.id}`}');
    expect(adminPageSource).toContain('data-scroll-target={`#admin-user-edit-${user.id}`}');
    expect(stylesSource).toContain("scroll-margin-top: 1.25rem");
    expect(stylesSource).toContain(".admin-edit-row { scroll-margin-top:");
  });
});

describe("localized corrective-action dates", () => {
  it("uses a Persian calendar picker for Persian UI and an ISO value for the API", () => {
    expect(uiSource).toContain("export function LocalizedDateInput");
    expect(uiSource).toContain("fa-IR-u-ca-persian");
    expect(uiSource).toContain('type="hidden" name={name}');
    expect(generalPagesSource).toContain('<LocalizedDateInput name="dueDate"');
    expect(assessmentPagesSource).toContain('<LocalizedDateInput name="dueDate"');
    expect(stylesSource).toContain(".localized-date-popover {");
    expect(i18nSource).toContain('"actions.chooseDate"');
  });
});

describe("corrective-action progress", () => {
  it("derives progress from the selected workflow status on the API", () => {
    expect(actionsSource).toContain("progressForActionStatus(body.status)");
    expect(actionProgressSource).toContain("ActionStatus.IN_PROGRESS]: 50");
    expect(actionProgressSource).toContain("ActionStatus.WAITING_FOR_REVIEW]: 75");
    expect(actionProgressSource).toContain("ActionStatus.COMPLETED]: 100");
  });
});

describe("corrective-action body-side scope", () => {
  it("requires and displays the selected anatomical scope for RULA-linked actions", () => {
    expect(actionsSource).toContain("bodySide: actionBodySideSchema.nullable().optional()");
    expect(actionsSource).toContain("RULA_ACTION_BODY_SIDE_REQUIRED");
    expect(actionsSource).toContain("RULA_ACTION_BODY_SIDE_MISMATCH");
    expect(generalPagesSource).toContain('name="bodySide"');
    expect(generalPagesSource).toContain('name="rulaId"');
    expect(generalPagesSource).toContain('t("actions.bodySideColumn")');
    expect(assessmentPagesSource).toContain('const actionSide = action.bodySide ?? payload.bodySide');
    expect(assessmentPagesSource).toContain('bodySide: actionSide');
    expect(assessmentPagesSource).toContain("buildLocalRulaSuggestionsForAssessment");
    expect(assessmentPagesSource).toContain("const RULA_CORRECTIVE_SUGGESTION_MAX = 6;");
    expect(assessmentPagesSource).toContain("suggestions.slice(0, RULA_CORRECTIVE_SUGGESTION_MAX)");
    expect(assessmentPagesSource).toContain('t("assessment.rulaActionBodySide")');
    expect(reportsSource).toContain('localizedRulaBodySide(action.bodySide ?? undefined, locale)');
  });
});

describe("corrective-action form layout", () => {
  it("keeps the new-action fields in deliberate responsive rows with a dedicated submit control", () => {
    expect(generalPagesSource).toContain('className="action-field action-project"');
    expect(generalPagesSource).toContain('className="action-field action-rula"');
    expect(generalPagesSource).toContain('className="action-field action-body-side"');
    expect(generalPagesSource).toContain('className="action-field action-description"');
    expect(generalPagesSource).toContain('className="primary action-submit" type="submit"');
    expect(stylesSource).toContain(".action-form { grid-template-columns: repeat(12, minmax(0, 1fr)); align-items: start; }");
    expect(stylesSource).toContain(".action-form .action-description { grid-column: span 8; }");
    expect(stylesSource).toContain(".action-form .action-submit { align-self: end; min-height: var(--control-height); width: 100%; white-space: nowrap; }");
    expect(stylesSource).toContain(".action-form .action-submit { grid-column: 1 / -1; justify-self: start; width: min(100%, 15rem); }");
    expect(stylesSource).toContain(".action-form .action-submit { width: 100%; }");
  });
});

describe("FMEA process information", () => {
  it("exposes a fast database-backed searchable job bank", () => {
    expect(assessmentPagesSource).toContain("function JobCatalogSearch");
    expect(assessmentPagesSource).toContain('role="combobox"');
    expect(assessmentPagesSource).toContain('name="jobCatalogId"');
    expect(assessmentPagesSource).toContain('name="existingControls"');
    expect(assessmentPagesSource).toContain('requestProcessAssistant()');
    expect(assessmentPagesSource).not.toContain('void requestProcessAssistant(job)');
    expect(assessmentPagesSource).toContain("function filterJobCatalog");
    expect(assessmentPagesSource).toContain("FMEA_JOB_CATALOG_LIMIT");
    expect(assessmentPagesSource).toContain("setJobCatalog(result.data)");
    expect(assessmentPagesSource).not.toContain('mode: "job-titles"');
    expect(assessmentPagesSource).not.toContain("function requestJobTitleSuggestions");
    expect(assessmentPagesSource).not.toContain("aiJobCatalogSuggestions={aiJobCatalogSuggestions}");
    expect(stylesSource).not.toContain(".fmea-job-option.ai {");
    expect(assessmentPagesSource).not.toContain('fmea-assistant-toolbar');
    expect(assessmentPagesSource).toContain('className={`fmea-assistant-toggle');
    expect(assessmentPagesSource).toContain('aria-pressed={fmeaAssistantEnabled}');
    expect(assessmentPagesSource).toContain('setFmeaAssistantEnabled((enabled) => !enabled)');
    expect(assessmentPagesSource).toContain('const FMEA_ASSISTANT_STORAGE_KEY = "nivasafe-fmea-assistant-enabled-v2";');
    expect(assessmentPagesSource).toContain('localStorage.getItem(FMEA_ASSISTANT_STORAGE_KEY) === "true"');
    expect(assessmentPagesSource).toContain('catch { return false; }');
    expect(stylesSource).toContain('.fmea-assistant-toggle:focus-visible');
    expect(assessmentPagesSource).toContain('mode: "autofill"');
    expect(assessmentPagesSource).toContain('projectId, jobCatalogId: selectedJobId || null');
    expect(assessmentPagesSource).toContain('{!editingExistingAssessment && fmeaAssistantEnabled && <div className="fmea-autofill-banner enabled"');
    expect(assessmentPagesSource).not.toContain('fmeaAssistantDisabledHint');
    expect(stylesSource).not.toContain('.fmea-autofill-banner.disabled');
    expect(assessmentPagesSource).toContain('autofilledFields.current.delete("department")');
    expect(assessmentPagesSource).toContain('mode: "description"');
    expect(assessmentPagesSource).toContain('function requestDescriptionSuggestion');
    expect(assessmentPagesSource).toContain('assessment.addNewJob');
    expect(assessmentPagesSource).toContain('name="customJobSelected"');
    expect(assessmentPagesSource).toContain('function applyCustomJobTitle(title: string)');
    expect(assessmentPagesSource).toContain('setCustomJobSelected(true);');
    expect(assessmentPagesSource).toContain('applyCustomJobTitle(title);');
    expect(assessmentPagesSource).toContain('onUseCustom: (title: string) => void');
    expect(assessmentPagesSource).toContain('onUseCustom(value.trim())');
    expect(assessmentPagesSource).toContain('onClick={() => onUseCustom(value.trim())}');
    expect(assessmentPagesSource).toContain('disabled={loading}');
    expect(assessmentPagesSource).toContain('setJobCatalogSaveError(true);');
    expect(assessmentPagesSource).toContain('t("assessment.jobCatalogSaveRequired")');
    expect(assessmentPagesSource).toContain('if (!open) { onOpenChange(true); setHighlighted(0); return; }');
   expect(assessmentPagesSource).toContain('assessment.activityDescriptionSentenceLimit');
   expect(assessmentPagesSource).toContain('t("assessment.addNewItem")');
    expect(assessmentPagesSource).toContain("function FmeaAssessmentDetailsBar");
    expect(assessmentPagesSource).toContain('className="fmea-assessment-details-bar"');
    expect(assessmentPagesSource).toContain('<FmeaAssessmentDetailsBar jobTitle={jobQuery}');
    expect(stylesSource).toContain(".fmea-assessment-details-bar {");
    expect(i18nSource).toContain('"assessment.assessmentDetails": "جزئیات ارزیابی"');
    expect(assessmentPagesSource).toContain("const FMEA_PROCESS_SUGGESTION_MAX = 10");
    expect(assessmentPagesSource).toContain("const FMEA_PROCESS_BOARD_SUGGESTION_MAX = 5");
    expect(assessmentPagesSource).toContain("suggestions: normaliseProcessBoardSuggestions(value.suggestions)");
    expect(assessmentPagesSource).toContain("const FMEA_PROCESS_SELECTION_MAX = 5");
    expect(assessmentPagesSource).toContain("const selectionLocked = !isSelected && selected.length >= FMEA_PROCESS_SELECTION_MAX");
    expect(assessmentPagesSource).toContain('t("assessment.suggestionSelectionLimit"');
    expect(i18nSource).toContain('"assessment.suggestionSelectionLimit": "{{selected}} از {{max}} انتخاب شده"');
    expect(i18nSource).toContain('"assessment.suggestionSelectionLimit": "{{selected}} of {{max}} selected"');
    expect(assessmentPagesSource).toContain('t("assessment.suggestionSelectionReached")');
    expect(assessmentPagesSource).toContain("disabled={selectionLocked}");
    expect(assessmentPagesSource).toContain("updated[category] = incoming.slice(0, FMEA_PROCESS_SELECTION_MAX)");
    expect(assessmentPagesSource).toContain("cancelAssistantRequests");
    expect(assessmentPagesSource).toContain('className="fmea-suggestion-board-actions"');
    expect(assessmentPagesSource).toContain('t("assessment.getProcessAiSuggestions")');
    expect(assessmentPagesSource).toContain('t("assessment.getNewProcessAiSuggestions")');
    expect(assessmentPagesSource).toContain("setProcessAiSuggestionsRequested(true)");
    expect(assessmentPagesSource).toContain("suggestions[category].slice(0, FMEA_PROCESS_BOARD_SUGGESTION_MAX)");
    expect(stylesSource).toContain(".fmea-job-options {");
    expect(stylesSource).toContain(".fmea-job-search { min-width: 0; display: flex;");
    expect(stylesSource).toContain(".fmea-suggestion-grid { display: grid;");
    expect(stylesSource).toContain(".fmea-suggestion-board-head > .fmea-suggestion-board-actions");
    expect(assessmentPagesSource).toContain('className="fmea-description-ai"');
    expect(assessmentPagesSource).toContain('setActivityDescription(suggestion)');
    expect(assessmentPagesSource).toContain('const [descriptionSuggestion, setDescriptionSuggestion] = useState("")');
    expect(assessmentPagesSource).toContain('descriptionSuggestion &&');
    expect(assessmentPagesSource).toContain('className="fmea-description-suggestion"');
    expect(assessmentPagesSource).toContain('onClick={acceptDescriptionSuggestion}');
    expect(assessmentPagesSource).toContain('onClick={dismissDescriptionSuggestion}');
    expect(assessmentPagesSource).not.toContain('fmea-job-ai-actions');
    expect(stylesSource).toContain(".fmea-description-ai {");
    expect(stylesSource).toContain(".fmea-description-suggestion {");
    expect(assessmentPagesSource).toContain('name="fmeaProcessImage"');
    expect(assessmentPagesSource).toContain("const FMEA_PROCESS_IMAGE_MAX_COUNT = 3");
    expect(assessmentPagesSource).toContain('fmeaProcessImageCount", { count: processImages.length.toLocaleString(numberLocale), max: FMEA_PROCESS_IMAGE_MAX_COUNT.toLocaleString(numberLocale) }');
    expect(assessmentPagesSource).toContain('multiple accept="image/jpeg,image/png,image/webp"');
    expect(assessmentPagesSource).toContain("handleFmeaProcessImageChange");
    expect(assessmentPagesSource).toContain('"/fmea/process-image-analysis"');
    expect(assessmentPagesSource).toContain('entityType", "FmeaAssessment"');
    expect(assessmentPagesSource).toContain('void requestFmeaProcessImageAnalysis(processImages)');
    expect(assessmentPagesSource).toContain('uploadFmeaProcessImages');
    expect(assessmentPagesSource).toContain("new Map(analyses.flatMap((analysis) => analysis.riskRows)");
    expect(assessmentPagesSource).toContain("values()).slice(0, FMEA_AI_SUGGESTION_TOTAL_MAX)");
    expect(assessmentPagesSource).toContain("fmea-image-annotation-layer");
    expect(assessmentPagesSource).toContain("fmea-image-annotation-label");
    expect(assessmentPagesSource).toContain('className="fmea-process-image-preview-button"');
    expect(assessmentPagesSource).toContain('AssessmentImageLightbox');
    expect(assessmentPagesSource).toContain('assessment.expandImage');
    expect(i18nSource).toContain('"assessment.fmeaProcessImageCount": "{{count}} از {{max}} تصویر انتخاب شده"');
    expect(i18nSource).toContain('"assessment.fmeaProcessImageCount": "{{count}} of {{max}} images selected"');
    expect(stylesSource).toContain(".fmea-image-annotation-label {");
    expect(stylesSource).toContain(".assessment-image-lightbox-backdrop {");
    expect(assessmentPagesSource).not.toContain('t("assessment.fmeaProcessImageAnalyze")');
    expect(assessmentPagesSource).not.toContain('t("assessment.fmeaProcessImageHint")');
    expect(assessmentPagesSource).not.toContain('className="fmea-process-image-analysis"');
    expect(assessmentPagesSource).toContain('const FMEA_CREATE_PROJECT_OPTION = "__create_project__"');
    expect(assessmentPagesSource).toContain('const value = event.target.value; if (value === FMEA_CREATE_PROJECT_OPTION) { openProjectCreator(); return; }');
    expect(assessmentPagesSource).toContain('navigate("/projects?from=fmea")');
    expect(assessmentPagesSource).toContain('requestedProjectId = searchParams.get("project")');
    expect(assessmentPagesSource).toContain('＋ {t("projects.newProject")}');
    expect(assessmentPagesSource).toContain('const RULA_CREATE_PROJECT_OPTION = "__create_rula_project__"');
    expect(assessmentPagesSource).toContain('if (value === RULA_CREATE_PROJECT_OPTION) { openRulaProjectCreator(); return; }');
    expect(assessmentPagesSource).toContain('navigate("/projects?from=rula")');
    expect(assessmentPagesSource).toContain('const requestedProjectId = searchParams.get("project")?.trim() ?? ""');
    expect(generalPagesSource).toContain('navigate(`/rula?project=${encodeURIComponent(created.data.id)}`, { replace: true });');
    expect(stylesSource).toContain(".fmea-process-image-dropzone {");
    expect(stylesSource).toContain(".fmea-process-image-gallery {");
    expect(stylesSource).toContain("grid-template-columns: repeat(3, minmax(0, 1fr));");
    expect(stylesSource).toContain(".fmea-process-image-head .fmea-field-label");
    expect(stylesSource).toContain("grid-column: 2; grid-row: 2;");
    expect(stylesSource).toContain("min-height: 47px; display: flex; align-items: center;");
    expect(stylesSource).toContain(".fmea-process-image-field { grid-column: auto; grid-row: auto; }");
  });

  it("keeps the server-side catalog scope and bounded AI contract", () => {
    expect(fmeaApiSource).toContain('app.get("/api/v1/fmea/job-catalog"');
    expect(fmeaApiSource).toContain('app.post("/api/v1/fmea/job-catalog"');
    expect(fmeaApiSource).toContain('const jobCatalogCreateBody');
    expect(fmeaApiSource).toContain('app.post("/api/v1/fmea/process-suggestions"');
    expect(fmeaApiSource).toContain('app.post("/api/v1/fmea/process-image-analysis"');
    expect(fmeaApiSource).toContain('sourceType: "FMEA_IMAGE_REVIEW"');
    expect(filesApiSource).toContain('entityType === "FmeaAssessment"');
    expect(filesApiSource).toContain("FMEA_PROCESS_IMAGE_MAX_COUNT = 3");
    expect(filesApiSource).toContain('FMEA_ATTACHMENT_IMAGE_COUNT_LIMIT');
    expect(fmeaApiSource).toContain('mode: z.enum(["suggestions", "description", "risk-row", "risk-rows", "job-titles", "autofill"])');
    expect(fmeaApiSource).toContain('FMEA_AUTOFILL_PROJECT_REQUIRED');
    expect(fmeaApiSource).toContain('buildFmeaProcessAutofillPrompt');
    expect(fmeaApiSource).toContain('parseFmeaProcessAutofill');
    expect(fmeaApiSource).toContain("buildJobTitleSuggestionsPrompt");
    expect(fmeaApiSource).toContain("persistAiJobTitles");
    expect(fmeaApiSource).toContain("aiJobCatalogSuggestions");
    expect(fmeaApiSource).toContain('keywords: [title, "AI-generated"]');
    expect(fmeaApiSource).toContain("buildFmeaRiskSuggestionsPrompt");
    expect(fmeaApiSource).toContain("ensureJobCatalog");
    expect(fmeaApiSource).toContain("assertFmeaProcessItemSelectionLimit");
    expect(fmeaApiSource).toContain("activityDescription");
    expect(fmeaApiSource).toContain("const requiredRiskText = z.string().trim().min(1).max(1_200)");
    expect(fmeaProcessSource).toContain("FMEA_PROCESS_DESCRIPTION_MAX");
    expect(fmeaProcessSource).toContain("FMEA_PROCESS_SUGGESTION_MAX");
    expect(fmeaProcessSource).toContain("FMEA_PROCESS_SELECTION_MAX");
    expect(fmeaProcessSource).toContain("The user will confirm every item");
    expect(fmeaProcessSource).toContain("NIVASAFE_FMEA_RISK_ROW_SUGGESTIONS");
    expect(fmeaProcessSource).toContain("parseFmeaRiskSuggestions");
    expect(fmeaProcessSource).toContain('"preventiveControls":[]');
    expect(fmeaProcessSource).toContain('"detectionControls":[]');
    expect(fmeaProcessSource).toContain("NIVASAFE_FMEA_IMAGE_REVIEW");
    expect(fmeaProcessSource).toContain("parseFmeaImageAnalysis");
    expect(fmeaProcessSource).toContain("NIVASAFE_FMEA_PROCESS_AUTOFILL");
    expect(fmeaProcessSource).toContain("parseFmeaProcessAutofill");
  });
});

describe("FMEA risk register", () => {
  it("renders the complete risk matrix with search, filtering, sorting, details, editing, and confirmed deletion", () => {
    expect(assessmentPagesSource).toContain('className="assessment-report-table fmea-risk-table"');
    expect(assessmentPagesSource).toContain('function assessmentProcessName');
    expect(assessmentPagesSource).toContain('assessmentProcessName(selectedAssessment, locale)');
    expect(assessmentPagesSource).toContain('t("assessment.processActivity")');
    expect(assessmentPagesSource).toContain('t("assessment.cause")');
    expect(assessmentPagesSource).toContain('t("assessment.existingControls")');
    expect(assessmentPagesSource).toContain('t("assessment.recommendation")');
    expect(assessmentPagesSource).toContain('setRiskSearch');
    expect(assessmentPagesSource).toContain('setRiskFilter');
    expect(assessmentPagesSource).toContain('setRiskSort');
    expect(assessmentPagesSource).toContain('function FmeaItemEditor');
    expect(assessmentPagesSource).toContain('function deleteItem');
    expect(assessmentPagesSource).toContain('t("assessment.scoreGuide")');
    expect(assessmentPagesSource).toContain('function FmeaScoreField');
    expect(assessmentPagesSource).toContain('paginatedRiskRows');
    expect(assessmentPagesSource).toContain('riskPageCount');
    expect(assessmentPagesSource).toContain('function FmeaRiskAiAssist');
    expect(assessmentPagesSource).toContain('mode: "risk-row"');
    expect(assessmentPagesSource).toContain('onAccept={applyRiskSuggestionToForm}');
    expect(assessmentPagesSource).toContain('onAutoAccept={(field, value) => applyRiskSuggestionToForm(field, value, true)}');
    expect(assessmentPagesSource).toContain('autoRequestKey={fmeaAssistantEnabled ? [locale, selectedAssessment.id');
    expect(assessmentPagesSource).toContain('preventiveControls: value("preventiveControls")');
    expect(assessmentPagesSource).toContain('autoEnabled={fmeaAssistantEnabled}');
    expect(assessmentPagesSource).toContain('const FMEA_AI_SUGGESTION_TOTAL_MAX = 15');
    expect(assessmentPagesSource).toContain('const FMEA_PROCESS_AI_SUGGESTION_TOTAL_MAX = 15');
    expect(stylesSource).toContain(".risk-table-toolbar {");
    expect(stylesSource).toContain(".risk-score-guide {");
    expect(stylesSource).toContain(".fmea-risk-table {");
    expect(stylesSource).toContain(".risk-table-pagination {");
    expect(stylesSource).toContain(".fmea-risk-ai-assist {");
    expect(stylesSource).toContain(".risk-table-wrap .fmea-risk-table");
    expect(stylesSource).toContain("border-inline-end: 1px solid #d8e5ed");
    expect(stylesSource).toContain(".rula-report-data-table :is(th, td):nth-child(1)");
    expect(stylesSource).toContain(".rula-analysis-table :is(th, td):nth-child(1)");
  });

  it("provides complete FMEA exports with real Word and Excel files", () => {
    expect(assessmentPagesSource).toContain('downloadFmeaReport("docx")');
    expect(assessmentPagesSource).toContain(".docx");
    expect(reportsSource).toContain('z.enum(["pdf", "xlsx", "doc", "docx"])');
    expect(reportsSource).toContain("buildFmeaWordDocument");
    expect(reportsSource).toContain("buildFmeaWorkbook");
    expect(reportsSource).toContain("buildFmeaPdfLines");
    expect(reportsSource).toContain("FULL FMEA DETAILS");
    expect(reportsSource).toContain('"Current controls"');
    expect(reportsSource).toContain('"Recommended action"');
    expect(reportsSource).toContain('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    expect(assessmentPagesSource).toContain("URL.revokeObjectURL(url)");
    expect(assessmentPagesSource).toContain("window.setTimeout");
  });

  it("provides a dedicated results report with persisted corrective-action links", () => {
    expect(appSource).toContain('<Route path="fmea/:id/report" element={<FmeaReportPage />} />');
    expect(assessmentPagesSource).toContain("FmeaReportRiskTable");
    expect(assessmentPagesSource).toContain("function FmeaReportTableContext");
    expect(assessmentPagesSource).toContain('className="fmea-report-table-context"');
    expect(assessmentPagesSource).toContain("evaluationDate={report.assessment.approvedAt ?? report.assessment.updatedAt}");
    expect(assessmentPagesSource).toContain("assessment-report-table fmea-report-data-table");
    expect(assessmentPagesSource).toContain('t("assessment.processActivity")');
    expect(assessmentPagesSource).toContain('t("assessment.operations")');
    expect(assessmentPagesSource).toContain('t("report.fullDetails")');
    expect(assessmentPagesSource).toContain('t("report.addManualAction")');
    expect(assessmentPagesSource).toContain("const FMEA_REPORT_VISIBLE_ITEM_COUNT = 5");
    expect(assessmentPagesSource).toContain("const FMEA_REPORT_AI_ACTION_MAX = 8");
    expect(assessmentPagesSource).toContain('t("report.getAiActionSuggestion")');
    expect(assessmentPagesSource).toContain('t("report.showMoreFailureModes", { count: hiddenTopFailureModeCount })');
    expect(assessmentPagesSource).toContain('t("report.showMoreActions", { count: hiddenSuggestedActionCount })');
    expect(stylesSource).toContain(".report-list-toggle {");
    expect(assessmentPagesSource).toContain("function openManualActionForm()");
    expect(assessmentPagesSource).toContain("showActionRegister");
    expect(assessmentPagesSource).toContain('aria-controls="fmea-manual-action-form"');
    expect(assessmentPagesSource).toContain('aria-controls="fmea-action-register-content"');
    expect(assessmentPagesSource).toContain("setActionFormScrollRequest");
    expect(assessmentPagesSource).toContain("scrollIntoView({ behavior: window.matchMedia");
    expect(assessmentPagesSource).toContain('className="report-action-form-anchor"');
    expect(stylesSource).toContain(".report-action-form-anchor { scroll-margin-top:");
    expect(stylesSource).toContain(".report-action-form-card.is-collapsed .surface-body");
    expect(stylesSource).toContain(".report-action-register-card.is-collapsed .surface-body");
    expect(stylesSource).toContain(".fmea-report-table-context {");
    expect(stylesSource).toContain("inset-block-start: 50%;");
    expect(stylesSource).toContain(".fmea-report-table-toolbar .risk-table-search input {");
    expect(stylesSource).toContain(".fmea-report-table-toolbar .risk-table-search:focus-within input {");
    const interactiveReportTableSource = fmeaFeatureSource.slice(fmeaFeatureSource.indexOf("function FmeaInteractiveReportRiskTable"), fmeaFeatureSource.indexOf("function FmeaReportItemDetailsDialog"));
    expect(interactiveReportTableSource).not.toContain('t("assessment.processActivity")}</th>');
    expect(assessmentPagesSource).toContain('onClick={() => onView(item)}');
    expect(assessmentPagesSource).toContain('onClick={() => onEdit(item)}');
    expect(assessmentPagesSource).toContain('function FmeaReportItemDetailsDialog');
    expect(assessmentPagesSource).not.toContain('<FmeaReportDetailSuggestionsPanel');
    expect(assessmentPagesSource).toContain("report/detail-suggestions");
    expect(assessmentPagesSource).toContain("report/action-suggestions");
    expect(reportsSource).toContain("FMEA_REPORT_ACTION_SUGGESTIONS");
    expect(reportsSource).toContain("RULA_REPORT_ACTION_SUGGESTIONS");
    expect(assessmentPagesSource).toContain('const autoCreate = report.items.length === 0 && !report.assessment.fmeaDetailSeeded && canEditActions;');
    expect(assessmentPagesSource).toContain('result.data.createdCount');
    expect(assessmentPagesSource).toContain('t("report.aiDetailsAutoAdded", { count: result.data.createdCount })');
    expect(assessmentPagesSource).toContain('className="fmea-report-ai-seed-status"');
    expect(assessmentPagesSource).toContain("aiDetailRequestKeyRef");
    expect(assessmentPagesSource).not.toContain('t("report.generateAiDetails")');
    expect(stylesSource).toContain(".fmea-report-dialog-backdrop {");
    expect(stylesSource).toContain(".fmea-report-ai-seed-status {");
    expect(stylesSource).toContain(".fmea-report-data-table td:last-child .report-table-actions");
    expect(stylesSource).toContain(".surface-actions > .primary");
    expect(stylesSource).toContain("white-space: nowrap");
    expect(reportsSource).toContain('app.get("/api/v1/fmea/:id/report"');
    expect(reportsSource).toContain('app.post("/api/v1/fmea/:id/report/save"');
    expect(reportsSource).toContain('app.post("/api/v1/fmea/:id/report/detail-suggestions"');
    expect(reportsSource).toContain("excludeTitles: z.array");
    expect(reportsSource).toContain('autoCreate: z.boolean().default(false)');
    expect(reportsSource).toContain("buildFmeaReportDetailSeedRows");
    expect(reportsSource).toContain('FMEA_REPORT_DETAIL_AUTOCREATE');
    expect(reportsSource).toContain("buildFmeaReportDetailSuggestionsPrompt");
    expect(reportsSource).toContain('sourceType: "FMEA_REPORT_DETAILS"');
    expect(reportsSource).toContain("evaluationTeam");
    expect(reportsSource).toContain("correctiveActions");
    expect(actionsSource).toContain("FMEA_ITEM_ASSESSMENT_MISMATCH");
    expect(assessmentPagesSource).toContain('name="fmeaItemId"');
    expect(assessmentPagesSource).toContain("function FmeaReportStepper({ onStepClick }");
    expect(assessmentPagesSource).toContain('className="fmea-report-dashboard-grid"');
    expect(assessmentPagesSource).not.toContain("fmeaReportDonutGradient");
    expect(assessmentPagesSource).toContain("function FmeaRiskDistributionChart");
    expect(assessmentPagesSource).toContain("formatFmeaRiskPercentage");
    expect(assessmentPagesSource).toContain("onMouseEnter={() => activate(entry.level)}");
    expect(assessmentPagesSource).toContain('t("report.ofTotal")');
    expect(assessmentPagesSource).toContain("completedActionCount");
    expect(assessmentPagesSource).toContain("inProgressActionCount");
    expect(assessmentPagesSource).toContain("remainingActionCount");
    expect(assessmentPagesSource).toContain('fmea-risk-donut-label');
    expect(stylesSource).toContain(".fmea-risk-donut {");
    expect(stylesSource).toContain("background: transparent");
    expect(stylesSource).toContain(".fmea-risk-donut-label {");
    expect(stylesSource).toContain(".fmea-risk-donut-svg {");
    expect(stylesSource).toContain(".fmea-risk-donut-segment.is-active");
    expect(stylesSource).toContain("@keyframes fmea-risk-percentage-in");
    expect(stylesSource).toContain(".fmea-risk-legend-value small");
    expect(i18nSource).toContain('"report.ofTotal": "از کل"');
    expect(i18nSource).toContain('"report.ofTotal": "of total"');
    expect(stylesSource).toContain(".fmea-action-progress-ring {");
    expect(stylesSource).toContain(".fmea-report-dashboard-grid {");
    expect(fmeaReportHelpersSource).toContain("summariseFmea");
    expect(fmeaReportHelpersSource).toContain("topFailureModes");
  });

  it("keeps search icons separated from placeholders in both text directions", () => {
    expect(stylesSource).toContain('.search-box .icon { position: absolute; inset-block-start: 50%; inset-inline-start: .8rem; inset-inline-end: auto;');
    expect(stylesSource).toContain('.search-box input { padding-inline-start: 2.5rem; padding-inline-end: .92rem; }');
    expect(stylesSource).toContain('[dir="rtl"] .search-box .icon { inset-inline-start: auto; inset-inline-end: .8rem; }');
    expect(stylesSource).toContain('[dir="rtl"] .search-box input { padding-inline-start: .92rem; padding-inline-end: 2.5rem; }');
    expect(assessmentPagesSource).toContain('className="search-box risk-table-search"');
    expect(generalPagesSource).toContain('className="search-box"');
    expect(adminPageSource).toContain('className="search-box"');
  });

  it("moves the FMEA process and date above the full details table", () => {
    expect(assessmentPagesSource).toContain("function FmeaReportTableContext");
    expect(assessmentPagesSource).toContain('className="fmea-report-table-context"');
    const reportTableSource = fmeaReportComponentsSource.slice(fmeaReportComponentsSource.indexOf("export function FmeaReportRiskTable"), fmeaReportComponentsSource.indexOf("export function FmeaScoreGuide"));
    expect(reportTableSource).not.toContain('t("assessment.processActivity")}</th>');
    expect(reportTableSource).not.toContain('<td className="report-table-text">{processName}</td>');
  });

  it("puts the final-table exports above the FMEA results table", () => {
    const fmeaReportSource = fmeaFeatureSource.slice(fmeaFeatureSource.indexOf("export function FmeaReportPage"));
    expect(fmeaReportSource).toContain('downloadFmeaFullReport("pdf")');
    expect(fmeaReportSource).toContain('downloadFmeaFullReport("docx")');
    expect(fmeaReportSource).toContain("locale=${locale}");
    expect(assessmentPagesSource).toContain("function FmeaFinalTableExportBar");
    expect(assessmentPagesSource).toContain('onDownload("xlsx")');
    expect(assessmentPagesSource).toContain('onDownload("pdf")');
    expect(assessmentPagesSource).toContain('onDownload("docx")');
    expect(fmeaReportSource).toContain("onDownload={downloadFmeaFinalTable}");
    expect(fmeaReportSource).toContain('view=final-table');
    expect(fmeaReportSource).not.toContain('downloadFmeaReport("xlsx")');
    expect(i18nSource).toContain('"assessment.downloadPdf"');
    expect(i18nSource).toContain('"report.finalTableExportTitle"');
    expect(stylesSource).toContain(".fmea-final-table-export-bar");
    expect(reportsSource).toContain("buildFmeaFinalTableWorkbook");
    expect(reportsSource).toContain("buildFmeaFinalTableWordDocument");
    expect(reportsSource).toContain("buildFmeaFinalTablePdfDocument");
    expect(reportsSource).toContain("FMEA_FINAL_TABLE_HEADERS");
    expect(reportsSource).toContain('z.enum(["final-table"])');
    expect(reportsSource).toContain("fmeaExportRows");
    expect(reportsSource).toContain("fmeaRecommendedAction");
    expect(reportsSource).toContain("labels.riskDistribution");
    expect(reportsSource).toContain("labels.topFailureModes");
    expect(reportsSource).toContain("labels.proposedActions");
    expect(reportsSource).toContain("labels.fullDetails");
  });

  it("shows three FMEA AI suggestions per field before the reversible remainder toggle", () => {
    expect(assessmentPagesSource).toContain("const FMEA_AI_VISIBLE_SUGGESTION_COUNT = 3");
    expect(assessmentPagesSource).toContain(".slice(0, FMEA_AI_VISIBLE_SUGGESTION_COUNT)");
    expect(assessmentPagesSource).toContain("aria-expanded={expanded}");
    expect(assessmentPagesSource).toContain('t("assessment.showMoreSuggestions")');
    expect(assessmentPagesSource).toContain('t("assessment.hideMoreSuggestions")');
    expect(stylesSource).toContain(".fmea-risk-ai-toggle {");
  });

  it("uses the supplied FMEA S/O/D scale and keeps score actions aligned", () => {
    expect(assessmentPagesSource).toContain('label: "متوسط به بالا"');
    expect(assessmentPagesSource).toContain('label: "تکرارشونده"');
    expect(assessmentPagesSource).toContain('label: "احتمال کشف پایین"');
    expect(assessmentPagesSource).toContain('className="score-panel-fields"');
    expect(assessmentPagesSource).toContain('className="score-panel-actions"');
    expect(assessmentPagesSource).toContain("item.score.toLocaleString(numberLocale)");
    expect(stylesSource).toContain(".score-panel-fields {");
    expect(stylesSource).toContain(".score-panel-actions {");
    expect(i18nSource).toContain('"assessment.severity": "شدت اثر (S)"');
  });

  it("connects the FMEA score panel to advisory AI S/O/D suggestions", () => {
    expect(assessmentPagesSource).toContain("scoreSuggestion?: FmeaRiskScoreSuggestion | null");
    expect(assessmentPagesSource).toContain('t("assessment.scoreAiTitle")');
    expect(assessmentPagesSource).toContain('onAcceptScore={(suggestion) => { scoreTouchedRef.current = true; setScores({ severity: suggestion.severity, occurrence: suggestion.occurrence, detection: suggestion.detection }); }}');
    expect(assessmentPagesSource).toContain('onAcceptScore={(suggestion) => { update("severity", suggestion.severity); update("occurrence", suggestion.occurrence); update("detection", suggestion.detection); }}');
    expect(assessmentPagesSource).toContain('setScoreSuggestion(remainingScoreSuggestion)');
    expect(assessmentPagesSource).toContain('t("assessment.applyScoreSuggestion")');
    expect(assessmentPagesSource).toContain('t("assessment.dismissScoreSuggestion")');
    expect(stylesSource).toContain(".fmea-score-ai-suggestion {");
  });

  it("does not ask for manual row number or process stage when adding a risk row", () => {
    const formStart = fmeaFeatureSource.indexOf('<SectionCard title={t("assessment.addRiskRow")');
    const formEnd = fmeaFeatureSource.indexOf("</SectionCard>}", formStart);
    const addRowSource = fmeaFeatureSource.slice(formStart, formEnd);
    expect(addRowSource).not.toContain('name="rowNumber"');
    expect(addRowSource).not.toContain('name="processStep"');
    expect(assessmentPagesSource).toContain('const requiredFields = ["failureMode", "effect", "cause"]');
    expect(assessmentPagesSource).not.toContain('rowNumber: numeric("rowNumber")');
    expect(assessmentPagesSource).not.toContain('processStep: text("processStep")');
    expect(fmeaApiSource).toContain("const fmeaItemCreateBody");
    expect(fmeaApiSource).toContain("nextFmeaRowNumber");
    expect(fmeaApiSource).toContain("defaultFmeaProcessStep");
  });
});

describe("FMEA creation stepper", () => {
  it("keeps the three stages visible and opens report/results after registration", () => {
    const wizardStart = fmeaFeatureSource.indexOf('description={t("assessment.threeSteps"');
    const wizardEnd = fmeaFeatureSource.indexOf('<fieldset id="fmea-process-step" data-step="1"', wizardStart);
    const wizardSource = fmeaFeatureSource.slice(wizardStart, wizardEnd);
    expect(assessmentPagesSource).toContain('const labels = [t("assessment.processInformation"), t("assessment.review"), t("assessment.reportResults")]');
    expect(wizardSource).toContain('{wizardStep === 3 ? <FmeaReportStepper onStepClick={handleFmeaStepClick}/> : <FmeaCreationStepper currentStep={wizardStep} onStepClick={handleFmeaStepClick}/>}');
    expect(assessmentPagesSource).toContain('function FmeaCreationStepper({ currentStep, onStepClick }');
    expect(assessmentPagesSource).toContain('currentStep !== step');
    expect(assessmentPagesSource).toContain('disabled={!clickable}');
    expect(assessmentPagesSource).toContain('function handleFmeaStepClick(step: FmeaWizardStep)');
    expect(assessmentPagesSource).toContain('if (step === 3 && editingAssessmentId)');
    expect(assessmentPagesSource).toContain('id="fmea-report-step" data-step="3"');
    expect(assessmentPagesSource).toContain('assessment.fmeaReportPreviewTitle');
    expect(assessmentPagesSource).toContain('assessment.returnToReview');
    expect(wizardSource).toContain('t("assessment.stepFmeaProcessReviewReport")');
    expect(assessmentPagesSource).toContain('data-fmea-step={wizardStep}');
    expect(assessmentPagesSource).toContain('<fieldset id="fmea-process-step" data-step="1"');
    expect(assessmentPagesSource).toContain('<fieldset ref={fmeaReviewStepRef} id="fmea-review-step" data-step="2"');
    expect(assessmentPagesSource).toContain('function continueToFmeaReview(event: ReactMouseEvent<HTMLButtonElement>)');
    expect(assessmentPagesSource).toContain('event.stopPropagation();');
    expect(assessmentPagesSource).toContain('function scrollAssessmentValidationToTop()');
    expect(assessmentPagesSource).toContain('alert.scrollIntoView({ block: "start", behavior: "smooth" });');
    expect(assessmentPagesSource).toContain('className="alert error assessment-validation-alert"');
    expect(assessmentPagesSource).toContain('scrollAssessmentValidationToTop();');
    expect(assessmentPagesSource).toContain('function submitFmeaFromReview(event: FormEvent<HTMLFormElement>)');
    expect(assessmentPagesSource).toContain('if (wizardStep !== 2) return;');
    expect(assessmentPagesSource).toContain('onSubmit={submitFmeaFromReview}');
    expect(assessmentPagesSource).toContain('onClick={continueToFmeaReview}');
    expect(assessmentPagesSource).toContain('if (wizardStep === 1) {\n      nextWizardStep();\n      return;\n    }');
    expect(assessmentPagesSource).toContain('if (creatingRef.current) return;');
    expect(assessmentPagesSource).toContain('function FmeaReviewRiskRow');
    expect(assessmentPagesSource).toContain('const [reviewRiskFormOpen, setReviewRiskFormOpen] = useState(false)');
    expect(assessmentPagesSource).toContain('{reviewRiskFormOpen && <FmeaReviewRiskRow');
    expect(assessmentPagesSource).toContain('className="fmea-add-risk-row-trigger"');
    expect(assessmentPagesSource).toContain('aria-controls={reviewRiskFormOpen ? "fmea-review-risk-form" : undefined}');
    expect(assessmentPagesSource).toContain('canDelete={canEdit()}');
    expect(assessmentPagesSource).toContain('function removeStageTwoDraftRow(item: FmeaReportItem)');
    expect(assessmentPagesSource).toContain('rowNumber: savedItems.length + index + 1');
    expect(assessmentPagesSource).toContain('pageSize={FMEA_STAGE_TWO_RISK_PAGE_SIZE}');
    expect(assessmentPagesSource).toContain('const FMEA_STAGE_TWO_RISK_PAGE_SIZE = 6');
    expect(assessmentPagesSource).toContain('function editStageTwoItem(item: FmeaReportItem, draftValue: FmeaItemDraft)');
    expect(assessmentPagesSource).toContain('function removeStageTwoRow(item: FmeaReportItem)');
    expect(assessmentPagesSource).toContain('function moveStageTwoRow(item: FmeaReportItem, direction: FmeaRowMoveDirection)');
    expect(assessmentPagesSource).toContain('onEditItem={canEdit() ? editStageTwoItem : undefined}');
    expect(assessmentPagesSource).toContain('onMove={moveStageTwoRow}');
    expect(i18nSource).toContain('"assessment.moveRowUp": "جابجایی ردیف به بالا"');
    expect(i18nSource).toContain('"assessment.moveRowDown": "جابجایی ردیف به پایین"');
    expect(stylesSource).toContain('.fmea-stage-two-review {');
    expect(stylesSource).toContain('.fmea-review-risk-card-compact {');
    const stageTwoReviewStart = fmeaFeatureSource.indexOf('{wizardStep === 2 && <div className="fmea-stage-two-review">');
    const stageTwoReviewSource = fmeaFeatureSource.slice(stageTwoReviewStart, fmeaFeatureSource.indexOf('<div className="wizard-actions">', stageTwoReviewStart));
    expect(stageTwoReviewSource.indexOf('FmeaStageTwoDetailsCard')).toBeLessThan(stageTwoReviewSource.indexOf('fmea-add-risk-row-trigger'));
    expect(assessmentPagesSource).toContain('{registeredAssessmentsView && selectedAssessment && canEdit() && wizardStep === 2 && <SectionCard title={t("assessment.addRiskRow")');
    expect(assessmentPagesSource).toContain('className="ghost button-link fmea-registered-button"');
    expect(assessmentPagesSource).toContain('aria-controls="fmea-registered-assessments"');
    expect(assessmentPagesSource).toContain('function openRegisteredAssessments()');
    expect(assessmentPagesSource).toContain('const registeredAssessmentsView = searchParams.get("view") === "registered"');
    expect(assessmentPagesSource).toContain('navigate("/fmea?view=registered")');
    expect(assessmentPagesSource).toContain('registeredAssessmentsView && <div id="fmea-registered-assessments"');
    expect(assessmentPagesSource).toContain('onClick={() => navigate("/fmea")}');
    expect(assessmentPagesSource).toContain('className="assessment-card-main" aria-label={`${t("assessment.openReport")}: ${item.title}`}');
    expect(assessmentPagesSource).not.toContain('onClick={() => setSelected(item.id)}');
    expect(assessmentPagesSource).toContain('id="fmea-registered-assessments"');
    expect(assessmentPagesSource).toContain('t("assessment.previousStep")');
    expect(assessmentPagesSource).toContain('name="reviewRiskRows"');
    expect(assessmentPagesSource).toContain('function reviewRiskRowsForSubmit()');
    expect(assessmentPagesSource).toContain('`/fmea/${created.data.id}/items`');
    expect(stylesSource).toContain('.fmea-review-risk-card {');
    expect(assessmentPagesSource).toContain('navigate(`/fmea/${created.data.id}/report`, { replace: true });');
    expect(assessmentPagesSource).toContain('navigate(`/fmea?edit=${encodeURIComponent(id)}&step=2`)');
    expect(assessmentPagesSource).toContain('function goToPreviousStep()');
    expect(assessmentPagesSource).toContain('editingAssessmentId');
    expect(assessmentPagesSource).toContain('<FmeaReportStepper onStepClick={canEditActions && id ? (step) => navigate(`/fmea?edit=${encodeURIComponent(id)}&step=${step}`) : undefined}/>');
    expect(assessmentPagesSource).toContain('function FmeaReportStepper({ onStepClick }');
    expect(assessmentPagesSource).toContain('return <FmeaCreationStepper currentStep={3} onStepClick={onStepClick}/>;');
    expect(assessmentPagesSource).not.toContain('className="fmea-report-stepper"');
    expect(assessmentPagesSource).toContain('type FmeaWizardStep = 1 | 2 | 3;');
    expect(assessmentPagesSource).toContain('storedStep === "3" ? 3');
    expect(i18nSource).toContain('"assessment.previousStep": "مرحله قبل"');
    expect(i18nSource).toContain('"assessment.previousStep": "Previous step"');
    expect(i18nSource).toContain('"assessment.reportResults": "گزارش و نتایج"');
    expect(i18nSource).toContain('"assessment.reportResults": "Report and results"');
    expect(i18nSource).toContain('"assessment.returnToReview": "بازگشت به مرور"');
    expect(i18nSource).toContain('"assessment.returnToReview": "Return to review"');
    expect(i18nSource).toContain('"assessment.backToNewFmea": "بازگشت به ارزیابی جدید FMEA"');
    expect(i18nSource).toContain('"assessment.backToNewFmea": "Back to new FMEA assessment"');

  });

  it("seeds five persisted details and renders the report details card before the manual add-row control", () => {
    expect(assessmentPagesSource).toContain('const [reviewDetailSeedLoading, setReviewDetailSeedLoading] = useState(false)');
    expect(assessmentPagesSource).toContain('body: JSON.stringify({ locale, autoCreate: true })');
    expect(assessmentPagesSource).toContain('detail-suggestions');
    expect(assessmentPagesSource).toContain('function FmeaStageTwoDetailsCard');
    expect(assessmentPagesSource).toContain('className="report-details-card"');
    expect(assessmentPagesSource).toContain('mode: "risk-rows"');
    expect(assessmentPagesSource).toContain('riskRows?.slice(0, 5)');
    expect(assessmentPagesSource).toContain('items={stageTwoDetailsItems}');
    expect(assessmentPagesSource).toContain('report.items.length === 0');
    expect(assessmentPagesSource).toContain('<FmeaStageTwoDetailsCard items={stageTwoDetailsItems}');
    expect(i18nSource).toContain('"assessment.closeRiskRowForm": "بستن فرم افزودن ردیف"');
    expect(i18nSource).toContain('"assessment.closeRiskRowForm": "Close add-row form"');
  });
});

describe("RULA creation stepper", () => {
  it("uses the requested review/scoring and assessment-reporting labels", () => {
    expect(assessmentPagesSource).toContain('[t("assessment.processInformation"), t("assessment.rulaReviewScoring"), t("assessment.rulaAssessmentReporting")]');
    expect(assessmentPagesSource).toContain('onClick={() => { setError(""); setWizardStep(step); }} disabled={submitting}');
    expect(assessmentPagesSource).toContain('disabled={wizardStep === 1 || submitting} onClick={() => { setError(""); setWizardStep((step) => step === 3 ? 2 : 1); }}>{t("assessment.previousStep")}</button>');
    expect(assessmentPagesSource).toContain('function advanceRulaWizard()');
    expect(assessmentPagesSource).toContain('if (missing) { setError(t("assessment.validationEnter", { field: missing[1] })); scrollAssessmentValidationToTop(); return false; }');
    expect(assessmentPagesSource).toContain('setWizardStep((step) => step === 1 ? 2 : step === 2 ? 3 : 3);');
    expect(assessmentPagesSource).toContain('function validateWizardStep() {\n    if (wizardStep === 1) return validateRulaProcessInfo();\n    setError("");\n    return true;\n  }');
    expect(assessmentPagesSource).not.toContain('hasUnconfirmedRulaResults(postureAnalysis, rulaBodySide)');
    expect(assessmentPagesSource).toContain('if (wizardStep < 3) { advanceRulaWizard(); return; } if (!validateRulaProcessInfo()) { setWizardStep(1); return; }');
    expect(assessmentPagesSource).toContain('navigate(`/rula/${created.data.id}/report`)');
    expect(i18nSource).toContain('"assessment.calculateRegisterRula": "ثبت و نمایش گزارش"');
    expect(i18nSource).toContain('"assessment.calculateRegisterRula": "Register and view report"');
    expect(stylesSource).toContain('.wizard-stepper > button:focus-visible');
    expect(stylesSource).toContain('.assessment-validation-alert { scroll-margin-top: 1rem; }');
    expect(assessmentPagesSource).toContain('<fieldset hidden={wizardStep !== 3}><legend>{t("assessment.rulaAssessmentReporting")}</legend>');
    expect(assessmentPagesSource).toContain('onClick={advanceRulaWizard}>{t("common.next")}');
    expect(i18nSource).toContain('"assessment.rulaReviewScoring": "مرور و ثبت و امتیاز دهی"');
    expect(i18nSource).toContain('"assessment.rulaAssessmentReporting": "گزارش دهی ارزیابی"');
    expect(i18nSource).toContain('"assessment.rulaReviewScoring": "Review, registration and scoring"');
    expect(i18nSource).toContain('"assessment.rulaAssessmentReporting": "Assessment reporting"');
    expect(i18nSource).toContain('"assessment.stepRulaProcessScoreReview": "اطلاعات فرآیند، مرور و ثبت و امتیاز دهی، و گزارش دهی ارزیابی."');
  });
});

describe("RULA assessment results view", () => {
  it("opens results from the page actions and provides a return path to new RULA", () => {
    expect(assessmentPagesSource).toContain('const resultsView = searchParams.get("view") === "results";');
    expect(assessmentPagesSource).toContain('navigate("/rula?view=results")');
    expect(assessmentPagesSource).toContain('t("assessment.rulaResults")');
    expect(assessmentPagesSource).toContain('t("assessment.rulaRegistered")');
    expect(assessmentPagesSource).toContain('t("assessment.backToNewRula")');
    expect(assessmentPagesSource).toContain('{resultsView && <SectionCard title={t("assessment.rulaResults")}');
    expect(assessmentPagesSource).toContain('{!resultsView && canEdit() && <SectionCard');
    expect(assessmentPagesSource).toContain('editingExistingAssessment ? t("assessment.editRula") : t("assessment.evaluateNew", { type: assessmentLabel })');
    expect(assessmentPagesSource).toContain("function resetRulaEntryForm()");
    expect(assessmentPagesSource).toContain("setSelectedProjectId(\"\")");
    expect(assessmentPagesSource).toContain("setJobQuery(\"\")");
    expect(assessmentPagesSource).toContain("await clearAutoSaveDraft(draftKey)");
    expect(i18nSource).toContain('"assessment.backToNewRula": "بازگشت به ارزیابی جدید RULA"');
    expect(i18nSource).toContain('"assessment.backToNewRula": "Back to new RULA assessment"');
    expect(i18nSource).toContain('"assessment.rulaRegistered": "ارزیابی‌های ثبت‌شده"');
    expect(i18nSource).toContain('"assessment.rulaRegistered": "Registered assessments"');
  });
  it("renders RULA results as semantic cards and keeps report actions", () => {
    expect(assessmentPagesSource).toContain('className="assessment-list rula-assessment-list"');
    expect(assessmentPagesSource).toContain('className="assessment-card rula-assessment-card"');
    expect(assessmentPagesSource).toContain('className="assessment-card-main" aria-label={t("assessment.openRulaReport") + ": " + displayTitle}');
    expect(assessmentPagesSource).not.toContain('role="link" tabIndex={0}');
    expect(assessmentPagesSource).toContain('onDownload(item, "xlsx")');
    expect(assessmentPagesSource).toContain('onDownload(item, "docx")');
    expect(assessmentPagesSource).toContain("onDelete(item)");
    expect(assessmentPagesSource).toContain('rula-assessment-context');
    expect(assessmentPagesSource).toContain('onOpenReport={(item) => navigate');
    expect(assessmentPagesSource).not.toContain('className="assessment-report-table rula-assessment-register-table"');
    expect(stylesSource).toContain(".rula-assessment-list");
    expect(stylesSource).toContain(".rula-assessment-card");
    expect(stylesSource).toContain(".rula-assessment-card:focus-visible");
  });
  it("keeps the manual RULA action form below the final data table", () => {
    const finalTableIndex = assessmentPagesSource.lastIndexOf("<RulaReportDataTable");
    const manualFormRenderIndex = assessmentPagesSource.lastIndexOf("{manualActionForm}</div>");
    expect(manualFormRenderIndex).toBeGreaterThan(finalTableIndex);
    const impactPanelIndex = assessmentPagesSource.indexOf('<aside className="rula-report-impact-panel"');
    expect(manualFormRenderIndex).toBeGreaterThan(impactPanelIndex);
    expect(assessmentPagesSource).toContain("const manualActionForm = onAddAction ? <RulaManualActionForm");
    expect(assessmentPagesSource).toContain("<RulaReportDataTable analysis={visibleAnalysis}");
    expect(assessmentPagesSource).toContain("{manualActionForm}</div>");
    expect(assessmentPagesSource).toContain('type="submit" formNoValidate');
    expect(assessmentPagesSource).toContain("manualValidationError");
    expect(assessmentPagesSource).toContain('t("assessment.rulaManualActionTitleRequired")');
    expect(assessmentPagesSource).toContain('aria-describedby={manualValidationError ? "rula-manual-action-title-error" : undefined}');
    expect(stylesSource).toContain(".rula-corrections-section > .rula-manual-action-form {");
    expect(stylesSource).toContain(".rula-report-secondary-sections > .rula-report-manual-action-form {");
    expect(stylesSource).toContain("max-width: 100%;");
  });
  it("keeps manual RULA action controls grouped into aligned responsive rows", () => {
    expect(assessmentPagesSource).toContain('className="rula-manual-action-text-fields"');
    expect(assessmentPagesSource).toContain('className="rula-manual-action-control-fields"');
    expect(assessmentPagesSource).toContain('className="rula-manual-action-form-actions"');
    expect(stylesSource).toContain(".rula-manual-action-text-fields {");
    expect(stylesSource).toContain(".rula-manual-action-control-fields {");
    expect(stylesSource).toContain(".rula-manual-action-form-actions {");
    expect(stylesSource).toContain("grid-template-columns: 1fr;");
    expect(stylesSource).toContain("min-height: var(--control-height);");
  });

  it("removes the redundant RULA result stepper from stage three", () => {
    expect(assessmentPagesSource).not.toContain('className="rula-result-stepper"');
    expect(assessmentPagesSource).not.toContain('t("assessment.rulaResultSteps")');
    expect(stylesSource).not.toContain(".rula-result-stepper");
    expect(i18nSource).not.toContain('"assessment.rulaResultSteps"');
  });
});

describe("RULA process information", () => {
  it("keeps the assessment title optional, aligned, and supports both body sides", () => {
    expect(assessmentPagesSource).toContain('<span className="field-label-line"><span>{t("assessment.titleRequired")}</span><span className="optional-label">{t("common.optional")}</span></span>');
    expect(assessmentPagesSource).toContain('<input name="title" maxLength={180} defaultValue={draftValue(draft, "title")} placeholder={t("assessment.titleRulaPlaceholder")}/>');
    expect(assessmentPagesSource).toContain('<span className="field-label-line">{t("assessment.bodySide")}</span>');
    expect(assessmentPagesSource).toContain('<option value="BOTH">{t("assessment.bothSides")}</option>');
    expect(assessmentPagesSource).toContain('<option value="0">{t("assessment.noSignificantForce")} — {t("assessment.noSignificantForcePoints")} — {t("assessment.noSignificantForceRange")}</option>');
    expect(assessmentPagesSource).toContain('<option value="1">{t("assessment.lowForce")} — {t("assessment.lowForcePoints")} — {t("assessment.lowForceRange")}</option>');
    expect(assessmentPagesSource).toContain('<option value="2">{t("assessment.mediumForce")} — {t("assessment.mediumForcePoints")} — {t("assessment.mediumForceRange")}</option>');
    expect(assessmentPagesSource).toContain('<option value="3">{t("assessment.highForce")} — {t("assessment.highForcePoints")} — {t("assessment.highForceRange")}</option>');
    expect(assessmentPagesSource).toContain('<RulaMuscleUseSelector value={rulaMuscleUse} onChange={setRulaMuscleUse}/>');
    expect(assessmentPagesSource).toContain('<label className="rula-muscle-use-field"><span className="field-label-line"><span>{t("assessment.repetitiveMuscle")}</span><span className="required-label">{t("common.required")}</span></span>');
    expect(assessmentPagesSource).toContain('name="muscleUse" value={rulaMuscleUse ? "1" : "0"}');
    expect(assessmentPagesSource).toContain('<StyledSelect name="muscleUseOption" value={value ? "1" : "0"} required');
    expect(assessmentPagesSource).toContain('<option value="1">{t("assessment.repetitiveMuscleCriterionOne")} — {t("assessment.repetitiveMuscleCriterionOneScore")}</option>');
    expect(assessmentPagesSource).toContain('<option value="0">{t("assessment.repetitiveMuscleCriterionZero")} — {t("assessment.repetitiveMuscleCriterionZeroScore")}</option>');
    expect(assessmentPagesSource).not.toContain('type="radio" name="muscleUseOption"');
    expect(assessmentPagesSource).not.toContain('rula-muscle-use-trigger');
    expect(assessmentPagesSource).toContain('const required: Array<[string, string]> = [["projectId", t("assessment.projectRequired")], ["jobTitle"');
    expect(assessmentPagesSource).toContain('const shortText = [[jobTitle, t("assessment.rulaJobTitle")], [taskDescription, t("assessment.rulaTask")]] as const;');
    expect(i18nSource).toContain('"assessment.bothSides": "هر دو سمت"');
    expect(i18nSource).toContain('"assessment.bothSides": "Both sides"');
    expect(i18nSource).toContain('"assessment.noSignificantForceRange": "کمتر از ۲ کیلوگرم"');
    expect(i18nSource).toContain('"assessment.noSignificantForcePoints": "۰ امتیاز"');
    expect(i18nSource).toContain('"assessment.lowForceRange": "۲ تا ۱۰ کیلوگرم به‌صورت منقطع"');
    expect(i18nSource).toContain('"assessment.lowForcePoints": "۱ امتیاز"');
    expect(i18nSource).toContain('"assessment.mediumForceRange": "۲ تا ۱۰ کیلوگرم (استاتیک و تکراری)"');
    expect(i18nSource).toContain('"assessment.mediumForcePoints": "۲ امتیاز"');
    expect(i18nSource).toContain('"assessment.highForceRange": "بیشتر از ۱۰ کیلوگرم"');
    expect(i18nSource).toContain('"assessment.highForcePoints": "۳ امتیاز"');
    expect(i18nSource).toContain('"assessment.noSignificantForceRange": "Less than 2 kg"');
    expect(i18nSource).toContain('"assessment.lowForceRange": "2–10 kg intermittently"');
    expect(i18nSource).toContain('"assessment.mediumForceRange": "2–10 kg (static and repetitive)"');
    expect(i18nSource).toContain('"assessment.highForceRange": "More than 10 kg"');
    expect(i18nSource).toContain('"assessment.repetitiveMuscleCriterionOne": "پوسچر عمدتاً استاتیک یا به‌شدت تکراری"');
    expect(i18nSource).toContain('"assessment.repetitiveMuscleCriterionOneScore": "امتیاز ۱"');
    expect(i18nSource).toContain('"assessment.repetitiveMuscleCriterionZero": "پوسچر نه استاتیک است و نه به‌شدت تکراری"');
    expect(i18nSource).toContain('"assessment.repetitiveMuscleCriterionZeroScore": "امتیاز صفر"');
    expect(i18nSource).toContain('"assessment.repetitiveMuscleCriterionOneScore": "1 point"');
    expect(i18nSource).toContain('"assessment.repetitiveMuscleCriterionZeroScore": "0 points"');
    expect(assessmentPagesSource).toContain('className="rula-analysis-image-button"');
    expect(assessmentPagesSource).toContain('analysis={visibleAnalysis} locale={locale}');
    expect(stylesSource).toContain(".rula-analysis-image-button {");
  });

  it("renders required and optional metadata in the shared inline label row", () => {
    expect(assessmentPagesSource).toContain('<span className="field-label-line"><span>{t("assessment.projectRequired")}</span><span className="required-label">{t("common.required")}</span></span>');
    expect(assessmentPagesSource).toContain('label={t("assessment.rulaJobTitle")}');
    expect(assessmentPagesSource).toContain('inputName="jobTitle"');
    expect(assessmentPagesSource).toContain('listId="rula-job-catalog-options"');
    expect(assessmentPagesSource).toContain('<span className="field-label-line"><span>{t("assessment.rulaLoadWeight")}</span><span className="optional-label">{t("common.optional")}</span></span>');
    expect(assessmentPagesSource).toContain('<span className="field-label-line"><span>{t("assessment.force")}</span><span className="required-label">{t("common.required")}</span></span>');
    expect(stylesSource).toContain('.field-label-line { display: flex; align-items: center;');
  });

  it("keeps the RULA task description compact while giving it enough writing space", () => {
    expect(assessmentPagesSource).toContain('id="rula-task-description"');
    expect(stylesSource).toContain(".rula-process-form-grid #rula-task-description { min-height: 148px; font-size: .7rem; line-height: 1.35; padding: .68rem .78rem; }");
  });

  it("reuses the FMEA searchable job catalog control for RULA", () => {
    expect(assessmentPagesSource).toContain("function JobCatalogSearch");
    expect(assessmentPagesSource).toContain('className="rula-job-search"');
    expect(assessmentPagesSource).toContain('inputId="rula-job-search"');
    expect(assessmentPagesSource).toContain('placeholder={t("assessment.jobActivityPlaceholder")}');
    expect(assessmentPagesSource).toContain('function filterJobCatalog');
    expect(assessmentPagesSource).toContain('api<JobCatalogEntry[]>("/fmea/job-catalog?limit=" + FMEA_JOB_CATALOG_LIMIT)');
    expect(assessmentPagesSource).toContain('function selectRulaJob(job: JobCatalogEntry)');
    expect(assessmentPagesSource).toContain('function changeRulaJobQuery(value: string)');
  });
});

describe("FMEA assessment information layout", () => {
  it("keeps the assessment code and scope automatic and hidden during review", () => {
    const assessmentInfoStart = fmeaFeatureSource.indexOf('<fieldset ref={fmeaReviewStepRef} id="fmea-review-step" data-step="2"');
    const assessmentInfoEnd = fmeaFeatureSource.indexOf('<div className="wizard-actions"', assessmentInfoStart);
    const assessmentInfoSource = fmeaFeatureSource.slice(assessmentInfoStart, assessmentInfoEnd);
    expect(assessmentInfoSource).toContain('<legend>{t("assessment.review")}</legend>');
    expect(assessmentPagesSource).toContain('const [assessmentCode, setAssessmentCode] = useState(() => draftValue(readLocalDraft(draftKey), "code").trim() || generatedFmeaCode());');
    expect(assessmentPagesSource).toContain('function automaticFmeaScope(projectLabel: string, jobTitle: string)');
    expect(assessmentPagesSource).toContain('const scope = String(values.get("scope") ?? "").trim() || title || null;');
    expect(assessmentPagesSource).toContain('scope: String(draft.scope ?? "").trim() || title || null');
    expect(assessmentInfoSource).toContain('<input type="hidden" data-fmea-auto-metadata="true" name="code" value={assessmentCode}/>');
    expect(assessmentInfoSource).toContain('<input type="hidden" data-fmea-auto-metadata="true" name="scope" value={assessmentScope ?? ""}/>');
    expect(assessmentInfoSource).not.toContain('<label>{t("assessment.codeRequired")');
    expect(assessmentInfoSource).not.toContain('t("assessment.scopePlaceholder")');
  });
});

describe("first-run assessment navigation", () => {
  it("keeps the route inside the authenticated application shell", () => {
    expect(appSource).toContain('<Route path="choose-path" element={<PathSelectionPage />} />');
    expect(appSource).not.toContain('<Route path="/choose-path" element={<PathSelectionPage />} />');
  });

  it("keeps the FMEA/RULA route available without forcing it after login", () => {
    expect(registrationPagesSource).toContain('onDoubleClick={() => continueToAssessment("fmea")}');
    expect(registrationPagesSource).toContain('onDoubleClick={() => continueToAssessment("rula")}');
    expect(registrationPagesSource).toContain('function selectAssessment(type: AssessmentPath)');
    expect(registrationPagesSource).toContain('sessionStorage.getItem(ASSESSMENT_PATH_KEY)');
    expect(registrationPagesSource).toContain('sessionStorage.setItem(ASSESSMENT_PATH_KEY, path)');
    expect(registrationPagesSource).toContain('className="primary path-choice-enter"');
    expect(registrationPagesSource).toContain('role="group" aria-label={t("path.choiceGroupLabel")}');
    expect(registrationPagesSource).toContain('aria-describedby="fmea-choice-description"');
    expect(registrationPagesSource).toContain('aria-describedby="rula-choice-description"');
    expect(registrationPagesSource).toContain('onClick={() => continueToAssessment()}');
    expect(accountPagesSource).toContain('nav(safeLoginRedirect(next) ?? "/", { replace: true });');
    expect(accountPagesSource).not.toContain("ASSESSMENT_PATH_KEY");
    expect(apiClientSource).toContain('sessionStorage.removeItem(ASSESSMENT_PATH_KEY)');
    expect(assessmentPagesSource).toContain('to="/choose-path"');
    expect(i18nSource).toContain('"path.enterFmea": "ورود به ارزیابی FMEA"');
    expect(i18nSource).toContain('"path.enterRula": "ورود به ارزیابی RULA"');
    expect(stylesSource).toContain('.path-choice-enter {');
    expect(stylesSource).toContain('.path-choice-select:focus-visible {');
    expect(registrationPagesSource).not.toContain("skipToDashboard");
    expect(registrationPagesSource).not.toContain('t("path.dashboard")');
  });

  it("shows a three-step assessment path without the basic-information step", () => {
    expect(registrationPagesSource).toContain('<div className="path-step current"><b>۱</b><span>{t("path.assessmentType")}</span></div><i/><div className="path-step"><b>۲</b><span>{t("path.assessmentInfo")}</span></div><i/><div className="path-step"><b>۳</b><span>{t("path.reviewConfirm")}</span></div>');
    expect(registrationPagesSource).toContain('t("path.stepOneOfThree")');
    expect(registrationPagesSource).not.toContain('t("path.basicInfo")');
    expect(registrationPagesSource).not.toContain('t("path.stepTwoOfFour")');
    expect(i18nSource).not.toContain('"path.basicInfo"');
    expect(stylesSource).toContain('grid-template-columns: auto minmax(28px, 1fr) auto minmax(28px, 1fr) auto;');
  });
});

describe("page entry loading", () => {
  it("does not add an artificial delay to route changes", () => {
    expect(appSource).not.toContain("RouteTransitionLoader");
    expect(appSource).not.toContain("setSettledRouteKey");
    expect(appSource).not.toContain("setTimeout(() => setSettledRouteKey");
    expect(appSource).not.toContain("PageLoadingScreen");
    expect(uiSource).toContain('className="page-loading-screen"');
    expect(uiSource).toContain('src="/brand/nivasafe-icon.png"');
    expect(stylesSource).toContain(".page-loading-screen { position: fixed;");
    expect(stylesSource).toContain("@keyframes page-loading-float");
    expect(stylesSource).toContain("@media (prefers-reduced-motion: reduce)");
  });
});

describe("mobile page action controls", () => {
  it("uses a shrink-safe grid that wraps action labels instead of clipping them", () => {
    expect(generalPagesSource).toContain('className="page-action-label"');
    expect(assessmentPagesSource).toContain('className="page-action-label"');
    expect(stylesSource).toContain(".page-actions {\n    display: grid;\n    grid-template-columns: repeat(auto-fit, minmax(min(14rem, 100%), 1fr));");
    expect(stylesSource).toContain(".page-actions > .page-actions-inline {\n    display: grid;\n    grid-column: 1 / -1;");
    expect(stylesSource).toContain(".page-actions-inline > .fmea-assistant-toggle {\n    grid-column: 1 / -1;");
    expect(stylesSource).toContain("min-height: 44px;");
    expect(stylesSource).toContain(".page-action-label {\n    min-width: 0;");
    expect(stylesSource).toContain("white-space: normal;");
    expect(stylesSource).toContain("overflow-wrap: anywhere;");
    expect(stylesSource).toContain("@media (max-width: 479px)");
    expect(stylesSource).not.toContain("min-height: 4rem;");
    expect(stylesSource).not.toContain("text-wrap: nowrap;");
  });

  it("uses compact typography for page actions while the desktop shell narrows", () => {
    expect(stylesSource).toContain("@media (min-width: 761px) and (max-width: 1280px)");
    expect(stylesSource).toContain(".page-actions > *, .page-actions-inline > * { font-size: .78rem; }");
  });
});
describe("organization navigation wording", () => {
  it("uses the company-only label without CRM wording", () => {
    expect(appLayoutSource).toContain('labelKey: "nav.organizations"');
    expect(appLayoutSource).not.toContain("شرکت‌ها و CRM");
    expect(generalPagesSource).toContain('eyebrow={t("organization.management")}');
    expect(generalPagesSource).not.toContain('eyebrow="CRM و مدیریت سازمان"');
  });
});

describe("multi-organization workspace management", () => {
  it("lets every authenticated account create a company while keeping switching outside the topbar", () => {
    expect(appSource).toContain('<Route path="organizations" element={<OrganizationsPage />} />');
    expect(appLayoutSource).toContain('path: "/organizations", labelKey: "nav.organizations", icon: "dashboard", scope: "all"');
    expect(appLayoutSource).not.toContain("selectOrganization(event.target.value)");
    expect(apiClientSource).toContain("export function selectOrganization(organizationId: string): boolean");
    expect(generalPagesSource).toContain("const { session, orgId } = getSession(); const canCreate = Boolean(session)");
    expect(generalPagesSource).toContain("selectOrganization(result.data.id)");
    expect(generalPagesSource).toContain("disabled={creating}");
  });
});

describe("dashboard widget layout", () => {
  it("opens saved dashboard assessments in their reports", () => {
    expect(generalPagesSource).toContain('function dashboardAssessmentReportPath(type: "FMEA" | "RULA", id: string)');
    expect(generalPagesSource).toContain('dashboardAssessmentReportPath("FMEA", item.id)');
    expect(generalPagesSource).toContain('dashboardAssessmentReportPath("RULA", item.id)');
    expect(generalPagesSource).toContain('return `/${type.toLowerCase()}/${encodeURIComponent(id)}/report`');
    expect(generalPagesSource).not.toContain('date: item.updatedAt, href: "/fmea"');
    expect(generalPagesSource).not.toContain('date: item.updatedAt, href: "/rula"');
  });

  it("visually separates each widget control and its ordering actions", () => {
    expect(generalPagesSource).toContain('className={`widget-control${removed ? " is-removed" : visible ? "" : " is-hidden"}`}');
    expect(generalPagesSource).toContain('className={`widget-visibility-toggle icon-only${visible ? "" : " is-hidden"}`}');
    expect(generalPagesSource).toContain('className="widget-remove-toggle icon-only"');
    expect(generalPagesSource).not.toContain('{t(visibilityKey)}');
    expect(generalPagesSource).not.toContain('{t("dashboard.removeWidget")}');
    expect(generalPagesSource).toContain('aria-pressed={!visible}');
    expect(generalPagesSource).toContain('dashboard.showWidget');
    expect(stylesSource).toContain(".widget-checks {\n  display: grid;");
    expect(stylesSource).toContain("border: 1px solid #d3e2ec");
    expect(stylesSource).toContain("border-radius: 12px");
    expect(stylesSource).toContain("border-inline-start: 1px solid #e3edf3");
    expect(stylesSource).toContain(".widget-visibility-toggle");
    expect(stylesSource).toContain(".widget-visibility-toggle.icon-only,\n.widget-remove-toggle.icon-only");
    expect(stylesSource).toContain(".dashboard-customizer .widget-remove-toggle {\n  display: none;\n}");
    expect(i18nSource).toContain('"dashboard.hideWidget": "مخفی کردن"');
    expect(i18nSource).toContain('"dashboard.showWidget": "Show"');
  });

  it("supports persisted ordering, visibility, removal, restoration, and an accessible empty state", () => {
    expect(generalPagesSource).toContain("const removedStorageKey = `${widgetStorageKey}:removed`");
    expect(generalPagesSource).toContain("function removeWidget(id: string)");
    expect(generalPagesSource).toContain("function restoreWidget(id: string)");
    expect(generalPagesSource).toContain("if (!dashboardWidgetLabels[source] || !dashboardWidgetLabels[target]) return");
    expect(generalPagesSource).toContain("saveDashboardList(removedStorageKey, next)");
    expect(generalPagesSource).toContain("data.counters[id.slice(4)] !== undefined");
    expect(generalPagesSource).toContain('data-widget-state={removed ? "removed" : visible ? "visible" : "hidden"}');
    expect(generalPagesSource).toContain('className="widget-remove-toggle icon-only"');
    expect(generalPagesSource).toContain('className="widget-restore-toggle"');
    expect(generalPagesSource).toContain('aria-labelledby="dashboard-layout-title"');
    expect(generalPagesSource).toContain('className="dashboard-empty-state"');
    expect(stylesSource).toContain(".widget-remove-toggle");
    expect(stylesSource).toContain(".widget-restore-toggle");
    expect(stylesSource).toContain(".dashboard-empty-state");
    expect(i18nSource).toContain('"dashboard.restoreWidget": "بازگردانی"');
    expect(i18nSource).toContain('"dashboard.openLayout": "Open dashboard layout"');
  });

  it("organizes the sidebar by product area and exposes collapse state to assistive technology", () => {
    expect(appLayoutSource).toContain('group: "actions"');
    expect(appLayoutSource).toContain('group: "reports"');
    expect(appLayoutSource).toContain('group: "guidance"');
    expect(appLayoutSource).toContain('group: "organization"');
    expect(appLayoutSource).toContain('group: "settings"');
    expect(appLayoutSource).toContain('id="app-sidebar"');
    expect(appLayoutSource).toContain('aria-expanded={!sidebarCollapsed}');
    expect(appLayoutSource).toContain('aria-controls="app-sidebar"');
    expect(appLayoutSource).toContain('title={sidebarCollapsed ? t(item.labelKey) : undefined}');
    expect(appLayoutSource).toContain('location.pathname.startsWith(`${item.path}/`)');
    expect(stylesSource).toContain(".app:not(.admin-shell) .side-nav a.active");
    expect(stylesSource).toContain("@media (min-width: 761px) and (max-width: 1020px)");
    expect(i18nSource).toContain('"group.actions": "برنامه‌های اقدام"');
    expect(i18nSource).toContain('"group.organization": "Company and users"');
  });
});

describe("consolidated project creation", () => {
  it("keeps project creation focused on a project and optional initial process", () => {
    expect(generalPagesSource).toContain('onSubmit={createProject}');
    expect(generalPagesSource).toContain('name="initialProcessName"');
    expect(generalPagesSource).not.toContain('name="initialActivityTitle"');
    expect(generalPagesSource).toContain('name="initialActivityLocation"');
    expect(generalPagesSource).toContain('t("projects.processName")');
    expect(generalPagesSource).toContain('t("projects.location")');
    expect(generalPagesSource).toContain('className="required-label"');
    expect(generalPagesSource).toContain('t("projects.creatingProject")');
    expect(generalPagesSource).toContain('t("projects.projectCreated")');
    expect(generalPagesSource).toContain('function openProjectEditor(project: Project)');
    expect(generalPagesSource).toContain('onMouseEnter={() => openProjectEditor(project)}');
    expect(generalPagesSource).toContain('className="project-edit-box"');
    expect(generalPagesSource).toContain('saveProjectEdit');
    expect(generalPagesSource).toContain('projects.reload(); processes.reload(); activities.reload()');
    expect(generalPagesSource).not.toContain('title={t("projects.newProcess")}');
    expect(generalPagesSource).not.toContain('title={t("projects.registerActivity")}');
    expect(generalPagesSource).not.toContain('title={t("projects.processList")}');
    expect(generalPagesSource).not.toContain('title={t("projects.activityList")}');
    expect(i18nSource).toContain('"projects.projectName": "نام پروژه / بخش"');
    expect(i18nSource).toContain('"projects.projectName": "Project / section name"');
  });
});

describe("FMEA header controls", () => {
  it("keeps the default-project target support without rendering the removed return link", () => {
    expect(assessmentPagesSource).not.toContain('to="/projects?project=DEFAULT"');
    expect(assessmentPagesSource).not.toContain('t("assessment.goToTestProject")');
    expect(generalPagesSource).toContain("useLocation");
    expect(generalPagesSource).toContain('get("project")');
    expect(generalPagesSource).toContain('project.code.trim().toUpperCase() === targetProjectCode');
    expect(generalPagesSource).toContain('id={`project-${project.id}`}');
    expect(generalPagesSource).toContain('targetProjectId === project.id ? "project-card-target" : ""');
    expect(stylesSource).toContain(".project-card-target");
    expect(i18nSource).toContain('"assessment.goToTestProject": "بازگشت به پروژه تستی"');
    expect(i18nSource).toContain('"assessment.goToTestProject": "Back to test project"');
  });
});

describe("project creation", () => {
  it("keeps the unique code optional without rendering an optional badge", () => {
    expect(generalPagesSource).toContain('<label>{t("projects.uniqueCode")}<input name="code" maxLength={40} placeholder={t("projects.codePlaceholder")}/>');
    expect(generalPagesSource).not.toContain('t("projects.uniqueCode")} <span className="optional-label">{t("common.optional")}');
    expect(generalPagesSource).toContain('name="code" maxLength={40} placeholder={t("projects.codePlaceholder")}/>');
    expect(generalPagesSource).toContain('t("projects.codeAutoGenerated")');
    expect(i18nSource).toContain('"projects.codeAutoGenerated": "در صورت خالی بودن، کد پروژه به‌صورت خودکار ساخته می‌شود."');
    expect(i18nSource).toContain('"projects.codeAutoGenerated": "If left empty, a unique project code is generated automatically."');
  });
});

describe("production login safety", () => {
  it("does not ship demo credentials or demo guidance in the login form", () => {
    expect(accountPagesSource).not.toContain("admin@nivasafe.local");
    expect(accountPagesSource).not.toContain("Demo123!");
    expect(accountPagesSource).not.toContain("login-hint");
    expect(accountPagesSource).not.toContain('placeholder="••••••••"');
    expect(accountPagesSource).toContain('autoComplete="username"');
    expect(accountPagesSource).toContain('autoComplete="current-password"');
    expect(accountPagesSource).toContain('placeholder={t("auth.loginUsernamePlaceholder")}');
    expect(accountPagesSource).toContain('placeholder={t("auth.passwordPlaceholder")}');
    expect(i18nSource).toContain('"auth.loginUsernamePlaceholder": "نام کاربری را وارد کنید"');
    expect(i18nSource).toContain('"auth.loginUsernamePlaceholder": "Enter your username"');
  });

  it("renders the localized public hero message", () => {
    expect(accountPagesSource).not.toContain("<h1>NIVASafe</h1>");
    expect(accountPagesSource).not.toContain('className="login-hero-icon"');
    expect(accountPagesSource).toContain('className="login-logo-wordmark"');
    expect(accountPagesSource).toContain('<div className="login-toolbar-brand"><div className="login-brand-panel">');
    expect(accountPagesSource).not.toContain('<div className="login-toolbar-brand"><img src="/brand/nivasafe-icon.png"');
    expect(accountPagesSource).toContain('<h1>{t("auth.heroTitle")}</h1>');
    expect(accountPagesSource).toContain('<span className="login-toolbar-link">{t("auth.features")}</span>');
    expect(accountPagesSource).toContain('<span className="login-toolbar-link">{t("auth.licenses")}</span>');
    expect(accountPagesSource).toContain('<span className="login-toolbar-link">{t("auth.about")}</span>');
    expect(accountPagesSource).toContain('<span className="login-toolbar-link">{t("auth.contact")}</span>');
    expect(accountPagesSource).not.toContain('<div className="eyebrow">{t("auth.loginEyebrow")}</div>');
    expect(accountPagesSource).not.toContain('className="login-card-footer"');
    expect(accountPagesSource.indexOf('className="login-hero-visual"')).toBeLessThan(accountPagesSource.indexOf('<h1>{t("auth.heroTitle")}</h1>'));
    expect(accountPagesSource.indexOf('<h1>{t("auth.heroTitle")}</h1>')).toBeLessThan(accountPagesSource.indexOf('className="login-cta-row"'));
    expect(accountPagesSource.indexOf('className="login-cta-row"')).toBeLessThan(accountPagesSource.indexOf('<div className="login-features"'));
    expect(accountPagesSource).not.toContain("login-hero-description");
    expect(accountPagesSource).toContain('className="login-approvals login-support-bar"');
    expect(accountPagesSource).toContain('<footer id="login-support" className="login-approvals login-support-bar"');
    expect(accountPagesSource).toContain('className="login-support-copy">{t("auth.supportBar")}</span>');
    expect(accountPagesSource).toContain('src="/brand/qazvin-science-technology-park.jpg"');
    expect(stylesSource).toContain(".login-approvals { display: flex; flex-direction: column;");
    expect(stylesSource).toContain("width: 100%; margin: 1rem 0 0;");
    expect(stylesSource).toContain(".login-support-bar { align-self: stretch; flex: 0 0 auto; width: calc(100% + var(--login-art-inline-pad) + var(--login-art-inline-pad)); max-width: none;");
    expect(stylesSource).toContain("border-radius: 0;");
    expect(stylesSource).toContain("width: calc(100% + var(--login-art-inline-pad) + var(--login-art-inline-pad));");
    expect(stylesSource).toContain(".login-toolbar-brand .login-brand-panel { margin-top: 0; padding: 0; border: 0;");
    expect(stylesSource).toContain(".login-toolbar-brand .login-brand-copy { display: flex; align-items: center; justify-content: center;");
    expect(stylesSource).toContain(".login-support-logo { display: block; width: 46px; height: 46px;");
    expect(stylesSource).toContain(".login { grid-template-columns: 1fr; grid-template-rows: auto; align-items: stretch; }");
    expect(accountPagesSource).toContain('const [mobileLoginFormVisible, setMobileLoginFormVisible]');
    expect(accountPagesSource).toContain('onClick={openMobileLogin}');
    expect(accountPagesSource).toContain('event.preventDefault();');
    expect(accountPagesSource).toContain('href="/register"');
    expect(stylesSource).toContain(".login:not(.mobile-login-form-visible):not(.register-page) .login-card { display: none; }");
    expect(stylesSource).toContain(".login.mobile-login-form-visible .login-art { display: none; }");
    expect(stylesSource).toContain(".login-art { display: flex; --login-art-inline-pad:");
    expect(stylesSource).toContain(".login-hero-content { display: flex; gap: clamp(.45rem, 1.4vh, .9rem);");
    expect(stylesSource).toContain(".login-hero-visual .visual-screen { inset-block-start: 18px; width: min(210px, 54vw);");
    expect(stylesSource).toContain(".login:not(.mobile-login-form-visible) .login-hero-visual .visual-screen { inset-block-start: 9px;");
    expect(i18nSource).toContain('"auth.heroTitle": "پلتفرم هوشمند ایمنی و بهداشت حرفه‌ای"');
    expect(i18nSource).toContain('"auth.features": "امکانات"');
    expect(i18nSource).toContain('"auth.licenses": "مجوزها"');
    expect(i18nSource).toContain('"auth.about": "درباره نیواسیف"');
    expect(i18nSource).toContain('"auth.contact": "تماس با ما"');
    expect(i18nSource).toContain('"auth.welcomeMessage": "جهت ورود، لطفا اطلاعات خود را وارد کنید."');
    expect(i18nSource).toContain('"auth.supportBar": "تحت حمایت پارک علم و فناوری قزوین و دارای مجوز های معتبر"');
    expect(i18nSource).toContain('"auth.heroTitle": "Smart occupational safety and health platform"');
    expect(i18nSource).toContain('"auth.supportBar": "Supported by Qazvin Science and Technology Park and holding valid licenses"');
  });

  it("keeps the placeholder login toolbar destinations inactive", () => {
    expect(accountPagesSource).not.toContain("https://app.nivasafe.com");
    expect(accountPagesSource).not.toContain("support@nivasafe.com");
    expect(accountPagesSource).not.toContain('t("auth.website")');
    expect(accountPagesSource).not.toContain('t("auth.goToWebsite")');
    expect(accountPagesSource).not.toContain('href="#login-features"');
    expect(accountPagesSource).not.toContain('href="#login-support"');
    expect(accountPagesSource).not.toContain('href="#login-about"');
    expect(accountPagesSource).not.toContain('href="#login-form">{t("auth.contact")}</a>');
    expect(accountPagesSource).toContain('className="login-toolbar-links"');
    expect(accountPagesSource).toContain('className="login-toolbar-link"');
    expect(i18nSource).not.toContain('"auth.website"');
    expect(i18nSource).not.toContain('"auth.goToWebsite"');
    expect(i18nSource).toContain('"auth.features": "Features"');
    expect(i18nSource).toContain('"auth.licenses": "Licenses"');
    expect(i18nSource).toContain('"auth.about": "About NIVASafe"');
    expect(i18nSource).toContain('"auth.contact": "Contact us"');
    expect(i18nSource).toContain('"auth.welcomeMessage": "Enter your account details to sign in."');
  });

  it("keeps the public login toolbar spaced and the support bar flush on mobile", () => {
    expect(accountPagesSource).toContain('<span>{t("auth.brandSubtitle")}</span>');
    expect(i18nSource).toContain('"auth.brandSubtitle": "پلتفرم هوشمند و ایمنی و بهداشت حرفه ای"');
    expect(i18nSource).toContain('"auth.brandSubtitle": "Smart occupational safety and health platform"');
    expect(stylesSource).toContain(".login-toolbar { padding: .65rem .75rem; gap: .75rem; }");
    expect(stylesSource).toContain(".login-art { padding-bottom: 0; }");
    expect(stylesSource).toContain(".login-support-bar { padding: .35rem .5rem calc(.45rem + env(safe-area-inset-bottom));");
    expect(stylesSource).toContain(".login:not(.mobile-login-form-visible) .login-art { padding-top: 3.65rem; padding-bottom: 0; }");
  });

  it("validates sign-in locally and prevents duplicate submissions", () => {
    expect(accountPagesSource).toContain("const submittingRef = useRef(false);");
    expect(accountPagesSource).toContain("if (submittingRef.current) return;");
    expect(accountPagesSource).toContain('noValidate aria-busy={loading}');
    expect(accountPagesSource).toContain('autoComplete="on" noValidate aria-busy={loading}');
    expect(accountPagesSource).toContain('autoComplete="username" defaultValue={rememberedLoginEmail}');
    expect(accountPagesSource).toContain('autoComplete="current-password"');
    expect(accountPagesSource).toContain('const REMEMBERED_LOGIN_EMAIL_KEY = "nivasafe-login-email";');
    expect(accountPagesSource).toContain('localStorage.removeItem(REMEMBERED_LOGIN_EMAIL_KEY)');
    expect(accountPagesSource).toContain('aria-invalid={Boolean(fieldErrors.identifier)}');
    expect(accountPagesSource).toContain('aria-invalid={Boolean(fieldErrors.password)}');
    expect(accountPagesSource).toContain('maxLength={128}');
    expect(accountPagesSource).toContain('t("auth.passwordTooShort", { min: PASSWORD_MIN_LENGTH })');
    expect(accountPagesSource).toContain('className="button-spinner"');
    expect(accountPagesSource).toContain('safeLoginRedirect(next)');
    expect(accountPagesSource).toContain('value.startsWith("//")');
    expect(accountPagesSource).toContain('value.includes("\\\\")');
    expect(accountPagesSource).toContain('nav(safeLoginRedirect(next) ?? "/", { replace: true });');
    expect(accountPagesSource).toContain('Link className="login-link" to="/forgot-password"');
    expect(accountPagesSource).toContain('Link className="login-link register-link" to="/register"');
    expect(i18nSource).toContain('"auth.loginIdentifierRequired": "ایمیل یا نام کاربری را وارد کنید."');
    expect(i18nSource).toContain('"auth.passwordTooShort": "رمز عبور باید حداقل {{min}} نویسه باشد."');
    expect(i18nSource).toContain('"auth.validation": "اطلاعات ورود را بررسی کنید."');
  });

  it("keeps password recovery validated, cancellable, and safe for users", () => {
    expect(accountPagesSource).toContain('"/auth/forgot-password"');
    expect(accountPagesSource).toContain('const rawIdentifier = String(form.get("identifier") ?? "").trim();');
    expect(accountPagesSource).toContain('setError(apiError.code === "INVALID_EMAIL" || apiError.code === "INVALID_USERNAME" || apiError.code === "INVALID_IDENTIFIER" ? t("auth.invalidLoginIdentifier") : t("auth.forgotFailed"));');
    expect(accountPagesSource).toContain('aria-invalid={Boolean(fieldError)}');
    expect(accountPagesSource).toContain('disabled={loading}');
    expect(accountPagesSource).toContain('t("auth.sendingRequest")');
    expect(accountPagesSource).toContain('catch (reason) { const apiError = reason as ApiError; setError(apiError.code === "INVALID_EMAIL" || apiError.code === "INVALID_USERNAME" || apiError.code === "INVALID_IDENTIFIER" ? t("auth.invalidLoginIdentifier") : t("auth.forgotFailed")); }');
    expect(i18nSource).toContain('"auth.forgotFailed": "شروع بازیابی رمز عبور ناموفق بود. دوباره تلاش کنید."');
    expect(i18nSource).toContain('"auth.forgotFailed": "Password recovery could not be started. Please try again."');
  });

  it("keeps the registration type-selection copy but hides redundant detail-step copy", () => {
    expect(registrationPagesSource).toContain('{step === 1 && <h2>{t("registration.title")}</h2>}');
    expect(registrationPagesSource).toContain('{step === 1 && <p className="muted">{t("registration.chooseType")}</p>}');
    expect(registrationPagesSource).not.toContain('registration.createAccount');
    expect(registrationPagesSource).not.toContain('registration.enterDetails');
    expect(i18nSource).not.toContain('"registration.createAccount"');
    expect(i18nSource).not.toContain('"registration.enterDetails"');
  });
});

describe("authentication account and role selection", () => {
  it("keeps the registration type selector available when a saved draft exists", () => {
    expect(registrationPagesSource).toContain("function isRegistrationKind(value: unknown): value is RegistrationKind");
    expect(registrationPagesSource).toContain("const [step, setStep] = useState(1);");
    expect(registrationPagesSource).toContain('role="radiogroup"');
    expect(registrationPagesSource).toContain('role="radio" aria-checked=');
    expect(registrationPagesSource).toContain('className="text-button registration-type-change"');
  });

  it("enters the panel directly and uses a server-returned workspace", () => {
    expect(accountPagesSource).not.toContain("pendingSession");
    expect(accountPagesSource).not.toContain("selectedOrganizationId");
    expect(accountPagesSource).not.toContain('role="radiogroup"');
    expect(accountPagesSource).not.toContain('role="radio" aria-checked=');
    expect(accountPagesSource).toContain("finishLogin(result.data, result.data.organizations[0]?.id, identifier)");
    expect(accountPagesSource).toContain('id="login-form" className="login-card"');
    expect(apiClientSource).toContain("selectedOrganizationId?: string");
    expect(stylesSource).not.toContain(".login-role-option.selected");
    expect(i18nSource).not.toContain('"auth.selectWorkspaceTitle"');
  });
});

describe("production API connectivity", () => {
  it("uses the same-origin API proxy in production when no build-time URL is provided", () => {
    expect(apiClientSource).toContain('const productionBuild = import.meta.env.MODE === "production";');
    expect(apiClientSource).toContain('const defaultApiUrl = productionBuild ? "/api/v1" : "http://localhost:5044/api/v1";');
    expect(apiClientSource).toContain("const configuredApiUrl = import.meta.env.VITE_API_URL;");
    expect(apiClientSource).toContain("configuredApiUrl ?? defaultApiUrl");
    expect(apiClientSource).toContain("productionBuild && configuredApiUrl && localDevelopmentApiUrl.test(configuredApiUrl) ? defaultApiUrl");
  });
});

describe("new user onboarding", () => {
  it("passes registration details to the server-owned workspace bootstrap", () => {
    expect(registrationPagesSource).toContain('companyName: draft.kind === "organization" ? draft.companyName.trim() : null');
    expect(registrationPagesSource).toContain('subscriptionPlan: draft.subscriptionPlan');
    expect(registrationPagesSource).toContain('setRegistrationPending(true)');
    expect(registrationPagesSource).not.toContain('api("/auth/login"');
    expect(registrationPagesSource).not.toContain('api("/projects"');
    expect(registrationPagesSource).not.toContain('api<{ id: string; nameFa: string; nameEn: string; subscriptionPlan?: string; subscriptionStatus?: string; subscriptionExpiresAt?: string | null }>("/organizations"');
  });
});

describe("assistant AI connectivity UX", () => {
  it("shows the configured provider state and protects short chat prompts", () => {
    expect(assistantPageSource).toContain("configuredForChat");
    expect(assistantPageSource).toContain("providerConnected");
    expect(assistantPageSource).toContain("providerUnavailable");
    expect(assistantPageSource).toContain("minLength={2}");
    expect(assistantPageSource).toContain("messageTooShort");
  });

  it("clears the submitted prompt immediately while keeping the response state visible", () => {
    expect(assistantPageSource).toContain("sendingRef");
    expect(assistantPageSource).toContain("if (sendingRef.current) return;");
    expect(assistantPageSource).toContain("setSending(true)");
    expect(assistantPageSource).toContain("setPendingMessage(content)");
    expect(assistantPageSource).toContain("element.reset();");
    expect(assistantPageSource).toContain("void clearAutoSaveDraft(composerDraftKey);");
    expect(assistantPageSource).toContain("setPendingResponse(response.data)");
    expect(assistantPageSource).toContain("aria-busy={sending}");
    expect(assistantPageSource).toContain("input.dispatchEvent(new Event(\"input\", { bubbles: true }));");
    expect(assistantPageSource).toContain('t("assistant.waitingForResponse")');
    expect(stylesSource).toContain(".composer-spinner");
    expect(stylesSource).toContain("@keyframes assistant-typing-bounce");
    expect(i18nSource).toContain('"assistant.waitingForResponse": "در حال دریافت پاسخ..."');
    expect(i18nSource).toContain('"assistant.waitingForResponse": "Waiting for the assistant response..."');
  });

  it("shows conversation topics instead of generated date-only labels", () => {
    expect(assistantPageSource).toContain("<strong>{item.title}</strong>");
    expect(assistantPageSource).toContain("body: JSON.stringify({ title: t(\"assistant.newConversation\") })");
    expect(assistantPageSource).toContain("conversations.data.map");
  });

  it("keeps the mobile shell inline and keeps the chat composer reachable", () => {
    expect(stylesSource).toContain(".topbar { flex-wrap: nowrap; row-gap: 0; }");
    expect(stylesSource).toContain(".header-actions {\n    flex-wrap: wrap;");
    expect(stylesSource).toContain(".topbar .language-menu { position: absolute;");
    expect(stylesSource).toContain("inset-block-start: calc(100% + .5rem);");
    expect(stylesSource).toContain("inset-inline-start: auto; inset-inline-end: 0;");
    expect(stylesSource).not.toContain(".topbar .language-menu { position: fixed;");
    expect(stylesSource).toContain(".login-toolbar .language-menu");
    expect(stylesSource).toContain('[dir="rtl"] .login-toolbar .language-menu');

    expect(stylesSource).toContain("width: min(174px, calc(100vw - 1rem));");
    expect(stylesSource).toContain('[dir="rtl"] .language-picker .language-menu { inset-inline-start: 0; inset-inline-end: auto; }');
    expect(stylesSource).toContain(".assistant-layout { position: relative; display: block; flex: 1 1 auto; min-height: 0; gap: 0; overflow: hidden; }");
    expect(stylesSource).toContain(".composer input { min-height: 44px; }");
    expect(stylesSource).toContain(".composer .primary { min-width: 44px; min-height: 44px; }");
  });

  it("uses a ChatGPT-like mobile conversation drawer and hides the page title", () => {
    expect(assistantPageSource).toContain("mobileConversationsOpen");
    expect(assistantPageSource).toContain("assistant-history-toggle");
    expect(assistantPageSource).toContain("assistant-history-backdrop");
    expect(assistantPageSource).toContain("assistant-history-close");
    expect(assistantPageSource).toContain("history-open");
    expect(assistantPageSource).toContain("setMobileConversationsOpen(false)");
    expect(stylesSource).toContain(".assistant-page > .page-header { display: none; }");
    expect(stylesSource).toContain(".assistant-layout.history-open .conversation-panel");
    expect(stylesSource).toContain(".assistant-history-backdrop");
    expect(stylesSource).toContain(".assistant-history-toggle");
    expect(stylesSource).toContain("left: 0;");
    expect(i18nSource).toContain('"assistant.openConversations": "نمایش گفتگوها"');
    expect(i18nSource).toContain('"assistant.closeConversations": "بستن گفتگوها"');
    expect(i18nSource).toContain('"assistant.openConversations": "Open conversations"');
    expect(i18nSource).toContain('"assistant.closeConversations": "Close conversations"');
  });
});

describe("assistant queued-analysis visibility", () => {
  it("hides the queued analysis form and request list from the chat page", () => {
    expect(assistantPageSource).not.toContain('t("assistant.queued")');
    expect(assistantPageSource).not.toContain('className="analysis-form"');
    expect(assistantPageSource).not.toContain('useLoad<AIRequest[]>("/ai/requests")');
    expect(assistantPageSource).not.toContain('t("assistant.sendToQueue")');
    expect(assistantPageSource).toContain('className={`assistant-layout${mobileConversationsOpen ? " history-open" : ""}`}');
  });
});

describe("assistant navigation label", () => {
  it("uses explicit AI chat wording in both locales", () => {
    expect(i18nSource).toContain('"nav.assistant": "گفتگو با هوش مصنوعی"');
    expect(i18nSource).toContain('"nav.assistant": "Chat with AI"');
  });
});

describe("knowledge form layout", () => {
  it("keeps visibility and multi-select controls balanced and responsive", () => {
    expect(generalPagesSource).toContain('className="knowledge-options"');
    expect(generalPagesSource).toContain('className="page-shell knowledge-page"');
    expect(generalPagesSource).not.toContain('name="aiOnly"');
    expect(generalPagesSource).not.toContain("toggleAiOnly");
    expect(generalPagesSource).toContain("knowledge.aiLinkTitle");
    expect(generalPagesSource).toContain('/knowledge/${documentId}/attachments');
    expect(generalPagesSource).toContain('className="knowledge-attachment-upload"');
    expect(filesApiSource).toContain('KNOWLEDGE_ATTACHMENT_ROUTE_REQUIRED');
    expect(apiClientSource).toContain('requestOptions.cache = "no-store"');
    expect(assistantPageSource).toContain("message-citations");
    expect(stylesSource).toContain(".knowledge-options > label:not(.checkbox-card):not(.knowledge-file)");
    expect(stylesSource).toContain(".knowledge-ai-link {");
    expect(stylesSource).toContain(".knowledge-page { min-height: 100%; overflow: visible; }");
    expect(stylesSource).toContain("overflow-y: auto;");
    expect(stylesSource).toContain(".knowledge-attachment-upload {");
    expect(stylesSource).toContain(".message-citations {");
    expect(stylesSource).toContain("height: 112px; min-height: 112px;");
    expect(stylesSource).toContain(".knowledge-options .checkbox-card { min-height: 76px;");
    expect(stylesSource).toContain("@media (max-width: 900px) {\n  .knowledge-form-top, .knowledge-options { grid-template-columns: 1fr; }");
  });
});

describe("form and surface UI polish", () => {
  it("keeps shared controls consistent while preserving validation and responsive states", () => {
    expect(stylesSource).toContain("--control-height: 48px;");
    expect(stylesSource).toContain("--control-radius: 13px;");
    expect(stylesSource).toContain("--form-gap: 1rem;");
    expect(stylesSource).toContain('input:not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="range"]):not([type="hidden"])');
    expect(stylesSource).toContain('input[type="file"]::file-selector-button');
    expect(stylesSource).toContain("select option {");
    expect(stylesSource).toContain("select option:checked");
    expect(stylesSource).toContain("select option:disabled");
    expect(stylesSource).toContain("select[multiple]");
    expect(stylesSource).toContain('.app[data-theme="blue"] select option');
    expect(stylesSource).toContain('.app[data-theme="white"] select option');
    expect(stylesSource).toContain('input[data-validation-state="success"]');
    expect(stylesSource).toContain('details.form-optional');
    expect(stylesSource).toContain("@media (max-width: 760px)");
    expect(stylesSource).toContain("@media (prefers-reduced-motion: reduce)");
  });
});

describe("mobile authenticated shell", () => {
  it("keeps the mobile drawer usable across route changes, Escape, resize and focus transitions", () => {
    expect(appLayoutSource).toContain('setMobileOpen(false);\n  }, [location.pathname, location.search]);');
    expect(appLayoutSource).toContain('if (event.key === "Escape") {');
    expect(appLayoutSource).toContain('setMobileOpen(false);');
    expect(appLayoutSource).toContain('if (window.innerWidth > 760) setMobileOpen(false);');
    expect(appLayoutSource).toContain('document.addEventListener("keydown", onKeyDown);');
    expect(appLayoutSource).toContain('window.addEventListener("resize", closeOnDesktopResize);');
    expect(appLayoutSource).toContain('aria-controls="app-sidebar"');
    expect(appLayoutSource).toContain('className="sidebar-backdrop"');
    expect(appLayoutSource).toContain('ref={mobileMenuButtonRef}');
    expect(appLayoutSource).toContain('ref={sidebarRef}');
    expect(appLayoutSource).toContain('data-mobile-drawer-close');
    expect(appLayoutSource).toContain('document.body.style.overflow = "hidden";');
    expect(appLayoutSource).toContain('opener.focus({ preventScroll: true })');
    expect(stylesSource).toContain('html[data-mobile-drawer-open="true"]');
    expect(stylesSource).toContain('.topbar-secondary-utilities,');
    expect(stylesSource).toContain('.side-utilities {');
  });

  it("bounds mobile shell overflow without disabling dense-table scrolling", () => {
    expect(indexHtmlSource).toContain('name="viewport"');
    expect(indexHtmlSource).toContain('content="width=device-width,initial-scale=1,viewport-fit=cover"');
    expect(stylesSource).toContain("/* Responsive foundation: layout children own their overflow.");
    expect(stylesSource).not.toContain("overflow-x: clip;");
    expect(stylesSource).not.toContain("body { margin: 0; min-width: 320px; min-height: 100vh; overflow-x: hidden;");
    expect(stylesSource).toContain("min-height: 100dvh;");
    expect(stylesSource).toContain(".side-nav {\n    min-height: 0;");
    expect(stylesSource).toContain("-webkit-overflow-scrolling: touch;");
    expect(stylesSource).toContain(".table-wrap > table {\n    max-width: none;");
    expect(stylesSource).toContain('[dir="rtl"] .app-sidebar.open {\n    transform: translateX(0);');
    expect(stylesSource).toContain("touch-action: manipulation;");
  });
});

describe("authenticated panel palette", () => {
  it("uses the existing site blue for panel accents and primary actions", () => {
    expect(stylesSource).toContain(".app { min-height: 100vh; --green-950: #123e73; --green-900: #174e86; --green-800: #1d5f98; --green-700: #2377c2; --green-600: #3986c8;");
    expect(stylesSource).toContain(".primary { background: linear-gradient(135deg, #174e86, var(--blue));");
    expect(stylesSource).not.toContain("linear-gradient(135deg, var(--green-700), var(--green-600))");
    expect(stylesSource).toContain(".app .ai-orb { background: linear-gradient(145deg, #3986c8, #174e86);");
    expect(stylesSource).toContain(".app .profile-hero { background:");
  });
});

describe("localized required-field validation", () => {
  it("uses a visible required indicator and prevents the browser bubble", () => {
    expect(appSource).toContain("<RequiredFieldValidation/>");
    expect(requiredFieldValidationSource).toContain("form.noValidate = true");
    expect(requiredFieldValidationSource).toContain('document.addEventListener("submit", onSubmit, true)');
    expect(requiredFieldValidationSource).toContain("missingRequiredControls");
    expect(requiredFieldValidationSource).toContain("focusAndScrollToFirstInvalid");
    expect(requiredFieldValidationSource).toContain("scrollIntoView");
    expect(requiredFieldValidationSource).toContain("visibleValidationTarget");
    expect(stylesSource).toContain('label:has(input[required], select[required], textarea[required])');
    expect(stylesSource).not.toContain('content: "*"');
    expect(stylesSource).toContain('.required-label');
    expect(stylesSource).toContain('data-required-error="true"');
  });
});

describe("fixed authentication viewport", () => {
  it("keeps the login shell naturally scrollable when the viewport or keyboard shrinks", () => {
    expect(stylesSource).toContain(".login { width: 100%; min-height: 100vh; min-height: 100dvh; height: auto; max-height: none;");
    expect(stylesSource).toContain("overflow: visible; background: #f5f9fc;");
    expect(stylesSource).toContain("body:has(.login)");
    expect(stylesSource).toContain("body:has(.login) { block-size: auto; min-block-size: 100%; overflow: auto; }");
    expect(stylesSource).toContain("grid-template-rows: auto;");
    expect(stylesSource).toContain("max-height: none; overflow: visible;");
    expect(stylesSource).toContain("font-size: 16px;");
    expect(stylesSource).toContain("env(safe-area-inset-left)");
  });

  it("moves narrow screens to a focused, non-cramped form layout", () => {
    expect(stylesSource).toContain("@media (max-width: 900px)");
    expect(stylesSource).toContain(".login { grid-template-columns: 1fr; grid-template-rows: auto; align-items: stretch; }");
    expect(stylesSource).toContain(".login:not(.mobile-login-form-visible) { display: block; }");
    expect(stylesSource).toContain(".login:not(.mobile-login-form-visible):not(.register-page) .login-card { display: none; }");
    expect(stylesSource).toContain(".login.mobile-login-form-visible { display: grid; place-items: center; }");
    expect(stylesSource).toContain(".login.mobile-login-form-visible .login-card { display: flex; }");
    expect(stylesSource).toContain(".login-hero-content { display: flex; gap: clamp(.45rem, 1.4vh, .9rem);");
    expect(stylesSource).toContain(".login:not(.mobile-login-form-visible) .login-art { padding-top: 3.65rem;");
    expect(stylesSource).toContain("align-self: center");
  });

  it("keeps the desktop marketing panel centered and fluid", () => {
    expect(stylesSource).toContain(
      ".login-brand-panel { display: flex; align-items: center; justify-content: flex-start; min-width: 0; margin-top: 25px; padding: .75rem 1rem;",
    );
    expect(stylesSource).toContain(
      ".login-hero-content { width: min(820px, 100%); flex: 1 1 auto; min-height: 0; margin-top: 16px; position: relative;",
    );
    expect(stylesSource).toContain("align-items: center; justify-content: space-between; gap: clamp(1.5rem, 3vh, 2.5rem); margin-inline: auto; text-align: center;");
    expect(stylesSource).toContain("grid-template-columns: repeat(2, minmax(0, 1fr));");
    expect(stylesSource).toContain("width: min(720px, 100%)");
    expect(stylesSource).toContain("max-width: 720px");
    expect(stylesSource).toContain(".login-features { width: 100%; max-width: 720px; margin-top: 0; margin-bottom: 25px;");
    expect(stylesSource).toContain(".login-hero-visual {");
    expect(stylesSource).toContain(".login-art h1 {");
    expect(stylesSource).toContain("max-width: 100%; font: 850 clamp(1.75rem, 2.55vw, 2.75rem)/1.22");
    expect(stylesSource).toContain(".login-art h1 { font-size: clamp(2.1rem, 2.4vw, 2.95rem); line-height: 1.2; }");
    expect(stylesSource).toContain(".login-art h1 { font-size: clamp(1.55rem, 2.45vw, 2.4rem); line-height: 1.2; }");
    expect(stylesSource).toContain("text-align: start; color: #123e73;");
    expect(stylesSource).not.toContain(".login-hero-description");
    expect(accountPagesSource).toContain('className="login-hero-visual"');
    expect(stylesSource).not.toContain("margin-top: 240px");
    expect(stylesSource).toContain("gap: clamp(1.5rem, 3vh, 2.5rem);");
    expect(stylesSource).toContain('[dir="rtl"] .login-hero-content .login-brand-panel { align-self: flex-start; }');
    expect(stylesSource).toContain('[dir="ltr"] .login-hero-content .login-brand-panel { align-self: flex-start; }');
    expect(stylesSource).toContain('[dir="rtl"] .login-card-logo { align-self: flex-end; }');
    expect(stylesSource).toContain('[dir="ltr"] .login-card-logo { align-self: flex-start; }');
    expect(stylesSource).toContain(".login-cta-row { display: flex; flex-wrap: wrap; justify-content: center; gap: .7rem; transform: translateY(clamp(10px, 3vh, 20px)); }");
    expect(stylesSource).not.toContain(".login-cta-row { display: flex; flex-wrap: wrap; justify-content: center; gap: .7rem; margin-top: clamp(2rem, 6vh, 4rem);");
    expect(stylesSource).toContain("transform: translateY(calc(clamp(10px, 1.5vh, 20px) * -1));");
    expect(stylesSource).toContain(".login-hero-content { gap: clamp(1.25rem, 2vh, 1.75rem); }");
  });

  it("keeps the login password text aligned with the email field in both writing directions", () => {
    expect(accountPagesSource).toContain('dir="ltr" placeholder={t("auth.passwordPlaceholder")}');
    expect(stylesSource).toContain('.password-field input[dir="ltr"] { direction: ltr; text-align: left; padding-inline-start: .85rem; padding-inline-end: 3.2rem; }');
    expect(stylesSource).not.toContain('.password-field input[dir="ltr"] { padding-inline-start: 3.2rem; padding-inline-end: .85rem; }');
  });

  it("uses a real HSE photo as the marketing panel background", () => {
    expect(accountPagesSource).toContain("login-hero-visual");
    expect(accountPagesSource).not.toContain("login-hero-decoration");
    expect(stylesSource).toContain('url("/brand/login-hse-background.png")');
    expect(stylesSource).toContain("background: transparent; border: 1px solid rgba(174, 207, 229, .35);");
    expect(stylesSource).toContain("background: transparent; }\n.visual-orb");
    expect(stylesSource).toContain(".visual-screen");
  });
});

describe("language picker", () => {
  it("opens an accessible choice box before changing the locale", () => {
    expect(i18nSource).toContain('aria-haspopup="menu"');
    expect(i18nSource).toContain('role="menuitemradio"');
    expect(i18nSource).toContain("chooseLocale");
    expect(i18nSource).toContain("setOpen((value) => !value)");
    expect(stylesSource).toContain(".language-menu {");
  });
});

describe("authenticated theme picker", () => {
  it("offers persistent blue and white themes with matching sidebar logo treatments", () => {
    expect(appLayoutSource).toContain('data-theme={theme}');
    expect(appLayoutSource).toContain("readAppTheme");
    expect(uiSource).toContain('data-testid="theme-switcher"');
    expect(uiSource).toContain('data-theme-option={selectedOption.value}');
    expect(uiSource).toContain('data-theme-option={alternateOption.value}');
    expect(themeSource).toContain('export type AppTheme = "blue" | "white"');
    expect(themeSource).toContain('APP_THEME_STORAGE_KEY = "nivasafe-theme"');
    expect(uiSource).toContain('aria-haspopup="menu"');
    expect(uiSource).toContain('aria-expanded={open}');
    expect(uiSource).toContain('setOpen((value) => !value)');
    expect(uiSource).toContain("theme-options-menu");
    expect(stylesSource).toContain(".theme-options-menu {");
    expect(stylesSource).toContain(".theme-option-label { display: none; }");
    expect(stylesSource).toContain(".theme-switcher { position: relative;");
    expect(stylesSource).toContain("max-width: min(180px, calc(100vw - 1rem));");
    expect(stylesSource).toContain("@media (min-width: 761px) and (max-width: 1280px)");
    expect(stylesSource).toContain("height: auto; min-height: 78px; flex-wrap: nowrap; row-gap: 0;");
    expect(stylesSource).toContain(".topbar-title { flex: 1 1 auto; }");
    expect(stylesSource).toContain(".header-actions { width: auto; flex: 0 0 auto; justify-content: flex-end; gap: .45rem; flex-wrap: nowrap; }");
    expect(stylesSource).not.toContain(".header-actions { width: 100%; flex: 1 1 100%;");
    expect(stylesSource).toContain(".header-actions { display: flex; align-items: center; justify-content: flex-end; gap: .55rem; min-width: 0; flex: 0 1 auto; flex-wrap: nowrap; }");
    expect(stylesSource).toContain(".header-notifications");
    expect(stylesSource).not.toContain(".header-actions select {");
    expect(stylesSource).not.toContain(".header-actions .styled-select");
    expect(stylesSource).toContain(".theme-trigger { min-width: 42px; }");
    expect(stylesSource).toContain(".theme-options-menu { min-width: 44px; max-width: calc(100vw - 1rem); }");
    expect(stylesSource).toContain('.app[data-theme="blue"] .side-brand-icon');
    expect(stylesSource).toContain('background: #fff; border: 1px solid rgba(255,255,255,.86);');
    expect(stylesSource).toContain('filter: none;');
    expect(stylesSource).toContain('.app[data-theme="white"] .side-brand-icon');
    expect(stylesSource).toContain('.app[data-theme="blue"] .topbar .ghost:hover');
    expect(stylesSource).toContain('.app[data-theme="blue"] .header-notifications:hover');
    expect(stylesSource).toContain('.app[data-theme="blue"] .styled-select-trigger:hover:not(:disabled), .app[data-theme="blue"] .styled-select.is-open .styled-select-trigger');
    expect(stylesSource).toContain('background: rgba(255,255,255,.16); color: #315978;');
    expect(stylesSource).toContain('.app[data-theme="blue"] .language-switch:hover');
    expect(stylesSource).toContain('.app[data-theme="blue"] .theme-option:hover { color: #c0d2df;');
    expect(stylesSource).toContain('background: rgba(255,255,255,.14);');
    expect(stylesSource).toContain('color: #eef6fb;');
  });
});

describe("phone input contract", () => {
  it("normalizes mobile digits in every editable phone field and enforces the local format", () => {
    expect(accountPagesSource).toContain("function normalizePhoneField");
    expect(accountPagesSource).toContain('onChange={normalizePhoneField}');
    expect(accountPagesSource).toContain('maxLength={11} pattern="09[0-9]{9}"');
    const registrationSource = readFileSync(new URL("./features/account/RegistrationPage.tsx", import.meta.url), "utf8");
    expect(registrationSource).toContain('onChange={(event) => update("phone", normalizePhone(event.target.value))}');
    expect(registrationSource).toContain('phone: typeof draft.phone === "string" ? normalizePhone(draft.phone) : ""');
  });
});

describe("registration contact and username security", () => {
  it("detects contact type in the registration form and keeps validation server-aligned", () => {
    expect(registrationPagesSource).toContain("detectContactInput");
    expect(registrationPagesSource).toContain("isValidContactInput");
    expect(registrationPagesSource).toContain('data-contact-kind={emailFeedback?.kind ?? "empty"}');
    expect(registrationPagesSource).toContain('data-contact-kind={phoneFeedback?.kind ?? "empty"}');
    expect(registrationPagesSource).toContain('type="text" inputMode="email" autoComplete="email"');
    expect(registrationPagesSource).toContain('t("registration.phoneInEmail")');
    expect(registrationPagesSource).toContain('t("registration.emailInPhone")');
    expect(registrationPagesSource).toContain('if (draft.phone.trim() && !isValidContactInput(draft.phone, "phone"))');
    expect(registrationPagesSource).toContain('displayName: normalizeDisplayName(draft.displayName)');
    expect(i18nSource).toContain('"registration.emailDetected": "ایمیل شناسایی شد."');
    expect(i18nSource).toContain('"registration.phoneDetected": "Phone number detected."');
  });
});

describe("registration personal and organization flows", () => {
  it("keeps both registration paths in the existing wizard with local validation", () => {
    expect(registrationPagesSource).toContain('const stepLabels = draft.kind === "organization" ? [t("registration.accountType"), t("registration.managerDetails"), t("registration.companyDetails"), t("registration.review")]');
    expect(registrationPagesSource).toContain('t("registration.firstName")');
    expect(registrationPagesSource).toContain('t("registration.lastName")');
    expect(registrationPagesSource).toContain('firstName: normalizeDisplayName(draft.firstName)');
    expect(registrationPagesSource).toContain('lastName: normalizeDisplayName(draft.lastName)');
    expect(registrationPagesSource).not.toContain('isValidIranianNationalId');
    expect(registrationPagesSource).not.toContain('registration-national-id');
    expect(registrationPagesSource).not.toContain('draft.nationalId');
    expect(registrationPagesSource).not.toContain('t("registration.privacyNote")');
    expect(registrationPagesSource).toContain('draft.employees || t("registration.notProvided")');
    expect(registrationPagesSource).toContain('draft.jobTitle || t("registration.notProvided")');
    expect(stylesSource).toContain('.login.register-page { height: auto; min-height: 100vh; max-height: none; overflow: visible; place-items: start center; }');
    expect(stylesSource).toContain('.login.register-page .register-card { align-self: start; max-height: none; overflow: visible; margin: 0 auto; }');
    expect(stylesSource).toContain('.login:not(.mobile-login-form-visible):not(.register-page) .login-card { display: none; }');
    expect(stylesSource).toContain('html:has(.register-page), body:has(.register-page) { block-size: auto; min-block-size: 100%; overflow: auto; }');
    expect(stylesSource).not.toContain('label:has(input[required], select[required], textarea[required]):not(:has(.required-label)):before');
    expect(stylesSource).toContain('label:has(input[required], select[required], textarea[required]):not(:has(.required-label)) { position: relative; }');
    expect(stylesSource).not.toContain('label:has(input[required],select[required],textarea[required]):not(:has(.required-label)){ padding-inline-start: .9rem;');
    expect(registrationPagesSource).toContain('noValidate');
    expect(registrationPagesSource).toContain('if (loading) return;');
    expect(registrationPagesSource).toContain('registrationPending');
    expect(registrationPagesSource).toContain('t("registration.pendingTitle")');
    expect(registrationPagesSource).not.toContain('api("/auth/login"');
    expect(stylesSource).toContain('.registration-success-card');
    expect(i18nSource).toContain('"registration.successTitle": "ثبت‌نام با موفقیت انجام شد"');
    expect(i18nSource).toContain('"registration.successTitle": "Registration completed successfully"');
  });
});

describe("form auto-save contract", () => {
  it("persists every input and restores drafts without storing credentials or files", () => {
    expect(autoSaveSource).toContain('form.addEventListener("input", persist)');
    expect(autoSaveSource).toContain('form.addEventListener("change", persist)');
    expect(autoSaveRulesSource).toContain('"password"');
    expect(autoSaveRulesSource).toContain('"file"');
    expect(autoSaveRulesSource).toContain("SENSITIVE_DRAFT_FIELDS");
    expect(autoSaveRulesSource).toContain("return sanitizeDraft(draft);");
    expect(autoSaveRulesSource).toContain("JSON.stringify(sanitizeDraft(draft))");
    expect(autoSaveSource).toContain("restoreForm");
    expect(autoSaveSource).toContain("sanitizeDraft(draft)");
    expect(registrationPagesSource).toContain("const { password: _password, confirmPassword: _confirmPassword, ...safeDraft } = draft;");
    expect(filesPageSource).toContain('aria-label={t("files.choose")}');
    expect(filesPageSource).toContain("uploadSubmittingRef");
    expect(readFileSync(new URL("./features/general/GeneralPages.tsx", import.meta.url), "utf8")).toContain("<AutoSaveForm");
    expect(readFileSync(new URL("./features/assistant/AssistantPage.tsx", import.meta.url), "utf8")).toContain("<AutoSaveForm");
  });

  it("protects FMEA and RULA assessment drafts through immediate local persistence and IndexedDB backup", () => {
    expect(assessmentPagesSource).toContain("readLocalDraft(draftKey)");
    expect(assessmentPagesSource).toContain("return assessmentDraftKey(kind, session?.user.id, orgId);");
    expect(assessmentPagesSource).toContain("assessmentWizardStepKey(draftKey)");
    expect(assessmentPagesSource).toContain("writeStoredDraft(browserStorage(), key, draft)");
    expect(assessmentPagesSource).toContain("onInput={(event) => { if (!editingExistingAssessment) queueDraft");
    expect(assessmentPagesSource).toContain("onChange={(event) => { if (!editingExistingAssessment) queueDraft");
    expect(assessmentPagesSource).toContain("const draftWriteQueue = useRef<Promise<void>>(Promise.resolve())");
    expect(assessmentPagesSource).toContain("await clearAutoSaveDraft(draftKey)");
    expect(assessmentPagesSource).toContain("draft.inputs && typeof draft.inputs === \"object\"");
    expect(registrationPagesSource).toContain("await clearAutoSaveDraft(draftKey);");
    expect(registrationPagesSource).toContain("clearAssessmentWizardStep(draftKey);");
    expect(registrationPagesSource).toContain("void clearSelectedAssessmentDraft(type);");
    expect(registrationPagesSource).toContain("await clearSelectedAssessmentDraft(type);");
  });

  it("captures RULA activity measurements and posture-photo guidance", () => {
    expect(assessmentPagesSource).toContain('name={inputName}');
    expect(assessmentPagesSource).toContain('inputName="jobTitle"');
    expect(assessmentPagesSource).toContain('name="taskDescription"');
    expect(assessmentPagesSource).toContain("function requestRulaTaskDescriptionSuggestion");
    expect(assessmentPagesSource).toContain('mode: "description"');
    expect(assessmentPagesSource).toContain('id="rula-task-description"');
    expect(assessmentPagesSource).toContain('className="fmea-description-ai"');
    expect(assessmentPagesSource).toContain('className="fmea-description-suggestion"');
    expect(assessmentPagesSource).toContain("acceptRulaTaskDescriptionSuggestion");
    expect(assessmentPagesSource).toContain("dismissRulaTaskDescriptionSuggestion");
    expect(assessmentPagesSource).toContain('name="postureDescription"');
    expect(assessmentPagesSource).toContain('name="durationPerOccurrence"');
    expect(assessmentPagesSource).toContain('name="repetitionsPerShift"');
    expect(assessmentPagesSource).toContain('name="postureHoldDuration"');
    expect(assessmentPagesSource).toContain('name="loadWeight"');
    expect(assessmentPagesSource).toContain('name="postureImage"');
    expect(assessmentPagesSource).toContain('noValidate aria-busy={submitting}');
    expect(assessmentPagesSource).toContain("handlePostureImageChange");
    expect(assessmentPagesSource).toContain("removePostureImage");
    expect(assessmentPagesSource).toContain('accept="image/jpeg,image/png,image/webp"');
    expect(assessmentPagesSource).not.toContain('capture="environment"');
    expect(assessmentPagesSource).toContain('postureImageInvalidType');
    expect(assessmentPagesSource).toContain('registeringRula');
    expect(assessmentPagesSource).toContain('entityType", "RulaAssessment"');
    expect(assessmentPagesSource).toContain("rulaAiImageActive");
    expect(assessmentPagesSource).toContain("rulaImageAnalysisWorking");
    expect(assessmentPagesSource).toContain('"/rula/posture-analysis"');
    expect(assessmentPagesSource).toContain("requestRulaPostureTextAnalysis");
    expect(assessmentPagesSource).toContain("rulaTextAnalysisWorking");
    expect(assessmentPagesSource).toContain("rulaTextAnalysisActive");
    expect(assessmentPagesSource).toContain('activityInfo: rulaActivityInfoFromForm(values)');
  });

  it("keeps RULA activity measurements optional while validating supplied values", () => {
    expect(assessmentPagesSource).toContain('const required: Array<[string, string]> = [["projectId", t("assessment.projectRequired")], ["jobTitle", t("assessment.rulaJobTitle")], ["taskDescription", t("assessment.rulaTask")]]');
    expect(assessmentPagesSource).toContain('if (!raw) return false; const value = Number(raw)');
    expect(assessmentPagesSource).toContain('t("assessment.rulaDuration")}</span><span className="optional-label">{t("common.optional")}</span>');
    expect(assessmentPagesSource).toContain('t("assessment.rulaRepetitions")}</span><span className="optional-label">{t("common.optional")}</span>');
    expect(assessmentPagesSource).toContain('t("assessment.rulaPostureHold")}</span><span className="optional-label">{t("common.optional")}</span>');
  });

  it("provides grouped editable RULA posture analysis with live score recalculation", () => {
    expect(assessmentPagesSource).toContain("rulaGroupARows");
    expect(assessmentPagesSource).toContain("rulaGroupBRows");
    expect(assessmentPagesSource).toContain("RulaPostureEditDialog");
    expect(assessmentPagesSource).toContain("suggestedRulaPostureScore");
    expect(assessmentPagesSource).toContain("suggestedRulaPostureScore(part, currentAngle, value, row.score)");
    expect(assessmentPagesSource).toContain("rulaActionLevelFor");
    expect(assessmentPagesSource).toContain("rulaGroupScores");
    expect(assessmentPagesSource).toContain('"--rula-score-angle"');
    expect(assessmentPagesSource).toContain("Math.round((scoreForGauge / 7) * 270)");
    expect(assessmentPagesSource).not.toContain('"--rula-score-progress"');
    expect(stylesSource).toContain("var(--rula-score-angle)");
    expect(assessmentPagesSource).toContain("rulaSourceLabelKey");
    expect(assessmentPagesSource).toContain("confirmedByUser");
    expect(assessmentPagesSource).not.toContain('t("assessment.aiAutoAnalyzed")');
    expect(assessmentPagesSource).toContain('source !== "DEFAULT"');
    expect(assessmentPagesSource).toContain("invalidPostureScore");
    expect(assessmentPagesSource).toContain("RULA Score =");
    expect(assessmentPagesSource).toContain("rula-skeleton-overlay");
    expect(assessmentPagesSource).toContain("RulaPostureOverlayLayer");
    expect(assessmentPagesSource).toContain('preserveAspectRatio="none"');
    expect(assessmentPagesSource).toContain("rulaOverlaySegments");
    expect(assessmentPagesSource).toContain("Math.max(2, annotation.y * 100)");
    expect(assessmentPagesSource).toContain("if (!processImages.length) return;");
    expect(assessmentPagesSource).toContain("...(side === \"RIGHT\" ? nextSides.RIGHT! : {})");
    expect(assessmentPagesSource).toContain('"/rula/posture-image-analysis"');
    expect(assessmentPagesSource).toContain('sideAnalyses: { RIGHT: right.analysis, LEFT: left.analysis }');
    expect(assessmentPagesSource).toContain('const visibleAnalysis = bodySide === "BOTH" ? analysis.sideAnalyses?.[activeSide] ?? analysis : analysis');
    expect(assessmentPagesSource).toContain('const visibleResult = bodySide === "BOTH" ? sideResults?.[activeSide] ?? result : result');
    expect(assessmentPagesSource).toContain('if (wizardStep === 1)');
    expect(assessmentPagesSource).toContain('postureImageAnalysisContextKey.current = ""');
    expect(assessmentPagesSource).not.toContain("joint-neck");
    expect(assessmentPagesSource).not.toContain("bone-neck");
    expect(assessmentPagesSource).toContain('name="postureAnalysis"');
    expect(assessmentPagesSource).toContain("setPostureAnalysis");
  });

  it("provides a RULA results report with main factors, corrective actions, and an explicit prediction", () => {
    expect(appSource).toContain('path="rula/:id/report"');
    expect(assessmentPagesSource).toContain("RulaReportPage");
    expect(assessmentPagesSource).toContain("RulaReportDataTable");
    expect(assessmentPagesSource).toContain("RulaAssessmentTable");
    expect(assessmentPagesSource).toContain("assessment-report-table rula-report-data-table");
    expect(assessmentPagesSource).toContain('className="report-details-card rula-report-data-section"');
    expect(assessmentPagesSource).toContain('<summary>{t("report.expandDetails")}</summary>');
    expect(assessmentPagesSource).toContain("report.assessment.postureAnalysis");
    expect(assessmentPagesSource).toContain('t("assessment.rulaReportDataTable")');
    expect(assessmentPagesSource).toContain("rulaReportFactorKeys");
    expect(assessmentPagesSource).toContain("rankRulaReportFactors");
    expect(assessmentPagesSource).toContain("rulaMainFactors");
    expect(assessmentPagesSource).toContain('factor.source !== "AI" && <small>{t(rulaSourceLabelKey(factor.source))}</small>');
    expect(assessmentPagesSource).toContain("rulaRelatedFactor");
    expect(assessmentPagesSource).toContain("RulaCorrectionSuggestionsTable");
    expect(assessmentPagesSource).toContain("assessment-report-table rula-correction-table");
    expect(assessmentPagesSource).not.toContain('t("assessment.resultSource")}</th><th>{t("assessment.rulaReportSelectedActions")}</th>');
    expect(assessmentPagesSource).toContain('t("assessment.rulaSuggestedAction")');
    expect(assessmentPagesSource).toContain('t("assessment.rulaActionBodySide")');
    expect(assessmentPagesSource).toContain('t("assessment.rulaActionPriority")');
    expect(assessmentPagesSource).toContain('t("assessment.rulaManualActionBodySide")');
    expect(assessmentPagesSource).toContain('rulaManualActionBodySideHint');
    expect(assessmentPagesSource).toContain("function rulaActionForDataTable");
    expect(assessmentPagesSource).toContain("const tableSelectedActions = visibleSelectedActions.map");
    expect(assessmentPagesSource).toContain("selectedActions={tableSelectedActions}");
    expect(assessmentPagesSource).toContain("busyActionId");
    expect(assessmentPagesSource).toContain("rulaActionLevelForScore");
    expect(assessmentPagesSource).toContain("rulaPredictionEstimate");
    expect(assessmentPagesSource).toContain("rulaPredictedNote");
    expect(assessmentPagesSource).toContain("buildLocalRulaFallbackSuggestions");
    expect(assessmentPagesSource).toContain("rula-local-fallback-neutral");
    expect(assessmentPagesSource).toContain("rulaImpact");
    expect(assessmentPagesSource).toContain("sideResults");
    expect(assessmentPagesSource).toContain("rula-report-side-tabs");
    expect(assessmentPagesSource).toContain("downloadPdf");
    expect(assessmentPagesSource).not.toContain("const suggestions = resultReady ? rawSuggestions : [];");
    expect(assessmentPagesSource).toContain('status !== "CANCELLED" && action.status !== "REJECTED"');
    expect(assessmentPagesSource).toContain("priority-${action.priority.toLowerCase()}");
    expect(assessmentPagesSource).toContain('body: JSON.stringify({ status: "CANCELLED" })');
    expect(reportsSource).toContain("const predictedScore = sideResults");
    expect(reportsSource).toContain('"Prediction note"');
    expect(reportsSource).toContain('"Related factors"');
    expect(stylesSource).toContain(".rula-prediction-card");
    expect(stylesSource).toContain(".rula-report-risk-badge.immediate");
    expect(stylesSource).toContain(".rula-manual-factors");
    expect(stylesSource).toContain(".rula-correction-table");
    expect(stylesSource).toContain(".rula-correction-table thead { position: static;");
    expect(stylesSource).toContain(".rula-correction-table tbody { display: table-row-group; }");
    expect(stylesSource).toContain(".rula-correction-table tbody tr { display: table-row;");
    expect(stylesSource).toContain(".table-wrap.report-data-table-wrap.rula-correction-table-wrap { overflow-x: hidden;");
    expect(stylesSource).toContain(".rula-correction-table { display: table; width: 100%; min-width: 0 !important; table-layout: fixed; }");
    expect(stylesSource).toContain(".rula-correction-table .rula-correction-toggle { width: 100%; max-width: 100%; min-width: 0;");
    expect(stylesSource).toContain("white-space: nowrap; overflow-wrap: normal; word-break: keep-all;");
    expect(i18nSource).toContain('"assessment.rulaSelectAction": "انتخاب"');
    expect(assessmentPagesSource).toContain("const generalActions = selectedActions.filter");
    expect(assessmentPagesSource).toContain('t("assessment.rulaGeneralCorrectiveActions")');
    expect(stylesSource).toContain(".rula-manual-action-scope-note");
    expect(stylesSource).toContain(".rula-assessment-register-table");
    expect(stylesSource).toContain(".rula-report-data-table");
    expect(stylesSource).toContain(".rula-report-table-wrap");
    expect(stylesSource).toContain(".rula-report-data-section .surface-head");
    expect(stylesSource).toContain(".rula-report-context");
    expect(stylesSource).toContain(".rula-report-section-heading p:empty");
    expect(i18nSource).not.toContain("پیشنهادهای GPT-5-Mini را با داده‌های وضعیت بدن تطبیق دهید");
    expect(i18nSource).not.toContain("Review GPT-5-Mini suggestions against the posture data");
    expect(assessmentPagesSource).toContain("rula-assessment-context");
    expect(stylesSource).toContain(".surface-title > div");
    expect(stylesSource).toContain("@media (max-width: 1400px)");
    expect(stylesSource).toContain(".rula-assessment-register-table .report-table-actions");
    expect(stylesSource).toContain(".rula-report-data-table td:last-child .report-table-actions");
    expect(stylesSource).toContain(".rula-report-data-table :is(th, td):last-child");
    expect(stylesSource).toContain("flex-wrap: nowrap");
    expect(stylesSource).toContain(".rula-report-data-table td:last-child .report-inline-details > .report-inline-trigger");
    expect(stylesSource).toContain(".report-details-card .surface-body > details > summary::after");
    expect(stylesSource).toContain(".report-details-card .surface-body > details[open] > summary::after");
    expect(stylesSource).toContain(".rula-report-data-section.report-details-card .surface-body > details > summary");
    expect(stylesSource).toContain("grid-template-columns: repeat(3, 27px)");
    expect(stylesSource).toContain("overflow-wrap: anywhere");
    expect(assessmentPagesSource).toContain('data-label={t("assessment.bodyPart")}');
    expect(assessmentPagesSource).toContain('data-label={t("assessment.rulaSuggestedAction")}');
    expect(stylesSource).toContain(".rula-smart-analysis .rula-analysis-table-card .table-wrap,");
    expect(stylesSource).toContain(".rula-report-page .rula-report-data-table tbody > tr > td::before");
    expect(stylesSource).toContain('grid-template-areas:\n      "body body"');
    expect(stylesSource).toContain(".rula-smart-analysis .rula-analysis-table tbody > tr > td:nth-child(1) {");
    expect(stylesSource).toContain(".rula-smart-analysis .rula-analysis-table .rula-detection-badge");
    expect(stylesSource).toContain("background: linear-gradient(180deg, #fff, #fbfdff);");
    expect(stylesSource).toContain(".rula-report-surface > .surface-body");
    expect(stylesSource).toContain(".rula-report-page,\n  .rula-report-view {\n    overflow-x: hidden;");
    expect(stylesSource).toContain(".rula-report-view * {\n    min-width: 0;");
    expect(stylesSource).toContain(".rula-corrections-layout {\n    direction: rtl;");
    expect(stylesSource).toContain(".rula-report-view .table-wrap");
    expect(stylesSource).toContain("content: attr(data-label);");
    expect(stylesSource).toContain("min-width: 0;");
    expect(assessmentPagesSource).toContain("function RulaReportStepper");
    expect(assessmentPagesSource).toContain('return <div className="wizard-stepper" aria-label={t("assessment.stepsLabel", { type: "RULA" })}');
    expect(assessmentPagesSource).not.toContain('className="wizard-stepper rula-report-stepper"');
    expect(stylesSource).not.toContain(".rula-report-stepper");
    expect(assessmentPagesSource).toContain("function goToPreviousStep()");
    expect(assessmentPagesSource).toContain('navigate(`/rula?edit=${encodeURIComponent(id)}&step=2`)');
    expect(assessmentPagesSource).toContain('onEdit={reportPostureEditHandler}');
    expect(assessmentPagesSource).toContain('t("assessment.editPostureResult")');
    expect(assessmentPagesSource).toContain('part=${encodeURIComponent(part)}');
    expect(assessmentPagesSource).toContain('const editingAssessmentId = searchParams.get("edit")?.trim() ?? ""');
    expect(assessmentPagesSource).toContain('await api(`/rula/${editingAssessmentId}`, { method: "PATCH"');
    expect(assessmentPagesSource).toContain('t("assessment.editRula")');
    expect(i18nSource).toContain('"assessment.editRula": "ویرایش ارزیابی RULA"');
    expect(i18nSource).toContain('"assessment.editRula": "Edit RULA assessment"');
  });
});

describe("global admin panel", () => {
  it("separates global administration and exposes guarded user controls", () => {
    expect(appSource).toContain('path="admin"');
    expect(appLayoutSource).toContain('path: "/admin"');
    expect(appLayoutSource).toContain('scope === "superadmin" && ["SUPER_ADMIN", "ORG_ADMIN"].includes(role)');
    expect(adminPageSource).toContain("/admin/overview");
    expect(adminPageSource).toContain("/admin/users");
    expect(adminPageSource).toContain("/admin/ai-usage");
    expect(adminPageSource).toContain("admin-ai-usage-table");
    expect(adminPageSource).toContain("admin.aiUsageTotalTokens");
    expect(adminPageSource).toContain("globalRole");
    expect(adminPageSource).toContain("active");
    expect(adminPageSource).toContain("OrganizationAdminPanelPage");
    expect(adminPageSource).toContain("/members");
    expect(adminModuleSource).toContain('"/api/v1/admin/overview"');
    expect(adminModuleSource).toContain('"/api/v1/admin/users"');
    expect(adminModuleSource).toContain('"/api/v1/admin/users/:id"');
    expect(adminModuleSource).toContain('"/api/v1/admin/ai-usage"');
    expect(adminModuleSource).toContain("requireSuperAdmin");
    expect(stylesSource).toContain(".admin-ai-usage-summary");
    expect(stylesSource).toContain(".admin-ai-usage-summary article");
    expect(stylesSource).toContain("text-align: center");
    expect(stylesSource).toContain(".admin-ai-usage-table table");
    expect(stylesSource).toContain(".admin-ai-usage-table th, .admin-ai-usage-table td { text-align: center; vertical-align: middle; }");
    expect(stylesSource).toContain(".admin-ai-usage-table .admin-user-identity { display: flex; flex-direction: column; align-items: center; text-align: center; }");
    expect(adminPageSource).toContain('data-label={t("admin.aiUsageUser")}');
    expect(adminPageSource).toContain('data-label={t("admin.organizationsColumn")}');
    expect(stylesSource).toContain(".responsive-table-container[data-responsive=\"cards\"]");
    expect(stylesSource).toContain(".admin-user-table .admin-role-select");
    expect(stylesSource).toContain(".admin-ai-usage-table .admin-user-identity");
    expect(stylesSource).toContain(".responsive-table-container[data-responsive=\"cards\"] > table {");
    expect(stylesSource).toContain(".admin-shell");
    expect(appLayoutSource).toContain('const adminVariant = role === "SUPER_ADMIN" ? "global-admin-shell" : role === "ORG_ADMIN" ? "organization-admin-shell" : "";');
    expect(stylesSource).toContain(".global-admin-shell");
    expect(stylesSource).toContain(".organization-admin-shell");
    expect(stylesSource).toContain(".admin-panel-page");
    expect(adminPageSource).toContain('const organizationRoles = ["HSE_MANAGER", "HSE_SPECIALIST", "HSE_OFFICER", "EXTERNAL_AUDITOR", "PERSONNEL", "VIEWER"];');
    expect(adminPageSource).toContain('const organizationAssignableRoles = organizationRoles;');
    expect(adminPageSource).toContain('className="status-badge neutral member-legacy-role"');
    expect(adminPageSource).toContain("`/admin/users/${target.id}/password`");
    expect(adminPageSource).toContain("`/admin/memberships/${membership.id}`");
    expect(adminModuleSource).toContain('"/api/v1/admin/users/:id/password"');
    expect(adminModuleSource).toContain('"/api/v1/admin/memberships/:id"');
  });
});

describe("administrator invitations", () => {
  it("offers only the approved HSE and limited organization roles through member flows", () => {
    const accountSource = readFileSync(new URL("./features/account/AccountPages.tsx", import.meta.url), "utf8");
    expect(accountSource).toContain('const roles = ["HSE_MANAGER", "HSE_SPECIALIST", "HSE_OFFICER", "EXTERNAL_AUDITOR", "PERSONNEL", "VIEWER"];');
    expect(accountSource).toContain("const invitationRoles = [...roles];");
    expect(accountSource).not.toContain('const roles = ["ORG_ADMIN"');
    expect(accountSource).not.toContain('const invitationRoles = ["ORG_ADMIN"');
    expect(accountSource).toContain("const memberRoles = organizationMemberRoles;");
    expect(accountSource).toContain('api("/member-requests"');
    expect(adminPageSource).toContain('`/admin/member-requests/${request.id}/approve`');
    expect(accountSource).toContain('api<{ developmentToken?: string }>("/invitations"');
    expect(i18nSource).toContain('"members.legacyInviteTitle": "دعوت ایمیلی سازگاری"');
    expect(i18nSource).toContain('"members.legacyInviteTitle": "Legacy email invitation"');
    expect(i18nSource).toContain('"role.superAdmin": "مدیر ارشد سیستم"');
    expect(i18nSource).toContain('"role.superAdmin": "Chief system administrator"');
  });
});

describe("activity log migration", () => {
  it("moves the user-facing audit surface to a detailed activity log while preserving the old route", () => {
    expect(appSource).toContain('path="activity-log"');
    expect(appSource).toContain('path="audit" element={<Navigate to="/activity-log" replace />}');
    expect(appLayoutSource).toContain('path: "/activity-log", labelKey: "nav.activityLog"');
    expect(generalPagesSource).toContain('export function ActivityLogPage()');
    expect(generalPagesSource).toContain('useLoad<ActivityLogEntry[]>(activityLogPath)');
    expect(generalPagesSource).toContain('activityLog.assessment');
    expect(generalPagesSource).toContain('item.tokenUsage.totalTokens');
    expect(generalPagesSource).toContain('activityLog.teamDescription');
    expect(generalPagesSource).toContain('item.metadata ? JSON.stringify(item.metadata, null, 2)');
    expect(generalPagesSource).toContain('data-label={t("activityLog.time")}');
    expect(generalPagesSource).toContain('data-label={t("activityLog.details")}');
    expect(stylesSource).toContain('.activity-log-filters { display: grid; grid-template-columns: minmax(0, 1.5fr) repeat(2, minmax(0, 1fr)) minmax(0, auto);');
    expect(stylesSource).toContain('.activity-log-filters input { width: 100%; max-width: 100%; min-width: 0; }');
    expect(stylesSource).toContain('  .activity-log-filters { grid-template-columns: repeat(2, minmax(0, 1fr)); }');
    expect(stylesSource).toContain('  .activity-log-filter-actions { grid-column: 1 / -1; justify-content: flex-start; }');
    expect(stylesSource).toContain('.responsive-table-container[data-responsive="cards"] > table > tbody');
    expect(stylesSource).toContain('.activity-log-table tbody > tr.activity-log-detail-row { display: block;');
    expect(i18nSource).toContain('"nav.activityLog": "لاگ فعالیت"');
    expect(appLayoutSource).toContain('path: "/activity-log", labelKey: "nav.activityLog", icon: "audit", scope: "all"');
  });
});

describe("responsive data tables", () => {
  it("uses one labelled table container contract across desktop, tablet and phone", () => {
    expect(uiSource).toContain("export function TableContainer");
    expect(uiSource).toContain('data-responsive={mobileCards ? "cards" : "scroll"}');
    expect(stylesSource).toContain(".responsive-table-container");
    expect(stylesSource).toContain("overscroll-behavior-inline: contain");
    expect(stylesSource).toContain("@media (min-width: 768px) and (max-width: 1279px)");
    expect(stylesSource).toContain("@media (max-width: 767px)");
    expect(stylesSource).not.toContain("table { width: 100%; border-collapse: collapse; white-space: nowrap; }");
    expect(stylesSource).not.toContain(".table-wrap:has(.styled-select.is-open)");
  });

  it("keeps dense assessment, action, activity and administration rows labelled for mobile cards", () => {
    expect(assessmentPagesSource).toContain('fmea-risk-table');
    expect(assessmentPagesSource).toContain('data-label={t("assessment.existingControls")}');
    expect(assessmentPagesSource).toContain('fmea-report-data-table');
    expect(assessmentPagesSource).toContain('className="rula-analysis-table"');
    expect(assessmentPagesSource).toContain('assessment-report-table rula-report-data-table');
    expect(assessmentPagesSource).toContain('assessment-report-table rula-correction-table');
    expect(generalPagesSource).toContain('className="actions-data-table"');
    expect(generalPagesSource).toContain('data-label={t("actions.progress")}');
    expect(generalPagesSource).toContain('className="activity-log-table"');
    expect(generalPagesSource).toContain('data-label={t("activityLog.details")}');
    expect(adminPageSource).toContain('className="admin-ai-usage-table"');
    expect(adminPageSource).toContain('className="admin-user-table"');
    expect(adminPageSource).toContain('data-label={t("admin.organizationsColumn")}');
  });
});

describe("modular CSS architecture", () => {
  it("keeps a small entry point and an explicit, stable import order", () => {
    expect(stylesEntrySource.trim()).toBe('@import "./styles/index.css";');
    const requiredModules = [
      "tokens.css",
      "base.css",
      "layout.css",
      "buttons.css",
      "forms.css",
      "tables.css",
      "overlays.css",
      "themes.css",
      "features/fmea-process.css",
      "features/fmea-details.css",
      "features/rula-report.css",
      "features/rula-table-cards.css",
      "features/rula-mobile.css",
      "responsive.css",
    ];
    for (const module of requiredModules) {
      expect(stylesIndexSource).toContain(`@import "./${module}";`);
    }
    expect(stylesIndexSource.indexOf('@import "./tokens.css";')).toBeLessThan(stylesIndexSource.indexOf('@import "./base.css";'));
    expect(stylesIndexSource.indexOf('@import "./base.css";')).toBeLessThan(stylesIndexSource.indexOf('@import "./layout.css";'));
    expect(stylesIndexSource.indexOf('@import "./layout.css";')).toBeLessThan(stylesIndexSource.indexOf('@import "./features/fmea-process.css";'));
  });

  it("does not reintroduce the removed overflow workarounds", () => {
    expect(stylesSource).not.toContain(".surface:has(.styled-select.is-open)");
    expect(stylesSource).not.toContain(".table-wrap:has(.styled-select.is-open)");
    expect(stylesSource).not.toContain("table { width: 100%; border-collapse: collapse; white-space: nowrap; }");
    expect(stylesSource).toContain(".table-wrap");
    expect(stylesSource).toContain("overflow-x: auto");
  });
});
