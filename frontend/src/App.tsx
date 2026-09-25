import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { getCurrentRole, getSession } from "./api/client";
import { AccessGuard, AppLayout } from "./layout/AppLayout";
import { PwaManager } from "./pwa/PwaManager";
import { AcceptInvitationPage, ForgotPasswordPage, LoginPage, MembersPage, ProfilePage, ResetPasswordPage } from "./features/account/AccountPages";
import { PathSelectionPage, RegisterPage } from "./features/account/RegistrationPage";
import { FmeaPage, FmeaReportPage, RulaPage, RulaReportPage } from "./features/assessments/AssessmentPages";
import { AssistantPage } from "./features/assistant/AssistantPage";
import { FilesPage } from "./features/files/FilesPage";
import { ActionsPage, ActivityLogPage, ComingSoonPage, DashboardPage, HealthPage, KnowledgePage, NotificationsPage, OrganizationsPage, ProjectsPage } from "./features/general/GeneralPages";
import { DialogProvider, FormInteractionEnhancer, PageLoadingScreen } from "./components/UI";
import { useI18n } from "./i18n";
import { RequiredFieldValidation } from "./forms/requiredFieldValidation";
import { AdminPanelPage, OrganizationAdminPanelPage } from "./features/admin/AdminPanelPage";

function ProtectedLayout() { return getSession().session ? <AppLayout /> : <Navigate to="/login" replace />; }
function AdminRoute() { return getCurrentRole() === "SUPER_ADMIN" ? <AdminPanelPage /> : <OrganizationAdminPanelPage />; }
function NotFound() { const { t } = useI18n(); return <div className="state"><h2>{t("shell.notFound")}</h2><a href="/">{t("shell.backToDashboard")}</a></div>; }

function RouteTransitionLoader() {
  const location = useLocation();
  const routeKey = `${location.pathname}${location.search}`;
  const [settledRouteKey, setSettledRouteKey] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setSettledRouteKey(routeKey), 420);
    return () => window.clearTimeout(timer);
  }, [routeKey]);

  return settledRouteKey === routeKey ? null : <PageLoadingScreen />;
}

function ApplicationRoutes() {
  return <>
    <Routes>
      <Route path="/login" element={<LoginPage />} /><Route path="/register" element={<RegisterPage />} /><Route path="/accept-invitation" element={<AcceptInvitationPage />} /><Route path="/forgot-password" element={<ForgotPasswordPage />} /><Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route element={<ProtectedLayout />}><Route index element={<DashboardPage />} /><Route path="choose-path" element={<PathSelectionPage />} /><Route path="projects" element={<ProjectsPage />} /><Route path="fmea" element={<FmeaPage />} /><Route path="fmea/:id/report" element={<FmeaReportPage />} /><Route path="rula" element={<RulaPage />} /><Route path="rula/:id/report" element={<RulaReportPage />} /><Route path="actions" element={<ActionsPage />} /><Route path="checklists" element={<ComingSoonPage titleKey="nav.checklists" descriptionKey="comingSoon.checklistsDescription" icon="audit" />} /><Route path="incidents" element={<ComingSoonPage titleKey="nav.incidents" descriptionKey="comingSoon.incidentsDescription" icon="warning" />} /><Route path="files" element={<FilesPage />} /><Route path="knowledge" element={<KnowledgePage />} /><Route path="assistant" element={<AssistantPage />} /><Route path="notifications" element={<NotificationsPage />} /><Route path="profile" element={<ProfilePage />} />
        <Route path="members" element={<AccessGuard roles={["SUPER_ADMIN", "ORG_ADMIN", "HSE_MANAGER"]}><MembersPage /></AccessGuard>} />
        <Route path="admin" element={<AccessGuard roles={["SUPER_ADMIN", "ORG_ADMIN"]}><AdminRoute /></AccessGuard>} />
        <Route path="activity-log" element={<ActivityLogPage />} />
        <Route path="audit" element={<Navigate to="/activity-log" replace />} />
        <Route path="health" element={<AccessGuard roles={["SUPER_ADMIN", "ORG_ADMIN"]}><HealthPage /></AccessGuard>} />
        <Route path="organizations" element={<OrganizationsPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
    <RouteTransitionLoader />
  </>;
}

export default function App() {
  return <DialogProvider><FormInteractionEnhancer/><RequiredFieldValidation/><BrowserRouter><ApplicationRoutes /></BrowserRouter><PwaManager /></DialogProvider>;
}
