import { NotificationsPage } from './pages/NotificationsPage';
import { FeedbackProvider, LanguageProvider } from '@pixellift/ui';
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import { AdminLayout } from './components/AdminLayout';
import { OverviewPage } from './pages/OverviewPage';
import { UsersPage } from './pages/UsersPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { PresetsPage } from './pages/PresetsPage';
import { MembershipsPage } from './pages/MembershipsPage';
import { TicketsPage } from './pages/TicketsPage';
import { ReportsPage } from './pages/ReportsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AdminManagementPage } from './pages/AdminManagementPage';
import { AdminLoginPage } from './pages/AdminLoginPage';

const ProtectedAdminRoutes: React.FC = () => {
  const { adminUser, isLoading } = useAdminAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-xs text-slate-500 dark:text-slate-400">
        Memverifikasi sesi administrator...
      </div>
    );
  }

  if (!adminUser) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AdminLayout>
      <Routes>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/background-removal" element={<ProjectsPage />} />
        <Route path="/transactions" element={<MembershipsPage />} />
        <Route path="/memberships" element={<MembershipsPage />} />
        <Route path="/support-tickets" element={<TicketsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/presets" element={<PresetsPage />} />
        <Route path="/audit-logs" element={<AuditLogsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/admin-management" element={<AdminManagementPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AdminLayout>
  );
};

export const App: React.FC = () => {
  return (
    <FeedbackProvider>
      <LanguageProvider>
        <div className="admin-app">
          <ThemeProvider>
            <AdminAuthProvider>
              <Router>
                <Routes>
                  <Route path="/login" element={<AdminLoginPage />} />
                  <Route path="/*" element={<ProtectedAdminRoutes />} />
                </Routes>
              </Router>
            </AdminAuthProvider>
          </ThemeProvider>
        </div>
      </LanguageProvider>
    </FeedbackProvider>
  );
};
