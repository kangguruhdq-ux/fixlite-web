import { DashboardPage } from './pages/DashboardPage';
import { FeedbackProvider, LanguageProvider } from '@pixellift/ui';
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { EditorPage } from './pages/EditorPage';
import { SettingsPage } from './pages/SettingsPage';
import { SubscriptionPage } from './pages/SubscriptionPage';
import { SupportPage } from './pages/SupportPage';
import { AuthPage } from './pages/AuthPage';

export const App: React.FC = () => {
  return (
    <FeedbackProvider>
      <LanguageProvider>
        <ThemeProvider>
          <AuthProvider>
            <Router>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/login" element={<AuthPage />} />
                <Route path="/register" element={<AuthPage />} />
                <Route path="/projects" element={<DashboardPage />} />
                <Route path="/editor" element={<EditorPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/subscription" element={<SubscriptionPage />} />
                <Route path="/support" element={<SupportPage />} />
              </Routes>
            </Router>
          </AuthProvider>
        </ThemeProvider>
      </LanguageProvider>
    </FeedbackProvider>
  );
};
