import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bookmark,
  Briefcase,
  CalendarDays,
  Check,
  ClipboardList,
  Clock,
  Eye,
  MapPin,
  Play,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/gaw/AppLayout";
import { LiveJobSharingCard } from "@/components/gaw/GawMap";
import { filterTabPillClass } from "@/components/gaw/interactions";
import { Avatar, EmptyState, StatusBadge } from "@/components/gaw/primitives";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  allowedActions,
  canWithdraw,
  MY_JOBS_TABS,
  tabForStatus,
  type BookingAction,
  type MyJobsTab,
} from "@/lib/gaw/bookings";
import { barangayName, type Job } from "@/lib/gaw/data";
import { bookingsFor, formatPeso, useGaw, type Booking } from "@/lib/gaw/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/my-jobs")({
  head: () => ({
    meta: [
      { title: "My Jobs & Desired Gigs — GAW" },
      {
        name: "description",
        content:
          "Manage your job applications, desired gigs queue, active client bookings, and completed jobs on GAW.",
      },
      { property: "og:title", content: "My Jobs & Desired Gigs — GAW" },
      {
        property: "og:description",
        content:
          "Manage your job applications, desired gigs queue, active client bookings, and completed jobs on GAW.",
      },
    ],
  }),
  component: () => (
    <AppLayout mode="work" title="My Jobs & Desired Gigs">
      <MyJobsPage />
    </AppLayout>
  ),
});

const ACTION_META: Record<
  BookingAction,
  {
    label: string;
    variant: "default" | "outline" | "destructive" | "gold";
    icon: typeof Check;
  }
> = {
  accept: { label: "Accept", variant: "default", icon: Check },
  decline: { label: "Decline", variant: "outline", icon: X },
  cancel: { label: "Cancel", variant: "destructive", icon: X },
  start: { label: "Start Job", variant: "gold", icon: Play },
  finish: { label: "Mark Done", variant: "default", icon: Check },
  confirm: { label: "Confirm Complete", variant: "default", icon: Check },
};

