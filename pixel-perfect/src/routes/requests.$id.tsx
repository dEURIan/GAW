import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Check, MapPin, Wallet, X } from "lucide-react";
import { toast } from "sonner";
import { AppLayout, BackButton } from "@/components/gaw/AppLayout";
import { Avatar, StatusBadge } from "@/components/gaw/primitives";
import { Button } from "@/components/ui/button";
import { barangayName } from "@/lib/gaw/data";
import { useGaw } from "@/lib/gaw/store";

function RequestDetailRouteComponent() {
  const { id } = Route.useParams();
  return (
    <AppLayout
      mode="work"
      back={<BackButton to="/my-jobs" label="Back to my jobs" />}
      title="Client Request"
    >
      <RequestDetail id={id} />
    </AppLayout>
  );
}

export const Route = createFileRoute("/requests/$id")({
  head: () => ({
    meta: [{ title: "Request Details — GAW" }],
  }),
  component: RequestDetailRouteComponent,
});

function RequestDetail({ id }: { id: string }) {
  const { requests, setRequestStatus } = useGaw();
  const req = requests.find((r) => r.id === id);

  if (!req) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border bg-card p-8 text-center shadow-soft">
        <p className="text-lg font-bold">Request not found</p>
        <Button asChild className="mt-4">
          <Link to="/work">Back to Worker Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl rounded-3xl border bg-card p-6 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar initials={req.initials} size="lg" />
          <div>
            <h2 className="text-xl font-extrabold">{req.service}</h2>
            <p className="text-sm text-muted-foreground">From {req.persona}</p>
          </div>
        </div>
        <StatusBadge status={req.status} />
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-muted p-3">
          <dt className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3.5" aria-hidden /> Barangay
          </dt>
          <dd className="mt-0.5 font-bold">{barangayName(req.barangayId)}</dd>
        </div>
        <div className="rounded-2xl bg-muted p-3">
          <dt className="flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5" aria-hidden /> Schedule
          </dt>
          <dd className="mt-0.5 font-bold">
            {req.date}, {req.time}
          </dd>
        </div>
        <div className="rounded-2xl bg-muted p-3">
          <dt className="flex items-center gap-1 text-xs text-muted-foreground">
            <Wallet className="size-3.5" aria-hidden /> Client Budget
          </dt>
          <dd className="mt-0.5 font-bold">{req.budget}</dd>
        </div>
      </dl>

      <h3 className="mt-5 font-bold">Description</h3>
      <p className="mt-1.5 text-muted-foreground">{req.description}</p>

      {req.status === "pending" ? (
        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            type="button"
            size="lg"
            className="flex-1 gap-1.5"
            onClick={() => {
              setRequestStatus(req.id, "confirmed");
              toast.success(`Booking with ${req.persona} confirmed!`);
            }}
          >
            <Check className="size-4" aria-hidden /> Accept Request
          </Button>
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="flex-1 gap-1.5"
            onClick={() => {
              setRequestStatus(req.id, "declined");
              toast("Request declined");
            }}
          >
            <X className="size-4" aria-hidden /> Decline
          </Button>
        </div>
      ) : (
        <div className="mt-6 flex justify-end">
          <Button asChild variant="outline">
            <Link to="/my-jobs">Back to My Jobs</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
