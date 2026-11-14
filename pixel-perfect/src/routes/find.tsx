import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, SearchX } from "lucide-react";
import { AppLayout } from "@/components/gaw/AppLayout";
import { WorkerCard } from "@/components/gaw/cards";
import { EmptyState, LocationFilter } from "@/components/gaw/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { barangayName, CATEGORIES, RADIUS_OPTIONS, WORKERS, type Category } from "@/lib/gaw/data";
import { filterWorkers, type WorkerWithDistance } from "@/lib/gaw/filter";
import { useGaw } from "@/lib/gaw/store";
import { cn } from "@/lib/utils";

type FindSearch = { category?: Category | undefined; q?: string | undefined };

export const Route = createFileRoute("/find")({
  validateSearch: (s: Record<string, unknown>): FindSearch => ({
    category: CATEGORIES.includes(s["category"] as Category)
      ? (s["category"] as Category)
      : undefined,
    q: typeof s["q"] === "string" && s["q"] ? s["q"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Nearby Finder — GAW" },
      {
        name: "description",
        content: "Find available workers within 1 to 10 km of your barangay.",
      },
      { property: "og:title", content: "Nearby Finder — GAW" },
      {
        property: "og:description",
        content: "Find available workers within 1 to 10 km of your barangay.",
      },
    ],
  }),
  component: FindPage,
});

function FindPage() {
  return (
    <AppLayout mode="hire" title="Nearby Finder">
      <NearbyFinder />
    </AppLayout>
  );
}

function bearing(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  return Math.atan2(to.lat - from.lat, to.lng - from.lng);
}

/** Radar view: rings scale to the selected radius; dots placed by live GPS distance and direction. */
function Radar({
  workers,
  origin,
  areaLabel,
  radius,
}: {
  workers: WorkerWithDistance[];
  origin: { lat: number; lng: number };
  areaLabel: string;
  radius: number;
}) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[300px]">
      {[1, 0.75, 0.5, 0.25].map((r) => (
        <div
          key={r}
          className="absolute rounded-full border border-deep-foreground/15"
          style={{ inset: `${(1 - r) * 50}%` }}
        />
      ))}
      <div className="absolute inset-0 animate-radar rounded-full bg-gold/25" aria-hidden />
      <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-deep-muted">
        {radius} km
      </span>
      <span className="absolute left-1/2 top-1/2 grid size-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-gold ring-4 ring-gold/30">
        <span className="sr-only">Your live GPS location, {areaLabel}</span>
      </span>
      {workers.map((w) => {
        const a = bearing(origin, w);
        const d = Math.min(46, Math.max(w.distance / radius, 0.08) * 46);
        return (
          <Link
            key={w.id}
            to="/workers/$id"
            params={{ id: w.id }}
            title={`${w.name} · ${w.skill} · ${w.distance.toFixed(1)} km away`}
            aria-label={`${w.name}, ${w.skill}, ${w.distance.toFixed(1)} km away`}
            className={cn(
              "absolute grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-[9px] font-bold shadow-soft transition-transform hover:scale-125",
              w.available ? "bg-deep-foreground text-deep" : "bg-deep-muted/50 text-deep",
            )}
            style={{ left: `${50 + Math.cos(a) * d}%`, top: `${50 - Math.sin(a) * d}%` }}
          >
            {w.initials}
          </Link>
        );
      })}
    </div>
  );
}

function NearbyFinder() {
  const search = Route.useSearch();
  const { locationId, setLocation, userGps, isLiveGpsWatching, requestBrowserGps } = useGaw();
  const [category, setCategory] = useState<Category | "all">(search.category ?? "all");
  const [query, setQuery] = useState(search.q ?? "");
  const [radius, setRadius] = useState<number>(5);
  const [availableOnly, setAvailableOnly] = useState(false);

  const results = useMemo(
    () =>
      filterWorkers(WORKERS, {
        barangayId: locationId,
        origin: userGps,
        category,
        query,
        radius,
        availableOnly,
      }),
    [locationId, userGps, category, query, radius, availableOnly],
  );
  const filtersActive = category !== "all" || query || availableOnly;
  const isLive = userGps.source === "gps" || isLiveGpsWatching;

  const clear = () => {
    setCategory("all");
    setQuery("");
    setAvailableOnly(false);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-3xl bg-contour p-5 text-deep-foreground shadow-lift">
          <Radar
            workers={results}
            origin={userGps}
            areaLabel={barangayName(locationId)}
            radius={radius}
          />
          <p className="mt-3 text-center text-sm font-semibold">
            {results.length} {results.length === 1 ? "worker" : "workers"} within {radius} km of{" "}
            {barangayName(locationId)}
          </p>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5 text-center text-xs text-deep-muted">
            <span
              className={cn(
                "size-2 rounded-full",
                isLive ? "animate-pulse bg-emerald-400" : "bg-gold",
              )}
              aria-hidden
            />
            <span>
              {isLive ? "Live GPS" : "Simulated GPS"} · {userGps.lat.toFixed(4)}°N,{" "}
              {userGps.lng.toFixed(4)}°E (±{userGps.accuracyMeters}m)
            </span>
            <button
              type="button"
              onClick={requestBrowserGps}
              className="cursor-pointer font-semibold text-gold underline-offset-2 hover:underline"
            >
              Pinpoint GPS
            </button>
          </div>
        </div>

        <div className="space-y-4 rounded-3xl border bg-card p-5 shadow-soft">
          <div className="space-y-1.5">
            <label
              htmlFor="finder-q"
              className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Search
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="finder-q"
                type="search"
                placeholder="Name or skill"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <LocationFilter id="finder-brgy" value={locationId} onChange={setLocation} />
            <div className="space-y-1.5">
              <label
                htmlFor="finder-cat"
                className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Service
              </label>
              <select
                id="finder-cat"
                className="field"
                value={category}
                onChange={(e) => setCategory(e.target.value as Category | "all")}
              >
                <option value="all">All services</option>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <fieldset>
            <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Search radius
            </legend>
            <div className="grid grid-cols-4 gap-1 rounded-xl bg-muted p-1">
              {RADIUS_OPTIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={radius === r}
                  onClick={() => setRadius(r)}
                  className={cn(
                    "h-10 cursor-pointer rounded-lg text-sm font-semibold transition-all",
                    radius === r
                      ? "bg-card text-primary shadow-soft"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {r} km
                </button>
              ))}
            </div>
          </fieldset>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="finder-avail" className="text-sm font-semibold">
              Available now only
            </label>
            <Switch id="finder-avail" checked={availableOnly} onCheckedChange={setAvailableOnly} />
          </div>
          {filtersActive && (
            <Button variant="ghost" size="sm" onClick={clear} className="w-full">
              Clear filters
            </Button>
          )}
        </div>
      </aside>

      <section aria-live="polite" aria-label="Results">
        {results.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {results.map((w) => (
              <WorkerCard key={w.id} worker={w} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<SearchX className="size-6" />}
            title="No workers match yet"
            body={`Nobody fits these filters within ${radius} km of ${barangayName(locationId)}. Try a wider radius or fewer filters.`}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {radius < 10 && <Button onClick={() => setRadius(10)}>Widen to 10 km</Button>}
                {filtersActive && (
                  <Button variant="outline" onClick={clear}>
                    Clear filters
                  </Button>
                )}
              </div>
            }
          />
        )}
      </section>
    </div>
  );
}
