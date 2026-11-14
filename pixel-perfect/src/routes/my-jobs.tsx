import { createFileRoute, Link } from "@tanstack/react-router";
import { Bookmark, ClipboardList, Inbox, MapPin, Navigation } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/gaw/AppLayout";
import { JobCard } from "@/components/gaw/cards";
import { Avatar, EmptyState, SectionHeader, StatusBadge } from "@/components/gaw/primitives";
import { Button } from "@/components/ui/button";
import { barangayName, calculateJobDistanceKm } from "@/lib/gaw/data";
import { useGaw } from "@/lib/gaw/store";

export const Route = createFileRoute("/my-jobs")({
  head: () => ({
    meta: [
      { title: "My Jobs & Desired Gigs — GAW" },
      {
        name: "description",
        content: "Manage your saved desired gigs, submitted applications, and direct bookings.",
      },
    ],
  }),
  component: () => (
    <AppLayout mode="work" title="My Jobs & Desired Gigs">
      <MyJobsBody />
    </AppLayout>
  ),
});

function MyJobsBody() {
  const { allJobs, userGps, savedJobIds, applications, requests, setRequestStatus } = useGaw();

  const appliedSet = new Set(applications.map((a) => a.jobId));

  const savedJobs = savedJobIds
    .map((id) => allJobs.find((j) => j.id === id))
    .filter((j): j is NonNullable<typeof j> => Boolean(j))
    .map((job) => ({
      ...job,
      distanceKm: calculateJobDistanceKm(userGps.lat, userGps.lng, job.lat, job.lng),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);

  const appliedJobs = applications
    .map((a) => ({
      app: a,
      job: allJobs.find((j) => j.id === a.jobId),
    }))
    .filter(
      (item): item is { app: (typeof applications)[number]; job: NonNullable<typeof item.job> } =>
        Boolean(item.job),
    );

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Desired Gigs Queue (Proximity Sorted) */}
      <section>
        <SectionHeader
          title="Desired Gigs Queue"
          action={
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">
              <Bookmark className="size-3.5 text-primary" aria-hidden />
              {savedJobs.length} saved
            </span>
          }
        />
        <p className="-mt-2 mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Navigation className="size-3.5 text-primary" aria-hidden />
          Sorted by distance from your active GPS pin ({userGps.label})
        </p>

        {savedJobs.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {savedJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                applied={appliedSet.has(job.id)}
                distanceKm={job.distanceKm}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Bookmark className="size-6" />}
            title="No saved gigs yet"
            body="Tap the bookmark icon on any Davao job to build your desired gigs queue."
            action={
              <Button asChild>
                <Link to="/jobs">Find Nearby Jobs</Link>
              </Button>
            }
          />
        )}
      </section>

      {/* Submitted Applications */}
      <section>
        <SectionHeader title={`Submitted Applications (${appliedJobs.length})`} />
        {appliedJobs.length ? (
          <ul className="space-y-3">
            {appliedJobs.map(({ app, job }) => (
              <li key={app.id} className="rounded-2xl border bg-card p-4 shadow-soft">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <Link
                      to="/jobs/$id"
                      params={{ id: job.id }}
                      className="font-bold hover:underline"
                    >
                      {job.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {job.poster} · {barangayName(job.barangayId)} · Your offer: {app.rate}
                    </p>
                  </div>
                  <span className="rounded-full bg-status-pending-bg px-2.5 py-0.5 text-xs font-bold text-status-pending">
                    Pending Review
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{app.message}</p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<ClipboardList className="size-6" />}
            title="No applications sent"
            body="Apply to jobs in your barangay from the live GPS jobs feed."
            action={
              <Button asChild variant="outline">
                <Link to="/jobs">Browse Open Jobs</Link>
              </Button>
            }
          />
        )}
      </section>

      {/* Direct Resident Requests */}
      <section>
        <SectionHeader title="Direct Client Requests" />
        {requests.length ? (
          <ul className="space-y-3">
            {requests.map((r) => (
              <li
                key={r.id}
                className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <Avatar initials={r.initials} size="sm" />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to="/requests/$id"
                        params={{ id: r.id }}
                        className="font-bold hover:underline"
                      >
                        {r.service}
                      </Link>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3" aria-hidden /> {barangayName(r.barangayId)}
                      </span>{" "}
                      · {r.persona} · {r.date}, {r.time} · {r.budget}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  {r.status === "pending" ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setRequestStatus(r.id, "confirmed");
                          toast.success(`Accepted request from ${r.persona}`);
                        }}
                      >
                        Accept
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setRequestStatus(r.id, "declined");
                          toast("Request declined");
                        }}
                      >
                        Decline
                      </Button>
                    </>
                  ) : (
                    <Button asChild size="sm" variant="soft">
                      <Link to="/requests/$id" params={{ id: r.id }}>
                        Details
                      </Link>
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<Inbox className="size-6" />}
            title="No direct requests yet"
            body="Keep your availability active in Working mode to receive direct invitations."
          />
        )}
      </section>
    </div>
  );
}
