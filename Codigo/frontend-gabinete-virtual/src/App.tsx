import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./layouts/app-layout";
import { PERMISSION_CODES } from "./lib/permission-codes";
import { PublicLayout } from "./layouts/public-layout";
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
import { ProjectLawsPage } from "./pages/project-laws-page";
import { RolesPage } from "./pages/roles-page";
import { UsersPage } from "./pages/users-page";

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <PublicOnlyRoute allowHome>
            <HomePage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/conheca"
        element={
          <PublicOnlyRoute allowHome>
            <HomePage />
          </PublicOnlyRoute>
        }
      />
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
            <AppLayout>
              <DashboardPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/painel/papeis"
        element={
          <ProtectedRoute>
            <PermissionRoute permission={PERMISSION_CODES.ROLES_VIEW}>
              <AppLayout>
                <RolesPage />
              </AppLayout>
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/painel/usuarios"
        element={
          <ProtectedRoute>
            <PermissionRoute permission={PERMISSION_CODES.USERS_VIEW}>
              <AppLayout>
                <UsersPage />
              </AppLayout>
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/painel/demandas"
        element={
          <ProtectedRoute>
            <PermissionRoute permission={PERMISSION_CODES.DEMANDS_MANAGE}>
              <AppLayout>
                <DemandsPage />
              </AppLayout>
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/painel/emendas"
        element={
          <ProtectedRoute>
            <PermissionRoute permission={PERMISSION_CODES.AMENDMENTS_MANAGE}>
              <AppLayout>
                <AmendmentsPage />
              </AppLayout>
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/painel/projetos-de-lei"
        element={
          <ProtectedRoute>
            <PermissionRoute permission={PERMISSION_CODES.PROJECT_LAWS_MANAGE}>
              <AppLayout>
                <ProjectLawsPage />
              </AppLayout>
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/painel/agenda"
        element={
          <ProtectedRoute>
            <PermissionRoute permission={PERMISSION_CODES.AGENDA_MANAGE}>
              <AppLayout>
                <AgendaPage />
              </AppLayout>
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/painel/cms"
        element={
          <ProtectedRoute>
            <PermissionRoute permission={PERMISSION_CODES.CMS_MANAGE}>
              <AppLayout>
                <CmsPage />
              </AppLayout>
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
