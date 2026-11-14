import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CalendarDays, CheckCircle2, MapPin, Play, UserCheck, Wallet, XCircle } from "lucide-react";
import { toast } from "sonner";
import { AppLayout, BackButton } from "@/components/gaw/AppLayout";
import { formatTime } from "@/components/gaw/BookingForm";
import { LiveJobSharingCard } from "@/components/gaw/GawMap";
import { Avatar, StatusBadge } from "@/components/gaw/primitives";
import { Button } from "@/components/ui/button";
import { barangayName } from "@/lib/gaw/data";
import { formatPeso, useGaw } from "@/lib/gaw/store";

export const Route = createFileRoute("/requests/$id")({
  head: () => ({
    meta: [
      { title: "Booking Request Details — GAW" },
      { name: "description", content: "Review and respond to an incoming booking request." },
    ],
  }),
  component: RequestDetailPage,
});

function RequestDetailPage() {
  const { id } = Route.useParams();
  return (
    <AppLayout
      mode="work"
      back={<BackButton to="/work" label="Back to Worker Home" />}
      title="Booking Request"
    >
      <RequestDetail id={id} />
    </AppLayout>
  );
}

function RequestDetail({ id }: { id: string }) {
  const { bookings, bookingAction } = useGaw();
  const navigate = useNavigate();
  const b = bookings.find((x) => x.id === id);

  if (!b) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border bg-card p-6 text-center shadow-soft">
        <p className="text-lg font-bold">This booking request could not be found.</p>
        <Button asChild className="mt-4">
          <Link to="/my-jobs">Open My Jobs</Link>
        </Button>
      </div>
    );
  }

  const rateDisplay = b.rateText ?? (b.budget ? formatPeso(b.budget) : "Quote requested");
  const locDisplay = b.location?.label ?? barangayName(b.barangayId);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <section className="animate-fade-up rounded-3xl border bg-card p-5 shadow-soft md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <Avatar initials={b.client.initials} size="lg" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-primary">
                Incoming Booking Request
              </p>
              <h2 className="text-2xl font-extrabold tracking-tight">{b.service}</h2>
              <p className="text-sm text-muted-foreground">
                Requested by <strong className="text-foreground">{b.client.name}</strong>
              </p>
            </div>
          </div>
          <StatusBadge status={b.status} />
        </div>

        <div className="mt-5 rounded-2xl bg-muted p-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Job Description
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-foreground">{b.description}</p>
        </div>

        <dl className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border p-3.5">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="size-3.5 text-primary" aria-hidden /> Location
            </dt>
            <dd className="mt-1 font-bold">{locDisplay}</dd>
          </div>
          <div className="rounded-2xl border p-3.5">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="size-3.5 text-primary" aria-hidden /> Date & Time
            </dt>
            <dd className="mt-1 font-bold">
              {b.date} · {formatTime(b.time)}
            </dd>
          </div>
          <div className="rounded-2xl border p-3.5">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Wallet className="size-3.5 text-primary" aria-hidden /> Budget / Rate
            </dt>
            <dd className="mt-1 font-bold text-primary">{rateDisplay}</dd>
          </div>
        </dl>

        {b.status === "in_progress" && (
          <LiveJobSharingCard
            bookingTitle={b.service}
            barangayId={b.barangayId}
            targetLocation={b.location}
          />
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <Button asChild variant="outline">
            <Link to="/my-jobs">Open My Jobs</Link>
          </Button>

          <div className="flex flex-wrap gap-2">
            {b.status === "pending" && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    bookingAction(b.id, "decline");
                    toast("Declined booking request");
                    navigate({ to: "/my-jobs", search: { tab: "cancelled" } });
                  }}
                >
                  <XCircle className="size-4" /> Decline Request
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    bookingAction(b.id, "accept");
                    toast.success("Accepted booking request! Moved to Upcoming.");
                    navigate({ to: "/my-jobs", search: { tab: "upcoming" } });
                  }}
                >
                  <CheckCircle2 className="size-4" /> Accept Request
                </Button>
              </>
            )}

            {b.status === "confirmed" && (
              <Button
                type="button"
                onClick={() => {
                  bookingAction(b.id, "start");
                  toast.success("Job started! Moved to In Progress.");
                }}
              >
                <Play className="size-4" /> Start Job
              </Button>
            )}

            {b.status === "in_progress" && (
              <Button
                type="button"
                onClick={() => {
                  bookingAction(b.id, "finish");
                  toast.success("Marked job as completed — awaiting employer confirmation.");
                }}
              >
                <CheckCircle2 className="size-4" /> Mark Job as Completed
              </Button>
            )}

            {b.status === "awaiting_confirmation" && (
              <Button
                type="button"
                variant="gold"
                onClick={() => {
                  bookingAction(b.id, "confirm");
                  toast.success("Employer confirmed completion!");
                }}
              >
                <UserCheck className="size-4" /> Confirm Completion (Employer Demo)
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
