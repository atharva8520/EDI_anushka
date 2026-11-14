import { Routes, Route, Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "./context/AuthContext";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardAppPage } from "./pages/DashboardAppPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { HackathonListPage } from "./pages/hackathons/HackathonListPage";
import { HackathonDetailPage } from "./pages/hackathons/HackathonDetailPage";
import { ProblemDetailPage } from "./pages/hackathons/ProblemDetailPage";
import { AppLayout } from "./components/AppLayout";
import { ProfilePage } from "./pages/ProfilePage";
import { AdminLayout } from "./pages/admin/AdminLayout";
import { AdminOverviewPage } from "./pages/admin/AdminOverviewPage";
import { AdminHackathonsPage } from "./pages/admin/AdminHackathonsPage";
import { AdminHackathonFormPage } from "./pages/admin/AdminHackathonFormPage";
import { AdminProblemsPage } from "./pages/admin/AdminProblemsPage";
import { AdminTeamsPage } from "./pages/admin/AdminTeamsPage";
import { AdminParticipantsPage } from "./pages/admin/AdminParticipantsPage";
import { TeamPage } from "./pages/teams/TeamPage";
import { TeammateSearchPage } from "./pages/teams/TeammateSearchPage";
import { InvitesPage } from "./pages/teams/InvitesPage";
import { WorkspacePage } from "./pages/workspace/WorkspacePage";

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-3 border-line border-t-primary" />
          <p className="text-xs font-semibold text-mute">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicAuthRoute({ children }: { children: ReactNode }) {
  const { token, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (token) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      {/* Public Landing */}
      <Route path="/" element={<LandingPage />} />

      {/* Auth Routes (Outside authenticated shell) */}
      <Route
        path="/login"
        element={
          <PublicAuthRoute>
            <LoginPage />
          </PublicAuthRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicAuthRoute>
            <RegisterPage />
          </PublicAuthRoute>
        }
      />

      {/* Authenticated /app Routes (Wrapped in AppLayout) */}
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardAppPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="hackathons" element={<HackathonListPage />} />
        <Route path="hackathons/:id" element={<HackathonDetailPage />} />
        <Route path="hackathons/:id/problems/:problemId" element={<ProblemDetailPage />} />
        <Route path="team" element={<TeamPage />} />
        <Route path="team/find" element={<TeammateSearchPage />} />
        <Route path="invites" element={<InvitesPage />} />
        <Route path="workspace" element={<WorkspacePage />} />
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminOverviewPage />} />
          <Route path="hackathons" element={<AdminHackathonsPage />} />
          <Route path="hackathons/new" element={<AdminHackathonFormPage />} />
          <Route path="hackathons/:id/edit" element={<AdminHackathonFormPage />} />
          <Route path="hackathons/:id/problems" element={<AdminProblemsPage />} />
          <Route path="teams" element={<AdminTeamsPage />} />
          <Route path="participants" element={<AdminParticipantsPage />} />
        </Route>
      </Route>

      {/* 404 Fallback */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
