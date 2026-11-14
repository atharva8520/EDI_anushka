import { useState } from "react";
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
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Logo } from "./Logo";
import { Badge } from "./Badge";
import { Button } from "./Button";

export function AppLayout() {
  const { profile, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const navItems = [
    { label: "Dashboard", href: "/app", icon: LayoutDashboard, exact: true },
    { label: "Profile", href: "/app/profile", icon: User },
    { label: "Hackathons", href: "/app/hackathons", icon: Compass },
    { label: "My Team", href: "/app/team", icon: Users },
    { label: "Invites", href: "/app/invites", icon: Mail },
    { label: "Project Workspace", href: "/app/workspace", icon: FolderKanban },
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
            className="md:hidden rounded-btn p-1 text-mute hover:bg-canvas"
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
                className={`flex items-center gap-3 rounded-btn px-3.5 py-2.5 text-sm transition ${
                  active
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-mute hover:bg-canvas hover:text-ink font-medium"
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? "text-primary" : "text-mute"}`} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-line bg-white/50">
        <div className="flex items-center gap-3 mb-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary font-bold text-sm">
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
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-white px-4 py-3 md:hidden">
        <Link to="/app">
          <Logo />
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-btn border border-line p-2 text-ink hover:bg-canvas"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Mobile Drawer Backdrop and Drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-[#111827]/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-lift z-10 flex flex-col">
            {navContent}
          </div>
        </div>
      ) : null}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col md:border-r md:border-line md:bg-white md:sticky md:top-0 md:h-screen">
        {navContent}
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        <Outlet />
      </div>
    </div>
  );
}
