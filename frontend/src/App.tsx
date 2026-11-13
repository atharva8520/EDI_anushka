import { Routes, Route, Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "./context/AuthContext";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardAppPage } from "./pages/DashboardAppPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { HackathonListPage } from "./pages/hackathons/HackathonListPage";
import { HackathonDetailPage } from "./pages/hackathons/HackathonDetailPage";
import { ProblemDetailPage } from "./pages/hackathons/ProblemDetailPage";

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

      {/* Auth Routes */}
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

      {/* Protected App Routes */}
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <DashboardAppPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/profile"
        element={
          <ProtectedRoute>
            <PlaceholderPage
              title="Profile & Skills"
              description="Customize your developer profile, technical proficiencies, portfolio links, and preferred team roles."
            />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/hackathons"
        element={
          <ProtectedRoute>
            <HackathonListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/hackathons/:id"
        element={
          <ProtectedRoute>
            <HackathonDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/hackathons/:id/problems/:problemId"
        element={
          <ProtectedRoute>
            <ProblemDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/team"
        element={
          <ProtectedRoute>
            <PlaceholderPage
              title="Team Hub"
              description="Form multidisciplinary hackathon teams, manage invite codes, and evaluate skill coverage."
            />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/workspace"
        element={
          <ProtectedRoute>
            <PlaceholderPage
              title="Sprint Workspace"
              description="Coordinate milestones, problem solutions, submissions, and demo decks with your teammates."
            />
          </ProtectedRoute>
        }
      />

      {/* 404 Fallback */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
