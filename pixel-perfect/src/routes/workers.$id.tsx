import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Briefcase, Clock, MapPin, Pencil, Star } from "lucide-react";
import { AppLayout, BackButton } from "@/components/gaw/AppLayout";
import { iconFor } from "@/components/gaw/categoryIcons";
import { Avatar, Availability, SectionHeader } from "@/components/gaw/primitives";
import { Button } from "@/components/ui/button";
import { BARANGAYS, barangayName, WORKERS, type Worker } from "@/lib/gaw/data";
import { distanceKm, roundKm } from "@/lib/gaw/filter";
import { formatPeso, hiringOrigin, useGaw } from "@/lib/gaw/store";

export const Route = createFileRoute("/workers/$id")({
  loader: ({ params }) => {
    if (params.id === "w-me") {
      return { worker: null, isSelf: true };
    }
    const worker = WORKERS.find((w) => w.id === params.id);
    if (!worker) throw notFound();
    return { worker, isSelf: false };
  },
  head: ({ loaderData }) => ({
    meta: loaderData?.worker
      ? [
          { title: `${loaderData.worker.name}, ${loaderData.worker.skill} — GAW` },
          { name: "description", content: loaderData.worker.bio },
          {
            property: "og:title",
            content: `${loaderData.worker.name}, ${loaderData.worker.skill} — GAW`,
          },
          { property: "og:description", content: loaderData.worker.bio },
        ]
      : [{ title: "Worker Profile — GAW" }],
  }),
  notFoundComponent: () => (
    <div className="grid min-h-screen place-items-center p-6 text-center">
      <div>
        <p className="text-xl font-bold">This worker profile isn't available.</p>
        <Button asChild className="mt-4">
          <Link to="/find">Back to Nearby Finder</Link>
        </Button>
      </div>
    </div>
  ),
  component: ProfilePage,
});

