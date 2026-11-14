import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Crown, MapPin, Navigation, Search, SearchX, SlidersHorizontal } from "lucide-react";
import { AppLayout } from "@/components/gaw/AppLayout";
import { WorkerCard } from "@/components/gaw/cards";
import { InteractiveMap, LocationPicker } from "@/components/gaw/GawMap";
import { interactiveNavCardClass, segmentedOptionClass } from "@/components/gaw/interactions";
import { ServicePicker } from "@/components/gaw/ServicePicker";
import { EmptyState, Field } from "@/components/gaw/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { RADIUS_OPTIONS, WORKERS, type Radius } from "@/lib/gaw/data";
import { filterWorkers } from "@/lib/gaw/filter";
import { hasPlan, hiringOrigin, hiringOriginLabel, useGaw } from "@/lib/gaw/store";

export const Route = createFileRoute("/find")({
  validateSearch: (s: Record<string, unknown>): { category?: string; q?: string } => ({
    ...(typeof s["category"] === "string" ? { category: s["category"] } : {}),
    ...(typeof s["q"] === "string" ? { q: s["q"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Nearby Finder — GAW" },
      {
        name: "description",
        content:
          "Filter local skilled workers in Davao City by live GPS location, radius, service category, and availability.",
      },
      { property: "og:title", content: "Nearby Finder — GAW" },
      {
        property: "og:description",
        content:
          "Filter local skilled workers in Davao City by live GPS location, radius, service category, and availability.",
      },
    ],
  }),
  component: () => (
    <AppLayout mode="hire" title="Nearby Finder">
      <FindWorkers />
    </AppLayout>
  ),
});

function FindWorkers() {
  const initialSearch = Route.useSearch();
  const {
    locationId,
    serviceLocation,
    setServiceLocation,
    userGps,
    requestBrowserGps,
    isLiveGpsWatching,
    plans,
  } = useGaw();

  const [category, setCategory] = useState<string>(initialSearch.category ?? "all");
  const [query, setQuery] = useState(initialSearch.q ?? "");
  const [radius, setRadius] = useState<Radius>(5);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [topRatedOnly, setTopRatedOnly] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);

  const isEmployerPro = hasPlan(plans, "employer");
  const origin = hiringOrigin({ serviceLocation, locationId });
  const originLabel = hiringOriginLabel({ serviceLocation, locationId });

  const results = filterWorkers(WORKERS, {
    origin,
    category,
    query,
    radius,
    availableOnly,
    topRatedOnly: isEmployerPro && topRatedOnly,
  });

  const filtersActive =
    category !== "all" || query.trim() !== "" || radius !== 5 || availableOnly || topRatedOnly;

  const clear = () => {
    setCategory("all");
    setQuery("");
    setRadius(5);
    setAvailableOnly(false);
    setTopRatedOnly(false);
  };

  return (
    <div className="space-y-6">
      {/* Live Location & Interactive Map Panel */}
      <section className="card-surface space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-primary">
              Search Origin ·{" "}
              {userGps.source === "gps" || isLiveGpsWatching
                ? "Live GPS synced"
                : "General Area Pin"}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold">
              <MapPin className="size-4 shrink-0 text-primary" aria-hidden />
              <span className="truncate">{originLabel}</span>
              <span className="shrink-0 text-xs font-normal text-muted-foreground">
                ({origin.lat.toFixed(4)}°N, {origin.lng.toFixed(4)}°E)
              </span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Through our live GPS tracking system, we connect workers and employers in the same
              general area.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={userGps.source === "gps" ? "default" : "outline"}
              onClick={requestBrowserGps}
            >
              <Navigation className="size-3.5" aria-hidden />
              Use Live GPS
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowLocationPicker((v) => !v)}
            >
              <SlidersHorizontal className="size-3.5" aria-hidden />
              {showLocationPicker ? "Hide Pin Picker" : "Adjust Map Pin"}
            </Button>
          </div>
        </div>

        {showLocationPicker && (
          <LocationPicker
            initialLocation={origin}
            initialBarangayId={locationId}
            initialLabel={serviceLocation?.label}
            confirmLabel="Apply Search Location"
            onConfirm={(placed) => {
              setServiceLocation(placed);
              setShowLocationPicker(false);
            }}
          />
        )}

        <InteractiveMap
          center={origin}
          pin={origin}
          pinLabel={originLabel}
          radiusKm={radius}
          workers={results}
          selectedWorkerId={selectedWorkerId}
          onSelectWorker={(w) => setSelectedWorkerId(w.id)}
          className="h-64 sm:h-72"
        />
      </section>

      {/* Filters + Results Grid */}
      <div className="grid gap-6 lg:grid-cols-[290px_1fr]">
        <aside aria-label="Worker filters">
          <div className="card-surface space-y-5 p-4 sm:p-5 lg:sticky lg:top-24">
            <Field id="find-query" label="Search">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  id="find-query"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Name, skill, or general area…"
                  className="pl-9"
                />
              </div>
            </Field>

            <ServicePicker
              id="find-service"
              label="Service Category"
              value={category}
              onChange={(service) => setCategory(service)}
              includeAll
              allLabel="All services"
            />

            <fieldset className="space-y-2">
              <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Within Radius
              </legend>
              <div className="grid grid-cols-4 gap-1.5 rounded-xl bg-muted p-1">
                {RADIUS_OPTIONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={radius === r}
                    onClick={() => setRadius(r)}
                    className={segmentedOptionClass(
                      radius === r,
                      "card",
                      "rounded-lg py-1.5 text-xs font-bold",
                    )}
                  >
                    {r} km
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border bg-muted/40 px-3 py-2.5 text-sm">
              <span className="font-semibold">Available now only</span>
              <Switch
                checked={availableOnly}
                onCheckedChange={setAvailableOnly}
                aria-label="Available now only"
              />
            </label>

            {isEmployerPro ? (
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-gold/40 bg-gold-soft px-3 py-2.5 text-sm text-gold-foreground">
                <span className="inline-flex items-center gap-1.5 font-semibold">
                  <Crown className="size-4" aria-hidden /> Top Rated (4.8+★)
                </span>
                <Switch
                  checked={topRatedOnly}
                  onCheckedChange={setTopRatedOnly}
                  aria-label="Top rated workers only"
                />
              </label>
            ) : (
              <Link
                to="/pro"
                className={`flex items-center justify-between gap-2 rounded-xl border border-dashed border-gold/50 px-3 py-2.5 text-xs font-semibold text-muted-foreground ${interactiveNavCardClass}`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Crown className="size-3.5 text-gold" aria-hidden /> Top-Rated Filter
                </span>
                <span className="rounded-full bg-gold-soft px-2 py-0.5 text-[10px] font-bold text-gold-foreground">
                  Employer Pro
                </span>
              </Link>
            )}

            {filtersActive && (
              <Button variant="ghost" size="sm" onClick={clear} className="w-full">
                Clear filters
              </Button>
            )}
          </div>
        </aside>

        <section aria-live="polite" aria-label="Results" className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-muted-foreground">
              {results.length} {results.length === 1 ? "worker" : "workers"} within {radius} km of{" "}
              <span className="text-foreground">{originLabel}</span>
            </p>
          </div>

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
              body={`Nobody fits these filters within ${radius} km of your general area. Try a wider radius or fewer filters.`}
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
    </div>
  );
}
