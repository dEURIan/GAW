import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck, CalendarDays, MapPin, Wallet } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/gaw/AppLayout";
import { formatTime } from "@/components/gaw/BookingForm";
import { Avatar, EmptyState, StatusBadge } from "@/components/gaw/primitives";
import { Button } from "@/components/ui/button";
import { barangayName, WORKERS } from "@/lib/gaw/data";
import { formatPeso, useGaw, type BookingStatus } from "@/lib/gaw/store";
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

const FILTERS: (BookingStatus | "all")[] = ["all", "pending", "confirmed", "completed", "declined"];

function BookingsList() {
  const { bookings, setBookingStatus } = useGaw();
  const [filter, setFilter] = useState<BookingStatus | "all">("all");
  const list = bookings.filter((b) => filter === "all" || b.status === filter);

  const act = (id: string, s: BookingStatus, msg: string) => {
    setBookingStatus(id, s);
    toast.success(msg);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div
        className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1"
        role="group"
        aria-label="Filter by status"
      >
        {FILTERS.map((f) => {
          const n = f === "all" ? bookings.length : bookings.filter((b) => b.status === f).length;
          return (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={cn(
                "h-10 shrink-0 cursor-pointer rounded-full border px-4 text-sm font-semibold capitalize transition-colors",
                filter === f
                  ? "border-deep bg-deep text-deep-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {f} <span className="opacity-70">({n})</span>
            </button>
          );
        })}
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={<CalendarCheck className="size-6" />}
          title={filter === "all" ? "No bookings yet" : `No ${filter} bookings`}
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
            const w = WORKERS.find((x) => x.id === b.workerId);
            if (!w) return null;
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
                        <Link
                          to="/workers/$id"
                          params={{ id: w.id }}
                          className="font-bold hover:underline"
                        >
                          {w.name}
                        </Link>
                        <p className="text-sm text-primary">{b.service}</p>
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
                        <MapPin className="size-3.5" aria-hidden /> {barangayName(b.barangayId)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Wallet className="size-3.5" aria-hidden />{" "}
                        {b.budget ? formatPeso(b.budget) : "Quote requested"}
                      </span>
                    </div>
                  </div>
                </div>

                {b.status === "pending" && (
                  <div className="mt-4 rounded-xl bg-muted p-3">
                    <p className="text-xs font-semibold text-muted-foreground">
                      Demo simulation — pretend {w.name.split(" ")[0]} responded:
                    </p>
                    <div className="mt-2 flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => act(b.id, "confirmed", `${w.name} confirmed your booking`)}
                      >
                        Worker accepts
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => act(b.id, "declined", `${w.name} declined this booking`)}
                      >
                        Worker declines
                      </Button>
                    </div>
                  </div>
                )}
                {b.status === "confirmed" && (
                  <div className="mt-4 flex justify-end">
                    <Button
                      size="sm"
                      variant="soft"
                      onClick={() => act(b.id, "completed", "Marked as completed")}
                    >
                      Mark as completed
                    </Button>
                  </div>
                )}
                {(b.status === "completed" || b.status === "declined") && (
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
