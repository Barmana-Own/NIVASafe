import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { getSession } from "./api/client";
import { AccessGuard, AppLayout } from "./layout/AppLayout";
import { PwaManager } from "./pwa/PwaManager";
import { AcceptInvitationPage, ForgotPasswordPage, LoginPage, MembersPage, ProfilePage, ResetPasswordPage } from "./features/account/AccountPages";
import { PathSelectionPage, RegisterPage } from "./features/account/RegistrationPage";
import { FmeaPage, RulaPage } from "./features/assessments/AssessmentPages";
import { AssistantPage } from "./features/assistant/AssistantPage";
import { FilesPage } from "./features/files/FilesPage";
import { ActionsPage, AuditPage, DashboardPage, HealthPage, KnowledgePage, NotificationsPage, OrganizationsPage, ProjectsPage } from "./features/general/GeneralPages";
import { DialogProvider } from "./components/UI";

function ProtectedLayout() { return getSession().session ? <AppLayout /> : <Navigate to="/login" replace />; }
function NotFound() { return <div className="state"><h2>صفحه پیدا نشد</h2><a href="/">بازگشت به داشبورد</a></div>; }

export default function App() {
  return <DialogProvider><BrowserRouter><Routes>
    <Route path="/login" element={<LoginPage />} /><Route path="/register" element={<RegisterPage />} /><Route path="/accept-invitation" element={<AcceptInvitationPage />} /><Route path="/forgot-password" element={<ForgotPasswordPage />} /><Route path="/reset-password" element={<ResetPasswordPage />} />
    <Route element={<ProtectedLayout />}><Route index element={<DashboardPage />} /><Route path="choose-path" element={<PathSelectionPage />} /><Route path="projects" element={<ProjectsPage />} /><Route path="fmea" element={<FmeaPage />} /><Route path="rula" element={<RulaPage />} /><Route path="actions" element={<ActionsPage />} /><Route path="files" element={<FilesPage />} /><Route path="knowledge" element={<KnowledgePage />} /><Route path="assistant" element={<AssistantPage />} /><Route path="notifications" element={<NotificationsPage />} /><Route path="profile" element={<ProfilePage />} />
      <Route path="members" element={<AccessGuard roles={["SUPER_ADMIN", "ORG_ADMIN"]}><MembersPage /></AccessGuard>} />
      <Route path="audit" element={<AccessGuard roles={["SUPER_ADMIN", "ORG_ADMIN", "HSE_MANAGER"]}><AuditPage /></AccessGuard>} />
      <Route path="health" element={<AccessGuard roles={["SUPER_ADMIN", "ORG_ADMIN"]}><HealthPage /></AccessGuard>} />
      <Route path="organizations" element={<AccessGuard roles={["SUPER_ADMIN", "ORG_ADMIN"]}><OrganizationsPage /></AccessGuard>} />
      <Route path="*" element={<NotFound />} />
    </Route>
  </Routes></BrowserRouter><PwaManager /></DialogProvider>;
}
