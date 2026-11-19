import { Outlet, Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { PublicNavbar } from "./PublicNavbar";

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-[#0A0D14] text-slate-100 flex flex-col selection:bg-purple-500/30 overflow-x-hidden">
      {/* Top Bar Announcement */}
      <div className="bg-gradient-to-r from-purple-700 via-violet-600 to-indigo-700 px-4 py-2 text-center text-xs font-semibold text-white shadow-sm">
        <span className="inline-flex items-center gap-1.5 flex-wrap justify-center">
          <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
          <span>NeuroGrid AI, PulseForge &amp; Web3 BUIDL Global hackathons are now live!</span>
          <Link to="/hackathons" className="underline font-bold hover:text-amber-200 ml-1">
            Explore Open Sprints &rarr;
          </Link>
        </span>
      </div>

      {/* Modern Glowing Navigation Bar */}
      <PublicNavbar />

      {/* Routed Page Content */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
export default PublicLayout;
