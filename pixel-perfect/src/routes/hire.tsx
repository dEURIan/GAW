import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, CalendarCheck, Crown, MapPin, Search, Settings } from "lucide-react";
import { AppLayout } from "@/components/gaw/AppLayout";
import { WorkerCard } from "@/components/gaw/cards";
import { CATEGORY_ICONS } from "@/components/gaw/categoryIcons";
import { PostGigCard } from "@/components/gaw/PostGigCard";
import { Avatar, LocationFilter, SectionHeader, StatusBadge } from "@/components/gaw/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { barangayName, CATEGORIES, WORKERS } from "@/lib/gaw/data";
import { filterWorkers } from "@/lib/gaw/filter";
import { useGaw } from "@/lib/gaw/store";

export const Route = createFileRoute("/hire")({
  head: () => ({
    meta: [
      { title: "Hire nearby workers — GAW" },
      { name: "description", content: "Find skilled workers near your barangay in Davao City." },
      { property: "og:title", content: "Hire nearby workers — GAW" },
      {
        property: "og:description",
        content: "Find skilled workers near your barangay in Davao City.",
      },
    ],
  }),
  component: EmployerDashboard,
});

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function EmployerDashboard() {
  return (
    <AppLayout mode="hire">
      <DashboardBody />
    </AppLayout>
  );
}

function DashboardBody() {
  const { account, locationId, setLocation, userGps, bookings, plans } = useGaw();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const nearby = filterWorkers(WORKERS, {
    barangayId: locationId,
    origin: userGps,
    category: "all",
    query: "",
    radius: 5,
    availableOnly: false,
  }).slice(0, 4);
  const count = (s: string) => bookings.filter((b) => b.status === s).length;
  const latest = bookings[0];
  const latestWorker = latest && WORKERS.find((w) => w.id === latest.workerId);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    navigate({ to: "/find", search: { q: q.trim() || undefined } });
  };

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl bg-contour p-5 text-deep-foreground shadow-lift md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm text-deep-muted">
              {greeting()}, {account?.name.split(" ")[0]}
              {plans.includes("employer") && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-gold px-2 py-0.5 text-xs font-bold text-gold-foreground">
                  <Crown className="size-3" aria-hidden /> Pro
                </span>
              )}
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight md:text-4xl">
              Who do you need today?
            </h1>
          </div>
          <div className="w-full md:w-56 [&_label]:text-deep-muted">
            <LocationFilter
              id="dash-location"
              label="Your location"
              value={locationId}
              onChange={setLocation}
            />
          </div>
        </div>
        <form onSubmit={onSearch} role="search" className="mt-5 flex gap-2">
          <label htmlFor="dash-search" className="sr-only">
            Search workers
          </label>
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="dash-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Try “leak repair” or “aircon cleaning”"
              className="h-12 rounded-xl border-transparent pl-11 text-foreground"
            />
          </div>
          <Button type="submit" variant="gold" size="lg" className="h-12">
            Search
          </Button>
        </form>
      </section>

      {/* Premium Buyout & Account Settings Strip directly under Profile Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3 text-sm shadow-soft">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold-foreground">
            <Crown className="size-4" aria-hidden />
          </span>
          <div>
            <p className="font-bold leading-tight text-foreground">
              {plans.includes("employer")
                ? "Employer Pro Buyout Active"
                : "Employer Pro Buyout · ₱299/mo"}
            </p>
            <p className="text-xs text-muted-foreground">
              {plans.includes("employer")
                ? "2% settlement fee & unlimited Davao gig postings"
                : "Unlock 2% settlement fee & unlimited open gig postings"}
            </p>
          </div>
        </div>
        <Link
          to="/pro"
          className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border bg-muted/60 px-3 text-xs font-bold text-foreground transition-colors hover:border-primary hover:bg-secondary"
        >
          <Settings className="size-3.5" aria-hidden />
          {plans.includes("employer") ? "Manage Plan" : "Buyout & Settings"}
        </Link>
      </div>

      <PostGigCard />

      <section aria-labelledby="cat-h">
        <h2 id="cat-h" className="mb-3 text-lg font-bold tracking-tight">
          Services
        </h2>
        <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
          {CATEGORIES.map((c) => {
            const Icon = CATEGORY_ICONS[c];
            return (
              <Link
                key={c}
                to="/find"
                search={{ category: c }}
                className="group flex flex-col items-center gap-2 rounded-2xl border bg-card px-2 py-4 text-center text-sm font-semibold shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary"
              >
                <span className="grid size-11 place-items-center rounded-xl bg-secondary text-secondary-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="size-5" aria-hidden />
                </span>
                {c}
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <section>
          <SectionHeader
            title={`Nearby in ${barangayName(locationId)}`}
            action={
              <Link
                to="/find"
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
              >
                See all <ArrowRight className="size-4" aria-hidden />
              </Link>
            }
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {nearby.map((w) => (
              <WorkerCard key={w.id} worker={w} />
            ))}
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3.5" aria-hidden /> Live GPS distances from your current
            location ({userGps.lat.toFixed(4)}°N, {userGps.lng.toFixed(4)}°E).
          </p>
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border bg-card p-5 shadow-soft">
            <SectionHeader
              title="My bookings"
              action={
                <Link to="/bookings" className="text-sm font-semibold text-primary">
                  View all
                </Link>
              }
            />
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
                className="mt-4 flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted"
              >
                <Avatar initials={latestWorker.initials} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{latestWorker.name}</p>
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
        </aside>
      </div>
    </div>
  );
}
