import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  MapPin,
  Play,
  Wallet,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/gaw/AppLayout";
import { formatTime } from "@/components/gaw/BookingForm";
import { LiveJobSharingCard } from "@/components/gaw/GawMap";
import { filterTabPillClass, subtleLinkClass } from "@/components/gaw/interactions";
import { Avatar, EmptyState, StatusBadge } from "@/components/gaw/primitives";
import { Button } from "@/components/ui/button";
import { STATUS_LABEL, type BookingAction } from "@/lib/gaw/bookings";
import { barangayName, WORKERS } from "@/lib/gaw/data";
import { formatPeso, useGaw, type Booking, type BookingStatus } from "@/lib/gaw/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/bookings")({
  head: () => ({
    meta: [
      { title: "My Bookings — GAW" },
      { name: "description", content: "Track your booking requests with nearby workers." },
      { property: "og:title", content: "My Bookings — GAW" },
      { property: "og:description", content: "Track your booking requests with nearby workers." },
    ],
  }),
  component: () => (
    <AppLayout mode="hire" title="My Bookings">
      <BookingsList />
    </AppLayout>
  ),
});

const FILTERS: { key: BookingStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Accepted" },
  { key: "in_progress", label: "In Progress" },
  { key: "awaiting_confirmation", label: "Awaiting Confirmation" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "declined", label: "Declined" },
];

function resolveWorkerDisplay(b: Booking, workerSkill?: string) {
  const w = WORKERS.find((x) => x.id === b.workerId);
  if (w) {
    return {
      id: w.id,
      name: w.name,
      initials: w.initials,
      skill: w.skill,
      isLinkable: true,
    };
  }
  const fallback = WORKERS[0]!;
  return {
    id: fallback.id,
    name: workerSkill ? `Assigned Worker (${workerSkill})` : `${fallback.name} (Synced Worker)`,
    initials: "WK",
    skill: workerSkill ?? b.service,
    isLinkable: false,
  };
}

