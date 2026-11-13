import { Link } from "react-router-dom";
import { Compass, Users, FolderKanban, Sparkles, ArrowRight } from "lucide-react";
import { Logo } from "../components/Logo";
import { Button } from "../components/Button";
import { EcosystemVisual } from "../components/EcosystemVisual";
import { Card } from "../components/States";
import { useAuth } from "../context/AuthContext";

export function LandingPage() {
  const { token } = useAuth();

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-line bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            {token ? (
              <Link to="/app">
                <Button variant="primary">
                  Go to App <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary">Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" /> Next-Gen Hackathon Platform
              </span>
              <h1 className="mt-5 text-4xl font-extrabold leading-[1.15] tracking-tight text-ink md:text-5xl lg:text-6xl">
                AI-Powered Hackathon Team Formation & Workspace
              </h1>
              <p className="mt-5 text-base text-mute md:text-lg">
                Discover campus and industry hackathons, assemble balanced multidisciplinary teams,
                and turn problem statements into winning prototypes with real-time AI assistance.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link to={token ? "/app" : "/register"}>
                  <Button variant="primary" className="px-6 py-3 text-base">
                    {token ? "Launch App" : "Get Started as Student"} <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                {!token ? (
                  <Link to="/login">
                    <Button variant="secondary" className="px-6 py-3 text-base">
                      Sign In to Account
                    </Button>
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="flex justify-center">
              <EcosystemVisual />
            </div>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section className="border-t border-line bg-white px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-primary">Platform Capabilities</h2>
            <p className="mt-2 text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
              Engineered for Hackers, Organizers, and Mentors
            </p>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-mute md:text-base">
              A comprehensive environment that guides builders from initial problem selection through final pitch.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-6 transition hover:shadow-lift">
              <div className="grid h-12 w-12 place-items-center rounded-btn bg-primary/10 text-primary">
                <Compass className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-lg font-bold">Hackathon Discovery</h3>
              <p className="mt-2 text-sm text-mute leading-relaxed">
                Explore verified hackathons with problem domains, judging rubrics, registration deadlines, and constraints.
              </p>
            </Card>

            <Card className="p-6 transition hover:shadow-lift">
              <div className="grid h-12 w-12 place-items-center rounded-btn bg-[#20B8E6]/10 text-[#20B8E6]">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-lg font-bold">Team Formation</h3>
              <p className="mt-2 text-sm text-mute leading-relaxed">
                Connect with peers across Frontend, Backend, AI/ML, and UI/UX using skill matching and invite codes.
              </p>
            </Card>

            <Card className="p-6 transition hover:shadow-lift">
              <div className="grid h-12 w-12 place-items-center rounded-btn bg-[#8B5CF6]/10 text-[#8B5CF6]">
                <FolderKanban className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-lg font-bold">Project Workspace</h3>
              <p className="mt-2 text-sm text-mute leading-relaxed">
                Align problem statements, track sprint milestones, organize deliverables, and keep your squad focused.
              </p>
            </Card>

            <Card className="p-6 transition hover:shadow-lift">
              <div className="grid h-12 w-12 place-items-center rounded-btn bg-primary/10 text-primary">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-lg font-bold">AI Assistance</h3>
              <p className="mt-2 text-sm text-mute leading-relaxed">
                Identify capability gaps, refine architecture decisions, and receive recommendations tailored to your challenge.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line bg-canvas px-6 py-8 text-center text-xs text-mute">
        <div className="mx-auto max-w-6xl flex flex-col items-center justify-between gap-4 sm:flex-row">
          <Logo compact />
          <p>&copy; {new Date().getFullYear()} HackNova. Build smarter, innovate better.</p>
          <div className="flex gap-4">
            <Link to="/login" className="hover:text-ink">Sign In</Link>
            <Link to="/register" className="hover:text-ink">Register</Link>
            <Link to="/app" className="hover:text-ink">Workspace</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
