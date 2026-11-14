import { Navigate, NavLink, Link, Outlet, useLocation } from "react-router-dom";
import { ShieldCheck, BarChart3, Compass, Users2, UserCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export function AdminLayout() {
  const { role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex-1 p-8 grid place-items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-line border-t-primary" />
      </div>
    );
  }

  if (role !== "admin") {
    return <Navigate to="/app" replace />;
  }

  const tabs = [
    { label: "Overview", href: "/app/admin", icon: BarChart3, exact: true },
    { label: "Hackathons", href: "/app/admin/hackathons", icon: Compass },
    { label: "Teams", href: "/app/admin/teams", icon: Users2 },
    { label: "Participants", href: "/app/admin/participants", icon: UserCheck },
  ];

  function isTabActive(tab: { href: string; exact?: boolean }) {
    if (tab.exact) {
      return location.pathname === tab.href;
    }
    return location.pathname.startsWith(tab.href);
  }

  return (
    <div className="flex-1 min-w-0 flex flex-col">
      {/* Top Admin Header Bar */}
      <div className="border-b border-line bg-white px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 max-w-7xl mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-ink flex items-center gap-2">
                Organizer Console
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-800 uppercase tracking-wider">
                  Admin
                </span>
              </h1>
              <p className="text-xs text-mute">Manage hackathons, problems, squads, and supervise ecosystem activity.</p>
            </div>
          </div>

          {/* Admin Navigation Submenu Tabs */}
          <nav className="flex items-center gap-1 overflow-x-auto py-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = isTabActive(tab);
              return (
                <NavLink
                  key={tab.href}
                  to={tab.href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-btn text-xs font-semibold transition shrink-0 ${
                    active
                      ? "bg-primary text-white shadow-xs"
                      : "text-mute hover:text-ink hover:bg-canvas"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </NavLink>
              );
            })}
            <Link
              to="/app/hackathons"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-btn text-xs font-semibold text-primary hover:bg-canvas transition shrink-0 ml-2 border border-primary/20"
            >
              Public Catalog &rarr;
            </Link>
          </nav>
        </div>
      </div>

      {/* Admin Content Area */}
      <div className="flex-1 min-w-0 p-6 md:p-8 max-w-7xl mx-auto w-full">
        <Outlet />
      </div>
    </div>
  );
}
