import { useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Briefcase,
  CalendarClock,
  CheckCircle2,
  MapPin,
  Radio,
  Search,
  Trash2,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout, BackButton } from "@/components/gaw/AppLayout";
import { iconFor } from "@/components/gaw/categoryIcons";
import { LiveGpsTracker } from "@/components/gaw/LiveGpsTracker";
import { PostGigCard } from "@/components/gaw/PostGigCard";
import { EmptyState, SectionHeader } from "@/components/gaw/primitives";
import { Button } from "@/components/ui/button";
import {
  barangayName,
  calculateJobDistanceKm,
  estimateTravelMinutes,
  type Job,
} from "@/lib/gaw/data";
import type { JobWithDistance } from "@/lib/gaw/filter";
import { formatPeso, FREE_OPEN_JOBS_LIMIT, useGaw } from "@/lib/gaw/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/gigs")({
  head: () => ({
    meta: [
      { title: "My Posted Gigs — GAW" },
      {
        name: "description",
        content: "View and manage the Davao City gigs you posted for nearby workers.",
      },
      { property: "og:title", content: "My Posted Gigs — GAW" },
      {
        property: "og:description",
        content: "View and manage the Davao City gigs you posted for nearby workers.",
      },
    ],
  }),
  component: () => (
    <AppLayout mode="hire" title="My Posted Gigs" back={<BackButton to="/hire" />}>
      <PostedGigsBody />
    </AppLayout>
  ),
});

