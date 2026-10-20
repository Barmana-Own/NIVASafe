import { lazy, Suspense } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";
import { LegalPolicyPage } from "./features/account/ImageProcessingConsent";
import { getCurrentRole, getSession } from "./api/client";
import { AccessGuard, AppLayout } from "./layout/AppLayout";
import { PwaManager } from "./pwa/PwaManager";
import { useStaticRouteWarmup } from "./pwa/staticRouteWarmup";
import { RouteRecovery } from "./components/RouteRecovery";
import { DialogProvider, EmptyState, FormInteractionEnhancer, PageLoadingScreen } from "./components/UI";
import { useI18n } from "./i18n";
import { RequiredFieldValidation } from "./forms/requiredFieldValidation";
const loadAccount = () => import("./features/account/AccountPages");
const loadRegistration = () => import("./features/account/RegistrationPage");
const loadAssessments = () => import("./features/assessments/AssessmentPages");
const loadAssistant = () => import("./features/assistant/AssistantPage");
const loadFiles = () => import("./features/files/FilesPage");
const loadGeneral = () => import("./features/general/GeneralPages");
const loadAdministration = () => import("./features/admin/AdminPanelPage");
const loadSupport = () => import("./features/support/SupportPage");
const loadChecklists = () => import("./features/checklists/ChecklistsPage");
const loadIncidents = () => import("./features/incidents/IncidentsPage");
const staticRoutes = [loadAccount, loadRegistration, loadAssessments, loadAssistant, loadFiles, loadGeneral, loadAdministration, loadSupport, loadChecklists, loadIncidents];