function BookingsList() {
  const { bookings, bookingAction, workerProfile } = useGaw();
  const [filter, setFilter] = useState<BookingStatus | "all">("all");

  const list = bookings.filter((b) => filter === "all" || b.status === filter);

  const act = (id: string, action: BookingAction, msg: string) => {
    bookingAction(id, action);
    toast.success(msg);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* Shared state note */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-card px-4 py-3 text-xs text-muted-foreground shadow-soft">
        <span>
          <strong>Shared Booking State:</strong> Status changes in Worker{" "}
          <Link to="/my-jobs" className={cn(subtleLinkClass, "inline text-[length:inherit]")}>
            My Jobs
          </Link>{" "}
          immediately update here.
        </span>
        <Button asChild size="sm" variant="soft">
          <Link to="/find">+ Request New Booking</Link>
        </Button>
      </div>

      {/* Filter pills */}
      <div
        className="-mx-4 flex gap-2 overflow-x-auto px-4 py-1.5"
        role="group"
        aria-label="Filter by status"
      >
        {FILTERS.map((f) => {
          const n =
            f.key === "all" ? bookings.length : bookings.filter((b) => b.status === f.key).length;
          return (
            <button
              key={f.key}
              type="button"
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={filterTabPillClass(
                filter === f.key,
                "h-10 shrink-0 rounded-full border px-4 text-sm font-semibold",
              )}
            >
              {f.label} <span className="opacity-70">({n})</span>
            </button>
          );
        })}
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={<CalendarCheck className="size-6" />}
          title={
            filter === "all"
              ? "No bookings yet"
              : `No ${STATUS_LABEL[filter]?.toLowerCase() ?? filter} bookings`
          }
          body="Find a nearby worker and send a booking request — it will show up here."
          action={
            <Button asChild>
              <Link to="/find">Open Nearby Finder</Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {list.map((b) => {
            const w = resolveWorkerDisplay(b, workerProfile?.skill);
            const rateDisplay = b.rateText ?? (b.budget ? formatPeso(b.budget) : "Quote requested");
            const locDisplay = b.location?.label ?? barangayName(b.barangayId);

            return (
              <li
                key={b.id}
                className="animate-fade-up rounded-2xl border bg-card p-4 shadow-soft md:p-5"
              >
                <div className="flex items-start gap-3">
                  <Avatar initials={w.initials} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        {w.isLinkable ? (
                          <Link
                            to="/workers/$id"
                            params={{ id: w.id }}
                            className={cn(
                              subtleLinkClass,
                              "inline text-base font-bold text-foreground hover:text-primary",
                            )}
                          >
                            {w.name}
                          </Link>
                        ) : (
                          <p className="font-bold">{w.name}</p>
                        )}
                        <p className="text-sm font-semibold text-primary">{b.service}</p>
                        <p className="text-xs text-muted-foreground">Employer: {b.client.name}</p>
                      </div>
                      <StatusBadge status={b.status} />
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {b.description}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="size-3.5" aria-hidden />
                        {new Date(b.date + "T00:00").toLocaleDateString("en-PH", {
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        · {formatTime(b.time)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3.5" aria-hidden /> {locDisplay}
                      </span>
                      <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                        <Wallet className="size-3.5" aria-hidden /> {rateDisplay}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Optional Live Location Sharing for Active In-Progress Booking */}
                {b.status === "in_progress" && (
                  <LiveJobSharingCard
                    bookingTitle={b.service}
                    barangayId={b.barangayId}
                    targetLocation={b.location}
                  />
                )}

                {/* Employer Confirmation Banner when Worker marks job finished */}
                {b.status === "awaiting_confirmation" && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-secondary/60 p-3.5">
                    <div className="text-xs">
                      <p className="font-bold text-foreground">
                        Worker marked this job as finished
                      </p>
                      <p className="text-muted-foreground">
                        Confirm completion to move this booking to Completed.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => act(b.id, "confirm", "Confirmed job completion!")}
                    >
                      <CheckCircle2 className="size-4" /> Confirm Completion
                    </Button>
                  </div>
                )}

                {/* Pending / Confirmed / In Progress Controls */}
                {b.status === "pending" && (
                  <div className="mt-4 rounded-xl bg-muted p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-muted-foreground">
                        Respond in{" "}
                        <Link
                          to="/my-jobs"
                          className={cn(subtleLinkClass, "inline text-[length:inherit] underline")}
                        >
                          Worker My Jobs
                        </Link>{" "}
                        or simulate worker response:
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => act(b.id, "cancel", "Booking cancelled")}
                      >
                        <XCircle className="size-3.5" /> Cancel Booking
                      </Button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => act(b.id, "accept", `${w.name} accepted the booking`)}
                      >
                        Worker Accepts
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => act(b.id, "decline", `${w.name} declined this booking`)}
                      >
                        Worker Declines
                      </Button>
                    </div>
                  </div>
                )}

                {b.status === "confirmed" && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                    <span className="text-xs text-muted-foreground">
                      Accepted & scheduled. Worker can start the job from My Jobs.
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => act(b.id, "cancel", "Booking cancelled")}
                      >
                        Cancel Booking
                      </Button>
                      <Button
                        size="sm"
                        variant="soft"
                        onClick={() => act(b.id, "start", "Worker started the job (In Progress)")}
                      >
                        <Play className="size-3.5" /> Simulate: Worker Starts Job
                      </Button>
                    </div>
                  </div>
                )}

                {b.status === "in_progress" && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                    <span className="text-xs text-muted-foreground">
                      Job is currently in progress.
                    </span>
                    <Button
                      size="sm"
                      variant="soft"
                      onClick={() =>
                        act(
                          b.id,
                          "finish",
                          "Worker marked job finished — now awaiting your confirmation",
                        )
                      }
                    >
                      Simulate: Worker Marks Completed
                    </Button>
                  </div>
                )}

                {(b.status === "completed" ||
                  b.status === "declined" ||
                  b.status === "cancelled") &&
                  w.isLinkable && (
                    <div className="mt-4 flex justify-end">
                      <Button asChild size="sm" variant="outline">
                        <Link to="/book/$workerId" params={{ workerId: w.id }}>
                          {b.status === "completed" ? "Book again" : "Try again"}
                        </Link>
                      </Button>
                    </div>
                  )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
