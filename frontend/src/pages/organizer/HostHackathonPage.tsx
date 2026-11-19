import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Building2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { api, apiError } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/Button";
import { Card } from "../../components/States";
import { Input, Select } from "../../components/Field";
import { PLATFORM_DOMAINS } from "../../constants";

export function HostHackathonPage() {
  const { role } = useAuth();

  const [step, setStep] = useState(1);
  const totalSteps = 5;

  // Form State
  const [name, setName] = useState("");
  const [shortDesc, setShortDesc] = useState("");
  const [desc, setDesc] = useState("");
  const [organizer, setOrganizer] = useState("");
  const [location, setLocation] = useState("Online");
  const [bannerUrl, setBannerUrl] = useState(
    "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1600&q=80"
  );

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [regDeadline, setRegDeadline] = useState("");
  const [teamSizeMin, setTeamSizeMin] = useState(2);
  const [teamSizeMax, setTeamSizeMax] = useState(4);

  const [selectedDomains, setSelectedDomains] = useState<string[]>(["AI/ML"]);
  const [prizePool, setPrizePool] = useState("$10,000 in Prizes & Grants");
  const [rules, setRules] = useState(
    "Open to all students. Submissions must be original. Repositories must be open-source during judging."
  );

  const [criteria, setCriteria] = useState([
    { title: "Technical depth", description: "Sound architecture and code quality", weight: 35 },
    { title: "Impact & Utility", description: "Clear value proposition and problem-solution fit", weight: 30 },
    { title: "Innovation", description: "Original approach and creative execution", weight: 20 },
    { title: "Presentation", description: "Clarity of demo and technical documentation", weight: 15 },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdSuccess, setCreatedSuccess] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const totalWeight = criteria.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);

  function toggleDomain(dom: string) {
    if (selectedDomains.includes(dom)) {
      if (selectedDomains.length > 1) {
        setSelectedDomains(selectedDomains.filter((d) => d !== dom));
      }
    } else {
      setSelectedDomains([...selectedDomains, dom]);
    }
  }

  function handleWeightChange(index: number, val: number) {
    const updated = [...criteria];
    updated[index].weight = val;
    setCriteria(updated);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    const payload = {
      name,
      short_description: shortDesc,
      description: desc || shortDesc,
      banner_url: bannerUrl,
      organizer,
      start_date: startDate,
      end_date: endDate,
      registration_deadline: regDeadline,
      location,
      team_size_min: teamSizeMin,
      team_size_max: teamSizeMax,
      rules,
      status: "published",
      domains: selectedDomains,
      criteria,
    };

    try {
      const res = await api.post("/hackathons/host", payload);
      if (res.data?.id) {
        setCreatedId(res.data.id);
      }
      setCreatedSuccess(true);
    } catch (err) {
      setError(apiError(err, "Failed to create hackathon. Ensure criteria weights equal 100% and dates are valid."));
    } finally {
      setSubmitting(false);
    }
  }

  const stepTitles = [
    "Event Essentials",
    "Timeline & Capacity",
    "Domains & Prizes",
    "Judging Rubric",
    "Review & Publish",
  ];

  return (
    <div className="min-h-screen bg-canvas text-ink py-10 px-4 md:px-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary">
          <Building2 className="h-3.5 w-3.5" /> Organizer Launchpad
        </span>
        <h1 className="text-3xl md:text-4xl font-black text-ink tracking-tight">
          Host a Hackathon on HackNova
        </h1>
        <p className="text-xs text-mute max-w-lg mx-auto">
          Publish your challenge, connect with verified campus squads, and manage submissions with an
          intuitive step-by-step wizard.
        </p>
      </div>

      {/* Stepper Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-mute px-1">
          <span>Step {step} of {totalSteps}: <strong className="text-ink">{stepTitles[step - 1]}</strong></span>
          <span>{Math.round((step / totalSteps) * 100)}% Complete</span>
        </div>
        <div className="h-2 w-full rounded-full bg-line overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Success View */}
      {createdSuccess ? (
        <Card className="p-8 text-center space-y-6 bg-surface-card border-emerald-500/30 shadow-glow">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <Check className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-ink">Hackathon Created & Published!</h2>
            <p className="text-xs text-mute max-w-md mx-auto">
              Your challenge <strong className="text-cyan">{name}</strong> is live and persisted in the database.
              Students, organizers, and sponsors can now discover your event in the directory, explore the problem tracks, and form squads.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3 pt-3">
            <Link to="/app/hackathons">
              <Button variant="primary" className="text-xs py-2.5 px-6">
                Explore in Hackathon Directory <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            {createdId && (
              <Link to={`/app/hackathons/${createdId}`}>
                <Button variant="secondary" className="text-xs py-2.5 px-5">
                  View Event Page
                </Button>
              </Link>
            )}
            <Link to="/app">
              <Button variant="ghost" className="text-xs py-2.5 px-5">
                Go to Dashboard
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <Card className="p-6 md:p-8 space-y-6 bg-surface-card shadow-card border border-line">
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-medium text-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: BASICS */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-ink border-b border-line pb-2">
                1. Basic Event Information
              </h2>
              <Input
                label="Hackathon Name"
                placeholder="e.g. NextGen Autonomous Mobility Hackathon"
                value={name}
                onChange={(e) => setName(e.target.value)}
                hint="Make it catchy and descriptive of your challenge"
              />
              <Input
                label="Organizing Company / Institution"
                placeholder="e.g. NVIDIA Labs, Google Cloud, or PICT Innovation"
                value={organizer}
                onChange={(e) => setOrganizer(e.target.value)}
              />
              <Input
                label="Short Tagline (1 sentence)"
                placeholder="e.g. 48 hours to architect autonomous drone navigation under real-world constraints."
                value={shortDesc}
                onChange={(e) => setShortDesc(e.target.value)}
              />
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink">Detailed Overview</label>
                <textarea
                  rows={3}
                  placeholder="Elaborate on the challenge scope, mentors, hardware/cloud provisions, and background..."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full rounded-btn border border-line bg-surface p-3 text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Event Mode / Location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                >
                  <option value="Online">Online (Global)</option>
                  <option value="Pune + Hybrid">Pune + Hybrid</option>
                  <option value="Bengaluru + Hybrid">Bengaluru + Hybrid</option>
                  <option value="Mumbai + In-Person">Mumbai + In-Person</option>
                  <option value="Delhi NCR + Hybrid">Delhi NCR + Hybrid</option>
                  <option value="San Francisco + Online">San Francisco + Online</option>
                </Select>
                <Input
                  label="Cover Banner Image URL"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  hint="Unsplash or hosted CDN image"
                />
              </div>
            </div>
          )}

          {/* STEP 2: TIMELINE */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-ink border-b border-line pb-2">
                2. Timeline & Squad Parameters
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Registration Deadline"
                  type="date"
                  value={regDeadline}
                  onChange={(e) => setRegDeadline(e.target.value)}
                />
                <Input
                  label="Hackathon Start Date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <Input
                  label="Hackathon End Date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <Input
                  label="Minimum Team Size"
                  type="number"
                  min="1"
                  max="5"
                  value={teamSizeMin}
                  onChange={(e) => setTeamSizeMin(parseInt(e.target.value, 10) || 1)}
                />
                <Input
                  label="Maximum Team Size"
                  type="number"
                  min="2"
                  max="6"
                  value={teamSizeMax}
                  onChange={(e) => setTeamSizeMax(parseInt(e.target.value, 10) || 4)}
                />
              </div>
            </div>
          )}

          {/* STEP 3: DOMAINS & PRIZES */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-ink border-b border-line pb-2">
                3. Technical Tracks & Prize Rewards
              </h2>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink">Select Domain Tracks</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {PLATFORM_DOMAINS.map((dom) => (
                    <button
                      type="button"
                      key={dom}
                      onClick={() => toggleDomain(dom)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-btn border transition ${
                        selectedDomains.includes(dom)
                          ? "bg-primary text-white border-primary shadow-sm"
                          : "bg-canvas text-mute border-line hover:text-ink"
                      }`}
                    >
                      {selectedDomains.includes(dom) ? "✓ " : "+ "}
                      {dom}
                    </button>
                  ))}
                </div>
              </div>

              <Input
                label="Prize Pool & Rewards"
                placeholder="e.g. $15,000 Cash + Cloud Credits + Fast-Track Interviews"
                value={prizePool}
                onChange={(e) => setPrizePool(e.target.value)}
              />

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink">Rules & Guidelines</label>
                <textarea
                  rows={3}
                  value={rules}
                  onChange={(e) => setRules(e.target.value)}
                  className="w-full rounded-btn border border-line bg-surface p-3 text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          )}

          {/* STEP 4: JUDGING RUBRIC */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-2">
                <h2 className="text-base font-bold text-ink">4. Judging Rubric (Must Total 100%)</h2>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    totalWeight === 100
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-rose-100 text-rose-800"
                  }`}
                >
                  Total Weight: {totalWeight}%
                </span>
              </div>

              <div className="space-y-3">
                {criteria.map((c, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-line bg-canvas flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex-1">
                      <div className="font-bold text-ink">{c.title}</div>
                      <div className="text-[11px] text-mute">{c.description}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-mute">Weight:</span>
                      <input
                        type="number"
                        min="5"
                        max="100"
                        value={c.weight}
                        onChange={(e) => handleWeightChange(idx, parseInt(e.target.value, 10) || 0)}
                        className="w-16 rounded-btn border border-line bg-white px-2 py-1 text-center font-bold text-ink"
                      />
                      <span className="font-bold text-ink">%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 5: REVIEW */}
          {step === 5 && (
            <div className="space-y-5">
              <h2 className="text-base font-bold text-ink border-b border-line pb-2">
                5. Review Hackathon Launch Card
              </h2>

              <div className="rounded-xl border border-primary/30 p-5 bg-gradient-to-br from-white to-primary/5 space-y-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                      Published · Ready
                    </span>
                    <h3 className="text-lg font-black text-ink mt-1.5">{name || "Untitled Hackathon"}</h3>
                    <div className="text-xs text-mute font-medium">By {organizer || "Anonymous Organizer"}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-primary">{prizePool}</div>
                    <div className="text-[11px] text-mute">{location}</div>
                  </div>
                </div>

                <p className="text-xs text-mute line-clamp-2">{shortDesc || "No tagline entered."}</p>

                <div className="flex flex-wrap items-center gap-4 text-xs text-mute pt-2 border-t border-line/60">
                  <span>📅 Reg Deadline: <strong>{regDeadline || "TBD"}</strong></span>
                  <span>🚀 Event: <strong>{startDate || "TBD"}</strong> to <strong>{endDate || "TBD"}</strong></span>
                  <span>👥 Squad: <strong>{teamSizeMin}–{teamSizeMax} Builders</strong></span>
                </div>
              </div>

              {role !== "admin" && (
                <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 font-medium">
                  <HelpCircle className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>
                    Note: Your organizer account is in standard mode. Clicking Launch will register your draft
                    and generate an instant preview.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between border-t border-line pt-4">
            {step > 1 ? (
              <Button
                variant="secondary"
                type="button"
                onClick={() => setStep(step - 1)}
                className="gap-1.5 text-xs py-2"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Previous
              </Button>
            ) : <div />}

            {step < totalSteps ? (
              <Button
                variant="primary"
                type="button"
                disabled={
                  (step === 1 && (!name.trim() || !organizer.trim())) ||
                  (step === 2 && (!startDate || !endDate || !regDeadline))
                }
                onClick={() => setStep(step + 1)}
                className="gap-1.5 text-xs py-2"
              >
                Continue <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                variant="primary"
                type="button"
                disabled={submitting || totalWeight !== 100}
                onClick={handleSubmit}
                className="gap-2 text-xs py-2 px-6"
              >
                <Sparkles className="h-4 w-4" />
                {submitting ? "Publishing Challenge..." : "Launch Hackathon"}
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
