import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./layouts/app-layout";
import { PERMISSION_CODES } from "./lib/permission-codes";
import { PublicLayout } from "./layouts/public-layout";
import { PublicSiteLayout } from "./components/domains/public/public-site-layout";
import { ProtectedRoute } from "./routes/protected-route";
import { PermissionRoute } from "./routes/permission-route";
import { PublicOnlyRoute } from "./routes/public-only-route";
import { AgendaPage } from "./pages/agenda-page";
import { DashboardPage } from "./pages/dashboard-page";
import { AmendmentsPage } from "./pages/amendments-page";
import { CmsPage } from "./pages/cms-page";
import { DemandsPage } from "./pages/demands-page";
import { HomePage } from "./pages/home-page";
import { LoginPage } from "./pages/login-page";
import { AboutPage } from "./pages/about-page";
import { ProjectLawsPage } from "./pages/project-laws-page";
import { PublicActivityPage } from "./pages/public-activity-page";
import { PublicNewsPage } from "./pages/public-news-page";
import { PublicProjectsPage } from "./pages/public-projects-page";
import { RemindersPage } from "./pages/reminders-page";
import { RolesPage } from "./pages/roles-page";
import { UsersPage } from "./pages/users-page";

export default function App() {
  return (
    <Routes>
      <Route
        element={
          <PublicOnlyRoute allowHome>
            <PublicSiteLayout />
          </PublicOnlyRoute>
        }
      >
        <Route path="/" element={<HomePage />} />
        <Route path="/conheca" element={<AboutPage />} />
        <Route path="/atuacao" element={<PublicActivityPage />} />
        <Route path="/projetos" element={<PublicProjectsPage />} />
        <Route path="/noticias" element={<PublicNewsPage />} />
      </Route>
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <PublicLayout>
              <LoginPage />
            </PublicLayout>
          </PublicOnlyRoute>
        }
      />
      {/* <Route
        path="/cadastro"
        element={
          <PublicOnlyRoute>
            <PublicLayout>
              <RegisterPage />
            </PublicLayout>
          </PublicOnlyRoute>
        }
      /> */}
      <Route
        path="/painel"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route
          path="lembretes"
          element={<RemindersPage />}
        />
        <Route
          path="papeis"
          element={
            <PermissionRoute permission={PERMISSION_CODES.ROLES_VIEW}>
              <RolesPage />
            </PermissionRoute>
          }
        />
        <Route
          path="usuarios"
          element={
            <PermissionRoute permission={PERMISSION_CODES.USERS_VIEW}>
              <UsersPage />
            </PermissionRoute>
          }
        />
        <Route
          path="demandas"
          element={
            <PermissionRoute permission={PERMISSION_CODES.DEMANDS_MANAGE}>
              <DemandsPage />
            </PermissionRoute>
          }
        />
        <Route
          path="emendas"
          element={
            <PermissionRoute permission={PERMISSION_CODES.AMENDMENTS_MANAGE}>
              <AmendmentsPage />
            </PermissionRoute>
          }
        />
        <Route
          path="projetos-de-lei"
          element={
            <PermissionRoute permission={PERMISSION_CODES.PROJECT_LAWS_MANAGE}>
              <ProjectLawsPage />
            </PermissionRoute>
          }
        />
        <Route
          path="agenda"
          element={
            <PermissionRoute permission={PERMISSION_CODES.AGENDA_MANAGE}>
              <AgendaPage />
            </PermissionRoute>
          }
        />
        <Route
          path="cms"
          element={
            <PermissionRoute permission={PERMISSION_CODES.CMS_MANAGE}>
              <CmsPage />
            </PermissionRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
