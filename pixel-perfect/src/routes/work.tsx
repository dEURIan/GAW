import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Inbox, MapPin, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/gaw/AppLayout";
import { JobCard } from "@/components/gaw/cards";
import { ProfileSetup } from "@/components/gaw/ProfileSetup";
import { Avatar, EmptyState, SectionHeader, StatusBadge } from "@/components/gaw/primitives";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { barangayName, calculateJobDistanceKm } from "@/lib/gaw/data";
import { useGaw } from "@/lib/gaw/store";

export const Route = createFileRoute("/work")({
  head: () => ({
    meta: [
      { title: "Find work nearby — GAW" },
      { name: "description", content: "See nearby jobs and booking requests in Davao City." },
      { property: "og:title", content: "Find work nearby — GAW" },
      {
        property: "og:description",
        content: "See nearby jobs and booking requests in Davao City.",
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
  const { workerProfile } = useGaw();
  return workerProfile ? <WorkerDashboard /> : <ProfileSetup />;
}

function WorkerDashboard() {
  const {
    account,
    allJobs,
    userGps,
    workerProfile: p,
    available,
    setAvailable,
    requests,
    applications,
  } = useGaw();
  if (!p || !account) return null;
  const initials = account.name
    .split(" ")
    .map((x) => x[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const pending = requests.filter((r) => r.status === "pending");
  const upcoming = requests.filter((r) => r.status === "confirmed");
  const applied = new Set(applications.map((a) => a.jobId));
  const nearbyJobs = [...allJobs]
    .map((job) => ({
      ...job,
      distanceKm: calculateJobDistanceKm(userGps.lat, userGps.lng, job.lat, job.lng),
    }))
    .sort(
      (a, b) =>
        Number(b.category === p.skill) - Number(a.category === p.skill) ||
        a.distanceKm - b.distanceKm,
    )
    .slice(0, 3);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-contour p-5 text-deep-foreground shadow-lift md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Avatar initials={initials} size="lg" className="ring-4 ring-deep-foreground/15" />
            <div>
              <p className="text-sm text-deep-muted">Working mode</p>
              <h1 className="text-2xl font-extrabold tracking-tight">{account.name}</h1>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-deep-muted">
                <span>{p.skill}</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" aria-hidden /> {barangayName(p.barangayId)}
                </span>
                <span>{p.experience}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-2xl bg-deep-foreground/10 px-4 py-3 md:min-w-64">
            <div>
              <label htmlFor="avail" className="block text-sm font-bold">
                {available ? "Available for work" : "Not available"}
              </label>
              <p className="text-xs text-deep-muted">
                {available ? "Residents can send you requests" : "Hidden from new requests"}
              </p>
            </div>
            <Switch
              id="avail"
              checked={available}
              onCheckedChange={(v) => {
                setAvailable(v);
                toast(v ? "You're now available" : "You're now unavailable");
              }}
              className="data-[state=checked]:bg-gold data-[state=unchecked]:bg-deep-foreground/25"
            />
          </div>
        </div>
        <dl className="mt-6 grid grid-cols-3 gap-2 text-center">
          {[
            ["New requests", pending.length],
            ["Upcoming jobs", upcoming.length],
            ["Applications", applications.length],
          ].map(([l, n]) => (
            <div key={l} className="rounded-2xl bg-deep-foreground/10 px-2 py-3">
              <dd className="text-2xl font-extrabold">{n}</dd>
              <dt className="text-xs text-deep-muted">{l}</dt>
            </div>
          ))}
        </dl>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <section>
          <SectionHeader
            title="Nearby jobs"
            action={
              <Link
                to="/jobs"
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
              >
                Find jobs <ArrowRight className="size-4" aria-hidden />
              </Link>
            }
          />
          <div className="space-y-3">
            {nearbyJobs.map((j) => (
              <JobCard key={j.id} job={j} applied={applied.has(j.id)} />
            ))}
          </div>
        </section>

        <aside className="space-y-6">
          <section>
            <SectionHeader title="Incoming requests" />
            <p className="-mt-2 mb-3 text-xs text-muted-foreground">
              Sample requests from demo residents.
            </p>
            {pending.length ? (
              <ul className="space-y-2.5">
                {pending.map((r) => (
                  <li key={r.id}>
                    <Link
                      to="/requests/$id"
                      params={{ id: r.id }}
                      className="flex items-center gap-3 rounded-2xl border bg-card p-3.5 shadow-soft transition-all hover:border-primary"
                    >
                      <Avatar initials={r.initials} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{r.service}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {r.persona} · {r.date}, {r.time}
                        </p>
                      </div>
                      <StatusBadge status={r.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={<Inbox className="size-6" />}
                title="All caught up"
                body="New booking requests will appear here."
              />
            )}
          </section>

          <section className="rounded-2xl border bg-card p-5 shadow-soft">
            <SectionHeader
              title="My Jobs"
              action={
                <Link to="/my-jobs" className="text-sm font-semibold text-primary">
                  View all
                </Link>
              }
            />
            <p className="text-sm text-muted-foreground">
              {upcoming.length} upcoming · {applications.length} application
              {applications.length === 1 ? "" : "s"} sent
            </p>
          </section>

          <section className="rounded-2xl bg-gold-sheen p-5 text-gold-foreground shadow-soft">
            <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide">
              <TrendingUp className="size-4" aria-hidden /> Earnings insights · sample data
            </p>
            <p className="mt-2 text-3xl font-extrabold text-foreground">₱18,450</p>
            <p className="text-sm">This month · up 12% vs last month</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
