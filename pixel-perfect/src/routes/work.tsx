import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Briefcase,
  CheckCircle2,
  ClipboardList,
  Inbox,
  MapPin,
  Pencil,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/gaw/AppLayout";
import { JobCard } from "@/components/gaw/cards";
import { interactiveNavCardClass, subtleLinkClass } from "@/components/gaw/interactions";
import { ProfileSetup } from "@/components/gaw/ProfileSetup";
import { Avatar, StatusBadge } from "@/components/gaw/primitives";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { barangayName } from "@/lib/gaw/data";
import { filterAndSortJobs } from "@/lib/gaw/filter";
import { bookingsFor, canPerformProtectedAction, formatPeso, useGaw } from "@/lib/gaw/store";

export const Route = createFileRoute("/work")({
  head: () => ({
    meta: [
      { title: "Worker Dashboard — GAW" },
      {
        name: "description",
        content:
          "Manage your skills profile, respond to incoming booking requests, and apply for Davao City jobs nearby.",
      },
      { property: "og:title", content: "Worker Dashboard — GAW" },
      {
        property: "og:description",
        content:
          "Manage your skills profile, respond to incoming booking requests, and apply for Davao City jobs nearby.",
      },
    ],
  }),
  component: () => (
    <AppLayout mode="work">
      <WorkerHome />
    </AppLayout>
  ),
});

function WorkerHome() {
  const {
    account,
    workerProfile,
    available,
    setAvailable,
    bookings,
    allJobs,
    userGps,
    verification,
  } = useGaw();
  const [editing, setEditing] = useState(false);

  const verif = canPerformProtectedAction(verification);
  const workerBookings = bookingsFor(bookings, "working");
  const pendingRequests = workerBookings.filter((b) => b.status === "pending");
  const activeBookings = workerBookings.filter(
    (b) =>
      b.status === "confirmed" ||
      b.status === "in_progress" ||
      b.status === "awaiting_confirmation",
  );

  const nearbyJobs = useMemo(
    () =>
      filterAndSortJobs(allJobs, {
        category: "all",
        barangayId: "all",
        query: "",
        sortBy: "nearest",
        userGps,
      }).slice(0, 4),
    [allJobs, userGps],
  );

  return (
    <div className="space-y-6">
      {!verif.allowed ? (
        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-gold/40 bg-gold-soft px-4 py-3.5 text-sm text-gold-foreground sm:flex-row sm:items-center">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
            <div>
              <p className="font-bold">
                {verif.isPending
                  ? "ID verification pending review"
                  : "Verify your identity before applying"}
              </p>
              <p className="text-xs opacity-90">
                {verif.isPending
                  ? "Your ID is under review. You can keep browsing open Davao City jobs while you wait."
                  : "Set up your worker profile and browse jobs anytime. Upload an ID when you are ready to submit applications."}
              </p>
            </div>
          </div>
          <Button asChild size="sm" variant="gold" className="shrink-0">
            <Link to="/verify">{verif.isPending ? "Check status" : "Verify ID"}</Link>
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-status-confirmed/25 bg-status-confirmed-bg px-4 py-2.5 text-xs font-semibold text-status-confirmed">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="size-4 shrink-0" aria-hidden />
            Identity verified — ready to apply for Davao City jobs.
          </span>
          <Link to="/verify" className="underline">
            Manage ID
          </Link>
        </div>
      )}

      {!workerProfile || editing ? (
        <section className="card-surface p-5 sm:p-7">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-primary">Worker Setup</p>
              <h1 className="text-2xl font-extrabold tracking-tight">
                {workerProfile ? "Update your worker profile" : "Tell neighbors what work you do"}
              </h1>
            </div>
            {workerProfile && (
              <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            )}
          </div>
          <ProfileSetup
            initial={workerProfile}
            onDone={() => {
              setEditing(false);
              toast.success("Worker profile saved.");
            }}
          />
        </section>
      ) : (
        <section className="card-surface p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-primary">
                Working Mode · {account?.name ?? "Demo Worker"}
              </p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight">{workerProfile.skill}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5 text-primary" aria-hidden />
                  {barangayName(workerProfile.barangayId)} · within {workerProfile.radiusKm} km
                </span>
                <span>{workerProfile.experience} experience</span>
              </p>
              {workerProfile.skills.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {workerProfile.skills.map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2.5 rounded-full border bg-muted/40 px-3.5 py-2 text-xs font-bold">
                <span className={available ? "text-status-confirmed" : "text-muted-foreground"}>
                  {available ? "Available for jobs" : "Paused"}
                </span>
                <Switch
                  checked={available}
                  onCheckedChange={(v) => {
                    setAvailable(v);
                    toast.success(v ? "You are now visible to clients." : "Status set to Paused.");
                  }}
                  aria-label="Toggle availability"
                />
              </label>

              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="size-3.5" aria-hidden /> Edit profile
              </Button>
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold tracking-tight">
                Closest open gigs in Davao City
              </h2>
              <p className="text-xs text-muted-foreground">Ranked from {userGps.label}</p>
            </div>
            <Button asChild size="sm">
              <Link to="/jobs">
                <Briefcase className="size-3.5" aria-hidden /> Open Live GPS Map
              </Link>
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {nearbyJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </section>

        <aside className="space-y-5">
          <section className="card-surface p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-extrabold">
                <Inbox className="size-4 text-primary" aria-hidden /> Incoming requests
              </h2>
              <Link to="/my-jobs" className={subtleLinkClass}>
                All jobs →
              </Link>
            </div>

            {pendingRequests.length ? (
              <div className="space-y-2.5">
                {pendingRequests.slice(0, 3).map((r) => (
                  <Link
                    key={r.id}
                    to="/requests/$id"
                    params={{ id: r.id }}
                    className={`flex items-center gap-3 rounded-xl border p-3 ${interactiveNavCardClass}`}
                  >
                    <Avatar initials={r.client.initials} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold transition-colors duration-150 group-hover:text-primary">
                        {r.service}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {r.client.name} · {barangayName(r.barangayId)} ·{" "}
                        {r.budget !== null ? formatPeso(r.budget) : "Quote requested"}
                      </p>
                    </div>
                    <StatusBadge status={r.status} />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No new client requests right now.</p>
            )}
          </section>

          <section className="card-surface p-5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-extrabold">
                <ClipboardList className="size-4 text-primary" aria-hidden /> Active queue
              </h2>
              <Link to="/my-jobs" className={subtleLinkClass}>
                My Jobs →
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              {activeBookings.length > 0 ? (
                <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                  <CheckCircle2 className="size-4 text-status-confirmed" aria-hidden />
                  {activeBookings.length} confirmed or in-progress{" "}
                  {activeBookings.length === 1 ? "job" : "jobs"}
                </span>
              ) : (
                "Accept incoming requests or apply to open Davao City jobs to fill your schedule."
              )}
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
