import { useState, useEffect } from "react";
import {
  User as UserIcon,
  Github,
  Globe,
  Sparkles,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Calendar,
  Layers,
  Award,
  Clock,
  Briefcase,
  X,
} from "lucide-react";
import { api, apiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { Profile, Skill, UserSkill, PreviousProject } from "../types";
import { Button } from "../components/Button";
import { Badge } from "../components/Badge";
import { Input, TextArea, Select } from "../components/Field";
import { Card, Skeleton, ErrorState, EmptyState } from "../components/States";
import { Modal } from "../components/Modal";
import { PLATFORM_DOMAINS, PREFERRED_ROLES, AVAILABILITY_OPTIONS } from "../constants";

export function ProfilePage() {
  const { refreshProfile } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [college, setCollege] = useState("");
  const [branch, setBranch] = useState("");
  const [year, setYear] = useState("");
  const [bio, setBio] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [availability, setAvailability] = useState<string>("");
  const [hackathonExperience, setHackathonExperience] = useState("");
  const [preferredRoles, setPreferredRoles] = useState<string[]>([]);
  const [domains, setDomains] = useState<string[]>([]);
  const [userSkills, setUserSkills] = useState<UserSkill[]>([]);
  const [projects, setProjects] = useState<PreviousProject[]>([]);

  // Skill Selector State
  const [selectedSkillId, setSelectedSkillId] = useState("");
  const [selectedProficiency, setSelectedProficiency] = useState<"beginner" | "intermediate" | "advanced">("intermediate");

  // Client Validation Errors
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, []);

  // Warn user on window unload if form is dirty
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isEditing && isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isEditing, isDirty]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [profileRes, skillsRes] = await Promise.all([
        api.get<Profile>("/users/me"),
        api.get<Skill[]>("/skills"),
      ]);
      setProfile(profileRes.data);
      setAllSkills(skillsRes.data);
      populateForm(profileRes.data);
    } catch (err) {
      setError(apiError(err, "Failed to load profile data."));
    } finally {
      setLoading(false);
    }
  }

  function populateForm(p: Profile) {
    setFullName(p.full_name || "");
    setCollege(p.college || "");
    setBranch(p.branch || "");
    setYear(p.year || "");
    setBio(p.bio || "");
    setGithubUrl(p.github_url || "");
    setPortfolioUrl(p.portfolio_url || "");
    setAvailability(p.availability || "");
    setHackathonExperience(p.hackathon_experience || "");
    setPreferredRoles([...p.preferred_roles]);
    setDomains([...p.domains]);
    setUserSkills([...p.skills]);
    setProjects(p.previous_projects.map((proj) => ({ ...proj })));
    setIsDirty(false);
    setClientErrors({});
    setServerError(null);
  }

  function handleStartEditing() {
    if (profile) {
      populateForm(profile);
    }
    setIsEditing(true);
    setSuccessMessage(null);
  }

  function handleCancelEdit() {
    if (isDirty) {
      setShowCancelModal(true);
    } else {
      setIsEditing(false);
      if (profile) populateForm(profile);
    }
  }

  function confirmCancel() {
    setShowCancelModal(false);
    setIsEditing(false);
    if (profile) populateForm(profile);
  }

  function validateUrl(url: string, fieldName: string): boolean {
    if (!url || !url.trim()) return true;
    const trimmed = url.trim();
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      setClientErrors((prev) => ({
        ...prev,
        [fieldName]: "URL must start with http:// or https://",
      }));
      return false;
    }
    setClientErrors((prev) => {
      const copy = { ...prev };
      delete copy[fieldName];
      return copy;
    });
    return true;
  }

  function toggleRole(role: string) {
    setIsDirty(true);
    setPreferredRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }

  function toggleDomain(domain: string) {
    setIsDirty(true);
    setDomains((prev) =>
      prev.includes(domain) ? prev.filter((d) => d !== domain) : [...prev, domain]
    );
  }

  function handleAddSkill() {
    if (!selectedSkillId) return;
    const skillObj = allSkills.find((s) => s.id === selectedSkillId);
    if (!skillObj) return;

    // Prevent duplicate skill on client
    if (userSkills.some((s) => s.skill_id === selectedSkillId)) {
      setClientErrors((prev) => ({
        ...prev,
        skills: "This skill has already been added.",
      }));
      return;
    }

    setClientErrors((prev) => {
      const copy = { ...prev };
      delete copy.skills;
      return copy;
    });

    setUserSkills((prev) => [
      ...prev,
      {
        skill_id: skillObj.id,
        name: skillObj.name,
        category: skillObj.category,
        proficiency: selectedProficiency,
      },
    ]);
    setSelectedSkillId("");
    setIsDirty(true);
  }

  function handleRemoveSkill(skillId: string) {
    setUserSkills((prev) => prev.filter((s) => s.skill_id !== skillId));
    setIsDirty(true);
  }

  function handleSkillProficiencyChange(skillId: string, proficiency: "beginner" | "intermediate" | "advanced") {
    setUserSkills((prev) =>
      prev.map((s) => (s.skill_id === skillId ? { ...s, proficiency } : s))
    );
    setIsDirty(true);
  }

  function handleAddProject() {
    setProjects((prev) => [
      ...prev,
      {
        title: "",
        description: "",
        tech_stack: "",
        year: new Date().getFullYear(),
      },
    ]);
    setIsDirty(true);
  }

  function handleRemoveProject(index: number) {
    setProjects((prev) => prev.filter((_, i) => i !== index));
    setIsDirty(true);
  }

  function handleProjectChange(index: number, field: keyof PreviousProject, value: unknown) {
    setProjects((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
    setIsDirty(true);
  }

  async function handleSave() {
    // 1. Client Validations
    const errors: Record<string, string> = {};
    if (!fullName.trim()) {
      errors.fullName = "Full name is required (at least 2 characters).";
    } else if (fullName.trim().length < 2) {
      errors.fullName = "Full name must be at least 2 characters.";
    }

    if (githubUrl && !validateUrl(githubUrl, "githubUrl")) {
      errors.githubUrl = "GitHub URL must start with http:// or https://";
    }

    if (portfolioUrl && !validateUrl(portfolioUrl, "portfolioUrl")) {
      errors.portfolioUrl = "Portfolio URL must start with http:// or https://";
    }

    for (let i = 0; i < projects.length; i++) {
      if (!projects[i].title.trim() || projects[i].title.trim().length < 2) {
        errors[`project_${i}`] = "Project title must be at least 2 characters.";
      }
    }

    if (Object.keys(errors).length > 0) {
      setClientErrors(errors);
      return;
    }

    setSaving(true);
    setServerError(null);

    try {
      // Build payload strictly adhering to PUT /api/users/me semantics:
      // - Clear text fields with empty strings
      // - Project year is an integer or null (never empty string)
      // - Full lists sent for skills, roles, domains, projects
      const payload = {
        full_name: fullName.trim(),
        college: college.trim(),
        branch: branch.trim(),
        year: year.trim(),
        bio: bio.trim(),
        github_url: githubUrl.trim(),
        portfolio_url: portfolioUrl.trim(),
        availability: availability ? availability : null,
        hackathon_experience: hackathonExperience.trim(),
        preferred_roles: preferredRoles,
        domains: domains,
        skills: userSkills.map((s) => ({
          skill_id: s.skill_id,
          proficiency: s.proficiency,
        })),
        previous_projects: projects.map((p) => ({
          title: p.title.trim(),
          description: p.description ? p.description.trim() : null,
          tech_stack: p.tech_stack ? p.tech_stack.trim() : null,
          year: p.year ? Number(p.year) : null,
        })),
      };

      const res = await api.put<Profile>("/users/me", payload);
      setProfile(res.data);
      populateForm(res.data);
      setIsEditing(false);
      setSuccessMessage("Profile updated successfully!");

      // Refresh AuthContext so sidebar immediately updates name and role
      await refreshProfile();
    } catch (err) {
      setServerError(apiError(err, "Failed to save profile. Please review the form."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 p-6 md:p-10 space-y-6 max-w-5xl mx-auto w-full">
        <Skeleton className="h-40 w-full rounded-card" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64 rounded-card" />
          <Skeleton className="h-64 rounded-card" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex-1 p-6 md:p-10 max-w-xl mx-auto w-full">
        <ErrorState message={error || "Profile could not be loaded."} onRetry={loadData} />
      </div>
    );
  }

  const completion = profile.completion_percent;
  const missing = profile.missing_fields || [];

  return (
    <div className="flex-1 p-6 md:p-10 max-w-5xl mx-auto w-full space-y-6">
      {/* Success Notification */}
      {successMessage ? (
        <div className="rounded-card border border-emerald-200 bg-emerald-50 p-4 flex items-center justify-between text-emerald-800 text-sm font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="p-1 hover:bg-emerald-100 rounded text-emerald-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {/* Server Error Alert */}
      {serverError ? (
        <div className="rounded-card border border-red-200 bg-red-50 p-4 flex items-center gap-2 text-red-800 text-sm font-medium">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
          <span>{serverError}</span>
        </div>
      ) : null}

      {/* Top Profile Summary Header Card */}
      <Card className="p-6 md:p-8 shadow-card">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-primary to-accent-violet text-white font-extrabold text-2xl shadow-glow">
              {profile.full_name ? profile.full_name.charAt(0).toUpperCase() : "B"}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-black tracking-tight text-ink md:text-3xl">
                  {profile.full_name || "Anonymous Builder"}
                </h1>
                <Badge tone={profile.role === "admin" ? "warning" : "primary"}>
                  {profile.role.toUpperCase()}
                </Badge>
              </div>
              <p className="text-xs text-mute font-medium">{profile.email}</p>
              <div className="flex items-center gap-2 text-xs text-mute flex-wrap">
                {profile.college ? <span>{profile.college}</span> : null}
                {profile.branch ? <span>· {profile.branch}</span> : null}
                {profile.year ? <span>· {profile.year}</span> : null}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isEditing ? (
              <Button
                variant="primary"
                onClick={handleStartEditing}
                className="text-xs gap-1.5"
              >
                <Edit3 className="h-4 w-4" /> Edit Profile
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSave}
                  loading={saving}
                  className="text-xs"
                >
                  Save Profile
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Profile Completion Bar & Missing Fields */}
        <div className="mt-6 border-t border-line pt-6">
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span className="flex items-center gap-1.5 text-ink">
              <Sparkles className="h-4 w-4 text-primary" /> Profile Completion: {completion}%
            </span>
            <span className="text-mute">{completion === 100 ? "Ready for matchmaking!" : "Complete to boost team discovery"}</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-line overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent-blue transition-all duration-500 rounded-full"
              style={{ width: `${Math.min(100, Math.max(0, completion))}%` }}
            />
          </div>

          {missing.length > 0 ? (
            <div className="mt-3 flex items-center gap-2 flex-wrap text-xs">
              <span className="font-semibold text-mute">Missing fields:</span>
              {missing.map((field) => (
                <span
                  key={field}
                  className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 capitalize"
                >
                  {field.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> All recommended profile fields completed!
            </p>
          )}
        </div>
      </Card>

      {/* Main Form or View Sections */}
      {!isEditing ? (
        /* ================= VIEW MODE ================= */
        <div className="grid gap-6 md:grid-cols-2">
          {/* Bio & Academic */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <UserIcon className="h-4 w-4" /> About & Bio
            </div>
            <p className="text-sm text-ink leading-relaxed whitespace-pre-line">
              {profile.bio || <span className="text-mute italic">No bio provided yet. Click "Edit Profile" to share what kind of problems you love building.</span>}
            </p>

            <div className="border-t border-line pt-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-mute">College:</span>
                <span className="font-medium text-ink">{profile.college || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-mute">Branch / Major:</span>
                <span className="font-medium text-ink">{profile.branch || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-mute">Academic Year:</span>
                <span className="font-medium text-ink">{profile.year || "—"}</span>
              </div>
            </div>
          </Card>

          {/* Links & Availability */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <Globe className="h-4 w-4" /> Web Links & Availability
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-mute block mb-1">GitHub Profile:</span>
                {profile.github_url ? (
                  <a
                    href={profile.github_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-primary font-semibold hover:underline"
                  >
                    <Github className="h-3.5 w-3.5" /> {profile.github_url}
                  </a>
                ) : (
                  <span className="text-mute italic">Not connected</span>
                )}
              </div>

              <div>
                <span className="text-mute block mb-1">Portfolio / Website:</span>
                {profile.portfolio_url ? (
                  <a
                    href={profile.portfolio_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-primary font-semibold hover:underline"
                  >
                    <Globe className="h-3.5 w-3.5" /> {profile.portfolio_url}
                  </a>
                ) : (
                  <span className="text-mute italic">Not set</span>
                )}
              </div>

              <div className="border-t border-line pt-3 flex items-center justify-between">
                <span className="text-mute">Availability:</span>
                <span className="font-semibold text-ink capitalize">
                  {profile.availability ? (
                    <Badge tone="info">{profile.availability}</Badge>
                  ) : (
                    "—"
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-mute">Hackathon Experience:</span>
                <span className="font-medium text-ink">{profile.hackathon_experience || "—"}</span>
              </div>
            </div>
          </Card>

          {/* Roles & Domains */}
          <Card className="p-6 space-y-4 md:col-span-2">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <div className="flex items-center gap-2 text-primary font-bold text-sm mb-3">
                  <Briefcase className="h-4 w-4" /> Preferred Team Roles
                </div>
                {profile.preferred_roles.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.preferred_roles.map((r) => (
                      <span
                        key={r}
                        className="rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-semibold text-primary"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-mute italic">No preferred roles selected.</p>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 text-accent-blue font-bold text-sm mb-3">
                  <Layers className="h-4 w-4" /> Domains of Interest
                </div>
                {profile.domains.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.domains.map((d) => (
                      <span
                        key={d}
                        className="rounded-full bg-accent-blue/10 border border-accent-blue/20 px-3 py-1 text-xs font-semibold text-[#0284C7]"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-mute italic">No domains of interest selected.</p>
                )}
              </div>
            </div>
          </Card>

          {/* Technical Skills */}
          <Card className="p-6 md:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <Award className="h-4 w-4" /> Technical Skills & Proficiency
              </div>
              <span className="text-xs text-mute">{profile.skills.length} skills added</span>
            </div>

            {profile.skills.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {profile.skills.map((s) => (
                  <div
                    key={s.skill_id}
                    className="flex items-center justify-between rounded-card border border-line bg-canvas p-3"
                  >
                    <div>
                      <p className="text-xs font-bold text-ink">{s.name}</p>
                      <p className="text-[11px] text-mute">{s.category}</p>
                    </div>
                    <Badge
                      tone={
                        s.proficiency === "advanced"
                          ? "success"
                          : s.proficiency === "intermediate"
                          ? "info"
                          : "neutral"
                      }
                    >
                      {s.proficiency}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No skills recorded"
                body="Add technical and domain skills to help squad leaders match with your proficiencies."
                action={
                  <Button variant="secondary" onClick={handleStartEditing} className="text-xs">
                    Add Skills
                  </Button>
                }
              />
            )}
          </Card>

          {/* Previous Projects */}
          <Card className="p-6 md:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <Calendar className="h-4 w-4" /> Previous Projects & Prototypes
              </div>
              <span className="text-xs text-mute">{profile.previous_projects.length} projects</span>
            </div>

            {profile.previous_projects.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {profile.previous_projects.map((proj, idx) => (
                  <div
                    key={proj.id || idx}
                    className="rounded-card border border-line bg-white p-4 shadow-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-ink">{proj.title}</h4>
                      {proj.year ? <Badge tone="neutral">{proj.year}</Badge> : null}
                    </div>
                    {proj.description ? (
                      <p className="text-xs text-mute leading-relaxed">{proj.description}</p>
                    ) : null}
                    {proj.tech_stack ? (
                      <p className="text-[11px] font-mono text-primary bg-primary/5 px-2 py-1 rounded inline-block">
                        {proj.tech_stack}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No previous projects listed"
                body="Highlight past hackathon builds, campus projects, or open-source work."
                action={
                  <Button variant="secondary" onClick={handleStartEditing} className="text-xs">
                    Add Project
                  </Button>
                }
              />
            )}
          </Card>
        </div>
      ) : (
        /* ================= EDIT MODE ================= */
        <div className="space-y-6">
          {/* Identity & Academic Fields */}
          <Card className="p-6 space-y-4">
            <h2 className="text-base font-bold text-ink border-b border-line pb-3">
              1. Identity & Academic Information
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Full Name *"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  setIsDirty(true);
                }}
                error={clientErrors.fullName}
                placeholder="e.g. Aditi Sharma"
              />
              <Input
                label="College / University"
                value={college}
                onChange={(e) => {
                  setCollege(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="e.g. PICT Pune"
              />
              <Input
                label="Branch / Major"
                value={branch}
                onChange={(e) => {
                  setBranch(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="e.g. Computer Engineering"
              />
              <Input
                label="Academic Year"
                value={year}
                onChange={(e) => {
                  setYear(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="e.g. TY or 3rd Year"
              />
            </div>
            <TextArea
              label="Bio / Builder Summary"
              value={bio}
              onChange={(e) => {
                setBio(e.target.value);
                setIsDirty(true);
              }}
              hint={`${bio.length}/2000 characters. Briefly describe what you enjoy building.`}
              placeholder="Backend engineer who enjoys turning messy operational problems into reliable APIs."
            />
          </Card>

          {/* Web Links & Logistics */}
          <Card className="p-6 space-y-4">
            <h2 className="text-base font-bold text-ink border-b border-line pb-3">
              2. Web Links & Logistics
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="GitHub URL"
                value={githubUrl}
                onChange={(e) => {
                  setGithubUrl(e.target.value);
                  setIsDirty(true);
                  if (clientErrors.githubUrl) validateUrl(e.target.value, "githubUrl");
                }}
                error={clientErrors.githubUrl}
                placeholder="https://github.com/username"
              />
              <Input
                label="Portfolio / Personal URL"
                value={portfolioUrl}
                onChange={(e) => {
                  setPortfolioUrl(e.target.value);
                  setIsDirty(true);
                  if (clientErrors.portfolioUrl) validateUrl(e.target.value, "portfolioUrl");
                }}
                error={clientErrors.portfolioUrl}
                placeholder="https://myportfolio.dev"
              />
              <Select
                label="Availability"
                value={availability}
                onChange={(e) => {
                  setAvailability(e.target.value);
                  setIsDirty(true);
                }}
              >
                <option value="">Select availability</option>
                {AVAILABILITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
              <Input
                label="Hackathon Experience"
                value={hackathonExperience}
                onChange={(e) => {
                  setHackathonExperience(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="e.g. 2 campus hackathons, SIH finalist"
              />
            </div>
          </Card>

          {/* Preferred Roles & Domains */}
          <Card className="p-6 space-y-6">
            <div>
              <h2 className="text-base font-bold text-ink mb-1">
                3. Preferred Team Roles
              </h2>
              <p className="text-xs text-mute mb-3">
                Select exactly the roles recognized by HackNova squad matching.
              </p>
              <div className="flex flex-wrap gap-2">
                {PREFERRED_ROLES.map((r) => {
                  const selected = preferredRoles.includes(r);
                  return (
                    <button
                      type="button"
                      key={r}
                      onClick={() => toggleRole(r)}
                      className={`rounded-btn px-3.5 py-1.5 text-xs font-semibold transition border ${
                        selected
                          ? "bg-primary text-white border-primary shadow-xs"
                          : "bg-white text-ink border-line hover:bg-canvas"
                      }`}
                    >
                      {r} {selected ? "✓" : "+"}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-line pt-4">
              <h2 className="text-base font-bold text-ink mb-1">
                4. Domains of Interest
              </h2>
              <p className="text-xs text-mute mb-3">
                Select problem domains you are passionate about tackling.
              </p>
              <div className="flex flex-wrap gap-2">
                {PLATFORM_DOMAINS.map((d) => {
                  const selected = domains.includes(d);
                  return (
                    <button
                      type="button"
                      key={d}
                      onClick={() => toggleDomain(d)}
                      className={`rounded-btn px-3.5 py-1.5 text-xs font-semibold transition border ${
                        selected
                          ? "bg-accent-blue text-white border-accent-blue shadow-xs"
                          : "bg-white text-ink border-line hover:bg-canvas"
                      }`}
                    >
                      {d} {selected ? "✓" : "+"}
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Skills Management */}
          <Card className="p-6 space-y-4">
            <h2 className="text-base font-bold text-ink border-b border-line pb-3">
              5. Technical Skills
            </h2>

            {/* Skill Selector Row */}
            <div className="grid gap-3 sm:grid-cols-3 items-end bg-canvas p-4 rounded-card border border-line">
              <Select
                label="Choose Skill"
                value={selectedSkillId}
                onChange={(e) => setSelectedSkillId(e.target.value)}
              >
                <option value="">Select from catalog...</option>
                {allSkills.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.category})
                  </option>
                ))}
              </Select>

              <Select
                label="Proficiency Level"
                value={selectedProficiency}
                onChange={(e) =>
                  setSelectedProficiency(
                    e.target.value as "beginner" | "intermediate" | "advanced"
                  )
                }
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </Select>

              <div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAddSkill}
                  disabled={!selectedSkillId}
                  className="w-full text-xs gap-1.5"
                >
                  <Plus className="h-4 w-4" /> Add Skill
                </Button>
              </div>
            </div>

            {clientErrors.skills ? (
              <p className="text-xs font-medium text-red-600">{clientErrors.skills}</p>
            ) : null}

            {/* Skill Badges List */}
            {userSkills.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 pt-2">
                {userSkills.map((s) => (
                  <div
                    key={s.skill_id}
                    className="flex items-center justify-between rounded-card border border-line bg-white p-3 shadow-xs"
                  >
                    <div>
                      <p className="text-xs font-bold text-ink">{s.name}</p>
                      <p className="text-[11px] text-mute">{s.category}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={s.proficiency}
                        onChange={(e) =>
                          handleSkillProficiencyChange(
                            s.skill_id,
                            e.target.value as "beginner" | "intermediate" | "advanced"
                          )
                        }
                        className="rounded border border-line text-[11px] font-semibold px-2 py-1 bg-canvas outline-none"
                      >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(s.skill_id)}
                        className="p-1 text-mute hover:text-red-600 rounded transition"
                        title="Remove skill"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-mute italic py-2">
                No skills added yet. Use the dropdown above to add skills.
              </p>
            )}
          </Card>

          {/* Previous Projects */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h2 className="text-base font-bold text-ink">
                6. Previous Projects & Work
              </h2>
              <Button
                type="button"
                variant="secondary"
                onClick={handleAddProject}
                className="text-xs gap-1.5 py-1.5"
              >
                <Plus className="h-4 w-4" /> Add Project
              </Button>
            </div>

            {projects.length > 0 ? (
              <div className="space-y-4">
                {projects.map((proj, idx) => (
                  <div
                    key={idx}
                    className="rounded-card border border-line bg-canvas p-4 space-y-3 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-primary">
                        Project #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveProject(idx)}
                        className="text-xs text-mute hover:text-red-600 flex items-center gap-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove
                      </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="sm:col-span-2">
                        <Input
                          label="Project Title *"
                          value={proj.title}
                          onChange={(e) =>
                            handleProjectChange(idx, "title", e.target.value)
                          }
                          error={clientErrors[`project_${idx}`]}
                          placeholder="e.g. Campus Med Queue"
                        />
                      </div>
                      <div>
                        <Input
                          label="Year"
                          type="number"
                          value={proj.year || ""}
                          onChange={(e) =>
                            handleProjectChange(
                              idx,
                              "year",
                              e.target.value ? parseInt(e.target.value, 10) : null
                            )
                          }
                          placeholder="e.g. 2025"
                        />
                      </div>
                    </div>

                    <Input
                      label="Tech Stack"
                      value={proj.tech_stack || ""}
                      onChange={(e) =>
                        handleProjectChange(idx, "tech_stack", e.target.value)
                      }
                      placeholder="e.g. React, FastAPI, PostgreSQL"
                    />

                    <TextArea
                      label="Description"
                      value={proj.description || ""}
                      onChange={(e) =>
                        handleProjectChange(idx, "description", e.target.value)
                      }
                      placeholder="Reduced OPD wait-time estimates using historical footfall."
                      className="min-h-[80px]"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-mute italic py-2">
                No previous projects added. Click "Add Project" above to showcase your portfolio.
              </p>
            )}
          </Card>

          {/* Bottom Action Bar */}
          <div className="sticky bottom-4 z-20 rounded-card border border-line bg-white/95 p-4 shadow-lift backdrop-blur flex items-center justify-between">
            <span className="text-xs text-mute font-medium">
              {isDirty ? (
                <span className="text-amber-600 font-semibold flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Unsaved changes
                </span>
              ) : (
                "No unsaved changes"
              )}
            </span>
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                onClick={handleCancelEdit}
                disabled={saving}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                loading={saving}
                className="text-xs"
              >
                Save Profile
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal when Canceling with Unsaved Changes */}
      <Modal
        open={showCancelModal}
        title="Discard Unsaved Changes?"
        onClose={() => setShowCancelModal(false)}
      >
        <div className="space-y-4">
          <p className="text-xs text-mute leading-relaxed">
            You have unsaved edits in your profile. Discarding will revert all fields back to their last saved state.
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setShowCancelModal(false)}
              className="text-xs"
            >
              Keep Editing
            </Button>
            <Button
              variant="danger"
              onClick={confirmCancel}
              className="text-xs"
            >
              Discard Changes
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
