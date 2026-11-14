import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Users,
  UserPlus,
  Shield,
  Copy,
  Check,
  AlertCircle,
  AlertTriangle,
  FolderKanban,
  Sparkles,
  UserMinus,
  ArrowRight,
  ExternalLink,
  Crown,
  Search,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { api, apiError } from "../../api/client";
import type {
  TeamWorkspace,
  HackathonListItem,
  Member,
  TeamInviteLeader,
} from "../../types";
import { PREFERRED_ROLES } from "../../constants";
import { Button } from "../../components/Button";
import { Badge } from "../../components/Badge";
import { Card, Skeleton, ErrorState } from "../../components/States";
import { Input, Select } from "../../components/Field";
import { Modal } from "../../components/Modal";
import { PageIntro } from "../../components/PageIntro";

export function TeamPage() {
  const [searchParams] = useSearchParams();
  const hackathonParam = searchParams.get("hackathon");

  const [workspace, setWorkspace] = useState<TeamWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // No-team state: hackathon list & forms
  const [hackathons, setHackathons] = useState<HackathonListItem[]>([]);
  const [createHackathonId, setCreateHackathonId] = useState<string>("");
  const [createName, setCreateName] = useState("");
  const [createRole, setCreateRole] = useState("Team Lead");
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [joinCode, setJoinCode] = useState("");
  const [joinRole, setJoinRole] = useState("Member");
  const [joinSubmitting, setJoinSubmitting] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Leader controls state
  const [copiedCode, setCopiedCode] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<TeamInviteLeader[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);

  // Modals
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const [roleModalMember, setRoleModalMember] = useState<Member | null>(null);
  const [newMemberRole, setNewMemberRole] = useState("");
  const [roleSubmitting, setRoleSubmitting] = useState(false);

  const [removeModalMember, setRemoveModalMember] = useState<Member | null>(null);
  const [removeSubmitting, setRemoveSubmitting] = useState(false);

  const [transferModalMember, setTransferModalMember] = useState<Member | null>(null);
  const [transferSubmitting, setTransferSubmitting] = useState(false);

  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);

  const fetchTeamWorkspace = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get<TeamWorkspace | null>("/teams/mine")
      .then((res) => {
        setWorkspace(res.data);
      })
      .catch((err) => {
        setError(apiError(err, "Failed to load team workspace"));
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const fetchHackathons = useCallback(() => {
    api
      .get<HackathonListItem[]>("/hackathons?limit=50")
      .then((res) => {
        const eligible = res.data.filter(
          (h) => h.status === "published" || h.status === "active"
        );
        setHackathons(eligible);
        if (hackathonParam && eligible.some((h) => h.id === hackathonParam)) {
          setCreateHackathonId(hackathonParam);
        } else if (eligible.length > 0 && !createHackathonId) {
          setCreateHackathonId(eligible[0].id);
        }
      })
      .catch(() => {});
  }, [hackathonParam, createHackathonId]);

  const fetchPendingInvites = useCallback((teamId: string) => {
    setLoadingInvites(true);
    api
      .get<TeamInviteLeader[]>(`/teams/${teamId}/invites`)
      .then((res) => {
        setPendingInvites(res.data);
      })
      .catch(() => {})
      .finally(() => {
        setLoadingInvites(false);
      });
  }, []);

  useEffect(() => {
    fetchTeamWorkspace();
    fetchHackathons();
  }, [fetchTeamWorkspace, fetchHackathons]);

  useEffect(() => {
    if (workspace?.team.is_leader && workspace.team.id) {
      fetchPendingInvites(workspace.team.id);
    }
  }, [workspace?.team.is_leader, workspace?.team.id, fetchPendingInvites]);

  // Copy invite code
  function handleCopyInviteCode() {
    if (!workspace?.team.invite_code) return;
    navigator.clipboard.writeText(workspace.team.invite_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  // Create team handler
  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!createHackathonId) {
      setCreateError("Please select a hackathon");
      return;
    }
    if (!createName.trim()) {
      setCreateError("Please enter a team name");
      return;
    }

    setCreateSubmitting(true);
    setCreateError(null);
    try {
      await api.post("/teams", {
        hackathon_id: createHackathonId,
        name: createName.trim(),
        member_role: createRole,
      });
      fetchTeamWorkspace();
    } catch (err) {
      setCreateError(apiError(err, "Failed to create team"));
    } finally {
      setCreateSubmitting(false);
    }
  }

  // Join team handler
  async function handleJoinTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!joinCode.trim()) {
      setJoinError("Please enter an invite code");
      return;
    }

    setJoinSubmitting(true);
    setJoinError(null);
    try {
      await api.post("/teams/join", {
        invite_code: joinCode.trim().toUpperCase(),
        member_role: joinRole,
      });
      fetchTeamWorkspace();
    } catch (err) {
      setJoinError(apiError(err, "Failed to join team"));
    } finally {
      setJoinSubmitting(false);
    }
  }

  // Invite by email handler
  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!workspace?.team.id || !inviteEmail.trim()) return;

    setInviteSubmitting(true);
    setInviteError(null);
    try {
      await api.post(`/teams/${workspace.team.id}/invites`, {
        email: inviteEmail.trim(),
      });
      setInviteModalOpen(false);
      setInviteEmail("");
      setActionSuccess("Invitation sent successfully!");
      fetchPendingInvites(workspace.team.id);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      setInviteError(apiError(err, "Failed to send invitation"));
    } finally {
      setInviteSubmitting(false);
    }
  }

  // Update member role handler
  async function handleUpdateRole(e: React.FormEvent) {
    e.preventDefault();
    if (!workspace?.team.id || !roleModalMember || !newMemberRole) return;

    setRoleSubmitting(true);
    try {
      await api.post(`/teams/${workspace.team.id}/members/${roleModalMember.id}/role`, {
        member_role: newMemberRole,
      });
      setRoleModalMember(null);
      setActionSuccess(`Updated ${roleModalMember.full_name}'s role to ${newMemberRole}`);
      fetchTeamWorkspace();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      alert(apiError(err, "Failed to update role"));
    } finally {
      setRoleSubmitting(false);
    }
  }

  // Remove member handler
  async function handleRemoveMember() {
    if (!workspace?.team.id || !removeModalMember) return;

    setRemoveSubmitting(true);
    try {
      await api.post(`/teams/${workspace.team.id}/members/${removeModalMember.id}/remove`);
      setRemoveModalMember(null);
      setActionSuccess(`Removed ${removeModalMember.full_name} from the squad.`);
      fetchTeamWorkspace();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      alert(apiError(err, "Failed to remove member"));
    } finally {
      setRemoveSubmitting(false);
    }
  }

  // Transfer leadership handler
  async function handleTransferLeadership() {
    if (!workspace?.team.id || !transferModalMember) return;

    setTransferSubmitting(true);
    try {
      await api.post(`/teams/${workspace.team.id}/transfer-leadership`, {
        member_id: transferModalMember.id,
      });
      setTransferModalMember(null);
      setActionSuccess(`Transferred leadership to ${transferModalMember.full_name}!`);
      fetchTeamWorkspace();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      alert(apiError(err, "Failed to transfer leadership"));
    } finally {
      setTransferSubmitting(false);
    }
  }

  // Leave team handler
  async function handleLeaveTeam() {
    if (!workspace?.team.id) return;

    setLeaveSubmitting(true);
    try {
      await api.post(`/teams/${workspace.team.id}/leave`);
      setLeaveModalOpen(false);
      setWorkspace(null);
      fetchTeamWorkspace();
    } catch (err) {
      alert(apiError(err, "Failed to leave team"));
    } finally {
      setLeaveSubmitting(false);
    }
  }

  // Check if selected hackathon registration is closed
  const selectedHackathon = hackathons.find((h) => h.id === createHackathonId);
  const isRegistrationClosed = selectedHackathon
    ? new Date(selectedHackathon.registration_deadline) < new Date(new Date().toDateString())
    : false;

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <ErrorState message={error} onRetry={fetchTeamWorkspace} />
      </div>
    );
  }

  // NO TEAM STATE: Dual Panel (Create Team / Join Team)
  if (!workspace || !workspace.team) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8 space-y-8">
        <PageIntro
          kicker="Squad Formation"
          title="Team Hub"
          body="Build your multidisciplinary squad or join an existing team using a leader invite code."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Panel 1: Create a Team */}
          <Card className="p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink">Create a Team</h3>
                <p className="text-xs text-mute">Found a new squad as the Team Lead</p>
              </div>
            </div>

            {createError ? (
              <div className="flex items-start gap-2 rounded-[12px] border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{createError}</span>
              </div>
            ) : null}

            <form onSubmit={handleCreateTeam} className="space-y-4">
              <Select
                label="Select Hackathon"
                value={createHackathonId}
                onChange={(e) => setCreateHackathonId(e.target.value)}
              >
                {hackathons.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.status})
                  </option>
                ))}
              </Select>

              {isRegistrationClosed ? (
                <div className="flex items-start gap-2 rounded-[12px] border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-900">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    Registration deadline has passed for this hackathon. New team creation is closed.
                  </div>
                </div>
              ) : null}

              <Input
                label="Team Name"
                placeholder="e.g. Neural Forge"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                disabled={isRegistrationClosed}
              />

              <Select
                label="Your Role"
                value={createRole}
                onChange={(e) => setCreateRole(e.target.value)}
                disabled={isRegistrationClosed}
              >
                <option value="Team Lead">Team Lead</option>
                {PREFERRED_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>

              <Button
                variant="primary"
                type="submit"
                disabled={createSubmitting || isRegistrationClosed || !createHackathonId}
                className="w-full justify-center gap-2 mt-2"
              >
                <Sparkles className="h-4 w-4" />
                {createSubmitting ? "Creating Squad..." : "Create Team"}
              </Button>
            </form>
          </Card>

          {/* Panel 2: Join with Invite Code */}
          <Card className="p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink">Join with Code</h3>
                <p className="text-xs text-mute">Enter the squad code provided by your leader</p>
              </div>
            </div>

            {joinError ? (
              <div className="flex items-start gap-2 rounded-[12px] border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{joinError}</span>
              </div>
            ) : null}

            <form onSubmit={handleJoinTeam} className="space-y-4">
              <Input
                label="Team Invite Code"
                placeholder="e.g. NOVA942"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                hint="Case-insensitive 4 to 12 character code"
              />

              <Select
                label="Your Member Role"
                value={joinRole}
                onChange={(e) => setJoinRole(e.target.value)}
              >
                <option value="Member">Member</option>
                {PREFERRED_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>

              <Button
                variant="secondary"
                type="submit"
                disabled={joinSubmitting || !joinCode.trim()}
                className="w-full justify-center gap-2 mt-2"
              >
                <Users className="h-4 w-4" />
                {joinSubmitting ? "Joining..." : "Join Squad"}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  // ACTIVE TEAM WORKSPACE
  const team = workspace.team;
  const activeMembers = team.members.filter((m) => m.status === "active");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 space-y-6">
      {actionSuccess ? (
        <div className="flex items-center gap-2 rounded-[12px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          <Check className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      ) : null}

      {/* Team Header & Readiness Hero */}
      <Card className="p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl font-bold text-ink truncate">{team.name}</h2>
              <Badge tone={team.is_leader ? "primary" : "neutral"}>
                {team.is_leader ? "Team Lead" : "Member"}
              </Badge>
            </div>
            <p className="text-sm text-mute">
              Event:{" "}
              <Link
                to={`/app/hackathons/${team.hackathon_id}`}
                className="font-semibold text-primary hover:underline inline-flex items-center gap-1"
              >
                {team.hackathon_name}
                <ExternalLink className="h-3 w-3" />
              </Link>
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            {/* Invite Code Box */}
            <div className="flex items-center gap-2 rounded-[12px] border border-line bg-canvas px-3 py-1.5">
              <span className="text-xs text-mute font-medium">Code:</span>
              <span className="font-mono text-sm font-bold text-ink">{team.invite_code}</span>
              <button
                onClick={handleCopyInviteCode}
                className="rounded p-1 text-mute hover:text-ink hover:bg-white transition"
                title="Copy Invite Code"
                aria-label="Copy Invite Code"
              >
                {copiedCode ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            {team.is_leader ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  className="gap-1.5 text-xs py-1.5"
                  disabled={team.is_full}
                  onClick={() => setInviteModalOpen(true)}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Invite Teammate
                </Button>
                <Link to="/app/team/find">
                  <Button variant="secondary" className="gap-1.5 text-xs py-1.5">
                    <Search className="h-3.5 w-3.5" />
                    Directory
                  </Button>
                </Link>
              </div>
            ) : null}

            <Button
              variant="secondary"
              onClick={() => setLeaveModalOpen(true)}
              className="gap-1.5 text-xs py-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
            >
              <UserMinus className="h-3.5 w-3.5" />
              Leave Team
            </Button>
          </div>
        </div>

        {/* Readiness Bar */}
        <div className="border-t border-line/60 pt-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <div className="flex items-center gap-2">
              <span className="text-ink">Squad Readiness:</span>
              {team.is_ready ? (
                <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                  ✓ Ready to compete
                </span>
              ) : (
                <span className="text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
                  Needs {team.team_size_min - team.active_member_count} more member
                  {team.team_size_min - team.active_member_count > 1 ? "s" : ""} to qualify
                </span>
              )}
              {team.is_full ? (
                <span className="text-mute bg-canvas border border-line px-2 py-0.5 rounded-full">
                  Full capacity ({team.team_size_max}/{team.team_size_max})
                </span>
              ) : null}
            </div>
            <span className="text-mute">
              {team.active_member_count} / {team.team_size_max} members (Min: {team.team_size_min})
            </span>
          </div>

          <div className="h-2 w-full rounded-full bg-canvas border border-line overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                team.is_ready ? "bg-emerald-500" : "bg-amber-400"
              }`}
              style={{
                width: `${Math.min(100, (team.active_member_count / team.team_size_max) * 100)}%`,
              }}
            />
          </div>
        </div>
      </Card>

      {/* Selected Problem Card */}
      <Card className="p-5">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-2.5">
            <FolderKanban className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-base text-ink">Selected Challenge</h3>
          </div>
          {team.selected_problem ? (
            <Link
              to={`/app/hackathons/${team.hackathon_id}/problems/${team.selected_problem.id}`}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              View Problem Brief
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : null}
        </div>

        {team.selected_problem ? (
          <div className="rounded-[12px] bg-canvas p-4 border border-line space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">
                {team.selected_problem.code}
              </span>
              <h4 className="font-bold text-sm text-ink">{team.selected_problem.title}</h4>
              <Badge tone="info">{team.selected_problem.domain}</Badge>
            </div>
            <p className="text-xs text-mute line-clamp-2">{team.selected_problem.description}</p>
          </div>
        ) : (
          <div className="rounded-[12px] border border-dashed border-line p-4 text-center space-y-2">
            <p className="text-xs text-mute">
              Your squad has not selected an official problem statement yet.
            </p>
            {team.is_leader ? (
              <Link to={`/app/hackathons/${team.hackathon_id}`}>
                <Button variant="secondary" className="gap-1.5 text-xs py-1.5">
                  Browse Hackathon Problems
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            ) : null}
          </div>
        )}
      </Card>

      {/* Skill Map & Missing Capabilities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-5 lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="font-bold text-sm text-ink">Squad Skill Coverage</h3>
            </div>
            <span className="text-[11px] font-medium text-mute">
              Relative coverage (strongest category = 100%)
            </span>
          </div>

          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={workspace.skill_map}
                margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
              >
                <XAxis
                  dataKey="category"
                  tick={{ fontSize: 11, fill: "#4B5563" }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#9CA3AF" }} unit="%" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-lg border border-line bg-white p-2.5 shadow-lift text-xs">
                          <p className="font-bold text-ink">{data.category}</p>
                          <p className="text-primary font-semibold">
                            Coverage: {data.coverage}%
                          </p>
                          <p className="text-mute">
                            {data.members} contributor{data.members !== 1 ? "s" : ""}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="coverage" fill="#5B4BDB" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Members per category breakdown */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-line/60">
            {workspace.skill_map.map((item) => (
              <div
                key={item.category}
                className="text-[11px] font-medium text-mute rounded-md bg-canvas px-2 py-1 border border-line"
              >
                <span className="font-bold text-ink">{item.category}:</span> {item.members} member{item.members !== 1 ? "s" : ""} ({item.coverage}%)
              </div>
            ))}
          </div>
        </Card>

        {/* Missing Capabilities List */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <h3 className="font-bold text-sm text-ink">Capability Gaps</h3>
          </div>

          <p className="text-xs text-mute">
            Roles currently uncovered by any teammate in this squad:
          </p>

          {workspace.missing_capabilities.length === 0 ? (
            <div className="rounded-[12px] bg-emerald-50 border border-emerald-200 p-3 text-xs font-medium text-emerald-800">
              ✓ All key roles and skill disciplines have active representation!
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {workspace.missing_capabilities.map((cat) => (
                <Badge key={cat} tone="warning">
                  Missing: {cat}
                </Badge>
              ))}
            </div>
          )}

          {team.is_leader && !team.is_full && workspace.missing_capabilities.length > 0 ? (
            <Link to="/app/team/find">
              <Button variant="secondary" className="w-full text-xs py-1.5 justify-center gap-1.5 mt-2">
                <Search className="h-3.5 w-3.5" />
                Find Teammates with Gaps
              </Button>
            </Link>
          ) : null}
        </Card>
      </div>

      {/* Roster: Members Table / Cards */}
      <Card className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Shield className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-base text-ink">
              Squad Roster ({activeMembers.length})
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeMembers.map((member) => {
            const isMemberLead = member.user_id === team.leader_id;

            return (
              <div
                key={member.id}
                className="rounded-[12px] border border-line bg-canvas/40 p-4 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                        {member.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-bold text-sm text-ink truncate">{member.full_name}</p>
                          {isMemberLead ? (
                            <span title="Team Lead" className="text-amber-500">
                              <Crown className="h-3.5 w-3.5" />
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs text-mute truncate">{member.college || "Student Builder"}</p>
                      </div>
                    </div>

                    <Badge tone={isMemberLead ? "primary" : "neutral"}>
                      {member.member_role}
                    </Badge>
                  </div>

                  {member.skills.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {member.skills.slice(0, 4).map((s) => (
                        <span
                          key={s.skill_id}
                          className="rounded bg-white px-2 py-0.5 text-[11px] font-medium text-ink border border-line"
                        >
                          {s.name}
                        </span>
                      ))}
                      {member.skills.length > 4 ? (
                        <span className="text-[10px] text-mute font-medium self-center">
                          +{member.skills.length - 4}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {/* Leader Actions on other members */}
                {team.is_leader && !isMemberLead ? (
                  <div className="flex items-center justify-end gap-2 border-t border-line/60 pt-2.5">
                    <button
                      onClick={() => {
                        setRoleModalMember(member);
                        setNewMemberRole(member.member_role);
                      }}
                      className="text-xs font-semibold text-primary hover:underline px-2 py-1"
                    >
                      Change Role
                    </button>
                    <button
                      onClick={() => setTransferModalMember(member)}
                      className="text-xs font-semibold text-amber-700 hover:underline px-2 py-1"
                    >
                      Make Lead
                    </button>
                    <button
                      onClick={() => setRemoveModalMember(member)}
                      className="text-xs font-semibold text-rose-600 hover:underline px-2 py-1"
                    >
                      Remove
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Leader Only: Pending Invites Drawer / Section */}
      {team.is_leader ? (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-ink">
              Pending Outgoing Invitations ({pendingInvites.length})
            </h3>
            <Button
              variant="secondary"
              onClick={() => fetchPendingInvites(team.id)}
              disabled={loadingInvites}
              className="text-xs py-1"
            >
              {loadingInvites ? "Refreshing..." : "Refresh"}
            </Button>
          </div>

          {pendingInvites.length === 0 ? (
            <p className="text-xs text-mute">No pending invitations sent by your squad.</p>
          ) : (
            <div className="divide-y divide-line/60 border border-line rounded-[12px] bg-canvas/30">
              {pendingInvites.map((inv) => (
                <div key={inv.id} className="p-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-ink">{inv.invitee_name}</span>
                    <span className="text-mute ml-2">
                      sent on {new Date(inv.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <Badge tone="warning">{inv.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : null}

      {/* MODALS */}

      {/* Modal: Invite by Email */}
      <Modal
        open={inviteModalOpen}
        title="Invite Teammate by Email"
        onClose={() => {
          setInviteModalOpen(false);
          setInviteError(null);
        }}
      >
        <form onSubmit={handleSendInvite} className="space-y-4">
          <p className="text-xs text-mute">
            Invite a registered student directly by entering their account email address.
          </p>

          {inviteError ? (
            <div className="flex items-start gap-2 rounded-[12px] border border-rose-200 bg-rose-50 p-2.5 text-xs font-medium text-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{inviteError}</span>
            </div>
          ) : null}

          <Input
            label="Student Email"
            type="email"
            placeholder="student@college.dev"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />

          <div className="flex items-center justify-between border-t border-line/60 pt-3">
            <Link to="/app/team/find" onClick={() => setInviteModalOpen(false)}>
              <span className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
                <Search className="h-3 w-3" />
                Browse Directory Instead
              </span>
            </Link>
            <Button
              variant="primary"
              type="submit"
              disabled={inviteSubmitting || !inviteEmail.trim()}
              className="text-xs"
            >
              {inviteSubmitting ? "Sending..." : "Send Invite"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Change Member Role */}
      <Modal
        open={Boolean(roleModalMember)}
        title={`Change Role: ${roleModalMember?.full_name}`}
        onClose={() => setRoleModalMember(null)}
      >
        <form onSubmit={handleUpdateRole} className="space-y-4">
          <Select
            label="Select Role"
            value={newMemberRole}
            onChange={(e) => setNewMemberRole(e.target.value)}
          >
            <option value="Member">Member</option>
            {PREFERRED_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>

          <div className="flex justify-end gap-2 pt-2 border-t border-line/60">
            <Button variant="secondary" type="button" onClick={() => setRoleModalMember(null)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={roleSubmitting}>
              {roleSubmitting ? "Updating..." : "Save Role"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Remove Member Confirmation */}
      <Modal
        open={Boolean(removeModalMember)}
        title="Remove Member from Team"
        onClose={() => setRemoveModalMember(null)}
      >
        <div className="space-y-4">
          <p className="text-sm text-ink">
            Are you sure you want to remove{" "}
            <span className="font-bold text-ink">{removeModalMember?.full_name}</span> from{" "}
            <span className="font-bold text-ink">{team.name}</span>?
          </p>
          <p className="text-xs text-mute">
            They will lose access to team problem submissions and workspace features.
          </p>
          <div className="flex justify-end gap-2 pt-3 border-t border-line/60">
            <Button variant="secondary" onClick={() => setRemoveModalMember(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              className="bg-rose-600 hover:bg-rose-700 text-white"
              disabled={removeSubmitting}
              onClick={handleRemoveMember}
            >
              {removeSubmitting ? "Removing..." : "Confirm Removal"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Transfer Leadership Confirmation */}
      <Modal
        open={Boolean(transferModalMember)}
        title="Transfer Team Leadership"
        onClose={() => setTransferModalMember(null)}
      >
        <div className="space-y-4">
          <p className="text-sm text-ink">
            Are you sure you want to transfer leadership of{" "}
            <span className="font-bold text-ink">{team.name}</span> to{" "}
            <span className="font-bold text-ink">{transferModalMember?.full_name}</span>?
          </p>
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-[12px] p-3 font-medium">
            You will become a regular Member. The new Team Lead will gain sole administrative control over member roles, invitations, problem selection, and leadership transfers.
          </p>
          <div className="flex justify-end gap-2 pt-3 border-t border-line/60">
            <Button variant="secondary" onClick={() => setTransferModalMember(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              className="bg-amber-600 hover:bg-amber-700 text-white"
              disabled={transferSubmitting}
              onClick={handleTransferLeadership}
            >
              {transferSubmitting ? "Transferring..." : "Confirm Transfer"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Leave Team Confirmation */}
      <Modal
        open={leaveModalOpen}
        title="Leave Squad"
        onClose={() => setLeaveModalOpen(false)}
      >
        <div className="space-y-4">
          <p className="text-sm text-ink">
            Are you sure you want to leave <span className="font-bold text-ink">{team.name}</span>?
          </p>

          {team.is_leader && team.active_member_count === 1 ? (
            <div className="rounded-[12px] bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-800 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <div>
                CRITICAL WARNING: As the team lead and the sole remaining member, leaving will permanently DELETE the team, its invite code, problem selections, and all pending invitations!
              </div>
            </div>
          ) : team.is_leader ? (
            <div className="rounded-[12px] bg-amber-50 border border-amber-200 p-3 text-xs font-medium text-amber-800">
              Note: You cannot leave as team lead while other active members remain. You must transfer leadership to another teammate first.
            </div>
          ) : (
            <p className="text-xs text-mute">
              You will be removed from the squad roster and can join or create another team.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-line/60">
            <Button variant="secondary" onClick={() => setLeaveModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              className="bg-rose-600 hover:bg-rose-700 text-white"
              disabled={leaveSubmitting}
              onClick={handleLeaveTeam}
            >
              {leaveSubmitting ? "Leaving..." : "Leave Team"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
