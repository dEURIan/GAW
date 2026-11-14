import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bookmark,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  Loader2,
  MapPin,
  Scale,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout, BackButton } from "@/components/gaw/AppLayout";
import { LiveGpsTracker } from "@/components/gaw/LiveGpsTracker";
import { Field } from "@/components/gaw/primitives";
import { VerificationGuardModal } from "@/components/gaw/VerificationCenter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  barangayName,
  calculateJobDistanceKm,
  estimateDavaoJobPricing,
  estimateTravelMinutes,
  formatDistanceBadge,
  JOBS,
  type Job,
} from "@/lib/gaw/data";
import { canPerformProtectedAction, formatPeso, useGaw } from "@/lib/gaw/store";

function JobDetailRouteComponent() {
  const { id, initialJob } = Route.useLoaderData();
  return (
    <AppLayout
      mode="work"
      back={<BackButton to="/jobs" label="Back to jobs" />}
      title="Job details & Live GPS"
    >
      <JobDetailResolver id={id} initialJob={initialJob} />
    </AppLayout>
  );
}

export const Route = createFileRoute("/jobs/$id")({
  loader: ({ params }) => {
    const initialJob = JOBS.find((j) => j.id === params.id);
    return { id: params.id, initialJob };
  },
  head: ({ loaderData }) => ({
    meta: loaderData?.initialJob
      ? [
          { title: `${loaderData.initialJob.title} — GAW Jobs` },
          { name: "description", content: loaderData.initialJob.description },
          { property: "og:title", content: `${loaderData.initialJob.title} — GAW Jobs` },
          { property: "og:description", content: loaderData.initialJob.description },
        ]
      : [{ title: "Job details — GAW" }],
  }),
  component: JobDetailRouteComponent,
});

function JobDetailResolver({ id, initialJob }: { id: string; initialJob?: Job | undefined }) {
  const { allJobs } = useGaw();
  const job = allJobs.find((j) => j.id === id) ?? initialJob;
  if (!job) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border bg-card p-8 text-center shadow-soft">
        <p className="text-xl font-bold">This job is no longer available.</p>
        <Button asChild className="mt-4">
          <Link to="/jobs">Browse jobs</Link>
        </Button>
      </div>
    );
  }
  return <JobDetail job={job} />;
}

