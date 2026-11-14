import { useEffect, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Loader2, Pencil } from "lucide-react";
import { AppLayout } from "@/components/gaw/AppLayout";
import { BookingForm, formatTime, type BookingDraft } from "@/components/gaw/BookingForm";
import { Avatar, StatusBadge } from "@/components/gaw/primitives";
import { VerificationGuardModal } from "@/components/gaw/VerificationCenter";
import { Button } from "@/components/ui/button";
import { barangayName, WORKERS, type Worker } from "@/lib/gaw/data";
import { canPerformProtectedAction, formatPeso, useGaw } from "@/lib/gaw/store";

export const Route = createFileRoute("/book/$workerId")({
  loader: ({ params }) => {
    const worker = WORKERS.find((w) => w.id === params.workerId);
    if (!worker) throw notFound();
    return { worker };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `Book ${loaderData.worker.name} — GAW` },
          { name: "description", content: `Request a booking with ${loaderData.worker.name}.` },
          { property: "og:title", content: `Book ${loaderData.worker.name} — GAW` },
          {
            property: "og:description",
            content: `Request a booking with ${loaderData.worker.name}.`,
          },
        ]
      : [{ title: "Booking unavailable — GAW" }, { name: "robots", content: "noindex" }],
  }),
  notFoundComponent: () => (
    <div className="grid min-h-screen place-items-center p-6 text-center">
      <div>
        <p className="text-xl font-bold">This worker isn't available for booking.</p>
        <Button asChild className="mt-4">
          <Link to="/find">Back to Nearby Finder</Link>
        </Button>
      </div>
    </div>
  ),
  component: BookPage,
});

type Step = "form" | "review" | "done";

function BookPage() {
  const { worker } = Route.useLoaderData();
  return (
    <AppLayout mode="hire">
      <BookingFlow worker={worker} />
    </AppLayout>
  );
}

const STEPS: { key: Step; label: string }[] = [
  { key: "form", label: "Details" },
  { key: "review", label: "Review" },
  { key: "done", label: "Sent" },
];

