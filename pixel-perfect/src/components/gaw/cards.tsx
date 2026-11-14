import { Link } from "@tanstack/react-router";
import {
  Bookmark,
  Briefcase,
  Clock,
  MapPin,
  Navigation,
  ShieldCheck,
  Star,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, Availability } from "./primitives";
import { Button } from "@/components/ui/button";
import {
  barangayName,
  calculateJobDistanceKm,
  estimateTravelMinutes,
  formatDistanceBadge,
  type Job,
} from "@/lib/gaw/data";
import type { WorkerWithDistance } from "@/lib/gaw/filter";
import { formatPeso, useGaw } from "@/lib/gaw/store";
import { cn } from "@/lib/utils";

export function WorkerCard({ worker }: { worker: WorkerWithDistance }) {
  return (
    <article className="group animate-fade-up rounded-2xl border bg-card p-4 shadow-soft transition-shadow hover:shadow-lift">
      <div className="flex gap-3.5">
        <Avatar initials={worker.initials} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-bold">{worker.name}</h3>
              <p className="text-sm font-medium text-primary">{worker.skill}</p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold">
              <Star className="size-3.5 fill-gold text-gold" aria-hidden />
              {worker.rating.toFixed(1)}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden />
              {barangayName(worker.barangayId)}
            </span>
            <span title="Live GPS distance from your current location pin">
              {worker.distance.toFixed(1)} km away · Live GPS
            </span>
          </div>
          <div className="mt-2">
            <Availability available={worker.available} />
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 border-t pt-3">
        <p className="text-sm">
          {worker.rate ? (
            <>
              <span className="text-base font-bold">{formatPeso(worker.rate)}</span>
              <span className="text-muted-foreground"> / hour</span>
            </>
          ) : (
            <span className="font-semibold text-muted-foreground">Request Quote</span>
          )}
        </p>
        <Button asChild size="sm" variant="soft">
          <Link
            to="/workers/$id"
            params={{ id: worker.id }}
            aria-label={`View profile of ${worker.name}`}
          >
            View Profile
          </Link>
        </Button>
      </div>
    </article>
  );
}

export function JobCard({
  job,
  applied,
  distanceKm: explicitDistanceKm,
  selectedOnMap,
  onFocusMap,
}: {
  job: Job;
  applied?: boolean | undefined;
  distanceKm?: number | undefined;
  selectedOnMap?: boolean | undefined;
  onFocusMap?: ((job: Job) => void) | undefined;
}) {
  const { userGps, savedJobIds, toggleSaveJob } = useGaw();
  const distanceKm =
    explicitDistanceKm ?? calculateJobDistanceKm(userGps.lat, userGps.lng, job.lat, job.lng);
  const { walkMin } = estimateTravelMinutes(distanceKm);
  const isSaved = savedJobIds.includes(job.id);

  const onSave = () => {
    const res = toggleSaveJob(job.id);
    if (!res.ok) {
      toast.error(res.reason ?? "Could not save job");
      return;
    }
    toast.success(res.saved ? "Saved to Desired Gigs" : "Removed from Desired Gigs");
  };

  return (
    <article
      className={cn(
        "animate-fade-up rounded-2xl border bg-card p-4 shadow-soft transition-shadow hover:shadow-lift",
        selectedOnMap && "border-primary ring-2 ring-primary/25",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
              {job.category}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800">
              <Navigation className="size-3" aria-hidden />
              {formatDistanceBadge(distanceKm)} · ~{walkMin}m walk
            </span>
            {job.urgent && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gold-soft px-2 py-0.5 text-xs font-semibold text-gold-foreground">
                <Zap className="size-3" aria-hidden /> Urgent
              </span>
            )}
          </div>
          <h3 className="font-bold leading-snug">{job.title}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {job.poster} · {job.landmark}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-base font-extrabold text-deep">{job.budget}</p>
          <p className="text-[11px] font-medium text-muted-foreground">
            ~{job.estimatedHours}h gig
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <MapPin className="size-3.5" aria-hidden /> {barangayName(job.barangayId)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3.5" aria-hidden /> {job.schedule}
        </span>
        <span className="inline-flex items-center gap-1 text-emerald-700">
          <ShieldCheck className="size-3.5" aria-hidden /> Min floor ₱
          {job.minimumRequiredPhp.toFixed(0)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Briefcase className="size-3.5" aria-hidden /> Posted {job.posted}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
        {applied ? (
          <span className="text-sm font-semibold text-primary">✓ Application submitted</span>
        ) : (
          <span className="text-sm text-muted-foreground">
            AI est. {formatPeso(job.aiRecommendedPhp)}
          </span>
        )}
        <div className="flex items-center gap-2">
          {onFocusMap && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onFocusMap(job)}
              aria-label={`Locate ${job.title} on live GPS map`}
            >
              Track GPS
            </Button>
          )}
          <Button
            type="button"
            size="icon"
            variant={isSaved ? "gold" : "outline"}
            onClick={onSave}
            aria-label={
              isSaved
                ? `Remove ${job.title} from Desired Gigs`
                : `Save ${job.title} to Desired Gigs`
            }
            className="size-9 rounded-xl"
          >
            <Bookmark className={cn("size-4", isSaved && "fill-current")} aria-hidden />
          </Button>
          <Button asChild size="sm" variant={applied ? "outline" : "default"}>
            <Link to="/jobs/$id" params={{ id: job.id }} aria-label={`View job: ${job.title}`}>
              View Job
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
