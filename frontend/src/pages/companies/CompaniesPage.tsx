import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  CheckCircle2,
  Search,
  ExternalLink,
  Trophy,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Globe,
  SlidersHorizontal,
} from "lucide-react";
import { VERIFIED_COMPANIES } from "../../data/companies";
import { Button } from "../../components/Button";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/States";
import { PageIntro } from "../../components/PageIntro";

export function CompaniesPage() {
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("All");

  const types = ["All", "Enterprise", "Startup", "Foundation", "University"];

  const filteredCompanies = useMemo(() => {
    return VERIFIED_COMPANIES.filter((comp) => {
      const matchSearch =
        comp.name.toLowerCase().includes(search.toLowerCase()) ||
        comp.description.toLowerCase().includes(search.toLowerCase()) ||
        comp.domains.some((d) => d.toLowerCase().includes(search.toLowerCase()));

      const matchType = selectedType === "All" || comp.type === selectedType;
      return matchSearch && matchType;
    });
  }, [search, selectedType]);

  const totalHackathons = VERIFIED_COMPANIES.reduce((acc, c) => acc + c.hackathons_hosted, 0);

  return (
    <div className="min-h-screen bg-canvas text-ink py-8 px-4 md:px-8 max-w-7xl mx-auto space-y-8">
      {/* Top Banner / Intro */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-line">
        <PageIntro
          kicker="Verified Ecosystem"
          title="Companies & Organizers"
          body="Explore trusted industry partners, research institutions, and foundations hosting high-impact hackathons."
        />

        <div className="flex items-center gap-3">
          <Link to="/host">
            <Button variant="primary" className="gap-2 text-xs py-2">
              <Sparkles className="h-4 w-4" />
              Host a Hackathon
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Counter Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-3.5 bg-gradient-to-br from-white to-primary/5">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-black text-ink">{VERIFIED_COMPANIES.length}+</div>
            <div className="text-xs text-mute font-medium">Verified Entities</div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3.5 bg-gradient-to-br from-white to-emerald-500/5">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-black text-ink">{totalHackathons}</div>
            <div className="text-xs text-mute font-medium">Hackathons Hosted</div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3.5 bg-gradient-to-br from-white to-accent-blue/5">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent-blue/10 text-accent-blue">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-black text-ink">100%</div>
            <div className="text-xs text-mute font-medium">Verified Organizers</div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3.5 bg-gradient-to-br from-white to-amber-500/5">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-amber-500/10 text-amber-600">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-black text-ink">$700K+</div>
            <div className="text-xs text-mute font-medium">Cumulative Prizes</div>
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-mute" />
            <input
              type="text"
              placeholder="Search by company name, technology, or domain..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs font-medium rounded-btn border border-line bg-surface text-ink placeholder:text-mute focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5 text-mute mr-1 hidden sm:block" />
            {types.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-btn transition ${
                  selectedType === type
                    ? "bg-primary text-white shadow-sm"
                    : "bg-surface hover:bg-line/40 text-mute hover:text-ink"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Companies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCompanies.map((comp) => (
          <Card
            key={comp.id}
            className="p-6 flex flex-col justify-between hover:shadow-lift transition duration-200 border border-line hover:border-primary/40 bg-white"
          >
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={comp.logo}
                    alt={comp.name}
                    className="h-12 w-12 rounded-xl object-cover border border-line shadow-sm"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-bold text-ink leading-tight">{comp.name}</h3>
                      {comp.verified && (
                        <span title="Verified HackNova Partner">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-medium text-mute">{comp.industry}</span>
                  </div>
                </div>

                <Badge tone="neutral">
                  {comp.type}
                </Badge>
              </div>

              {/* Bio */}
              <p className="text-xs text-mute line-clamp-3 leading-relaxed">{comp.description}</p>

              {/* Domains */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {comp.domains.map((dom) => (
                  <span
                    key={dom}
                    className="inline-flex items-center rounded-md bg-canvas px-2 py-0.5 text-[11px] font-medium text-mute border border-line/60"
                  >
                    {dom}
                  </span>
                ))}
              </div>
            </div>

            {/* Footer Stats & Actions */}
            <div className="pt-5 mt-5 border-t border-line/70 space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-canvas">
                  <div className="font-bold text-ink">{comp.hackathons_hosted}</div>
                  <div className="text-[10px] text-mute">Hosted</div>
                </div>
                <div className="p-2 rounded-lg bg-canvas">
                  <div className="font-bold text-emerald-600">{comp.active_events}</div>
                  <div className="text-[10px] text-mute">Active</div>
                </div>
                <div className="p-2 rounded-lg bg-canvas">
                  <div className="font-bold text-primary">{comp.total_prize_awarded}</div>
                  <div className="text-[10px] text-mute">Prizes</div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <a
                  href={comp.website_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-mute hover:text-ink transition"
                >
                  <Globe className="h-3 w-3" />
                  Website
                  <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                </a>

                <Link to={`/app/hackathons?q=${encodeURIComponent(comp.name.split(" ")[0])}`}>
                  <Button variant="secondary" className="text-xs py-1.5 gap-1">
                    View Events <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Become an Organizer Callout */}
      <div className="rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-white to-accent-blue/10 p-6 md:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            <Building2 className="h-3.5 w-3.5" /> For Enterprises & Universities
          </div>
          <h2 className="text-xl md:text-2xl font-black text-ink">
            Host Your Next Hackathon on HackNova
          </h2>
          <p className="text-xs text-mute max-w-xl">
            Sponsor challenges, recruit vetted student innovators with explainable AI skill maps, and
            manage team submissions with a seamless organizer console.
          </p>
        </div>

        <Link to="/host">
          <Button variant="primary" className="whitespace-nowrap px-6 py-2.5 text-xs gap-2">
            Launch an Event <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
