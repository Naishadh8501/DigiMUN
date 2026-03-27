import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';

// Contexts
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { CommitteeProvider } from '@/contexts/CommitteeContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

// Layout Component
import Layout from '@/components/Layout';

// Pages
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import DelegatesPage from '@/pages/DelegatesPage';
import SpeakersList from '@/pages/SpeakersList';
import MotionsPage from '@/pages/MotionsPage';
import VotingPage from '@/pages/VotingPage';
import EChitPage from '@/pages/EChitPage';
import ResolutionsPage from '@/pages/ResolutionsPage';
import VerbatimPage from '@/pages/VerbatimPage';
import ActivityLogPage from '@/pages/ActivityLogPage';
import AdminPanel from '@/pages/AdminPanel';

// --- Protected Route Wrapper ---
// Redirects to login if the user doesn't have a role assigned
const ProtectedRoute = ({ children, requireAdmin = false }: { children: React.ReactNode, requireAdmin?: boolean }) => {
  const { role, isAdmin } = useAuth();
  const location = useLocation();

  if (!role) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CommitteeProvider>
          <Router>
            <Toaster position="top-right" richColors closeButton />
            <Routes>
              {/* Public Route */}
              <Route path="/login" element={<Login />} />

              {/* Protected Routes wrapped in your custom Layout */}
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout><Dashboard /></Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/delegates" element={
                <ProtectedRoute>
                  <Layout><DelegatesPage /></Layout>
                </ProtectedRoute>
              } />

              <Route path="/speakers" element={
                <ProtectedRoute>
                  <Layout><SpeakersList /></Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/motions" element={
                <ProtectedRoute>
                  <Layout><MotionsPage /></Layout>
                </ProtectedRoute>
              } />

              <Route path="/voting" element={
                <ProtectedRoute>
                  <Layout><VotingPage /></Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/echit" element={
                <ProtectedRoute>
                  <Layout><EChitPage /></Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/resolutions" element={
                <ProtectedRoute>
                  <Layout><ResolutionsPage /></Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/verbatim" element={
                <ProtectedRoute>
                  <Layout><VerbatimPage /></Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/activity" element={
                <ProtectedRoute>
                  <Layout><ActivityLogPage /></Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/admin" element={
                <ProtectedRoute requireAdmin>
                  <Layout><AdminPanel /></Layout>
                </ProtectedRoute>
              } />

              {/* Fallback Route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </CommitteeProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}