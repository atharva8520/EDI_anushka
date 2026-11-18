import { useState, useEffect, useCallback } from "react";
import { Link, NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  User,
  Compass,
  Users,
  Mail,
  FolderKanban,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Building2,
  Trophy,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Logo } from "./Logo";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { api } from "../api/client";

export function AppLayout() {
  const { profile, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [inviteCount, setInviteCount] = useState<number>(0);

  const fetchInvites = useCallback(() => {
    if (role === "student" || profile?.role === "student") {
      api
        .get("/invites")
        .then((res) => {
          if (Array.isArray(res.data)) {
            setInviteCount(res.data.length);
          }
        })
        .catch(() => {});
    }
  }, [role, profile?.role]);

  useEffect(() => {
    fetchInvites();
    const handleRefresh = () => fetchInvites();
    window.addEventListener("refresh-invites", handleRefresh);
    return () => window.removeEventListener("refresh-invites", handleRefresh);
  }, [fetchInvites]);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const navItems = [
    { label: "Dashboard", href: "/app", icon: LayoutDashboard, exact: true },
    { label: "Hackathons", href: "/app/hackathons", icon: Compass },
    { label: "Companies", href: "/app/companies", icon: Building2 },
    { label: "Showcase", href: "/app/projects", icon: Trophy },
    { label: "Host Event", href: "/app/host", icon: Sparkles },
    { label: "My Team", href: "/app/team", icon: Users },
    { label: "Invites", href: "/app/invites", icon: Mail },
    { label: "Project Workspace", href: "/app/workspace", icon: FolderKanban },
    { label: "Profile", href: "/app/profile", icon: User },
  ];

  if (role === "admin") {
    navItems.push({ label: "Admin Panel", href: "/app/admin", icon: ShieldCheck });
  }

  function isItemActive(item: { href: string; exact?: boolean }) {
    if (item.exact) {
      return location.pathname === item.href;
    }
    return location.pathname.startsWith(item.href);
  }

  const displayName = profile?.full_name || "Builder";
  const displayRole = role || profile?.role || "student";

  const navContent = (
    <div className="flex h-full flex-col justify-between">
      <div>
        <div className="px-5 py-5 border-b border-line flex items-center justify-between">
          <Link to="/app" onClick={() => setMobileOpen(false)}>
            <Logo />
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden rounded-btn p-1 text-mute hover:bg-slate-800 transition"
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item);
            return (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-btn px-3.5 py-2.5 text-sm transition-all duration-200 ${
                  active
                    ? "bg-gradient-to-r from-primary/20 via-primary/10 to-transparent text-cyan font-semibold border-l-2 border-cyan shadow-[0_0_15px_rgba(0,242,254,0.12)]"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100 font-medium"
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? "text-cyan" : "text-slate-400"}`} />
                <span className="flex-1">{item.label}</span>
                {item.href === "/app/invites" && inviteCount > 0 ? (
                  <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-white shadow-glow">
                    {inviteCount}
                  </span>
                ) : null}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-line bg-surface-card/60 backdrop-blur-md">
        <div className="flex items-center gap-3 mb-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-tr from-primary to-cyan text-white font-bold text-sm shadow-[0_0_12px_rgba(99,102,241,0.4)]">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-ink">{displayName}</p>
            <div className="mt-0.5">
              <Badge tone={displayRole === "admin" ? "warning" : "primary"}>
                {displayRole.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>
        <Button
          variant="secondary"
          onClick={handleLogout}
          className="w-full justify-center gap-1.5 text-xs py-2"
        >
          <LogOut className="h-3.5 w-3.5 text-mute" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col md:flex-row">
      {/* Mobile Top Bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface/95 backdrop-blur-md px-4 py-3 md:hidden">
        <Link to="/app">
          <Logo />
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-btn border border-line p-2 text-ink hover:bg-slate-800 transition"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Mobile Drawer Backdrop and Drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-72 bg-surface border-r border-line shadow-2xl z-50">
            {navContent}
          </div>
        </div>
      ) : null}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col border-r border-line bg-surface/90 backdrop-blur-xl shrink-0">
        {navContent}
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 flex flex-col min-w-0 bg-canvas overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
