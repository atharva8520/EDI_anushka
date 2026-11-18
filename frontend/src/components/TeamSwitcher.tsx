import React from "react";
import { useNavigate } from "react-router-dom";
import { Users, ChevronDown } from "lucide-react";
import type { MyTeamItem } from "../types";

interface TeamSwitcherProps {
  activeTeams: MyTeamItem[];
  currentTeamId?: string;
  basePath: string; // e.g. "/app/team" or "/app/workspace"
}

export function TeamSwitcher({ activeTeams, currentTeamId, basePath }: TeamSwitcherProps) {
  const navigate = useNavigate();

  // ONLY show switcher when the student has more than one active team
  if (!activeTeams || activeTeams.length <= 1) {
    return null;
  }

  const selectedId = currentTeamId || activeTeams[0]?.id;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTeamId = e.target.value;
    navigate(`${basePath}?team=${newTeamId}`);
  };

  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-card border border-primary/20 bg-primary/5 px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2.5">
        <div className="grid h-8 w-8 place-items-center rounded-btn bg-primary/10 text-primary">
          <Users className="h-4 w-4" />
        </div>
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-mute">Active Squad</span>
          <p className="text-xs text-ink">
            You belong to <strong className="text-primary font-bold">{activeTeams.length} squads</strong> across different hackathons.
          </p>
        </div>
      </div>

      <div className="relative min-w-[240px]">
        <select
          value={selectedId}
          onChange={handleChange}
          className="w-full appearance-none rounded-btn border border-line bg-card py-2 pl-3 pr-8 text-xs font-semibold text-ink shadow-sm transition hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {activeTeams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} — {t.hackathon_name} {t.is_leader ? "(Lead)" : "(Member)"}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-mute" />
      </div>
    </div>
  );
}