const LoginPage = lazy(() => loadAccount().then((module) => ({ default: module.LoginPage })));
const AcceptInvitationPage = lazy(() => loadAccount().then((module) => ({ default: module.AcceptInvitationPage })));
const ForgotPasswordPage = lazy(() => loadAccount().then((module) => ({ default: module.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => loadAccount().then((module) => ({ default: module.ResetPasswordPage })));
const MembersPage = lazy(() => loadAccount().then((module) => ({ default: module.MembersPage })));
const ProfilePage = lazy(() => loadAccount().then((module) => ({ default: module.ProfilePage })));
const RegisterPage = lazy(() => loadRegistration().then((module) => ({ default: module.RegisterPage })));
const PathSelectionPage = lazy(() => loadRegistration().then((module) => ({ default: module.PathSelectionPage })));
const FmeaPage = lazy(() => loadAssessments().then((module) => ({ default: module.FmeaPage })));
const FmeaReportPage = lazy(() => loadAssessments().then((module) => ({ default: module.FmeaReportPage })));
const RulaPage = lazy(() => loadAssessments().then((module) => ({ default: module.RulaPage })));
const RulaReportPage = lazy(() => loadAssessments().then((module) => ({ default: module.RulaReportPage })));
const AssistantPage = lazy(() => loadAssistant().then((module) => ({ default: module.AssistantPage })));
const FilesPage = lazy(() => loadFiles().then((module) => ({ default: module.FilesPage })));
const DashboardPage = lazy(() => loadGeneral().then((module) => ({ default: module.DashboardPage })));
const ProjectsPage = lazy(() => loadGeneral().then((module) => ({ default: module.ProjectsPage })));
const ActionsPage = lazy(() => loadGeneral().then((module) => ({ default: module.ActionsPage })));
const KnowledgePage = lazy(() => loadGeneral().then((module) => ({ default: module.KnowledgePage })));
const OrganizationsPage = lazy(() => loadGeneral().then((module) => ({ default: module.OrganizationsPage })));
const NotificationsPage = lazy(() => loadGeneral().then((module) => ({ default: module.NotificationsPage })));
const ActivityLogPage = lazy(() => loadGeneral().then((module) => ({ default: module.ActivityLogPage })));
const HealthPage = lazy(() => loadGeneral().then((module) => ({ default: module.HealthPage })));
const AdminPanelPage = lazy(() => loadAdministration().then((module) => ({ default: module.AdminPanelPage })));
const OrganizationAdminPanelPage = lazy(() => loadAdministration().then((module) => ({ default: module.OrganizationAdminPanelPage })));
const SupportPage = lazy(() => loadSupport().then((module) => ({ default: module.SupportPage })));
const ChecklistsPage = lazy(() => loadChecklists().then((module) => ({ default: module.ChecklistsPage })));
const IncidentsPage = lazy(() => loadIncidents().then((module) => ({ default: module.IncidentsPage })));

function ProtectedLayout() { return getSession().session ? <AppLayout /> : <Navigate to="/login" replace />; }
function AdminRoute() { return getCurrentRole() === "SUPER_ADMIN" ? <AdminPanelPage /> : <OrganizationAdminPanelPage />; }
function NotFound() { const { t } = useI18n(); return <EmptyState icon="search" title={t("shell.notFound")} description={t("redesign.notFoundDescription")} action={<Link className="primary button-link" to="/">{t("shell.backToDashboard")}</Link>}/>; }

function ApplicationRoutes() {
  return <RouteRecovery><Suspense fallback={<PageLoadingScreen />}>
    <Routes>
      <Route path="/login" element={<LoginPage />} /><Route path="/register" element={<RegisterPage />} /><Route path="/terms" element={<LegalPolicyPage kind="terms"/>}/><Route path="/privacy" element={<LegalPolicyPage kind="privacy"/>}/><Route path="/accept-invitation" element={<AcceptInvitationPage />} /><Route path="/forgot-password" element={<ForgotPasswordPage />} /><Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route element={<ProtectedLayout />}><Route index element={<DashboardPage />} /><Route path="choose-path" element={<PathSelectionPage />} /><Route path="projects" element={<ProjectsPage />} /><Route path="fmea" element={<FmeaPage />} /><Route path="fmea/:id/report" element={<FmeaReportPage />} /><Route path="rula" element={<RulaPage />} /><Route path="rula/:id/report" element={<RulaReportPage />} /><Route path="actions" element={<ActionsPage />} /><Route path="checklists" element={<AccessGuard roles={["SUPER_ADMIN", "ORG_ADMIN", "HSE_MANAGER", "HSE_SPECIALIST", "HSE_OFFICER", "EXTERNAL_AUDITOR", "ASSESSOR"]}><ChecklistsPage /></AccessGuard>} /><Route path="incidents" element={<IncidentsPage />} /><Route path="files" element={<FilesPage />} /><Route path="knowledge" element={<KnowledgePage />} /><Route path="assistant" element={<AssistantPage />} /><Route path="notifications" element={<NotificationsPage />} /><Route path="support" element={<SupportPage />} /><Route path="profile" element={<ProfilePage />} />
        <Route path="members" element={<AccessGuard roles={["SUPER_ADMIN", "ORG_ADMIN", "HSE_MANAGER"]}><MembersPage /></AccessGuard>} />
        <Route path="admin" element={<AccessGuard roles={["SUPER_ADMIN", "ORG_ADMIN"]}><AdminRoute /></AccessGuard>} />
        <Route path="activity-log" element={<ActivityLogPage />} />
        <Route path="audit" element={<Navigate to="/activity-log" replace />} />
        <Route path="health" element={<AccessGuard roles={["SUPER_ADMIN", "ORG_ADMIN"]}><HealthPage /></AccessGuard>} />
        <Route path="organizations" element={<AccessGuard roles={["SUPER_ADMIN", "ORG_ADMIN"]}><OrganizationsPage /></AccessGuard>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  </Suspense></RouteRecovery>;
}

export default function App() {
  return <DialogProvider><FormInteractionEnhancer/><RequiredFieldValidation/><BrowserRouter><ApplicationRoutes /></BrowserRouter><PwaManager /></DialogProvider>;
}
