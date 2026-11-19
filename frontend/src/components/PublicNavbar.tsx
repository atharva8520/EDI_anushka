import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowRight,
  Menu,
  X,
} from "lucide-react";
import { Logo } from "./Logo";
import { useAuth } from "../context/AuthContext";

export function PublicNavbar() {
  const { token } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Hackathons", href: "/hackathons" },
    { label: "Services & AI", href: "/#services" },
    { label: "Leaderboard & Projects", href: "/projects" },
    { label: "Companies", href: "/companies" },
    { label: "Host Event", href: "/host" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return location.pathname === "/";
    if (href.startsWith("/#")) return false;
    return location.pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0A0D14]/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3.5">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2">
          <Logo />
        </Link>

        {/* Center Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-7 text-xs font-semibold text-slate-300">
          {navLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.label}
                to={link.href}
                className={`transition-colors duration-200 hover:text-white ${
                  active ? "text-purple-400 font-bold" : "text-slate-400"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Action Buttons */}
        <div className="hidden sm:flex items-center gap-3">
          {token ? (
            <Link to="/app">
              <button className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-[0_0_20px_rgba(168,85,247,0.35)] hover:from-purple-500 hover:to-indigo-500 transition-all">
                <span>Enter Workspace</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </Link>
          ) : (
            <>
              <Link to="/login">
                <button className="px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white transition">
                  Sign In
                </button>
              </Link>
              <Link to="/register">
                <button className="rounded-xl bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-[0_0_20px_rgba(168,85,247,0.35)] hover:from-purple-500 hover:to-indigo-500 hover:shadow-[0_0_25px_rgba(168,85,247,0.5)] transition-all">
                  Register
                </button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 text-slate-400 hover:text-white"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-white/10 bg-[#0A0D14] px-6 py-4 space-y-3">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-slate-300 hover:text-white py-1.5"
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
            {token ? (
              <Link to="/app" onClick={() => setMobileMenuOpen(false)}>
                <button className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white">
                  Enter Workspace
                </button>
              </Link>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <button className="w-full text-center text-xs font-semibold text-slate-300 py-2">
                    Sign In
                  </button>
                </Link>
                <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                  <button className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-glow">
                    Register
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