function BookingFlow({ worker }: { worker: Worker }) {
  const { locationId, serviceLocation, addBooking, verification } = useGaw();
  const draftKey = `gaw:booking-draft:${worker.id}`;

  const [step, setStep] = useState<Step>("form");
  const [busy, setBusy] = useState(false);
  const [showVerifModal, setShowVerifModal] = useState(false);
  const [draft, setDraft] = useState<BookingDraft>({
    service: worker.skill,
    description: "",
    date: "",
    time: "",
    barangayId: locationId,
    location: serviceLocation,
    budgetMode: worker.rate ? "budget" : "quote",
    budget: "",
  });

  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved) as { draft?: BookingDraft; step?: Step };
        if (parsed.draft) setDraft(parsed.draft);
        if (parsed.step === "form" || parsed.step === "review") setStep(parsed.step);
      }
    } catch {
      /* ignore session storage errors */
    }
  }, [draftKey]);

  useEffect(() => {
    if (step === "done") return;
    try {
      window.sessionStorage.setItem(draftKey, JSON.stringify({ draft, step }));
    } catch {
      /* ignore session storage errors */
    }
  }, [draftKey, draft, step]);

  const executeBookingConfirm = () => {
    setBusy(true);
    setTimeout(() => {
      const createdId = addBooking({
        workerId: worker.id,
        service: draft.service,
        description: draft.description.trim(),
        date: draft.date,
        time: draft.time,
        barangayId: draft.barangayId,
        location: draft.location ?? null,
        budget: draft.budgetMode === "budget" ? Number(draft.budget) : null,
      });
      setBusy(false);
      if (createdId) {
        try {
          window.sessionStorage.removeItem(draftKey);
        } catch {
          /* ignore */
        }
        setStep("done");
        window.scrollTo({ top: 0 });
      }
    }, 450);
  };

  const confirm = () => {
    const guard = canPerformProtectedAction(verification);
    if (!guard.allowed) {
      setShowVerifModal(true);
      return;
    }
    executeBookingConfirm();
  };

  const idx = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="mx-auto max-w-xl">
      {step !== "done" && (
        <div className="mb-5 flex items-center gap-3">
          {step === "form" ? (
            <Button asChild variant="outline" size="icon" className="rounded-full">
              <Link to="/workers/$id" params={{ id: worker.id }} aria-label="Back to profile">
                <ArrowLeft />
              </Link>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              onClick={() => setStep("form")}
              aria-label="Back to details"
            >
              <ArrowLeft />
            </Button>
          )}
          <h1 className="text-2xl font-extrabold tracking-tight">Request Booking</h1>
        </div>
      )}

      <ol className="mb-6 grid grid-cols-3 gap-2" aria-label="Booking progress">
        {STEPS.map((s, i) => (
          <li key={s.key} aria-current={i === idx ? "step" : undefined}>
            <div className={`h-1.5 rounded-full ${i <= idx ? "bg-primary" : "bg-border"}`} />
            <p
              className={`mt-1.5 text-xs font-semibold ${i <= idx ? "text-primary" : "text-muted-foreground"}`}
            >
              {s.label}
            </p>
          </li>
        ))}
      </ol>

      <div className="mb-5 flex items-center gap-3 rounded-2xl border bg-card p-3.5 shadow-soft">
        <Avatar initials={worker.initials} />
        <div>
          <p className="font-bold">{worker.name}</p>
          <p className="text-sm text-muted-foreground">
            {worker.skill} · {worker.rate ? `${formatPeso(worker.rate)}/hr` : "Quote on request"}
          </p>
        </div>
      </div>

      {step === "form" && (
        <div className="animate-fade-up rounded-3xl border bg-card p-5 shadow-soft md:p-7">
          <BookingForm
            worker={worker}
            initial={draft}
            onReview={(d) => {
              setDraft(d);
              setStep("review");
              window.scrollTo({ top: 0 });
            }}
          />
        </div>
      )}

      {step === "review" && (
        <div className="animate-fade-up rounded-3xl border bg-card p-5 shadow-soft md:p-7">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Review details</h2>
            <Button variant="ghost" size="sm" onClick={() => setStep("form")}>
              <Pencil /> Edit
            </Button>
          </div>
          <dl className="mt-4 divide-y">
            {[
              ["Service", draft.service],
              ["Job description", draft.description],
              [
                "Preferred date",
                new Date(draft.date + "T00:00").toLocaleDateString("en-PH", {
                  weekday: "short",
                  month: "long",
                  day: "numeric",
                }),
              ],
              ["Preferred time", formatTime(draft.time)],
              ["Service area", draft.location?.label ?? barangayName(draft.barangayId)],
              [
                "Budget",
                draft.budgetMode === "budget"
                  ? formatPeso(Number(draft.budget))
                  : "Requesting a quote",
              ],
            ].map(([k, v]) => (
              <div key={k} className="grid grid-cols-[120px_1fr] gap-3 py-3 text-sm">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <Button size="lg" className="mt-5 w-full" onClick={confirm} disabled={busy}>
            {busy && <Loader2 className="animate-spin" />}
            {busy ? "Sending request…" : "Confirm Request"}
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            No payment is taken. {worker.name.split(" ")[0]} will confirm or decline.
          </p>
        </div>
      )}

      {step === "done" && (
        <div
          className="animate-fade-up rounded-3xl border bg-card p-6 text-center shadow-soft md:p-10"
          role="status"
        >
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-secondary text-primary">
            <CheckCircle2 className="size-9" aria-hidden />
          </span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Booking request sent!</h1>
          <p className="mt-2 text-muted-foreground">
            {worker.name} will review your request for {draft.service.toLowerCase()} on{" "}
            {new Date(draft.date + "T00:00").toLocaleDateString("en-PH", {
              month: "short",
              day: "numeric",
            })}{" "}
            at {formatTime(draft.time)}.
          </p>
          <div className="mt-4">
            <StatusBadge status="pending" />
          </div>
          <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild size="lg">
              <Link to="/bookings">View My Bookings</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/my-jobs" search={{ tab: "pending" }}>
                Respond in Worker My Jobs
              </Link>
            </Button>
          </div>
        </div>
      )}

      <VerificationGuardModal
        open={showVerifModal}
        onOpenChange={setShowVerifModal}
        role="hire"
        actionContext={`Confirm booking with ${worker.name} (${draft.service})`}
        onVerifiedContinue={executeBookingConfirm}
      />
    </div>
  );
}
