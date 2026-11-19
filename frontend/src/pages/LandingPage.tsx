import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  ArrowRight,
  Compass,
  Users,
  Trophy,
  Zap,
  Award,
  Kanban,
  Bot,
  Flame,
  Calendar,
  Building2,
} from "lucide-react";
import { Badge } from "../components/Badge";
import { Card } from "../components/States";
import { api } from "../api/client";
import type { HackathonListItem } from "../types";

export function LandingPage() {
  // Active persona tab on landing
  const [activePersona, setActivePersona] = useState<"builders" | "companies" | "judges">("builders");

  // Live hackathons fetched from backend
  const [liveHackathons, setLiveHackathons] = useState<HackathonListItem[]>([]);

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

  useEffect(() => {
    api
      .get<HackathonListItem[]>("/hackathons?limit=3")
      .then((res) => {
        setLiveHackathons(res.data);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="text-slate-100 overflow-x-hidden">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden px-4 sm:px-6 pt-16 pb-24 md:pt-24 md:pb-32 border-b border-white/5">
        {/* Glowing Background Radial Orbs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-gradient-to-tr from-purple-600/20 via-violet-500/15 to-transparent blur-3xl pointer-events-none rounded-full" />
        <div className="absolute -top-40 right-10 w-[400px] h-[400px] bg-pink-500/10 blur-[120px] pointer-events-none rounded-full" />
        <div className="absolute top-60 -left-20 w-[400px] h-[400px] bg-indigo-500/10 blur-[120px] pointer-events-none rounded-full" />

        <div className="relative mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content (7 Cols) */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              {/* Top Shimmer Pill Chip */}
              <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/40 bg-purple-500/10 px-4 py-1.5 text-xs font-bold text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                <Sparkles className="h-3.5 w-3.5 text-purple-400 animate-spin" style={{ animationDuration: "6s" }} />
                <span>Discover Your Next Big Opportunity</span>
              </div>

              {/* Headline (Matching uploaded images) */}
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white leading-[1.12]">
                Explore Your <br />
                Creativity with{" "}
                <span className="bg-gradient-to-r from-purple-400 via-fuchsia-400 to-indigo-300 bg-clip-text text-transparent">
                  HackNova
                </span>
              </h1>

              {/* Subheadline */}
              <p className="text-sm md:text-base text-slate-300 font-medium leading-relaxed max-w-xl mx-auto lg:mx-0">
                Join premier hackathons worldwide to elevate your standards of creativity and innovation. Assemble AI-matched squads, build with an autonomous Groq-powered AI Copilot, and climb the live podium leaderboard.
              </p>

              {/* Call to Actions */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
                <Link to="/hackathons">
                  <button className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 px-7 py-3.5 text-sm font-bold text-white shadow-[0_0_25px_rgba(168,85,247,0.45)] hover:from-purple-500 hover:to-indigo-500 hover:shadow-[0_0_35px_rgba(168,85,247,0.6)] hover:-translate-y-0.5 transition-all">
                    <Compass className="h-4 w-4" />
                    <span>Explore Hackathons</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </Link>

                <Link to="/host">
                  <button className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-bold text-slate-200 hover:bg-white/10 hover:border-purple-400/40 hover:text-white transition-all">
                    <Building2 className="h-4 w-4 text-purple-400" />
                    <span>Host a Hackathon</span>
                  </button>
                </Link>
              </div>

              {/* Small Trust Line */}
              <div className="flex items-center justify-center lg:justify-start gap-4 pt-4 text-xs text-slate-400 font-medium">
                <div className="flex -space-x-2 overflow-hidden">
                  <img className="inline-block h-6 w-6 rounded-full ring-2 ring-[#0A0D14]" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&fit=crop&crop=faces" alt="avatar" />
                  <img className="inline-block h-6 w-6 rounded-full ring-2 ring-[#0A0D14]" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&h=64&fit=crop&crop=faces" alt="avatar" />
                  <img className="inline-block h-6 w-6 rounded-full ring-2 ring-[#0A0D14]" src="https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=64&h=64&fit=crop&crop=faces" alt="avatar" />
                </div>
                <span>Joined by <strong className="text-white">4,200+ engineers</strong> across 85+ verified organizations</span>
              </div>
            </div>

            {/* Right Hero Visual Mockup (Matching Image 1) */}
            <div className="lg:col-span-5 relative flex justify-center">
              {/* Glowing Aura Behind Mockup */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-indigo-500/20 blur-2xl rounded-3xl" />

              {/* Laptop & Floating Widgets Container */}
              <div className="relative w-full max-w-md p-6 rounded-3xl border border-white/15 bg-slate-900/80 backdrop-blur-xl shadow-2xl space-y-4">
                {/* Simulated Screen Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  </div>
                  <span className="text-[11px] font-mono text-purple-300 font-bold">HackNova v2.0 Workspace</span>
                </div>

                {/* Simulated Laptop Screen Body */}
                <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-950/70 via-slate-950 to-indigo-950/80 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                      <Zap className="h-4 w-4 text-amber-300" />
                      Live Sprint Active
                    </span>
                    <Badge tone="success">In Progress</Badge>
                  </div>

                  <h3 className="font-bold text-base text-white">
                    Emergency Capacity Signal
                  </h3>
                  <p className="text-xs text-slate-300 line-clamp-2">
                    Real-time hospital capacity telemetry & coordination dashboard with live Groq AI Copilot.
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {["FastAPI", "React", "Groq AI", "PostgreSQL"].map((t) => (
                      <span key={t} className="rounded-md border border-purple-400/20 bg-purple-500/10 px-2 py-0.5 text-[11px] font-medium text-purple-200">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Floating Glassmorphic Pill 1: Registration Deadline (from user image) */}
                <div className="rounded-2xl border border-white/20 bg-white/95 text-slate-900 p-3 shadow-lift flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-500">Registration Deadline</div>
                      <div className="text-xs font-black text-slate-900">2026 Live Sprints Active</div>
                    </div>
                  </div>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                </div>

                {/* Floating Glassmorphic Pill 2: Prize Pool (from user image) */}
                <div className="rounded-2xl border border-white/20 bg-white/95 text-slate-900 p-3 shadow-lift flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-600 text-white font-black text-sm">
                      $
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-500">Total Prize Pool</div>
                      <div className="text-xs font-black text-slate-900">$350,000+ USD & Grants</div>
                    </div>
                  </div>
                  <Badge tone="primary">Global</Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Metric Stats Banner */}
          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-5xl mx-auto">
            <div className="p-5 rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md text-center hover:border-purple-500/40 transition">
              <div className="text-3xl font-black text-white tracking-tight">15+</div>
              <div className="text-xs font-semibold text-slate-400 mt-1">Active Hackathons</div>
            </div>

            <div className="p-5 rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md text-center hover:border-purple-500/40 transition">
              <div className="text-3xl font-black text-purple-400 tracking-tight">4,200+</div>
              <div className="text-xs font-semibold text-slate-400 mt-1">Registered Innovators</div>
            </div>

            <div className="p-5 rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md text-center hover:border-purple-500/40 transition">
              <div className="text-3xl font-black text-emerald-400 tracking-tight">85+</div>
              <div className="text-xs font-semibold text-slate-400 mt-1">Verified Organizations</div>
            </div>

            <div className="p-5 rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md text-center hover:border-purple-500/40 transition">
              <div className="text-3xl font-black text-pink-400 tracking-tight">$350,000+</div>
              <div className="text-xs font-semibold text-slate-400 mt-1">Prizes &amp; Grants</div>
            </div>
          </div>
        </div>
      </section>

      {/* COMPREHENSIVE SERVICES & FEATURES SECTION */}
      <section id="services" className="py-24 px-4 sm:px-6 max-w-7xl mx-auto space-y-16">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-xs font-bold text-purple-300">
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            Complete Autonomous Suite
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
            Everything You Need from Registration to Podium
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl mx-auto">
            HackNova is not just a form or listing directory — it is a full-stack execution engine providing AI squad assembly, live project workspaces, AI sprint coaching, and transparent judging rubrics.
          </p>
        </div>

        {/* 6 Core Services Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Service 1: Hackathon Discovery */}
          <Card className="p-6 space-y-4 border border-white/10 bg-slate-900/50 hover:border-purple-500/40 hover:shadow-[0_0_25px_rgba(168,85,247,0.15)] transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md">
                <Compass className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">1. Hackathon Discovery & Challenges</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Discover premier virtual and hybrid hackathons organized by verified enterprises and foundations. Access structured problem statements with clear constraints, target users, and evaluation rubrics.
              </p>
            </div>
            <Link to="/hackathons" className="inline-flex items-center gap-1 text-xs font-bold text-purple-400 hover:text-purple-300 pt-2">
              Explore Open Challenges &rarr;
            </Link>
          </Card>

          {/* Service 2: AI Teammate Matching */}
          <Card className="p-6 space-y-4 border border-white/10 bg-slate-900/50 hover:border-purple-500/40 hover:shadow-[0_0_25px_rgba(168,85,247,0.15)] transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-fuchsia-600 to-purple-600 text-white shadow-md">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">2. AI Squad Assembly & Matchmaking</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Never build alone. Our smart recommender examines candidate proficiencies, domain strengths, and availability against your team's unfilled skills, generating AI match compatibility explanations.
              </p>
            </div>
            <Link to="/register" className="inline-flex items-center gap-1 text-xs font-bold text-purple-400 hover:text-purple-300 pt-2">
              Find Your Dream Squad &rarr;
            </Link>
          </Card>

          {/* Service 3: AI Sprint Copilot */}
          <Card className="p-6 space-y-4 border border-white/10 bg-slate-900/50 hover:border-purple-500/40 hover:shadow-[0_0_25px_rgba(168,85,247,0.15)] transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-md">
                <Bot className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">3. AI Sprint Copilot (Groq LLM)</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Integrated 24/7 technical mentor powered by ultra-low-latency Groq models. Automatically decomposes complex challenge statements into actionable sprint tasks and advises on MVP architecture.
              </p>
            </div>
            <div className="text-xs font-semibold text-cyan-400 pt-2">
              ⚡ Powered by Groq Models
            </div>
          </Card>

          {/* Service 4: Project Workspace */}
          <Card className="p-6 space-y-4 border border-white/10 bg-slate-900/50 hover:border-purple-500/40 hover:shadow-[0_0_25px_rgba(168,85,247,0.15)] transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md">
                <Kanban className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">4. Autonomous Project Workspace</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Full-featured Kanban sprint board with real-time drag-and-drop task tracking, deadline milestones, shared team notes, pre-flight checklists, and full audit activity logging.
              </p>
            </div>
            <Link to="/register" className="inline-flex items-center gap-1 text-xs font-bold text-purple-400 hover:text-purple-300 pt-2">
              Explore Workspace Tools &rarr;
            </Link>
          </Card>

          {/* Service 5: Final Submission & Judging */}
          <Card className="p-6 space-y-4 border border-white/10 bg-slate-900/50 hover:border-purple-500/40 hover:shadow-[0_0_25px_rgba(168,85,247,0.15)] transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white shadow-md">
                <Award className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">5. Deliverable Submission & Judging</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Submit repository code, live demo links, Loom videos, slide decks, and architecture notes. Industry judges evaluate each deliverable using weighted criteria rubrics with feedback.
              </p>
            </div>
            <div className="text-xs font-semibold text-amber-400 pt-2">
              ✓ Weighted Multi-Judge Scoring
            </div>
          </Card>

          {/* Service 6: Live Leaderboard & Showcase */}
          <Card className="p-6 space-y-4 border border-white/10 bg-slate-900/50 hover:border-purple-500/40 hover:shadow-[0_0_25px_rgba(168,85,247,0.15)] transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-pink-600 to-rose-600 text-white shadow-md">
                <Trophy className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">6. Podium Leaderboard & Showcase</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Real-time leaderboard ranking with Gold, Silver, and Bronze awards. Winning prototypes are published to the public Project Showcase for investor exposure and hiring opportunities.
              </p>
            </div>
            <Link to="/projects" className="inline-flex items-center gap-1 text-xs font-bold text-purple-400 hover:text-purple-300 pt-2">
              Browse Project Showcase &rarr;
            </Link>
          </Card>
        </div>
      </section>

      {/* FEATURED SPRINT SPOTLIGHT */}
      <section className="py-16 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="relative rounded-3xl overflow-hidden border border-purple-500/30 bg-slate-900/90 p-8 md:p-12 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/40 via-slate-900 to-black pointer-events-none" />

          <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="space-y-4 max-w-xl">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="bg-purple-500/20 text-purple-300 font-bold px-3 py-1 rounded-full border border-purple-500/30 flex items-center gap-1">
                  <Flame className="h-3.5 w-3.5 text-amber-400" /> Featured Sprint
                </span>
                <span className="bg-white/10 text-slate-300 px-3 py-1 rounded-full">
                  Hybrid &bull; Pune / Global
                </span>
                <span className="bg-amber-400/20 text-amber-300 font-bold px-3 py-1 rounded-full border border-amber-400/30">
                  $25,000 Prize Pool
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-black text-white">
                PulseForge HealthHack 2026
              </h3>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                48 hours to redesign emergency capacity telemetry with responsible AI. Clinical mentors from municipal hospitals guide your squad from challenge statement to working prototype.
              </p>
            </div>

            {/* Countdown Box */}
            <div className="flex flex-col items-start lg:items-end gap-4 shrink-0">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-widest">
                Registration Deadline Approaching:
              </span>

              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-white/10 backdrop-blur-md border border-white/15 px-3 py-2 rounded-xl min-w-[60px]">
                  <div className="text-xl font-black text-white">{timeLeft.days}</div>
                  <div className="text-[10px] text-slate-400 uppercase">Days</div>
                </div>
                <div className="bg-white/10 backdrop-blur-md border border-white/15 px-3 py-2 rounded-xl min-w-[60px]">
                  <div className="text-xl font-black text-white">{timeLeft.hours}</div>
                  <div className="text-[10px] text-slate-400 uppercase">Hours</div>
                </div>
                <div className="bg-white/10 backdrop-blur-md border border-white/15 px-3 py-2 rounded-xl min-w-[60px]">
                  <div className="text-xl font-black text-white">{timeLeft.minutes}</div>
                  <div className="text-[10px] text-slate-400 uppercase">Mins</div>
                </div>
                <div className="bg-white/10 backdrop-blur-md border border-white/15 px-3 py-2 rounded-xl min-w-[60px]">
                  <div className="text-xl font-black text-amber-400">{timeLeft.seconds}</div>
                  <div className="text-[10px] text-slate-400 uppercase">Secs</div>
                </div>
              </div>

              <Link to="/hackathons">
                <button className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-3 text-xs font-bold text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_30px_rgba(168,85,247,0.6)] transition-all">
                  Join PulseForge Sprint &rarr;
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* LIVE HACKATHONS DIRECT FEED */}
      {liveHackathons.length > 0 && (
        <section className="py-12 px-4 sm:px-6 max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-white">Active Hackathons Right Now</h3>
              <p className="text-xs text-slate-400">Join a verified sprint, assemble a squad, and start hacking.</p>
            </div>
            <Link to="/hackathons" className="text-xs font-bold text-purple-400 hover:text-purple-300">
              View All &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {liveHackathons.slice(0, 3).map((hack) => (
              <Card key={hack.id} className="p-6 border border-white/10 bg-slate-900/60 hover:border-purple-500/40 transition-all flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20">
                      {hack.status}
                    </span>
                    <span className="text-xs text-slate-400">
                      {hack.location || "Online"}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-white line-clamp-1">{hack.name}</h4>
                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">{hack.short_description}</p>
                </div>
                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-400">
                    {hack.team_count} Teams &bull; {hack.problem_count} Challenges
                  </span>
                  <Link to={`/hackathons/${hack.id}`} className="text-xs font-bold text-purple-300 hover:text-white">
                    Details &rarr;
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* THREE PERSONAS / HOW IT WORKS */}
      <section className="py-20 px-4 sm:px-6 max-w-7xl mx-auto space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">Built For Innovators</span>
          <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
            Designed for the Entire Innovation Ecosystem
          </h2>
          <p className="text-xs md:text-sm text-slate-400">
            Select your role to see how HackNova accelerates your hackathon journey.
          </p>

          <div className="flex justify-center gap-2 pt-4">
            <button
              onClick={() => setActivePersona("builders")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activePersona === "builders"
                  ? "bg-purple-600 text-white shadow-glow"
                  : "bg-white/5 text-slate-400 hover:text-white"
              }`}
            >
              Builders &amp; Students
            </button>
            <button
              onClick={() => setActivePersona("companies")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activePersona === "companies"
                  ? "bg-purple-600 text-white shadow-glow"
                  : "bg-white/5 text-slate-400 hover:text-white"
              }`}
            >
              Companies &amp; Sponsors
            </button>
            <button
              onClick={() => setActivePersona("judges")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activePersona === "judges"
                  ? "bg-purple-600 text-white shadow-glow"
                  : "bg-white/5 text-slate-400 hover:text-white"
              }`}
            >
              Judges &amp; Mentors
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {activePersona === "builders" ? (
            <>
              <Card className="p-6 border border-white/10 bg-slate-900/60 space-y-2">
                <div className="text-xs font-bold text-purple-400 uppercase font-mono">Step 1</div>
                <h4 className="font-bold text-white text-base">Register Profile &amp; Match</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Showcase your skills in AI/ML, frontend, or smart contracts. Let our recommender match you with complementary squad members.
                </p>
              </Card>
              <Card className="p-6 border border-white/10 bg-slate-900/60 space-y-2">
                <div className="text-xs font-bold text-purple-400 uppercase font-mono">Step 2</div>
                <h4 className="font-bold text-white text-base">Build with AI Copilot</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Work in your squad Kanban board. Prompt the Groq AI Copilot for architecture advice, API structures, and task breakdowns.
                </p>
              </Card>
              <Card className="p-6 border border-white/10 bg-slate-900/60 space-y-2">
                <div className="text-xs font-bold text-purple-400 uppercase font-mono">Step 3</div>
                <h4 className="font-bold text-white text-base">Submit &amp; Win</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Submit code, demo links, and video pitches. Receive weighted judge evaluations and compete for 1st place gold podium glory.
                </p>
              </Card>
            </>
          ) : activePersona === "companies" ? (
            <>
              <Card className="p-6 border border-white/10 bg-slate-900/60 space-y-2">
                <div className="text-xs font-bold text-purple-400 uppercase font-mono">Step 1</div>
                <h4 className="font-bold text-white text-base">Define Challenges</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Publish real problem statements with technical constraints and criteria. Set custom prize pools and dates.
                </p>
              </Card>
              <Card className="p-6 border border-white/10 bg-slate-900/60 space-y-2">
                <div className="text-xs font-bold text-purple-400 uppercase font-mono">Step 2</div>
                <h4 className="font-bold text-white text-base">Engage Top Builders</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Observe thousands of verified engineers actively building solutions using your developer APIs and SDKs.
                </p>
              </Card>
              <Card className="p-6 border border-white/10 bg-slate-900/60 space-y-2">
                <div className="text-xs font-bold text-purple-400 uppercase font-mono">Step 3</div>
                <h4 className="font-bold text-white text-base">Hire &amp; Incubate</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Identify exceptional teams through weighted rubric scores and fast-track them to grant funding or full-time roles.
                </p>
              </Card>
            </>
          ) : (
            <>
              <Card className="p-6 border border-white/10 bg-slate-900/60 space-y-2">
                <div className="text-xs font-bold text-purple-400 uppercase font-mono">Step 1</div>
                <h4 className="font-bold text-white text-base">Review Submissions</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Directly inspect source code repos, live preview deployments, and pitch walkthroughs submitted by teams.
                </p>
              </Card>
              <Card className="p-6 border border-white/10 bg-slate-900/60 space-y-2">
                <div className="text-xs font-bold text-purple-400 uppercase font-mono">Step 2</div>
                <h4 className="font-bold text-white text-base">Objective Scoring</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Score projects seamlessly on a 1.0–10.0 scale across weighted criteria: innovation, architecture, execution, and presentation.
                </p>
              </Card>
              <Card className="p-6 border border-white/10 bg-slate-900/60 space-y-2">
                <div className="text-xs font-bold text-purple-400 uppercase font-mono">Step 3</div>
                <h4 className="font-bold text-white text-base">Publish Leaderboard</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Scores automatically aggregate into live public leaderboards, assigning Gold, Silver, and Bronze awards to the top squads.
                </p>
              </Card>
            </>
          )}
        </div>
      </section>

      {/* FINAL CALL TO ACTION BANNER */}
      <section className="py-20 px-4 sm:px-6 max-w-5xl mx-auto text-center">
        <div className="rounded-3xl border border-purple-500/30 bg-gradient-to-r from-purple-900/50 via-slate-900 to-indigo-900/50 p-10 md:p-16 space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-pink-500/20 blur-3xl pointer-events-none rounded-full" />
          <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-purple-500/20 blur-3xl pointer-events-none rounded-full" />

          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Ready to Build Something Extraordinary?
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
            Join thousands of innovators solving real-world challenges. Create your builder account today or host your next flagship hackathon.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link to="/register">
              <button className="rounded-xl bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 px-8 py-3.5 text-sm font-bold text-white shadow-[0_0_25px_rgba(168,85,247,0.45)] hover:from-purple-500 hover:to-indigo-500 transition-all">
                Create Free Account
              </button>
            </Link>
            <Link to="/hackathons">
              <button className="rounded-xl border border-white/20 bg-white/5 px-7 py-3.5 text-sm font-bold text-slate-200 hover:bg-white/10 transition-all">
                Browse Live Sprints
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10 py-12 px-4 sm:px-6 bg-[#080A10] text-xs text-slate-400">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="font-black text-white text-base">HackNova</span>
            <span>&bull;</span>
            <span>Autonomous Hackathon &amp; Open Innovation Platform</span>
          </div>

          <div className="flex flex-wrap items-center gap-6 font-semibold">
            <Link to="/hackathons" className="hover:text-white transition">Hackathons</Link>
            <Link to="/projects" className="hover:text-white transition">Showcase</Link>
            <Link to="/companies" className="hover:text-white transition">Companies</Link>
            <Link to="/host" className="hover:text-white transition">Host Event</Link>
            <Link to="/login" className="hover:text-white transition">Sign In</Link>
          </div>
        </div>

        <div className="mx-auto max-w-7xl mt-8 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div>&copy; {new Date().getFullYear()} HackNova Ecosystem. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <span>Powered by Groq LLM &amp; FastAPI</span>
            <span>&bull;</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              All Systems Operational
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
export default LandingPage;