function ProfilePage() {
  const { worker, isSelf } = Route.useLoaderData();
  const { workerProfile, account, available } = useGaw();

  const resolvedWorker: Worker | null = isSelf
    ? workerProfile
      ? {
          id: "w-me",
          name: `${account?.name ?? "Your Profile"} (Your Worker Profile)`,
          initials: "ME",
          skill: workerProfile.skill,
          skills: workerProfile.skills,
          barangayId: workerProfile.barangayId,
          lat: (workerProfile.area ?? BARANGAYS[0]!).lat,
          lng: (workerProfile.area ?? BARANGAYS[0]!).lng,
          rate: 350,
          available,
          rating: 4.9,
          jobsDone: 12,
          years: 3,
          bio: workerProfile.description,
          hours: "Flexible schedule",
          reviews: [
            {
              author: "Maria S.",
              rating: 5,
              text: "Great communication and reliable work.",
              when: "Recent",
            },
          ],
          portfolio: [workerProfile.skill, ...workerProfile.skills.slice(0, 2)],
        }
      : null
    : worker;

  if (!resolvedWorker) {
    return (
      <AppLayout
        mode="hire"
        back={<BackButton to="/find" label="Back to Nearby Finder" />}
        title="Worker profile"
      >
        <div className="rounded-3xl border bg-card p-6 text-center shadow-soft">
          <p className="font-bold">
            Set up your worker profile in Working Mode to preview it here.
          </p>
          <Button asChild className="mt-4">
            <Link to="/work">Go to Working Mode</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      mode="hire"
      back={<BackButton to="/find" label="Back to Nearby Finder" />}
      title="Worker profile"
    >
      <WorkerProfile worker={resolvedWorker} isSelf={isSelf} />
    </AppLayout>
  );
}

function WorkerProfile({ worker, isSelf }: { worker: Worker; isSelf?: boolean }) {
  const gaw = useGaw();
  const distance = roundKm(distanceKm(hiringOrigin(gaw), worker));
  const Icon = iconFor(worker.skill);

  const cta = isSelf ? (
    <Button asChild size="lg" variant="outline" className="w-full">
      <Link to="/work">
        <Pencil className="size-4" /> Edit Your Worker Profile
      </Link>
    </Button>
  ) : (
    <Button asChild size="lg" className="w-full">
      <Link to="/book/$workerId" params={{ workerId: worker.id }}>
        Request Booking
      </Link>
    </Button>
  );

  return (
    <div className="grid gap-6 pb-20 lg:grid-cols-[1fr_320px] lg:pb-0">
      <div className="space-y-6">
        <section className="animate-fade-up rounded-3xl border bg-card p-5 shadow-soft md:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <Avatar initials={worker.initials} size="xl" />
            <div className="flex-1">
              <h2 className="text-2xl font-extrabold tracking-tight">{worker.name}</h2>
              <p className="font-semibold text-primary">{worker.skill}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                  <Star className="size-4 fill-gold text-gold" aria-hidden />{" "}
                  {worker.rating.toFixed(1)}
                  <span className="font-normal text-muted-foreground">
                    ({worker.reviews.length * 12 + 7} reviews)
                  </span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <Briefcase className="size-4" aria-hidden /> {worker.jobsDone} jobs ·{" "}
                  {worker.years} yrs
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-4" aria-hidden /> {barangayName(worker.barangayId)} area ·
                  ≈{distance} km from your location
                </span>
              </div>
              <div className="mt-2.5">
                <Availability available={worker.available} />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border bg-card p-5 shadow-soft md:p-7">
          <SectionHeader title="About" />
          <p className="leading-relaxed text-muted-foreground">{worker.bio}</p>
          <h3 className="mt-5 text-sm font-bold">Skills</h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            <li className="rounded-full bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground">
              {worker.skill} (Primary)
            </li>
            {worker.skills.map((s) => (
              <li
                key={s}
                className="rounded-full bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground"
              >
                {s}
              </li>
            ))}
          </ul>
          <h3 className="mt-5 text-sm font-bold">Availability</h3>
          <p className="mt-1 inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="size-4" aria-hidden /> {worker.hours}
          </p>
        </section>

        <section>
          <SectionHeader title="Portfolio" />
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {worker.portfolio.map((p, i) => (
              <li
                key={p}
                className={`flex aspect-[4/3] flex-col justify-between rounded-2xl p-4 shadow-soft ${
                  [
                    "bg-contour text-deep-foreground",
                    "bg-secondary text-secondary-foreground",
                    "bg-gold-sheen text-gold-foreground",
                  ][i % 3]
                }`}
              >
                <Icon className="size-6 opacity-80" aria-hidden />
                <span className="text-sm font-bold leading-tight">{p}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">Sample portfolio for demo purposes.</p>
        </section>

        <section>
          <SectionHeader title="Reviews" />
          <ul className="space-y-3">
            {worker.reviews.map((r) => (
              <li key={r.author} className="rounded-2xl border bg-card p-4 shadow-soft">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{r.author}</p>
                  <span className="text-xs text-muted-foreground">{r.when}</span>
                </div>
                <p className="mt-0.5 text-sm text-gold" aria-label={`${r.rating} out of 5 stars`}>
                  {"★".repeat(r.rating)}
                  <span className="text-border">{"★".repeat(5 - r.rating)}</span>
                </p>
                <p className="mt-1.5 text-sm text-muted-foreground">{r.text}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-24 rounded-3xl border bg-card p-6 shadow-soft">
          <p className="text-sm text-muted-foreground">Rate</p>
          <p className="text-3xl font-extrabold">
            {worker.rate ? (
              <>
                {formatPeso(worker.rate)}
                <span className="text-base font-medium text-muted-foreground"> / hour</span>
              </>
            ) : (
              "Request Quote"
            )}
          </p>
          <div className="mt-5">{cta}</div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            {isSelf
              ? "You cannot hire yourself. Switch to Working Mode to edit."
              : "No payment now. The worker confirms first."}
          </p>
        </div>
      </aside>

      <div className="fixed inset-x-0 bottom-16 z-20 border-t bg-card/95 p-3 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <p className="shrink-0 text-sm font-bold">
            {worker.rate ? `${formatPeso(worker.rate)}/hr` : "Quote"}
          </p>
          {cta}
        </div>
      </div>
    </div>
  );
}
