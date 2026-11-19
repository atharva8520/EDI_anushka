import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  ArrowRight,
  Compass,
  Users,
  Trophy,
  Building2,
  ShieldCheck,
  CheckCircle2,
  Layers,
  Cpu,
  Zap,
} from "lucide-react";
import { Logo } from "../components/Logo";
import { Button } from "../components/Button";
import { Card } from "../components/States";
import { useAuth } from "../context/AuthContext";
import { VERIFIED_COMPANIES } from "../data/companies";

export function LandingPage() {
  const { token } = useAuth();

  // Active persona tab on landing
  const [activePersona, setActivePersona] = useState<"students" | "companies" | "admins">("students");

  // Live countdown timer for featured hackathon
  const [timeLeft, setTimeLeft] = useState({
    days: 4,
    hours: 14,
    minutes: 32,
    seconds: 48,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        if (prev.days > 0) return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-canvas text-ink selection:bg-primary/20">
      {/* Top Bar Announcement */}
      <div className="bg-gradient-to-r from-primary via-indigo-600 to-accent-blue px-4 py-2 text-center text-xs font-semibold text-white">
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
          Web3 BUIDL Global &amp; NeuroGrid AI registrations are now live!
          <Link to="/app/hackathons" className="underline font-bold hover:text-amber-200 ml-1">
            Browse Events &rarr;
          </Link>
        </span>
      </div>

      {/* Global Header */}
      <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-8">
            <Link to="/">
              <Logo />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-mute">
              <Link to="/app/hackathons" className="hover:text-ink transition">
                Explore Hackathons
              </Link>
              <Link to="/companies" className="hover:text-ink transition">
                Companies &amp; Organizers
              </Link>
              <Link to="/projects" className="hover:text-ink transition">
                Projects Showcase
              </Link>
              <Link to="/host" className="text-primary hover:text-primary-dark transition font-bold flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Host a Hackathon
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {token ? (
              <Link to="/app">
                <Button variant="primary" className="text-xs py-2 gap-1.5">
                  Open Workspace <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" className="text-xs py-2">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" className="text-xs py-2">
                    Join as Builder
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative overflow-hidden px-6 pt-16 pb-20 md:pt-24 md:pb-28 border-b border-line/60 bg-gradient-to-b from-white via-canvas to-canvas">
        {/* Glow ambient background elements */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-primary/15 via-accent-blue/10 to-transparent blur-3xl pointer-events-none rounded-full" />

        <div className="relative mx-auto max-w-7xl">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary shadow-sm">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              The Autonomous Hackathon Platform
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-ink leading-[1.12]">
              Build. Compete.{" "}
              <span className="bg-gradient-to-r from-primary via-indigo-600 to-accent-blue bg-clip-text text-transparent">
                Collaborate.
              </span>{" "}
              Innovate.
            </h1>

            <p className="text-sm md:text-base text-mute font-medium leading-relaxed max-w-2xl mx-auto">
              Your gateway to premier hackathons, innovation challenges, verified industry sponsors,
              and AI-powered squad assembly. Built for high-velocity engineering.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
              <Link to="/app/hackathons">
                <Button variant="primary" className="px-7 py-3 text-sm font-bold shadow-lift gap-2">
                  <Compass className="h-4 w-4" />
                  Explore Hackathons
                </Button>
              </Link>
              <Link to="/host">
                <Button variant="secondary" className="px-6 py-3 text-sm font-bold border-line hover:border-primary/40 gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  Host a Hackathon
                </Button>
              </Link>
            </div>
          </div>

          {/* Live Platform Stats Counter Bar */}
          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-5xl mx-auto">
            <Card className="p-5 text-center bg-surface-card/85 backdrop-blur-md border-line shadow-glow hover:border-cyan/40 transition">
              <div className="text-3xl font-black text-ink tracking-tight">12+</div>
              <div className="text-xs font-semibold text-mute mt-1">Active Hackathons</div>
            </Card>

            <Card className="p-5 text-center bg-surface-card/85 backdrop-blur-md border-line shadow-glow hover:border-cyan/40 transition">
              <div className="text-3xl font-black text-primary tracking-tight">4,200+</div>
              <div className="text-xs font-semibold text-mute mt-1">Registered Innovators</div>
            </Card>

            <Card className="p-5 text-center bg-surface-card/85 backdrop-blur-md border-line shadow-glow hover:border-cyan/40 transition">
              <div className="text-3xl font-black text-emerald-600 tracking-tight">85+</div>
              <div className="text-xs font-semibold text-mute mt-1">Verified Organizations</div>
            </Card>

            <Card className="p-5 text-center bg-surface-card/85 backdrop-blur-md border-line shadow-glow hover:border-cyan/40 transition">
              <div className="text-3xl font-black text-accent-blue tracking-tight">$350,000+</div>
              <div className="text-xs font-semibold text-mute mt-1">Prizes &amp; Grants</div>
            </Card>
          </div>

          {/* Featured Hackathon Spotlight Banner */}
          <div className="mt-14 max-w-5xl mx-auto">
            <div className="relative rounded-2xl overflow-hidden border border-primary/40 bg-slate-900 text-white shadow-lift">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/30 via-slate-900 to-black opacity-90" />
              <div className="relative p-6 sm:p-8 md:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                <div className="space-y-3 max-w-xl">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="bg-emerald-500/20 text-emerald-300 font-bold px-3 py-1 rounded-full border border-emerald-500/30">
                      ⚡ Featured Sprint
                    </span>
                    <span className="bg-white/10 text-slate-300 px-3 py-1 rounded-full">
                      Pune + Hybrid
                    </span>
                    <span className="bg-amber-400/20 text-amber-300 font-bold px-3 py-1 rounded-full border border-amber-400/30">
                      $25,000 Prize Pool
                    </span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                    PulseForge HealthHack 2026
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    48 hours to redesign emergency capacity telemetry with responsible AI. Clinical mentors
                    from municipal hospitals and deep-tech engineers guide your squad from challenge to working prototype.
                  </p>
                </div>

                {/* Countdown Card */}
                <div className="flex flex-col items-center sm:items-end gap-4 shrink-0">
                  <div className="text-xs font-bold text-amber-300 uppercase tracking-widest">
                    Registration Closing In:
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-white/10 backdrop-blur-md border border-white/15 px-3 py-2 rounded-xl min-w-[58px]">
                      <div className="text-lg font-black text-white">{timeLeft.days}</div>
                      <div className="text-[10px] text-slate-400 uppercase">Days</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md border border-white/15 px-3 py-2 rounded-xl min-w-[58px]">
                      <div className="text-lg font-black text-white">{timeLeft.hours}</div>
                      <div className="text-[10px] text-slate-400 uppercase">Hours</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md border border-white/15 px-3 py-2 rounded-xl min-w-[58px]">
                      <div className="text-lg font-black text-white">{timeLeft.minutes}</div>
                      <div className="text-[10px] text-slate-400 uppercase">Mins</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md border border-white/15 px-3 py-2 rounded-xl min-w-[58px]">
                      <div className="text-lg font-black text-amber-400">{timeLeft.seconds}</div>
                      <div className="text-[10px] text-slate-400 uppercase">Secs</div>
                    </div>
                  </div>

                  <Link to="/app/hackathons">
                    <Button variant="primary" className="text-xs py-2.5 px-6 shadow-glow font-bold gap-2">
                      Join PulseForge Sprint <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* THREE PERSONAS SECTION */}
      <section className="py-20 px-6 max-w-7xl mx-auto space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-bold text-primary uppercase tracking-widest">Three-Sided Ecosystem</span>
          <h2 className="text-3xl md:text-4xl font-black text-ink tracking-tight">
            Designed for the Entire Innovation Lifecycle
          </h2>
          <p className="text-xs md:text-sm text-mute">
            Whether you are building the next breakout unicorn, sponsoring domain challenges, or governing
            university cohorts.
          </p>
        </div>

        {/* Persona Switcher Tabs */}
        <div className="flex justify-center">
          <div className="inline-flex rounded-btn border border-line bg-surface p-1.5 shadow-sm">
            <button
              onClick={() => setActivePersona("students")}
              className={`px-5 py-2 text-xs font-bold rounded-lg transition ${
                activePersona === "students"
                  ? "bg-primary text-white shadow-sm"
                  : "text-mute hover:text-ink"
              }`}
            >
              👩‍💻 For Students &amp; Builders
            </button>
            <button
              onClick={() => setActivePersona("companies")}
              className={`px-5 py-2 text-xs font-bold rounded-lg transition ${
                activePersona === "companies"
                  ? "bg-primary text-white shadow-sm"
                  : "text-mute hover:text-ink"
              }`}
            >
              🏢 For Companies &amp; Organizers
            </button>
            <button
              onClick={() => setActivePersona("admins")}
              className={`px-5 py-2 text-xs font-bold rounded-lg transition ${
                activePersona === "admins"
                  ? "bg-primary text-white shadow-sm"
                  : "text-mute hover:text-ink"
              }`}
            >
              🛡️ For Administrators
            </button>
          </div>
        </div>

        {/* Persona Content Display */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {activePersona === "students" && (
            <>
              <Card className="p-6 space-y-3 border-line hover:border-primary/40 transition">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Compass className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-ink">Multi-Hackathon Freedom</h3>
                <p className="text-xs text-mute leading-relaxed">
                  Participate in multiple hackathons simultaneously without account locks. Distinct squad
                  Kanban boards, scoped problem statements, and intelligent overlap detection.
                </p>
              </Card>

              <Card className="p-6 space-y-3 border-line hover:border-primary/40 transition">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent-blue/10 text-accent-blue">
                  <Users className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-ink">AI Teammate Assembly</h3>
                <p className="text-xs text-mute leading-relaxed">
                  Never hack alone. Our compatibility engine matches missing frontend, backend, AI, or UI/UX
                  capabilities with explainable fit scores and instant invite links.
                </p>
              </Card>

              <Card className="p-6 space-y-3 border-line hover:border-primary/40 transition">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
                  <Trophy className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-ink">Verified Builder Showcase</h3>
                <p className="text-xs text-mute leading-relaxed">
                  Publish prototypes to your immutable builder profile. Win industry bounties, capture recruiter
                  visibility, and claim sponsored grants.
                </p>
              </Card>
            </>
          )}

          {activePersona === "companies" && (
            <>
              <Card className="p-6 space-y-3 border-line hover:border-primary/40 transition">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-ink">5-Step Event Wizard</h3>
                <p className="text-xs text-mute leading-relaxed">
                  Launch challenges with curated problem statements, timeline guards, judging rubrics,
                  and custom prize pool distribution in under 10 minutes.
                </p>
              </Card>

              <Card className="p-6 space-y-3 border-line hover:border-primary/40 transition">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-ink">Verified Partner Status</h3>
                <p className="text-xs text-mute leading-relaxed">
                  Receive a verified company profile in the public directory, build talent pipelines,
                  and review student submission repositories with rubric-based scoring.
                </p>
              </Card>

              <Card className="p-6 space-y-3 border-line hover:border-primary/40 transition">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent-blue/10 text-accent-blue">
                  <Building2 className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-ink">Real-Time Cohort Analytics</h3>
                <p className="text-xs text-mute leading-relaxed">
                  Monitor active teams, problem selection velocity, sprint progress, and submission completion
                  rates from a dedicated organizer view.
                </p>
              </Card>
            </>
          )}

          {activePersona === "admins" && (
            <>
              <Card className="p-6 space-y-3 border-line hover:border-primary/40 transition">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-ink">Ecosystem Governance</h3>
                <p className="text-xs text-mute leading-relaxed">
                  Full control over event lifecycle transitions (draft, published, active, completed, archived)
                  with rigorous rubric weight validations.
                </p>
              </Card>

              <Card className="p-6 space-y-3 border-line hover:border-primary/40 transition">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/10 text-amber-600">
                  <Layers className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-ink">Cross-Squad Supervision</h3>
                <p className="text-xs text-mute leading-relaxed">
                  Monitor participants across all collegiate institutions with comma-separated multi-squad tracking
                  and zero email exposure leaks.
                </p>
              </Card>

              <Card className="p-6 space-y-3 border-line hover:border-primary/40 transition">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent-blue/10 text-accent-blue">
                  <Zap className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-ink">Deterministic APIs</h3>
                <p className="text-xs text-mute leading-relaxed">
                  Engineered with primary-key tie-breakers, robust database constraints, and full test suite
                  resilience across high-volume registration surges.
                </p>
              </Card>
            </>
          )}
        </div>
      </section>

      {/* AI ENGINE SHOWCASE */}
      <section className="bg-slate-950 text-white py-20 px-6 border-y border-slate-800">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/20 text-indigo-300 px-3.5 py-1 text-xs font-bold border border-primary/30">
              <Cpu className="h-3.5 w-3.5" /> Explainable Intelligence
            </span>

            <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
              AI Teammate Matching &amp; Skill-Gap Analysis
            </h2>

            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              HackNova does not use opaque black-boxes. Every recommendation inspects your squad&apos;s
              chosen problem statement, calculates capability gaps across backend, frontend, AI, and design,
              and returns candidates with mathematical compatibility rationale.
            </p>

            <div className="space-y-3 pt-2 text-xs">
              <div className="flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 grid place-items-center shrink-0 mt-0.5">
                  ✓
                </div>
                <div>
                  <strong className="text-white">Domain &amp; Skill Coverage:</strong> Vectorized scoring ensures squads
                  have complementary strengths rather than redundant duplicate roles.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 grid place-items-center shrink-0 mt-0.5">
                  ✓
                </div>
                <div>
                  <strong className="text-white">Availability Compatibility:</strong> Matches weekday vs weekend
                  working patterns so teams never stall during build sprints.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 grid place-items-center shrink-0 mt-0.5">
                  ✓
                </div>
                <div>
                  <strong className="text-white">Strict Hackathon Scoping:</strong> Automatically permits builders to
                  recruit talent active in other hackathons while preventing same-event poaching.
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Link to={token ? "/app/team/find" : "/login"}>
                <Button variant="primary" className="text-xs py-2.5 px-6 font-bold shadow-glow gap-2">
                  Try AI Teammate Finder <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Code / Visual Box */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 space-y-4 shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-slate-400">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-rose-500/80" />
                <span className="h-3 w-3 rounded-full bg-amber-500/80" />
                <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
                <span className="text-[11px] font-sans ml-2 text-slate-300">compatibility_matrix.py</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-sans">Model: weighted-v1</span>
            </div>

            <div className="space-y-2 text-slate-300">
              <p className="text-slate-500"># Evaluating candidate suitability for squad...</p>
              <p><span className="text-purple-400">target_problem</span> = &quot;Autonomous Drone Pathfinding&quot;</p>
              <p><span className="text-purple-400">c_target</span> = [&quot;Robotics&quot;, &quot;Computer Vision&quot;, &quot;PyTorch&quot;]</p>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5 font-sans">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300 font-bold">Candidate: Meera Joshi (AI/ML)</span>
                  <span className="text-emerald-400 font-black">Score: 94%</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-400 h-full w-[94%]" />
                </div>
                <p className="text-[10px] text-slate-400 pt-1">
                  Reason: Bridges critical missing capability in PyTorch &amp; Computer Vision. High schedule availability alignment.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VERIFIED ORGANIZERS LOGO STRIP */}
      <section className="py-16 px-6 max-w-7xl mx-auto space-y-8">
        <div className="text-center space-y-1">
          <span className="text-[11px] font-bold text-mute uppercase tracking-widest">
            Trusted by Top Industry Teams &amp; University Cells
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 items-center justify-center">
          {VERIFIED_COMPANIES.map((c) => (
            <Link
              key={c.id}
              to="/companies"
              className="p-4 rounded-xl border border-line bg-surface-card hover:border-cyan/40 hover:shadow-glow hover:shadow-card transition flex flex-col items-center text-center gap-2"
            >
              <img src={c.logo} alt={c.name} className="h-8 w-8 rounded-lg object-cover" />
              <span className="text-[11px] font-bold text-ink line-clamp-1">{c.name.split(" ")[0]}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-line bg-surface px-6 py-12 text-xs text-mute">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <Logo />
            <p className="text-[11px] text-mute pt-1">
              &copy; {new Date().getFullYear()} HackNova. The human-centric hackathon infrastructure.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 font-semibold">
            <Link to="/app/hackathons" className="hover:text-ink transition">
              Hackathons
            </Link>
            <Link to="/companies" className="hover:text-ink transition">
              Companies
            </Link>
            <Link to="/projects" className="hover:text-ink transition">
              Showcase
            </Link>
            <Link to="/host" className="hover:text-ink transition">
              Host Hackathon
            </Link>
            <Link to="/login" className="hover:text-ink transition">
              Sign In
            </Link>
            <Link to="/register" className="hover:text-ink transition">
              Register
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