function MyJobsPage() {
  const {
    applications,
    bookings,
    allJobs,
    savedJobIds,
    toggleSaveJob,
    withdrawApplication,
    simulateHire,
    bookingAction,
  } = useGaw();
  const [tab, setTab] = useState<MyJobsTab>("applications");
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);
  const [detailJob, setDetailJob] = useState<Job | null>(null);

  const workerBookings = bookingsFor(bookings, "working");
  const savedJobs = savedJobIds
    .map((id) => allJobs.find((j) => j.id === id))
    .filter((j): j is Job => Boolean(j));

  const countFor = (t: MyJobsTab) => {
    if (t === "applications") return applications.length;
    return workerBookings.filter((b) => tabForStatus(b.status) === t).length;
  };

  const tabBookings =
    tab === "applications" ? [] : workerBookings.filter((b) => tabForStatus(b.status) === tab);

  const doAction = (id: string, act: BookingAction) => {
    bookingAction(id, act);
    toast.success(`Updated job status (${ACTION_META[act].label}).`);
  };

  return (
    <div className="space-y-6">
      {/* Desired Gigs Queue */}
      <section className="card-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-xl bg-gold-soft text-gold-foreground">
              <Bookmark className="size-4 fill-current" aria-hidden />
            </span>
            <div>
              <h2 className="text-base font-extrabold">Desired Gigs Queue</h2>
              <p className="text-xs text-muted-foreground">
                Bookmarked Davao City gigs ready when you want to apply ({savedJobs.length})
              </p>
            </div>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/jobs">Find more gigs</Link>
          </Button>
        </div>

        {savedJobs.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {savedJobs.map((job) => (
              <div
                key={job.id}
                className="flex flex-col justify-between gap-2.5 rounded-2xl border bg-muted/40 p-3.5"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-primary">{job.category}</span>
                    <span className="font-extrabold text-deep dark:text-foreground">
                      {job.budget}
                    </span>
                  </div>
                  <Link
                    to="/jobs/$id"
                    params={{ id: job.id }}
                    className="mt-1 block truncate text-sm font-bold hover:text-primary"
                  >
                    {job.title}
                  </Link>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {barangayName(job.barangayId)} · {job.schedule}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button asChild size="sm" className="flex-1">
                    <Link to="/jobs/$id" params={{ id: job.id }}>
                      View & Apply
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    aria-label={`Remove ${job.title} from Desired Gigs`}
                    onClick={() => {
                      toggleSaveJob(job.id);
                      toast("Removed from Desired Gigs");
                    }}
                    className="size-8 shrink-0 rounded-lg"
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Bookmark any open gig on the Live GPS Map to save it to your Desired Gigs queue.
          </p>
        )}
      </section>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="My Jobs views"
        className="flex flex-wrap gap-1.5 rounded-2xl border bg-card p-1.5"
      >
        {MY_JOBS_TABS.map((t) => {
          const active = tab === t.key;
          const cnt = countFor(t.key);
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              className={filterTabPillClass(
                active,
                "inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold",
              )}
            >
              <span>{t.label}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px]",
                  active ? "bg-white/20 text-white" : "bg-muted text-muted-foreground",
                )}
              >
                {cnt}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {tab === "applications" ? (
        applications.length > 0 ? (
          <div className="space-y-3">
            {applications.map((app) => {
              const job = allJobs.find((j) => j.id === app.jobId);
              return (
                <article
                  key={app.id}
                  className="card-surface flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center sm:p-5"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-bold text-secondary-foreground">
                        {job?.category ?? "Gig"}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-bold capitalize",
                          app.status === "hired"
                            ? "bg-status-confirmed-bg text-status-confirmed"
                            : app.status === "withdrawn"
                              ? "bg-muted text-muted-foreground"
                              : "bg-status-pending-bg text-status-pending",
                        )}
                      >
                        {app.status}
                      </span>
                    </div>
                    <h3 className="truncate text-base font-extrabold">
                      {job?.title ?? `Job ${app.jobId}`}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Your offer: <strong className="text-foreground">{app.rate}</strong>
                      {job ? ` · ${barangayName(job.barangayId)} · Poster: ${job.poster}` : ""}
                    </p>
                    <p className="line-clamp-2 text-sm text-muted-foreground">“{app.message}”</p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {job && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setDetailJob(job)}
                      >
                        <Eye className="size-3.5" aria-hidden /> Details
                      </Button>
                    )}
                    {app.status === "submitted" && (
                      <Button
                        type="button"
                        variant="gold"
                        size="sm"
                        onClick={() => {
                          const newBookingId = simulateHire(app.id);
                          if (newBookingId) {
                            toast.success(
                              "Demo employer accepted your application! Moved to Upcoming.",
                            );
                            setTab("upcoming");
                          }
                        }}
                      >
                        <Sparkles className="size-3.5" aria-hidden /> Simulate employer hire
                      </Button>
                    )}
                    {canWithdraw(app.status) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          withdrawApplication(app.id);
                          toast("Application withdrawn");
                        }}
                      >
                        Withdraw
                      </Button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={<ClipboardList className="size-6" />}
            title="No job applications yet"
            body="Browse open Davao City jobs on the Live GPS Map and send your offer."
            action={
              <Button asChild>
                <Link to="/jobs">
                  <Briefcase className="size-4" aria-hidden /> Browse Open Jobs
                </Link>
              </Button>
            }
          />
        )
      ) : tabBookings.length > 0 ? (
        <div className="space-y-3">
          {tabBookings.map((b) => {
            const actions = allowedActions(b.status, "worker");
            return (
              <article key={b.id} className="card-surface p-4 sm:p-5">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div className="flex min-w-0 items-start gap-3">
                    <Avatar initials={b.client.initials} size="md" />
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={b.status} />
                        <span className="text-xs font-semibold text-muted-foreground">
                          Client: {b.client.name}
                        </span>
                      </div>
                      <h3 className="text-base font-extrabold">{b.service}</h3>
                      <p className="text-sm text-muted-foreground">{b.description}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="size-3.5" aria-hidden /> {b.date}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="size-3.5" aria-hidden /> {b.time}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3.5" aria-hidden />
                          {b.location?.label ?? barangayName(b.barangayId)}
                        </span>
                        <span className="font-bold text-foreground">
                          {b.rateText
                            ? b.rateText
                            : b.budget !== null
                              ? formatPeso(b.budget)
                              : "Quote requested"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setDetailBooking(b)}
                    >
                      View details
                    </Button>
                    {actions.map((act) => {
                      const meta = ACTION_META[act];
                      const Icon = meta.icon;
                      return (
                        <Button
                          key={act}
                          type="button"
                          size="sm"
                          variant={meta.variant}
                          onClick={() => doAction(b.id, act)}
                        >
                          <Icon className="size-3.5" aria-hidden /> {meta.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {b.status === "in_progress" && (
                  <LiveJobSharingCard
                    bookingTitle={b.service}
                    barangayId={b.barangayId}
                    targetLocation={b.location}
                  />
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<ClipboardList className="size-6" />}
          title="Nothing in this queue yet"
          body="Accepted requests and completed client jobs will show up here."
        />
      )}

      {/* Booking Detail Dialog */}
      <Dialog open={!!detailBooking} onOpenChange={(v) => !v && setDetailBooking(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>{detailBooking?.service}</DialogTitle>
            <DialogDescription>
              Client: {detailBooking?.client.name} ·{" "}
              {detailBooking ? barangayName(detailBooking.barangayId) : ""}
            </DialogDescription>
          </DialogHeader>
          {detailBooking && (
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">{detailBooking.description}</p>
              <div className="rounded-2xl bg-muted p-3.5 text-xs space-y-1">
                <p>
                  <strong>Schedule:</strong> {detailBooking.date} at {detailBooking.time}
                </p>
                <p>
                  <strong>Location:</strong>{" "}
                  {detailBooking.location?.label ?? barangayName(detailBooking.barangayId)}
                </p>
                <p>
                  <strong>Agreed Pay:</strong>{" "}
                  {detailBooking.rateText
                    ? detailBooking.rateText
                    : detailBooking.budget !== null
                      ? formatPeso(detailBooking.budget)
                      : "Quote requested"}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Applied Job Detail Dialog */}
      <Dialog open={!!detailJob} onOpenChange={(v) => !v && setDetailJob(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>{detailJob?.title}</DialogTitle>
            <DialogDescription>
              {detailJob?.category} · {detailJob?.poster}
            </DialogDescription>
          </DialogHeader>
          {detailJob && (
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">{detailJob.description}</p>
              <div className="rounded-2xl bg-muted p-3.5 text-xs space-y-1">
                <p>
                  <strong>Budget:</strong> {detailJob.budget} (~
                  {detailJob.estimatedHours}h)
                </p>
                <p>
                  <strong>Landmark:</strong> {detailJob.landmark} (
                  {barangayName(detailJob.barangayId)})
                </p>
                <p>
                  <strong>Schedule:</strong> {detailJob.schedule}
                </p>
              </div>
              <Button asChild className="w-full">
                <Link to="/jobs/$id" params={{ id: detailJob.id }}>
                  Open Job & Live GPS Tracker
                </Link>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
