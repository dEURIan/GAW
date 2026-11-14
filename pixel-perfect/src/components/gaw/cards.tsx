import { Link } from "@tanstack/react-router";
import {
  Bookmark,
  Clock,
  Footprints,
  MapPin,
  Navigation,
  ShieldCheck,
  Star,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  barangayName,
  calculateJobDistanceKm,
  estimateTravelMinutes,
  formatDistanceBadge,
  type Job,
  type Worker,
} from "@/lib/gaw/data";
import { formatPeso, useGaw } from "@/lib/gaw/store";
import { cn } from "@/lib/utils";
import { iconFor } from "./categoryIcons";
import { interactiveEntityCardClass } from "./interactions";
import { AvailabilityBadge, Avatar, PriceDisplay, SkillChip } from "./primitives";

export function WorkerCard({ worker }: { worker: Worker & { distance?: number } }) {
  const Icon = iconFor(worker.skill);
  const topSkills = worker.skills.slice(0, 2);

  return (
    <article className={cn(interactiveEntityCardClass, "flex flex-col gap-3 p-4")}>
      <div className="flex items-start gap-3">
        <Avatar initials={worker.initials} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <Link
              to="/workers/$id"
              params={{ id: worker.id }}
              className="truncate text-base font-bold transition-colors duration-150 hover:text-primary group-hover:text-primary"
            >
              {worker.name}
            </Link>
            <AvailabilityBadge available={worker.available} />
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <SkillChip>
              <Icon className="size-3" aria-hidden />
              {worker.skill}
            </SkillChip>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground">
              <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden />
              {worker.rating.toFixed(1)}
              <span className="font-normal text-muted-foreground">({worker.jobsDone} jobs)</span>
            </span>
          </div>
        </div>
      </div>

      <p className="line-clamp-2 text-sm text-muted-foreground">{worker.bio}</p>

      {topSkills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {topSkills.map((sk) => (
            <span
              key={sk}
              className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            >
              {sk}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3">
        <div className="min-w-0">
          <PriceDisplay formattedRate={worker.rate !== null ? formatPeso(worker.rate) : null} />
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3 shrink-0 text-primary" aria-hidden />
            <span className="truncate">
              {barangayName(worker.barangayId)}
              {typeof worker.distance === "number" ? ` · ≈ ${worker.distance} km away` : ""}
            </span>
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Button asChild variant="outline" size="sm">
            <Link to="/workers/$id" params={{ id: worker.id }}>
              Profile
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/book/$workerId" params={{ workerId: worker.id }}>
              Book
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

export function JobCard({
  job,
  applied,
  distanceKm,
  selected,
  selectedOnMap,
  onFocusGps,
  onFocusMap,
}: {
  job: Job;
  applied?: boolean;
  distanceKm?: number;
  selected?: boolean;
  selectedOnMap?: boolean;
  onFocusGps?: (job: Job) => void;
  onFocusMap?: (job: Job) => void;
}) {
  const { userGps, savedJobIds, toggleSaveJob, applications } = useGaw();
  const Icon = iconFor(job.category);
  const km = distanceKm ?? calculateJobDistanceKm(userGps.lat, userGps.lng, job.lat, job.lng);
  const eta = estimateTravelMinutes(km);
  const saved = savedJobIds.includes(job.id);
  const app = applications.find((a) => a.jobId === job.id && a.status !== "withdrawn");
  const isApplied = applied ?? Boolean(app);
  const isSelected = Boolean(selected || selectedOnMap);
  const focusHandler = onFocusGps ?? onFocusMap;

  const handleSave = () => {
    const res = toggleSaveJob(job.id);
    if (res.ok) {
      toast.success(
        res.saved
          ? `Saved "${job.title}" to your Desired Gigs queue.`
          : "Removed from Desired Gigs.",
      );
    }
  };

  return (
    <article
      className={cn(
        interactiveEntityCardClass,
        "flex flex-col gap-3 p-4",
        isSelected && "border-primary ring-2 ring-primary/20",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
            <Icon className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-primary">{job.category}</span>
              {job.urgent && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-gold-soft px-2 py-0.5 text-[11px] font-bold text-gold-foreground">
                  <Zap className="size-3" aria-hidden /> Urgent
                </span>
              )}
              {isApplied && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  {app?.status === "hired" ? "Hired" : "Applied"}
                </span>
              )}
            </div>
            <Link
              to="/jobs/$id"
              params={{ id: job.id }}
              className="mt-0.5 block truncate text-base font-bold transition-colors duration-150 hover:text-primary group-hover:text-primary"
            >
              {job.title}
            </Link>
          </div>
        </div>

        <Button
          type="button"
          variant={saved ? "gold" : "outline"}
          size="icon"
          aria-label={saved ? "Remove from Desired Gigs" : "Save to Desired Gigs"}
          onClick={handleSave}
          className="size-8 shrink-0 rounded-lg"
        >
          <Bookmark className={cn("size-4", saved && "fill-current")} aria-hidden />
        </Button>
      </div>

      <p className="line-clamp-2 text-sm text-muted-foreground">{job.description}</p>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1 font-semibold text-primary">
          <MapPin className="size-3.5" aria-hidden />
          {formatDistanceBadge(km)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Footprints className="size-3.5" aria-hidden /> ~{eta.walkMin} min walk
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3.5" aria-hidden /> {job.schedule}
        </span>
        <span className="truncate">
          {barangayName(job.barangayId)} · {job.landmark}
        </span>
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t pt-3">
        <div>
          <p className="text-base font-extrabold text-deep dark:text-foreground">
            {job.budget}{" "}
            <span className="text-xs font-medium text-muted-foreground">
              (~{job.estimatedHours}h)
            </span>
          </p>
          <p className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
            <ShieldCheck className="size-3.5" aria-hidden />
            Floor ₱{job.minimumRequiredPhp.toFixed(0)} · Above ₱63.50/hr
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {focusHandler && (
            <Button type="button" variant="outline" size="sm" onClick={() => focusHandler(job)}>
              <Navigation className="size-3.5" aria-hidden /> Track GPS
            </Button>
          )}
          <Button asChild size="sm">
            <Link to="/jobs/$id" params={{ id: job.id }}>
              View & Apply
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
