import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { useAuthStore } from "@/stores/authStore";

// Auth
import LoginPage from "@/pages/auth/LoginPage";
import SignupPage from "@/pages/auth/SignupPage";

// Public signing pages
import SigningPage from "@/pages/signing/SigningPage";
import SigningSuccessPage from "@/pages/signing/SigningSuccessPage";

// Layout
import AppShell from "@/components/layout/AppShell";

// Pages
import DashboardPage from "@/pages/dashboard/DashboardPage";
import DocumentsPage from "@/pages/documents/DocumentsPage";
import NewDocumentPage from "@/pages/documents/NewDocumentPage";
import DocumentDetailPage from "@/pages/documents/DocumentDetailPage";
import PrepareDocumentPage from "@/pages/documents/PrepareDocumentPage";
import DocumentActivityPage from "@/pages/documents/DocumentActivityPage";
import SentPage from "@/pages/documents/SentPage";
import DraftsPage from "@/pages/documents/DraftsPage";
import CompletedPage from "@/pages/documents/CompletedPage";
import SettingsPage from "@/pages/settings/SettingsPage";

export default function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          style: {
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: "14px",
          },
        }}
      />
      <Routes>
        {/* Root redirect */}
        <Route
          path="/"
          element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />}
        />

        {/* Auth routes */}
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
        />
        <Route
          path="/signup"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <SignupPage />}
        />

        {/* Public account-less signing routes */}
        <Route path="/sign/:token" element={<SigningPage />} />
        <Route path="/sign/:token/success" element={<SigningSuccessPage />} />

        {/* Protected App Routes */}
        <Route
          element={isAuthenticated ? <AppShell /> : <Navigate to="/login" replace />}
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/documents/new" element={<NewDocumentPage />} />
          <Route path="/documents/:id" element={<DocumentDetailPage />} />
          <Route path="/documents/:id/prepare" element={<PrepareDocumentPage />} />
          <Route path="/documents/:id/activity" element={<DocumentActivityPage />} />
          <Route path="/sent" element={<SentPage />} />
          <Route path="/drafts" element={<DraftsPage />} />
          <Route path="/completed" element={<CompletedPage />} />
          <Route path="/settings/*" element={<SettingsPage />} />
        </Route>

        {/* Catch all */}
        <Route
          path="*"
          element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}
