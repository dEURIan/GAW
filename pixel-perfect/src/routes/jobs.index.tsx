import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { List, Map as MapIcon, MapPinned, Search, SearchX } from "lucide-react";
import { AppLayout } from "@/components/gaw/AppLayout";
import { JobCard } from "@/components/gaw/cards";
import { LiveGpsTracker } from "@/components/gaw/LiveGpsTracker";
import { EmptyState, LocationFilter } from "@/components/gaw/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORIES, formatDistanceBadge, type Category, type Job } from "@/lib/gaw/data";
import { filterAndSortJobs, type JobSort } from "@/lib/gaw/filter";
import { useGaw } from "@/lib/gaw/store";
import { cn } from "@/lib/utils";

type ViewMode = "split" | "map" | "list";

export const Route = createFileRoute("/jobs/")({
  head: () => ({
    meta: [
      { title: "Find Jobs + Live GPS — GAW" },
      {
        name: "description",
        content:
          "Live Foodpanda/Grab-style GPS tracker to pinpoint your Davao City location and see exact job distances.",
      },
      { property: "og:title", content: "Find Jobs + Live GPS — GAW" },
      {
        property: "og:description",
        content:
          "Browse nearby plumbing, electrical, cleaning and other gigs sorted by live GPS proximity in Davao City.",
      },
    ],
  }),
  component: () => (
    <AppLayout mode="work" title="Find Jobs Near You">
      <JobsList />
    </AppLayout>
  ),
});

function JobsList() {
  const { allJobs, applications, workerProfile, userGps } = useGaw();
  const [category, setCategory] = useState<Category | "all">("all");
  const [area, setArea] = useState("all");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<JobSort>("nearest");
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [selectedJobId, setSelectedJobId] = useState<string | undefined>(undefined);

  const applied = new Set(applications.map((a) => a.jobId));
  const list = useMemo(
    () =>
      filterAndSortJobs(allJobs, {
        category,
        barangayId: area,
        query,
        sortBy,
        userGps,
      }),
    [allJobs, category, area, query, sortBy, userGps],
  );

  const activeJobId = list.some((j) => j.id === selectedJobId) ? selectedJobId : list[0]?.id;

  const handleSelectJob = (job: Job) => {
    setSelectedJobId(job.id);
    if (viewMode === "list") {
      setViewMode("split");
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {!workerProfile && (
        <div className="flex flex-col gap-3 rounded-2xl bg-gold-soft p-4 text-gold-foreground sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold">Set up your worker profile to apply for jobs.</p>
          <Button asChild size="sm" variant="gold">
            <Link to="/work">Set up profile</Link>
          </Button>
        </div>
      )}

      {/* Mobile & Desktop View Mode Switcher + Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Job view mode"
          className="inline-flex rounded-2xl border bg-card p-1 shadow-soft"
        >
          {(
            [
              ["split", "Split View", MapPinned],
              ["map", "Live Map", MapIcon],
              ["list", "Job List", List],
            ] as const
          ).map(([mode, label, Icon]) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              aria-pressed={viewMode === mode}
              className={cn(
                "inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-colors",
                viewMode === mode
                  ? "bg-deep text-deep-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              {label}
            </button>
          ))}
        </div>

        <p className="text-xs font-semibold text-muted-foreground" aria-live="polite">
          {list.length} open gig{list.length === 1 ? "" : "s"}
          {list[0] ? ` · Closest is ${formatDistanceBadge(list[0].distanceKm)}` : ""}
        </p>
      </div>

      {/* Foodpanda / Grab-style Live GPS Map Tracker */}
      {viewMode !== "list" && (
        <LiveGpsTracker jobs={list} selectedJobId={activeJobId} onSelectJob={handleSelectJob} />
      )}

      {/* Search & Filters */}
      <div className="space-y-3 rounded-3xl border bg-card p-4 shadow-soft">
        <div className="relative">
          <label htmlFor="jobs-q" className="sr-only">
            Search jobs
          </label>
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="jobs-q"
            type="search"
            placeholder="Search jobs, skills, or Davao landmarks..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label
              htmlFor="jobs-cat"
              className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Category
            </label>
            <select
              id="jobs-cat"
              className="field"
              value={category}
              onChange={(e) => setCategory(e.target.value as Category | "all")}
            >
              <option value="all">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <LocationFilter
            id="jobs-area"
            label="Area Filter"
            value={area}
            onChange={setArea}
            includeAll
          />
          <div className="space-y-1.5">
            <label
              htmlFor="jobs-sort"
              className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Sort By
            </label>
            <select
              id="jobs-sort"
              className="field"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as JobSort)}
            >
              <option value="nearest">Nearest to my GPS pin</option>
              <option value="pay">Highest Pay (₱)</option>
              <option value="urgent">Urgent First</option>
            </select>
          </div>
        </div>
        {workerProfile && category !== workerProfile.skill && (
          <button
            type="button"
            onClick={() => setCategory(workerProfile.skill)}
            className="cursor-pointer text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            Show only {workerProfile.skill} jobs
          </button>
        )}
      </div>

      {/* Job Feed List */}
      {viewMode !== "map" && (
        <>
          {list.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {list.map((j) => (
                <JobCard
                  key={j.id}
                  job={j}
                  applied={applied.has(j.id)}
                  distanceKm={j.distanceKm}
                  selectedOnMap={activeJobId === j.id}
                  onFocusMap={handleSelectJob}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<SearchX className="size-6" />}
              title="No jobs match"
              body="Try another category, barangay, or move your GPS pin on the map."
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    setCategory("all");
                    setArea("all");
                    setQuery("");
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          )}
        </>
      )}
    </div>
  );
}
