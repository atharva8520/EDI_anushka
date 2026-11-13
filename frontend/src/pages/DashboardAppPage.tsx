import { Link, useNavigate } from "react-router-dom";
import { LogOut, User as UserIcon, Compass, Users, FolderKanban } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Logo } from "../components/Logo";
import { Button } from "../components/Button";
import { Badge } from "../components/Badge";
import { Card } from "../components/States";

export function DashboardAppPage() {
  const { profile, role, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const displayName = profile?.full_name || "Builder";
  const displayEmail = profile?.email || "";
  const displayRole = role || profile?.role || "student";

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-line bg-white/80 px-6 py-3.5 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/app">
              <Logo />
            </Link>
            <nav className="hidden items-center gap-4 text-sm font-medium text-mute sm:flex">
              <Link to="/app" className="text-primary font-semibold">
                Overview
              </Link>
              <Link to="/app/hackathons" className="hover:text-ink">
                Hackathons
              </Link>
              <Link to="/app/team" className="hover:text-ink">
                Team
              </Link>
              <Link to="/app/workspace" className="hover:text-ink">
                Workspace
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/app/profile">
              <Button variant="ghost" className="gap-2 text-xs">
                <UserIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Profile</span>
              </Button>
            </Link>
            <Button variant="secondary" onClick={handleLogout} className="gap-1.5 text-xs">
              <LogOut className="h-4 w-4 text-mute" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black tracking-tight text-ink md:text-3xl">
                Welcome back, {displayName}
              </h1>
              <Badge tone={displayRole === "admin" ? "warning" : "primary"}>
                {displayRole.toUpperCase()}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-mute">
              {displayEmail ? `${displayEmail} · ` : ""}HackNova student workspace is initialized.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/app/hackathons">
              <Button variant="primary" className="text-xs">
                Explore Hackathons
              </Button>
            </Link>
          </div>
        </div>

        {/* Status card */}
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-btn bg-primary/10 text-primary">
                <Compass className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Hackathons</h3>
                <p className="text-xs text-mute">Discover & apply</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-mute leading-relaxed">
              Browse campus events and find challenges aligned with your tech stack.
            </p>
            <div className="mt-4">
              <Link to="/app/hackathons">
                <Button variant="secondary" className="w-full text-xs">View Hackathons</Button>
              </Link>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-btn bg-[#20B8E6]/10 text-[#20B8E6]">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Squad Formation</h3>
                <p className="text-xs text-mute">Invite & match</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-mute leading-relaxed">
              Create a team or join teammates using peer invite codes and skills matching.
            </p>
            <div className="mt-4">
              <Link to="/app/team">
                <Button variant="secondary" className="w-full text-xs">Manage Team</Button>
              </Link>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-btn bg-[#8B5CF6]/10 text-[#8B5CF6]">
                <FolderKanban className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Project Workspace</h3>
                <p className="text-xs text-mute">Sprints & submission</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-mute leading-relaxed">
              Coordinate team tasks, milestones, deliverables, and hackathon presentation.
            </p>
            <div className="mt-4">
              <Link to="/app/workspace">
                <Button variant="secondary" className="w-full text-xs">Open Workspace</Button>
              </Link>
            </div>
          </Card>
        </div>

        {/* Minimal info banner */}
        <div className="mt-8 rounded-card border border-primary/20 bg-primary/5 p-6 text-sm text-mute">
          <p className="font-semibold text-ink">Module 1 Authentication & App Shell Active</p>
          <p className="mt-1">
            Authentication flow is verified. The full interactive dashboard and real-time team matching views will be loaded in Module 2.
          </p>
        </div>
      </main>
    </div>
  );
}
