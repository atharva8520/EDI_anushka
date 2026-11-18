
import { useState, useMemo } from "react";
import {
  Trophy,
  Github,
  ExternalLink,
  Search,
  Star,
  Users,
} from "lucide-react";
import { SHOWCASE_PROJECTS } from "../../data/projects";
import { Button } from "../../components/Button";
import { Card } from "../../components/States";
import { PageIntro } from "../../components/PageIntro";

export function ProjectsShowcasePage() {
  const [search, setSearch] = useState("");
  const [selectedDomain, setSelectedDomain] = useState<string>("All");

  const domains = ["All", "Healthcare & AI", "Web3 & Security", "Climate & Data", "Cybersecurity"];

  const filteredProjects = useMemo(() => {
    return SHOWCASE_PROJECTS.filter((proj) => {
      const matchSearch =
        proj.title.toLowerCase().includes(search.toLowerCase()) ||
        proj.tagline.toLowerCase().includes(search.toLowerCase()) ||
        proj.team_name.toLowerCase().includes(search.toLowerCase()) ||
        proj.tech_stack.some((t) => t.toLowerCase().includes(search.toLowerCase()));

      const matchDomain = selectedDomain === "All" || proj.domain === selectedDomain;
      return matchSearch && matchDomain;
    });
  }, [search, selectedDomain]);

  return (
    <div className="min-h-screen bg-canvas text-ink py-8 px-4 md:px-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-line">
        <PageIntro
          kicker="Hall of Innovation"
          title="Projects Showcase"
          body="Explore winning projects, live prototypes, and open-source solutions crafted by student squads on HackNova."
        />
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-mute" />
            <input
              type="text"
              placeholder="Search projects by title, squad name, tech stack..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs font-medium rounded-btn border border-line bg-surface text-ink placeholder:text-mute focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {domains.map((dom) => (
              <button
                key={dom}
                onClick={() => setSelectedDomain(dom)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-btn transition ${selectedDomain === dom
                    ? "bg-primary text-white shadow-sm"
                    : "bg-surface hover:bg-line/40 text-mute hover:text-ink"
                  }`}
              >
                {dom}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredProjects.map((proj) => (
          <Card
            key={proj.id}
            className="overflow-hidden hover:shadow-lift transition duration-200 border border-line hover:border-primary/40 bg-white flex flex-col justify-between"
          >
            <div>
              <div className="relative h-48 w-full overflow-hidden bg-slate-900">
                <img
                  src={proj.thumbnail}
                  alt={proj.title}
                  className="h-full w-full object-cover opacity-85 hover:scale-105 transition duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute top-3 left-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-xs font-bold text-amber-300 border border-amber-300/30">
                    <Trophy className="h-3.5 w-3.5 text-amber-400" />
                    {proj.award}
                  </span>
                </div>
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
                  <span className="font-semibold tracking-wide">{proj.hackathon_name}</span>
                  <span className="inline-flex items-center gap-1 text-[11px] bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full">
                    <Star className="h-3 w-3 text-amber-400 fill-amber-400" /> {proj.stars}
                  </span>
                </div>
              </div>

              <div className="p-5 space-y-3">
                <h3 className="text-base font-bold text-ink leading-snug">{proj.title}</h3>
                <p className="text-xs text-mute line-clamp-2 leading-relaxed">{proj.tagline}</p>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {proj.tech_stack.map((tech) => (
                    <span
                      key={tech}
                      className="inline-flex items-center rounded-md bg-canvas px-2 py-0.5 text-[11px] font-medium text-mute border border-line/60"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-5 pt-0 mt-3 border-t border-line/70 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-1.5 text-mute font-medium">
                <Users className="h-3.5 w-3.5 text-primary" />
                <span>Squad: <strong className="text-ink">{proj.team_name}</strong></span>
              </div>

              <div className="flex items-center gap-2">
                {proj.github_url && (
                  <a
                    href={proj.github_url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-btn hover:bg-canvas text-mute hover:text-ink transition border border-line/60"
                    title="View GitHub Repository"
                  >
                    <Github className="h-4 w-4" />
                  </a>
                )}
                {proj.demo_url && (
                  <a
                    href={proj.demo_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button variant="secondary" className="text-xs py-1.5 gap-1">
                      Live Demo <ExternalLink className="h-3 w-3" />
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
