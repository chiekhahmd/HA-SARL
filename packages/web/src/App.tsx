import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { TenantProvider } from './tenant/TenantProvider';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { WorkersPage } from './pages/WorkersPage';
import { TimeEntriesPage } from './pages/TimeEntriesPage';
import { AbsencesPage } from './pages/AbsencesPage';
import { MaterialsPage } from './pages/MaterialsPage';
import { VehiclesPage } from './pages/VehiclesPage';
import { ReportsPage } from './pages/ReportsPage';
import { UsersPage } from './pages/UsersPage';

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <TenantProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/workers" element={<WorkersPage />} />
          <Route path="/time-entries" element={<TimeEntriesPage />} />
          <Route path="/absences" element={<AbsencesPage />} />
          <Route path="/materials" element={<MaterialsPage />} />
          <Route path="/vehicles" element={<VehiclesPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </TenantProvider>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
