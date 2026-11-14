import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Save,
  Tag,
  Scale,
} from "lucide-react";
import { api } from "../../api/client";
import { Card } from "../../components/States";
import { Button } from "../../components/Button";
import { PLATFORM_DOMAINS } from "../../constants";
import type { HackathonDetail } from "../../types";

interface CriterionFormItem {
  id?: string;
  title: string;
  description: string;
  weight: number;
}

export function AdminHackathonFormPage() {
  const { id } = useParams<{ id?: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [organizer, setOrganizer] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [registrationDeadline, setRegistrationDeadline] = useState("");
  const [teamSizeMin, setTeamSizeMin] = useState(2);
  const [teamSizeMax, setTeamSizeMax] = useState(4);
  const [rules, setRules] = useState("");

  // Domains chips
  const [domains, setDomains] = useState<string[]>(["Healthcare"]);
  const [customDomain, setCustomDomain] = useState("");

  // Judging Criteria
  const [criteria, setCriteria] = useState<CriterionFormItem[]>([
    { title: "Technical Quality", description: "Architecture and implementation depth", weight: 40 },
    { title: "Impact & Relevance", description: "Problem fit and measurable user benefit", weight: 30 },
    { title: "Presentation & Pitch", description: "Story clarity and demonstration quality", weight: 30 },
  ]);

  // Load existing hackathon if editing
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .get<HackathonDetail>(`/hackathons/${id}`)
      .then((res) => {
        const h = res.data;
        setName(h.name);
        setShortDescription(h.short_description);
        setDescription(h.description);
        setOrganizer(h.organizer);
        setLocation(h.location);
        setStartDate(h.start_date);
        setEndDate(h.end_date);
        setRegistrationDeadline(h.registration_deadline);
        setTeamSizeMin(h.team_size_min);
        setTeamSizeMax(h.team_size_max);
        setRules(h.rules);
        setDomains(h.domains || []);
        if (h.criteria && h.criteria.length > 0) {
          setCriteria(
            h.criteria.map((c) => ({
              id: c.id,
              title: c.title,
              description: c.description,
              weight: c.weight,
            }))
          );
        }
      })
      .catch((err) => {
        setError(err.response?.data?.detail || "Failed to load hackathon for editing");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  // Criteria calculations
  const totalWeight = criteria.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
  const isWeightValid = totalWeight === 100;

  // Domain Chip handlers
  function toggleDomain(dom: string) {
    if (domains.includes(dom)) {
      setDomains(domains.filter((d) => d !== dom));
    } else {
      setDomains([...domains, dom]);
    }
  }

  function handleAddCustomDomain() {
    const trimmed = customDomain.trim();
    if (!trimmed) return;
    if (!domains.some((d) => d.toLowerCase() === trimmed.toLowerCase())) {
      setDomains([...domains, trimmed]);
    }
    setCustomDomain("");
  }

  // Criteria row handlers
  function handleAddCriterion() {
    setCriteria([
      ...criteria,
      { title: "New Criterion", description: "Evaluation guideline details", weight: 10 },
    ]);
  }

  function handleRemoveCriterion(index: number) {
    setCriteria(criteria.filter((_, i) => i !== index));
  }

  function handleCriterionChange(index: number, field: keyof CriterionFormItem, value: any) {
    const updated = [...criteria];
    updated[index] = { ...updated[index], [field]: value };
    setCriteria(updated);
  }

  // Client validation
  const clientErrors: string[] = [];
  if (teamSizeMin > teamSizeMax) {
    clientErrors.push("Maximum team size must be greater than or equal to minimum");
  }
  if (endDate && startDate && endDate < startDate) {
    clientErrors.push("End date must be on or after start date");
  }
  if (registrationDeadline && endDate && registrationDeadline > endDate) {
    clientErrors.push("Registration deadline must be on or before end date");
  }
  if (!isWeightValid) {
    clientErrors.push(`Judging criteria weights must total 100% (currently ${totalWeight}%)`);
  }
  if (domains.length === 0) {
    clientErrors.push("At least one domain tag must be selected");
  }

  const canSubmit =
    !saving &&
    name.trim().length >= 4 &&
    shortDescription.trim().length >= 10 &&
    description.trim().length >= 20 &&
    organizer.trim().length >= 2 &&
    location.trim().length >= 2 &&
    startDate &&
    endDate &&
    registrationDeadline &&
    rules.trim().length >= 2 &&
    clientErrors.length === 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    const payload = {
      name: name.trim(),
      short_description: shortDescription.trim(),
      description: description.trim(),
      organizer: organizer.trim(),
      location: location.trim(),
      start_date: startDate,
      end_date: endDate,
      registration_deadline: registrationDeadline,
      team_size_min: Number(teamSizeMin),
      team_size_max: Number(teamSizeMax),
      rules: rules.trim(),
      domains,
      criteria: criteria.map((c) => ({
        title: c.title.trim(),
        description: c.description.trim(),
        weight: Number(c.weight),
      })),
    };

    try {
      if (isEditing) {
        await api.put(`/hackathons/${id}`, payload);
        setSuccess("Hackathon updated successfully!");
      } else {
        const res = await api.post("/hackathons", payload);
        setSuccess("Hackathon created successfully!");
        setTimeout(() => {
          navigate(`/app/admin/hackathons/${res.data.id}/problems`);
        }, 1000);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to save hackathon");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 space-y-4 max-w-4xl mx-auto">
        <div className="h-10 w-48 rounded-xl bg-slate-200 animate-pulse" />
        <div className="h-96 rounded-2xl bg-white border border-line animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Back Link and Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/app/admin/hackathons">
            <Button variant="secondary" className="p-2">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-xl font-bold text-ink">
              {isEditing ? "Edit Hackathon" : "Create New Hackathon"}
            </h2>
            <p className="text-xs text-mute">
              Configure event parameters, timeline dates, and scoring criteria.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs font-medium text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-medium text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Basic Information */}
        <Card className="p-6 space-y-4">
          <h3 className="text-sm font-bold text-ink border-b border-line pb-2">
            Basic Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-ink mb-1">
                Hackathon Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. PulseForge HealthTech Sprint"
                className="w-full px-3 py-2 text-xs rounded-btn border border-line bg-canvas focus:outline-none focus:border-primary text-ink"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Organizer Organization *
              </label>
              <input
                type="text"
                required
                value={organizer}
                onChange={(e) => setOrganizer(e.target.value)}
                placeholder="e.g. HealthCare Guild"
                className="w-full px-3 py-2 text-xs rounded-btn border border-line bg-canvas focus:outline-none focus:border-primary text-ink"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Location *
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Pune, MH / Hybrid"
                className="w-full px-3 py-2 text-xs rounded-btn border border-line bg-canvas focus:outline-none focus:border-primary text-ink"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-ink mb-1">
                Short Description (1-2 sentences) *
              </label>
              <input
                type="text"
                required
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="Concise overview visible on discovery cards"
                className="w-full px-3 py-2 text-xs rounded-btn border border-line bg-canvas focus:outline-none focus:border-primary text-ink"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-ink mb-1">
                Full Description *
              </label>
              <textarea
                rows={4}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed objectives, challenges, and context for builders..."
                className="w-full px-3 py-2 text-xs rounded-btn border border-line bg-canvas focus:outline-none focus:border-primary text-ink"
              />
            </div>
          </div>
        </Card>

        {/* Section 2: Timeline & Squad Sizing */}
        <Card className="p-6 space-y-4">
          <h3 className="text-sm font-bold text-ink border-b border-line pb-2">
            Timeline & Squad Sizing
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-btn border border-line bg-canvas focus:outline-none focus:border-primary text-ink"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                End Date *
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-btn border border-line bg-canvas focus:outline-none focus:border-primary text-ink"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Registration Deadline *
              </label>
              <input
                type="date"
                required
                value={registrationDeadline}
                onChange={(e) => setRegistrationDeadline(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-btn border border-line bg-canvas focus:outline-none focus:border-primary text-ink"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Min Team Size *
              </label>
              <input
                type="number"
                min={1}
                max={10}
                required
                value={teamSizeMin}
                onChange={(e) => setTeamSizeMin(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 text-xs rounded-btn border border-line bg-canvas focus:outline-none focus:border-primary text-ink"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Max Team Size *
              </label>
              <input
                type="number"
                min={1}
                max={12}
                required
                value={teamSizeMax}
                onChange={(e) => setTeamSizeMax(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 text-xs rounded-btn border border-line bg-canvas focus:outline-none focus:border-primary text-ink"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-ink mb-1">
                Rules & Eligibility *
              </label>
              <textarea
                rows={3}
                required
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                placeholder="Team rules, eligibility requirements, code of conduct..."
                className="w-full px-3 py-2 text-xs rounded-btn border border-line bg-canvas focus:outline-none focus:border-primary text-ink"
              />
            </div>
          </div>
        </Card>

        {/* Section 3: Domain Focus Tags */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <div>
              <h3 className="text-sm font-bold text-ink flex items-center gap-1.5">
                <Tag className="h-4 w-4 text-primary" />
                Domains & Challenge Tracks
              </h3>
              <p className="text-[11px] text-mute">
                Select from platform suggestions or add custom tracks.
              </p>
            </div>
            <span className="text-xs font-bold text-primary">
              {domains.length} selected
            </span>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {PLATFORM_DOMAINS.map((dom) => {
              const selected = domains.includes(dom);
              return (
                <button
                  type="button"
                  key={dom}
                  onClick={() => toggleDomain(dom)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                    selected
                      ? "bg-primary text-white shadow-xs"
                      : "bg-slate-100 text-ink hover:bg-slate-200"
                  }`}
                >
                  {dom} {selected && "✓"}
                </button>
              );
            })}
            {domains
              .filter((d) => !PLATFORM_DOMAINS.includes(d as any))
              .map((custom) => (
                <span
                  key={custom}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-purple-600 text-white"
                >
                  {custom}
                  <button
                    type="button"
                    onClick={() => toggleDomain(custom)}
                    className="ml-1 hover:text-purple-200 font-bold"
                  >
                    &times;
                  </button>
                </span>
              ))}
          </div>

          <div className="flex gap-2 pt-2">
            <input
              type="text"
              placeholder="Add custom track tag..."
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddCustomDomain();
                }
              }}
              className="flex-1 px-3 py-1.5 text-xs rounded-btn border border-line bg-canvas focus:outline-none focus:border-primary text-ink"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleAddCustomDomain}
              className="text-xs py-1.5 px-3"
            >
              Add Track
            </Button>
          </div>
        </Card>

        {/* Section 4: Judging Criteria (Live weight counter) */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <div>
              <h3 className="text-sm font-bold text-ink flex items-center gap-1.5">
                <Scale className="h-4 w-4 text-primary" />
                Judging Criteria & Weights
              </h3>
              <p className="text-[11px] text-mute">
                Weights must total exactly 100%. Seeded events mirror this standard.
              </p>
            </div>

            {/* Live Weight Total Indicator */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${
                isWeightValid
                  ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                  : "bg-rose-50 border-rose-300 text-rose-700"
              }`}
            >
              <span>Total Weight: {totalWeight}%</span>
              {isWeightValid ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5" />
              )}
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {criteria.map((item, idx) => (
              <div
                key={idx}
                className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded-xl bg-canvas border border-line"
              >
                <div className="flex-1 w-full space-y-2">
                  <input
                    type="text"
                    required
                    placeholder="Criterion Title (e.g. Technical Quality)"
                    value={item.title}
                    onChange={(e) =>
                      handleCriterionChange(idx, "title", e.target.value)
                    }
                    className="w-full px-3 py-1.5 text-xs font-bold rounded-btn border border-line bg-white text-ink"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Evaluation Guidelines (at least 4 characters)"
                    value={item.description}
                    onChange={(e) =>
                      handleCriterionChange(idx, "description", e.target.value)
                    }
                    className="w-full px-3 py-1.5 text-xs rounded-btn border border-line bg-white text-mute"
                  />
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      required
                      value={item.weight}
                      onChange={(e) =>
                        handleCriterionChange(
                          idx,
                          "weight",
                          parseInt(e.target.value, 10) || 0
                        )
                      }
                      className="w-16 px-2 py-1.5 text-xs text-center font-bold rounded-btn border border-line bg-white text-ink"
                    />
                    <span className="text-xs font-bold text-mute">%</span>
                  </div>

                  {criteria.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCriterion(idx)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-btn transition"
                      title="Remove Criterion"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="secondary"
              onClick={handleAddCriterion}
              className="text-xs gap-1.5 py-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Judging Criterion
            </Button>
          </div>
        </Card>

        {/* Validation Errors Pill */}
        {clientErrors.length > 0 && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 space-y-1">
            <p className="text-xs font-bold text-amber-800">Please review before saving:</p>
            <ul className="list-disc list-inside text-xs text-amber-700">
              {clientErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-line">
          <Link to="/app/admin/hackathons">
            <Button variant="secondary" className="text-xs">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            variant="primary"
            disabled={!canSubmit}
            className="text-xs gap-2 py-2 px-6"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : isEditing ? "Save Changes" : "Create Hackathon"}
          </Button>
        </div>
      </form>
    </div>
  );
}