function PostedGigsBody() {
  const { customJobs, applications, plans, userGps, removeJob } = useGaw();
  const [selectedJobId, setSelectedJobId] = useState<string | undefined>(customJobs[0]?.id);
  const mapSectionRef = useRef<HTMLElement | null>(null);

  const isEmployerPro = plans.includes("employer");

  const jobsWithDistance = useMemo<JobWithDistance[]>(
    () =>
      customJobs.map((job) => {
        const dKm = calculateJobDistanceKm(userGps.lat, userGps.lng, job.lat, job.lng);
        const eta = estimateTravelMinutes(dKm);
        return {
          ...job,
          distanceKm: dKm,
          rideMin: eta.rideMin,
          walkMin: eta.walkMin,
        };
      }),
    [customJobs, userGps],
  );

  const activeJobId = jobsWithDistance.some((j) => j.id === selectedJobId)
    ? selectedJobId
    : jobsWithDistance[0]?.id;

  const matchingApplicationsCount = useMemo(() => {
    const ids = new Set(customJobs.map((j) => j.id));
    return applications.filter((a) => ids.has(a.jobId)).length;
  }, [customJobs, applications]);

  const handlePinOnMap = (job: Job) => {
    setSelectedJobId(job.id);
    mapSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const handleCloseJob = (job: Job) => {
    removeJob(job.id);
    toast.success(`Closed "${job.title}"`);
  };

  return (
    <div className="mx-auto min-w-0 max-w-5xl space-y-6">
      {/* KPI Summary Cards */}
      <section aria-label="Posted gigs summary" className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span>Open Posted Gigs</span>
            <Briefcase className="size-4 text-primary" aria-hidden />
          </div>
          <p className="mt-2 text-3xl font-extrabold tracking-tight">{customJobs.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {isEmployerPro
              ? "Unlimited · Employer Pro"
              : `${customJobs.length} of ${FREE_OPEN_JOBS_LIMIT} free open gigs used`}
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span>Applicant Proposals</span>
            <Users className="size-4 text-primary" aria-hidden />
          </div>
          <p className="mt-2 text-3xl font-extrabold tracking-tight">{matchingApplicationsCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {matchingApplicationsCount === 0
              ? "Waiting for nearby worker proposals"
              : "Worker proposals on your gigs"}
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span>Live GPS Broadcast</span>
            <Radio className="size-4 text-primary" aria-hidden />
          </div>
          <p className="mt-2 inline-flex items-center gap-2 text-xl font-extrabold tracking-tight text-primary">
            <span className="size-2.5 rounded-full bg-primary ring-4 ring-primary/20" aria-hidden />
            {customJobs.length > 0 ? "Active" : "Standby"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Broadcasting in Davao City</p>
        </div>
      </section>

      {/* Post a New Gig Form */}
      <PostGigCard onPosted={() => setSelectedJobId(undefined)} />

      {/* Posted Gigs List */}
      <section aria-label="Posted gigs">
        <SectionHeader
          title="Your posted gigs"
          action={
            customJobs.length > 0 ? (
              <span className="text-xs font-semibold text-muted-foreground">
                {customJobs.length} open gig{customJobs.length === 1 ? "" : "s"}
              </span>
            ) : undefined
          }
        />

        {jobsWithDistance.length === 0 ? (
          <EmptyState
            icon={<Briefcase className="size-6" />}
            title="No posted gigs yet"
            body="Post an open Davao City gig above so nearby workers can discover it on Live GPS and submit proposals."
            action={
              <Button asChild variant="soft">
                <Link to="/find">Open Nearby Finder</Link>
              </Button>
            }
          />
        ) : (
          <ul className="space-y-4">
            {jobsWithDistance.map((job) => {
              const Icon = iconFor(job.category);
              const jobApps = applications.filter((a) => a.jobId === job.id);
              const isPinned = activeJobId === job.id;

              return (
                <li
                  key={job.id}
                  className={cn(
                    "animate-fade-up rounded-3xl border bg-card p-5 shadow-soft transition-shadow hover:shadow-lift",
                    isPinned && "border-primary/45 ring-1 ring-primary/20",
                  )}
                >
                  <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3.5">
                      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
                        <Icon className="size-5" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 rounded-full bg-status-confirmed-bg px-2.5 py-0.5 text-xs font-semibold text-status-confirmed">
                            <CheckCircle2 className="size-3" aria-hidden />
                            Open
                          </span>
                          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                            {job.category}
                          </span>
                          {job.urgent && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gold px-2.5 py-0.5 text-xs font-bold text-gold-foreground">
                              <Zap className="size-3" aria-hidden />
                              Urgent
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">· {job.posted}</span>
                        </div>
                        <h3 className="mt-1.5 text-lg font-bold tracking-tight">{job.title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{job.description}</p>
                      </div>
                    </div>

                    <div className="shrink-0 rounded-2xl bg-secondary/45 px-4 py-2.5 text-left sm:text-right">
                      <p className="text-xl font-extrabold text-deep">{job.budget}</p>
                      <p className="text-xs font-semibold text-muted-foreground">
                        {job.estimatedHours}h · Min floor ₱{job.minimumRequiredPhp.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <dl className="mt-4 grid min-w-0 gap-2 rounded-2xl bg-muted/55 p-3.5 text-xs text-muted-foreground sm:grid-cols-3">
                    <div className="flex min-w-0 items-start gap-2">
                      <MapPin className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
                      <div className="min-w-0">
                        <dt className="break-words font-semibold text-foreground">
                          {barangayName(job.barangayId)} · {job.landmark}
                        </dt>
                        <dd className="tabular-nums">
                          {job.lat.toFixed(4)}°N, {job.lng.toFixed(4)}°E
                        </dd>
                      </div>
                    </div>
                    <div className="flex min-w-0 items-start gap-2">
                      <CalendarClock
                        className="mt-0.5 size-3.5 shrink-0 text-primary"
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <dt className="font-semibold text-foreground">Schedule</dt>
                        <dd>{job.schedule}</dd>
                      </div>
                    </div>
                    <div className="flex min-w-0 items-start gap-2">
                      <Wallet className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
                      <div className="min-w-0">
                        <dt className="font-semibold text-foreground">Applications</dt>
                        <dd>
                          {jobApps.length === 0
                            ? "0 proposals yet"
                            : `${jobApps.length} worker proposal${jobApps.length === 1 ? "" : "s"}`}
                        </dd>
                      </div>
                    </div>
                  </dl>

                  {jobApps.length > 0 && (
                    <div className="mt-3 space-y-2 rounded-2xl border border-primary/20 bg-secondary/30 p-3.5">
                      <p className="text-xs font-bold uppercase tracking-wide text-primary">
                        Applicant proposals ({jobApps.length})
                      </p>
                      <ul className="space-y-2">
                        {jobApps.map((app) => (
                          <li
                            key={app.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-card px-3 py-2 text-xs shadow-soft"
                          >
                            <p className="font-medium text-foreground">{app.message}</p>
                            {app.rate && (
                              <span className="shrink-0 font-bold text-deep">{app.rate}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-3.5">
                    <Button
                      type="button"
                      size="sm"
                      variant={isPinned ? "default" : "outline"}
                      onClick={() => handlePinOnMap(job)}
                    >
                      <MapPin className="size-3.5" aria-hidden />
                      {isPinned ? "Pinned on Map" : "Pin on Map"}
                    </Button>
                    <Button asChild size="sm" variant="soft">
                      <Link to="/find" search={{ category: job.category }}>
                        <Search className="size-3.5" aria-hidden />
                        Find Workers
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleCloseJob(job)}
                      className="ml-auto text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                      Close Gig
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Embedded Live Davao GPS Tracker for Posted Gigs */}
      {jobsWithDistance.length > 0 && (
        <section
          ref={mapSectionRef}
          aria-label="Posted gigs live map preview"
          className="space-y-3"
        >
          <SectionHeader
            title="Live Davao GPS Preview"
            action={
              <span className="text-xs font-semibold text-muted-foreground">
                Tap a posted gig pin or click Pin on Map above
              </span>
            }
          />
          <LiveGpsTracker
            jobs={jobsWithDistance}
            selectedJobId={activeJobId}
            onSelectJob={(job) => setSelectedJobId(job.id)}
          />
        </section>
      )}
    </div>
  );
}
