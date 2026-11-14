import { useEffect, useState, type FormEvent } from "react";
import { PlusCircle, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";
import { Field, LocationFilter } from "./primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requestPricingEstimateFromApi } from "@/lib/gaw/api";
import { CATEGORIES, estimateDavaoJobPricing, type Category } from "@/lib/gaw/data";
import { formatPeso, useGaw } from "@/lib/gaw/store";

export function PostGigCard({ onPosted }: { onPosted?: () => void }) {
  const { locationId, createJob } = useGaw();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category>("Plumbing");
  const [barangayId, setBarangayId] = useState(locationId);
  const [landmark, setLandmark] = useState("");
  const [hours, setHours] = useState("4");
  const [urgent, setUrgent] = useState(false);
  const [budget, setBudget] = useState("600");
  const [schedule, setSchedule] = useState("Tomorrow morning");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [useAiPricer, setUseAiPricer] = useState(true);
  const [apiRecommendedPhp, setApiRecommendedPhp] = useState<number | null>(null);

  const numericHours = Math.max(1, Number(hours) || 1);
  const localPricing = estimateDavaoJobPricing(category, numericHours, urgent);
  const aiRecommendedPhp = apiRecommendedPhp ?? localPricing.aiRecommendedPhp;

  useEffect(() => {
    setBarangayId(locationId);
  }, [locationId]);

  useEffect(() => {
    if (!open || !useAiPricer) return;
    let active = true;
    void requestPricingEstimateFromApi({
      category,
      estimatedHours: numericHours,
      urgency: urgent ? "urgent" : "standard",
    }).then((res) => {
      if (active && res) {
        setApiRecommendedPhp(res.recommendedPhp);
      }
    });
    return () => {
      active = false;
    };
  }, [open, useAiPricer, category, numericHours, urgent]);

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
              Post an open gig in Davao City so available workers nearby can apply right away.
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
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <LocationFilter
            id="post-barangay"
            label="Davao Barangay"
            value={barangayId}
            onChange={setBarangayId}
          />
          <Field id="post-landmark" label="Street / Landmark">
            <Input
              id="post-landmark"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              placeholder="Near Abreeza / SM"
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
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/20 bg-card p-3">
              <div>
                <p className="text-xs font-semibold text-muted-foreground">
                  Suggested rate for {numericHours}h {category}
                </p>
                <p className="text-sm font-bold text-deep">{formatPeso(aiRecommendedPhp)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setUrgent((u) => !u)}
                  aria-pressed={urgent}
                  className={
                    urgent
                      ? "inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-xl bg-gold px-3 text-xs font-bold text-gold-foreground"
                      : "inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-xl border bg-card px-3 text-xs font-semibold text-muted-foreground"
                  }
                >
                  <Zap className="size-3.5" aria-hidden />
                  Urgent (+20%)
                </button>
                <Button
                  type="button"
                  size="sm"
                  variant="gold"
                  onClick={() => setBudget(String(Math.round(aiRecommendedPhp)))}
                >
                  Use AI Rate ({formatPeso(aiRecommendedPhp)})
                </Button>
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
