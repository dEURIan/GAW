import { useMemo, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Crown,
  MapPin,
  Search,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { AppLayout } from "@/components/gaw/AppLayout";
import { WorkerCard } from "@/components/gaw/cards";
import { iconFor } from "@/components/gaw/categoryIcons";
import { LocationPicker } from "@/components/gaw/GawMap";
import { interactiveNavCardClass, subtleLinkClass } from "@/components/gaw/interactions";
import { PostGigCard } from "@/components/gaw/PostGigCard";
import { Avatar, StatusBadge } from "@/components/gaw/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FEATURED_CATEGORIES, WORKERS, barangayName } from "@/lib/gaw/data";
import { filterWorkers } from "@/lib/gaw/filter";
import {
  FREE_OPEN_JOBS_LIMIT,
  bookingsFor,
  canPerformProtectedAction,
  hasPlan,
  hiringOrigin,
  hiringOriginLabel,
  useGaw,
  workerById,
} from "@/lib/gaw/store";

export const Route = createFileRoute("/hire")({
  head: () => ({
    meta: [
      { title: "Hire a Worker — GAW" },
      {
        name: "description",
        content:
          "Browse verified skilled workers nearby, post a Davao City gig, and manage your bookings.",
      },
      { property: "og:title", content: "Hire a Worker — GAW" },
      {
        property: "og:description",
        content:
          "Browse verified skilled workers nearby, post a Davao City gig, and manage your bookings.",
      },
    ],
  }),
  component: () => (
    <AppLayout mode="hire">
      <HireHome />
    </AppLayout>
  ),
});

function HireHome() {
  const {
    account,
    locationId,
    serviceLocation,
    setServiceLocation,
    bookings,
    customJobs,
    plans,
    verification,
  } = useGaw();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [editingLoc, setEditingLoc] = useState(false);

  const origin = hiringOrigin({ serviceLocation, locationId });
  const originLabel = hiringOriginLabel({ serviceLocation, locationId });
  const hiringBookings = bookingsFor(bookings, "hiring");
  const isPro = hasPlan(plans, "employer");
  const verif = canPerformProtectedAction(verification);

  const nearbyWorkers = useMemo(
    () =>
      filterWorkers(WORKERS, {
        origin,
        category: "all",
        query: "",
        radius: 5,
        availableOnly: false,
      }).slice(0, 4),
    [origin],
  );

  const count = (status: string) => hiringBookings.filter((b) => b.status === status).length;
  const latest = hiringBookings[0];
  const latestWorker = latest ? workerById(latest.workerId) : undefined;

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    void navigate({
      to: "/find",
      search: { category: "all", q: query.trim() },
    });
  };

  return (
    <div className="space-y-6">
      {!verif.allowed ? (
        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-gold/40 bg-gold-soft px-4 py-3.5 text-sm text-gold-foreground sm:flex-row sm:items-center">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
            <div>
              <p className="font-bold">
                {verif.isPending
                  ? "Identity verification pending review"
                  : "Verify your identity before booking"}
              </p>
              <p className="text-xs opacity-90">
                {verif.isPending
                  ? "Your ID has been submitted. Once approved, you can confirm worker bookings."
                  : "Browse workers freely anytime. Upload a valid ID when you are ready to book."}
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
            Identity verified — ready to book workers directly.
          </span>
          <Link to="/verify" className="underline">
            Manage ID
          </Link>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card-surface p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-primary">
                  Hiring in Davao City
                </p>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
                  Hi {account?.name?.split(" ")[0] ?? "neighbor"}, need help nearby?
                </h1>
              </div>

              <button
                type="button"
                onClick={() => setEditingLoc((v) => !v)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border bg-muted px-3 py-1.5 text-xs font-semibold transition-colors hover:border-primary"
              >
                <MapPin className="size-3.5 text-primary" aria-hidden />
                <span className="max-w-44 truncate">{originLabel}</span>
                <span className="text-primary">Change</span>
              </button>
            </div>

            {editingLoc && (
              <div className="mt-4">
                <LocationPicker
                  initialLocation={origin}
                  initialBarangayId={locationId}
                  initialLabel={serviceLocation?.label}
                  confirmLabel="Use this location"
                  onConfirm={(placed) => {
                    setServiceLocation(placed);
                    setEditingLoc(false);
                  }}
                />
              </div>
            )}

            <form onSubmit={submitSearch} className="mt-5 flex flex-col gap-2.5 sm:flex-row">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search service, skill, or worker (e.g. Motorcycle Mechanic)…"
                  className="h-11 pl-10"
                />
              </div>
              <Button type="submit" size="lg" className="shrink-0">
                Find Workers
                <ArrowRight aria-hidden />
              </Button>
            </form>

            <div className="mt-5">
              <div className="mb-2.5 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Popular categories
                </p>
                <Link to="/find" search={{ category: "all", q: "" }} className={subtleLinkClass}>
                  All 16+ services →
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {FEATURED_CATEGORIES.map((cat) => {
                  const Icon = iconFor(cat);
                  return (
                    <Link
                      key={cat}
                      to="/find"
                      search={{ category: cat, q: "" }}
                      className={`flex items-center gap-2.5 rounded-2xl border bg-muted/40 p-3 text-sm font-semibold ${interactiveNavCardClass}`}
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground transition-[background-color,color,transform] duration-150 group-hover:scale-105 group-hover:bg-primary group-hover:text-primary-foreground motion-reduce:group-hover:scale-100">
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <span className="truncate transition-colors duration-150 group-hover:text-primary">
                        {cat}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>

          <PostGigCard />

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold tracking-tight">
                  Skilled workers in your general area
                </h2>
                <p className="text-xs text-muted-foreground">
                  Connected through live GPS tracking · Ranked by distance from {originLabel}
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/find" search={{ category: "all", q: "" }}>
                  Open Nearby Finder
                </Link>
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {nearbyWorkers.map((w) => (
                <WorkerCard key={w.id} worker={w} />
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          {/* Employer Posted Gigs summary card */}
          <section className="card-surface p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                  <ClipboardList className="size-4" aria-hidden />
                </span>
                <div>
                  <h2 className="text-base font-extrabold">My posted gigs</h2>
                  <p className="text-xs text-muted-foreground">
                    {customJobs.length} active{" "}
                    {isPro ? "· Unlimited (Pro)" : `of ${FREE_OPEN_JOBS_LIMIT} free slots`}
                  </p>
                </div>
              </div>
              <Link to="/gigs" className={subtleLinkClass}>
                View all
              </Link>
            </div>

            {customJobs.length > 0 ? (
              <div className="mt-4 space-y-2">
                {customJobs.slice(0, 2).map((job) => (
                  <Link
                    key={job.id}
                    to="/gigs"
                    className={`block rounded-xl border bg-muted/40 p-3 ${interactiveNavCardClass}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold transition-colors duration-150 group-hover:text-primary">
                        {job.title}
                      </p>
                      <span className="shrink-0 text-xs font-bold text-primary">{job.budget}</span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {job.category} · {barangayName(job.barangayId)}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                No posted gigs yet. Use “Post a Gig” to invite local applicants.
              </p>
            )}
          </section>

          {/* Bookings summary */}
          <section className="card-surface p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-extrabold">Bookings</h2>
              <Link to="/bookings" className={subtleLinkClass}>
                Manage →
              </Link>
            </div>
            <dl className="grid grid-cols-3 gap-2 text-center">
              {[
                ["Pending", count("pending")],
                ["Confirmed", count("confirmed")],
                ["Completed", count("completed")],
              ].map(([l, n]) => (
                <div key={l} className="rounded-xl bg-muted px-2 py-3">
                  <dd className="text-2xl font-extrabold">{n}</dd>
                  <dt className="text-xs text-muted-foreground">{l}</dt>
                </div>
              ))}
            </dl>
            {latest && latestWorker ? (
              <Link
                to="/bookings"
                className={`mt-4 flex items-center gap-3 rounded-xl border p-3 ${interactiveNavCardClass}`}
              >
                <Avatar initials={latestWorker.initials} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold transition-colors duration-150 group-hover:text-primary">
                    {latestWorker.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{latest.service}</p>
                </div>
                <StatusBadge status={latest.status} />
              </Link>
            ) : (
              <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarCheck className="size-4" aria-hidden /> No bookings yet.
              </p>
            )}
          </section>

          {/* Employer Pro Card */}
          <section className="rounded-3xl border border-gold/40 bg-gradient-to-br from-deep to-[#0E563B] p-5 text-white shadow-soft">
            <div className="flex items-center gap-2">
              <Crown className="size-5 text-gold" aria-hidden />
              <h2 className="text-base font-extrabold">GAW Employer Pro</h2>
            </div>
            {isPro ? (
              <>
                <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-200">
                  <CheckCircle2 className="size-4" aria-hidden /> Active · Unlimited gig postings &
                  Top-Rated filter unlocked
                </p>
                <Button asChild variant="gold" size="sm" className="mt-4 w-full">
                  <Link to="/pro">Manage Employer Pro</Link>
                </Button>
              </>
            ) : (
              <>
                <p className="mt-2 text-xs leading-relaxed text-emerald-100/90">
                  Unlock unlimited open gig postings and filter top-rated Davao City specialists for
                  ₱69/month.
                </p>
                <Button asChild variant="gold" size="sm" className="mt-4 w-full">
                  <Link to="/pro">Upgrade to Employer Pro</Link>
                </Button>
              </>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
