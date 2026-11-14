import { useEffect, useState, type FormEvent } from "react";
import {
  ChevronDown,
  ChevronUp,
  Info,
  Loader2,
  PlusCircle,
  Scale,
  Sparkles,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Field } from "./primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requestPricingEstimateFromApi, type ApiPricingEstimate } from "@/lib/gaw/api";
import { CATEGORIES, OTHER_CATEGORY, estimateDavaoJobPricing, type Category } from "@/lib/gaw/data";
import { formatPeso, useGaw } from "@/lib/gaw/store";

export function PostGigCard({ onPosted }: { onPosted?: () => void }) {
  const { locationId, createJob } = useGaw();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category>("Plumbing");
  const [isOtherCategory, setIsOtherCategory] = useState(false);
  const [barangayId, setBarangayId] = useState(locationId);
  const [landmark, setLandmark] = useState("");
  const [hours, setHours] = useState("4");
  const [urgent, setUrgent] = useState(false);
  const [budget, setBudget] = useState("600");
  const [schedule, setSchedule] = useState("Tomorrow morning");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [useAiPricer, setUseAiPricer] = useState(true);
  const [apiEstimate, setApiEstimate] = useState<ApiPricingEstimate | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const numericHours = Math.max(1, Number(hours) || 1);
  const localPricing = estimateDavaoJobPricing(category, numericHours, urgent);

  const activeRecommendedPhp = apiEstimate?.recommendedPhp ?? localPricing.aiRecommendedPhp;
  const activeMinPhp = apiEstimate?.suggestedMinPhp ?? localPricing.suggestedMinPhp;
  const activeMaxPhp = apiEstimate?.suggestedMaxPhp ?? localPricing.suggestedMaxPhp;
  const activeHourlyRate =
    apiEstimate?.hourlyRateRecommendedPhp ??
    Math.round((activeRecommendedPhp / numericHours) * 10) / 10;
  const activeBreakdown = apiEstimate?.breakdown ?? localPricing.breakdown;
  const activeLegalBasis = apiEstimate?.legalBasis ?? localPricing.legalBasis;
  const activeLogicalBasis = apiEstimate?.logicalBasis ?? localPricing.logicalBasis;
  const activeRationale = apiEstimate?.rationale ?? localPricing.rationale;
  const isAiSourced = apiEstimate?.source === "external_ai";

  useEffect(() => {
    setBarangayId(locationId);
  }, [locationId]);

  useEffect(() => {
    if (!open || !useAiPricer) return;
    let active = true;
    setLoadingAi(true);

    const timer = setTimeout(() => {
      void requestPricingEstimateFromApi({
        category,
        estimatedHours: numericHours,
        urgency: urgent ? "urgent" : "standard",
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        barangay: landmark.trim() || undefined,
      })
        .then((res) => {
          if (active) {
            if (res) {
              setApiEstimate(res);
            }
            setLoadingAi(false);
          }
        })
        .catch(() => {
          if (active) setLoadingAi(false);
        });
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [open, useAiPricer, category, numericHours, urgent, title, description, landmark]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 4) {
      setError("Enter a clear job title (at least 4 characters).");
      return;
    }
    if (description.trim().length < 8) {
      setError("Describe the gig in at least 8 characters.");
      return;
    }
    const offered = Number(budget);
    if (!Number.isFinite(offered) || offered <= 0) {
      setError("Enter a valid PHP budget.");
      return;
    }
    if (offered < localPricing.minimumRequiredPhp) {
      setError(
        `Offered pay ₱${offered.toFixed(2)} is below Davao Region XI minimum floor ₱${localPricing.minimumRequiredPhp.toFixed(2)} (${numericHours}h × ₱63.50/hr). Under Philippine labor laws, gigs cannot be offered below minimum wage.`,
      );
      return;
    }

    const res = createJob({
      title,
      category,
      barangayId,
      landmark,
      estimatedHours: numericHours,
      budgetNum: offered,
      schedule,
      description,
      urgent,
    });

    if (!res.ok) {
      setError(res.error ?? "Unable to publish gig.");
      return;
    }

    setError(null);
    setTitle("");
    setLandmark("");
    setDescription("");
    setOpen(false);
    toast.success("Gig published! Workers nearby can now see it on Live GPS.");
    onPosted?.();
  };

  if (!open) {
    return (
      <section className="rounded-2xl border border-primary/25 bg-secondary/45 p-5 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-extrabold">Need multiple applicants nearby?</h2>
            <p className="text-sm text-muted-foreground">
              Through our live GPS tracking system, we connect workers and employers in the same
              general area so available workers nearby can apply right away.
            </p>
          </div>
          <Button type="button" onClick={() => setOpen(true)} className="min-h-11 shrink-0 gap-1.5">
            <PlusCircle className="size-4" aria-hidden /> Post a Gig
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Post a new gig"
      className="rounded-3xl border bg-card p-5 shadow-lift md:p-6"
    >
      <div className="flex items-center justify-between gap-2 border-b pb-3">
        <div>
          <h2 className="text-lg font-extrabold">Post a Gig to Live Davao Map</h2>
          <p className="text-xs text-muted-foreground">
            Share your job details, location, and schedule for nearby workers.
          </p>
        </div>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>

      <form noValidate onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="post-title" label="Gig Title">
            <Input
              id="post-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Repair leaking kitchen pipe"
            />
          </Field>
          <Field id="post-category" label="Skill Category">
            <select
              id="post-category"
              className="field"
              value={isOtherCategory ? OTHER_CATEGORY : category}
              onChange={(e) => {
                const val = e.target.value;
                if (val === OTHER_CATEGORY) {
                  setIsOtherCategory(true);
                  if (CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
                    setCategory("");
                  }
                } else {
                  setIsOtherCategory(false);
                  setCategory(val);
                }
              }}
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
              <option value={OTHER_CATEGORY}>{OTHER_CATEGORY}</option>
            </select>
            {isOtherCategory && (
              <input
                type="text"
                className="field mt-2"
                placeholder="Type custom service (e.g. Motorcycle Mechanic)"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              />
            )}
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="post-landmark" label="General Area / Street Landmark">
            <Input
              id="post-landmark"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              placeholder="e.g. Near main avenue or corner landmark"
            />
          </Field>
          <Field id="post-hours" label="Estimated Hours">
            <Input
              id="post-hours"
              type="number"
              min={1}
              max={24}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
            />
          </Field>
        </div>
        <p className="text-xs text-muted-foreground">
          Pinned via Live GPS to connect you with available workers in your same general area.
        </p>

        <Field id="post-desc" label="Job Description">
          <Textarea
            id="post-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe tools provided, access instructions, and scope..."
          />
        </Field>

        <div className="space-y-3 rounded-2xl border bg-secondary/35 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Pricing Option
            </span>
            <div className="inline-flex rounded-xl bg-muted p-1">
              <button
                type="button"
                aria-pressed={useAiPricer}
                onClick={() => setUseAiPricer(true)}
                className={
                  useAiPricer
                    ? "inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg bg-card px-3 text-xs font-bold text-primary shadow-soft"
                    : "inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg px-3 text-xs font-semibold text-muted-foreground hover:text-foreground"
                }
              >
                <Sparkles className="size-3.5" aria-hidden />
                Use AI Pricer
              </button>
              <button
                type="button"
                aria-pressed={!useAiPricer}
                onClick={() => setUseAiPricer(false)}
                className={
                  !useAiPricer
                    ? "inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg bg-card px-3 text-xs font-bold text-primary shadow-soft"
                    : "inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg px-3 text-xs font-semibold text-muted-foreground hover:text-foreground"
                }
              >
                Manual Pricing
              </button>
            </div>
          </div>

          {useAiPricer && (
            <div className="space-y-3 rounded-2xl border border-primary/30 bg-card p-4 shadow-xs">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                      <Sparkles className="size-3.5" aria-hidden />
                      {isAiSourced ? "Gemini Pro AI Pricing" : "AI Pricing Advisor"}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:text-emerald-400">
                      <Scale className="size-3.5" aria-hidden />
                      DOLE Region XI Floor Compliant (₱{localPricing.minimumRequiredPhp.toFixed(
                        2,
                      )}{" "}
                      min)
                    </span>
                    {loadingAi && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Loader2 className="size-3 animate-spin" /> Analyzing...
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2 pt-1">
                    <span className="text-2xl font-black text-deep">
                      {formatPeso(activeRecommendedPhp)}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">
                      (₱{activeHourlyRate.toFixed(2)}/hr · Fair Band: {formatPeso(activeMinPhp)} –{" "}
                      {formatPeso(activeMaxPhp)})
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Recommended rate for {numericHours}h of {category} labor in Davao City.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setUrgent((u) => !u)}
                    aria-pressed={urgent}
                    className={
                      urgent
                        ? "inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-xl bg-gold px-3 text-xs font-bold text-gold-foreground"
                        : "inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-xl border bg-card px-3 text-xs font-semibold text-muted-foreground hover:bg-muted"
                    }
                  >
                    <Zap className="size-3.5" aria-hidden />
                    Urgent (+20%)
                  </button>
                  <Button
                    type="button"
                    size="sm"
                    variant="gold"
                    onClick={() => setBudget(String(Math.round(activeRecommendedPhp)))}
                  >
                    Use AI Rate ({formatPeso(activeRecommendedPhp)})
                  </Button>
                </div>
              </div>

              {/* Itemized Breakdown & Legal/Logical Foundations */}
              <div className="border-t pt-3">
                <button
                  type="button"
                  onClick={() => setShowBreakdown((v) => !v)}
                  className="flex w-full cursor-pointer items-center justify-between text-xs font-bold text-primary hover:underline"
                >
                  <span className="flex items-center gap-1.5">
                    <Info className="size-3.5" />
                    {showBreakdown
                      ? "Hide Price Breakdown & Legal Basis"
                      : "Show Itemized Pricing Breakdown & Legal Basis"}
                  </span>
                  {showBreakdown ? (
                    <ChevronUp className="size-4" />
                  ) : (
                    <ChevronDown className="size-4" />
                  )}
                </button>

                {showBreakdown && (
                  <div className="mt-3 space-y-3 rounded-xl bg-secondary/35 p-3.5 text-xs text-secondary-foreground animate-fade-in">
                    {/* Statutory Legal Basis */}
                    <div className="rounded-lg border border-primary/20 bg-background/90 p-2.5">
                      <p className="flex items-center gap-1.5 font-bold text-primary">
                        <Scale className="size-3.5" /> Statutory Legal Basis (DOLE Region XI)
                      </p>
                      <p className="mt-1 leading-relaxed text-muted-foreground">
                        {activeLegalBasis}
                      </p>
                    </div>

                    {/* Itemized Economic Breakdown Table */}
                    <div className="overflow-hidden rounded-lg border bg-background">
                      <div className="bg-muted px-3 py-1.5 font-bold text-muted-foreground">
                        Itemized Cost & Allowance Breakdown
                      </div>
                      <dl className="divide-y divide-border">
                        <div className="flex justify-between px-3 py-1.5">
                          <dt className="text-muted-foreground">
                            ⚖️ DOLE Statutory Base Floor ({numericHours}h × ₱63.50/hr)
                          </dt>
                          <dd className="font-semibold">
                            {formatPeso(activeBreakdown.baseWageFloorPhp)}
                          </dd>
                        </div>
                        <div className="flex justify-between px-3 py-1.5">
                          <dt className="text-muted-foreground">
                            🔧 Trade Specialization & Diagnostic Premium
                          </dt>
                          <dd className="font-semibold text-emerald-700 dark:text-emerald-400">
                            +{formatPeso(activeBreakdown.skillPremiumPhp)}
                          </dd>
                        </div>
                        <div className="flex justify-between px-3 py-1.5">
                          <dt className="text-muted-foreground">
                            🧰 Worker-Supplied Tools & PPE Allowance
                          </dt>
                          <dd className="font-semibold text-emerald-700 dark:text-emerald-400">
                            +{formatPeso(activeBreakdown.toolAllowancePhp)}
                          </dd>
                        </div>
                        <div className="flex justify-between px-3 py-1.5">
                          <dt className="text-muted-foreground">
                            🛵 Davao Intra-City Transit Offset
                          </dt>
                          <dd className="font-semibold text-emerald-700 dark:text-emerald-400">
                            +{formatPeso(activeBreakdown.transportAllowancePhp)}
                          </dd>
                        </div>
                        {activeBreakdown.urgencyPremiumPhp > 0 && (
                          <div className="flex justify-between bg-amber-500/10 px-3 py-1.5">
                            <dt className="font-semibold text-amber-800 dark:text-amber-400">
                              ⚡ Urgent Same-Day Dispatch Surcharge
                            </dt>
                            <dd className="font-bold text-amber-800 dark:text-amber-400">
                              +{formatPeso(activeBreakdown.urgencyPremiumPhp)}
                            </dd>
                          </div>
                        )}
                        <div className="flex justify-between bg-primary/5 px-3 py-2 text-xs font-black">
                          <dt className="text-primary">Total Recommended Fair Compensation</dt>
                          <dd className="text-primary">{formatPeso(activeRecommendedPhp)}</dd>
                        </div>
                      </dl>
                    </div>

                    {/* Logical Basis & AI Rationale */}
                    <div className="space-y-1 rounded-lg border bg-background/90 p-2.5">
                      <p className="font-bold text-foreground">💡 Economic & Logical Rationale</p>
                      <p className="leading-relaxed text-muted-foreground">{activeLogicalBasis}</p>
                      {activeRationale && activeRationale !== activeLogicalBasis && (
                        <p className="pt-1 text-[11px] italic text-muted-foreground/90">
                          "{activeRationale}"
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="post-budget"
              label="Your Offer (PHP)"
              hint={
                useAiPricer
                  ? `Use the AI suggested rate or enter your own offer (min. ₱${localPricing.minimumRequiredPhp.toFixed(2)}).`
                  : `Enter your custom PHP offer (min. ₱${localPricing.minimumRequiredPhp.toFixed(2)} for ${numericHours}h at ₱63.50/hr).`
              }
            >
              <Input
                id="post-budget"
                inputMode="numeric"
                value={budget}
                onChange={(e) => setBudget(e.target.value.replace(/[^\d.]/g, ""))}
              />
            </Field>
            <Field id="post-schedule" label="Preferred Schedule">
              <Input
                id="post-schedule"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
              />
            </Field>
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-xl bg-status-declined-bg px-3.5 py-2.5 text-sm font-semibold text-status-declined"
          >
            {error}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full">
          Publish Davao Gig Now
        </Button>
      </form>
    </section>
  );
}