function JobDetail({ job }: { job: Job }) {
  const {
    applications,
    applyToJob,
    workerProfile,
    userGps,
    savedJobIds,
    toggleSaveJob,
    verification,
  } = useGaw();
  const already = applications.find((a) => a.jobId === job.id && a.status !== "withdrawn");
  const isSaved = savedJobIds.includes(job.id);
  const draftKey = `gaw:draft:apply:${job.id}`;

  const [message, setMessage] = useState("");
  const [rate, setRate] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showVerifModal, setShowVerifModal] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const pricingDetail = estimateDavaoJobPricing(job.category, job.estimatedHours, job.urgent);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(draftKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { message?: string; rate?: string };
        if (parsed.message) setMessage(parsed.message);
        if (parsed.rate) setRate(parsed.rate);
      }
    } catch {
      /* ignore corrupted draft */
    }
  }, [draftKey]);

  const persistDraft = (nextMessage: string, nextRate: string) => {
    try {
      window.sessionStorage.setItem(
        draftKey,
        JSON.stringify({ message: nextMessage, rate: nextRate }),
      );
    } catch {
      /* ignore quota errors */
    }
  };

  const jobWithDistance = useMemo(() => {
    const dKm = calculateJobDistanceKm(userGps.lat, userGps.lng, job.lat, job.lng);
    const eta = estimateTravelMinutes(dKm);
    return [{ ...job, distanceKm: dKm, rideMin: eta.rideMin, walkMin: eta.walkMin }];
  }, [job, userGps]);

  const activeDistanceKm = jobWithDistance[0]!.distanceKm;

  const handleSave = () => {
    const res = toggleSaveJob(job.id);
    if (!res.ok) {
      toast.error(res.reason ?? "Could not save job");
      return;
    }
    toast.success(res.saved ? "Saved to Desired Gigs" : "Removed from Desired Gigs");
  };

  const executeApplicationSubmit = () => {
    setBusy(true);
    setTimeout(() => {
      const ok = applyToJob({
        jobId: job.id,
        message: message.trim(),
        rate: rate.trim() || job.budget,
      });
      setBusy(false);
      if (ok) {
        try {
          window.sessionStorage.removeItem(draftKey);
        } catch {
          /* ignore */
        }
        toast.success(`Application submitted to ${job.poster}.`);
      } else {
        setShowVerifModal(true);
      }
    }, 350);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (message.trim().length < 10) {
      setError("Write a short message (at least 10 characters).");
      return;
    }
    setError("");
    persistDraft(message.trim(), rate.trim());
    const guard = canPerformProtectedAction(verification);
    if (!guard.allowed) {
      setShowVerifModal(true);
      return;
    }
    executeApplicationSubmit();
  };

  return (
    <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        {/* Live GPS Route Tracker Card */}
        <LiveGpsTracker jobs={jobWithDistance} selectedJobId={job.id} singleJobMode />

        <section className="animate-fade-up rounded-3xl border bg-card p-5 shadow-soft md:p-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
                {job.category}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">
                <ShieldCheck className="size-3.5" aria-hidden />
                Region XI Min Wage Compliant
              </span>
            </div>
            <Button
              type="button"
              size="sm"
              variant={isSaved ? "gold" : "outline"}
              onClick={handleSave}
              className="gap-1.5"
            >
              <Bookmark className={isSaved ? "size-4 fill-current" : "size-4"} aria-hidden />
              {isSaved ? "Saved in Desired Gigs" : "Save Gig"}
            </Button>
          </div>

          <h2 className="mt-3 text-2xl font-extrabold tracking-tight">{job.title}</h2>
          <p className="mt-1 text-muted-foreground">
            Posted by {job.poster} · {job.posted} · {job.landmark}
          </p>

          <dl className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              [
                MapPin,
                "Distance from GPS Pin",
                `${formatDistanceBadge(activeDistanceKm)} (${barangayName(job.barangayId)})`,
              ],
              [CalendarDays, "Schedule", `${job.schedule} · ~${job.estimatedHours}h`],
              [Wallet, "Employer Offer", job.budget],
            ].map(([Icon, k, v]) => {
              const I = Icon as typeof MapPin;
              return (
                <div key={k as string} className="rounded-2xl bg-muted p-3">
                  <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <I className="size-3.5" aria-hidden /> {k as string}
                  </dt>
                  <dd className="mt-0.5 text-sm font-bold">{v as string}</dd>
                </div>
              );
            })}
          </dl>

          {/* Transparent Davao Minimum Wage & Fair Pay Guide */}
          <div className="mt-5 rounded-2xl border bg-secondary/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary">
                <Sparkles className="size-3.5" aria-hidden />
                Davao Wage Floor & Fair Pay Guide
              </p>
              <button
                type="button"
                onClick={() => setShowBreakdown((v) => !v)}
                className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <Info className="size-3" />
                {showBreakdown ? "Hide Breakdown" : "View Breakdown & Legal Basis"}
                {showBreakdown ? (
                  <ChevronUp className="size-3" />
                ) : (
                  <ChevronDown className="size-3" />
                )}
              </button>
            </div>
            <div className="mt-2.5 grid gap-2 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">
                  Davao Min Floor ({job.estimatedHours}h)
                </p>
                <p className="font-bold">₱{job.minimumRequiredPhp.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">AI Fair Market Guide</p>
                <p className="font-bold">{formatPeso(job.aiRecommendedPhp)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Worker Take-Home Pay</p>
                <p className="font-extrabold text-primary">{job.budget}</p>
              </div>
            </div>

            {showBreakdown && (
              <div className="mt-3.5 space-y-2.5 border-t pt-3 text-xs text-muted-foreground">
                <div className="rounded-lg border bg-background/80 p-2.5">
                  <p className="flex items-center gap-1 font-bold text-foreground">
                    <Scale className="size-3 text-primary" /> Statutory Legal Basis
                  </p>
                  <p className="mt-0.5 leading-relaxed">{pricingDetail.legalBasis}</p>
                </div>
                <div className="overflow-hidden rounded-lg border bg-background text-xs">
                  <div className="bg-muted px-2.5 py-1 font-bold text-foreground">
                    Fair Pay Component Breakdown
                  </div>
                  <dl className="divide-y divide-border">
                    <div className="flex justify-between px-2.5 py-1">
                      <span>⚖️ Statutory Base Floor ({job.estimatedHours}h × ₱63.50/hr)</span>
                      <span className="font-semibold text-foreground">
                        {formatPeso(pricingDetail.breakdown.baseWageFloorPhp)}
                      </span>
                    </div>
                    <div className="flex justify-between px-2.5 py-1">
                      <span>🔧 Trade Specialization Premium</span>
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                        +{formatPeso(pricingDetail.breakdown.skillPremiumPhp)}
                      </span>
                    </div>
                    <div className="flex justify-between px-2.5 py-1">
                      <span>🧰 Worker Tools & PPE Allowance</span>
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                        +{formatPeso(pricingDetail.breakdown.toolAllowancePhp)}
                      </span>
                    </div>
                    <div className="flex justify-between px-2.5 py-1">
                      <span>🛵 Intra-City Transit Allowance</span>
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                        +{formatPeso(pricingDetail.breakdown.transportAllowancePhp)}
                      </span>
                    </div>
                    {pricingDetail.breakdown.urgencyPremiumPhp > 0 && (
                      <div className="flex justify-between bg-amber-500/10 px-2.5 py-1">
                        <span className="font-semibold text-amber-800 dark:text-amber-400">
                          ⚡ Urgent Dispatch Surcharge
                        </span>
                        <span className="font-bold text-amber-800 dark:text-amber-400">
                          +{formatPeso(pricingDetail.breakdown.urgencyPremiumPhp)}
                        </span>
                      </div>
                    )}
                  </dl>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground/90">
                  💡 {pricingDetail.logicalBasis}
                </p>
              </div>
            )}
          </div>

          <h3 className="mt-6 font-bold">Job description</h3>
          <p className="mt-1.5 leading-relaxed text-muted-foreground">{job.description}</p>
        </section>
      </div>

      <aside className="md:sticky md:top-24 md:self-start">
        {already ? (
          <div
            className="animate-fade-up rounded-3xl border bg-card p-6 text-center shadow-soft"
            role="status"
          >
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-secondary text-primary">
              <CheckCircle2 className="size-8" aria-hidden />
            </span>
            <h2 className="mt-3 text-xl font-extrabold">Application submitted</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {job.poster} will see your message and offer of {already.rate}.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <Button asChild>
                <Link to="/my-jobs">View My Jobs</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/jobs">Find more jobs</Link>
              </Button>
            </div>
          </div>
        ) : !workerProfile ? (
          <div className="rounded-3xl bg-gold-soft p-6 text-gold-foreground">
            <p className="font-bold">Set up your worker profile first</p>
            <p className="mt-1 text-sm">It takes a minute and lets you apply to jobs.</p>
            <Button asChild variant="gold" className="mt-4 w-full">
              <Link to="/work">Set up profile</Link>
            </Button>
          </div>
        ) : (
          <form
            noValidate
            onSubmit={submit}
            className="space-y-4 rounded-3xl border bg-card p-5 shadow-soft"
          >
            <h2 className="text-lg font-bold">Apply for this job</h2>
            <Field id="message" label="Message to the client" error={error}>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  persistDraft(e.target.value, rate);
                }}
                placeholder={`Hi! I'm a ${workerProfile.skill.toLowerCase()} worker only ${formatDistanceBadge(activeDistanceKm)}…`}
                aria-invalid={!!error}
                aria-describedby={error ? "message-error" : undefined}
              />
            </Field>
            <Field
              id="rate"
              label="Your offer (optional)"
              hint={`Leave blank to accept ${job.budget}.`}
            >
              <Input
                id="rate"
                value={rate}
                onChange={(e) => {
                  setRate(e.target.value);
                  persistDraft(message, e.target.value);
                }}
                placeholder={`e.g. ${job.budget}`}
              />
            </Field>
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />}
              {busy ? "Submitting…" : "Apply Now"}
            </Button>
          </form>
        )}
      </aside>

      <VerificationGuardModal
        open={showVerifModal}
        onOpenChange={setShowVerifModal}
        role="work"
        actionContext={`Apply for “${job.title}”`}
        onVerifiedContinue={executeApplicationSubmit}
      />
    </div>
  );
}
