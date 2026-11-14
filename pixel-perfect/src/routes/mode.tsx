import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Hammer, Search } from "lucide-react";
import { Logo } from "@/components/gaw/primitives";
import { useRequireSignIn } from "@/components/gaw/AppLayout";
import { useGaw, type Mode } from "@/lib/gaw/store";

export const Route = createFileRoute("/mode")({
  head: () => ({
    meta: [
      { title: "Choose your mode — GAW" },
      { name: "description", content: "Hire a nearby worker or find work in your area." },
      { property: "og:title", content: "Choose your mode — GAW" },
      { property: "og:description", content: "Hire a nearby worker or find work in your area." },
    ],
  }),
  component: ModePage,
});

/** ModeSelector: the two large mode cards. */
function ModeSelector({ onPick }: { onPick: (m: Mode) => void }) {
  const cards = [
    {
      mode: "hire" as Mode,
      title: "Hire a Worker",
      body: "Find skilled workers near you.",
      icon: Search,
      tone: "bg-card text-foreground border hover:border-primary",
      iconTone: "bg-secondary text-secondary-foreground",
    },
    {
      mode: "work" as Mode,
      title: "Find Work",
      body: "Discover jobs in your area.",
      icon: Hammer,
      tone: "bg-contour text-deep-foreground border border-transparent",
      iconTone: "bg-gold text-gold-foreground",
    },
  ];
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {cards.map((c, i) => (
        <button
          key={c.mode}
          type="button"
          onClick={() => onPick(c.mode)}
          style={{ animationDelay: `${i * 80}ms` }}
          className={`group flex min-h-48 animate-fade-up cursor-pointer flex-col justify-between rounded-3xl p-6 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift md:min-h-64 md:p-8 ${c.tone}`}
        >
          <span className={`grid size-14 place-items-center rounded-2xl ${c.iconTone}`}>
            <c.icon className="size-7" aria-hidden />
          </span>
          <span className="mt-6 flex items-end justify-between gap-4">
            <span>
              <span className="block text-2xl font-extrabold tracking-tight">{c.title}</span>
              <span className="mt-1 block opacity-80">{c.body}</span>
            </span>
            <ArrowRight
              className="size-6 shrink-0 transition-transform group-hover:translate-x-1"
              aria-hidden
            />
          </span>
        </button>
      ))}
    </div>
  );
}

function ModePage() {
  const ready = useRequireSignIn();
  const { account, setMode } = useGaw();
  const navigate = useNavigate();
  if (!ready) return null;

  const pick = (m: Mode) => {
    setMode(m);
    navigate({ to: m === "hire" ? "/hire" : "/work" });
  };

  return (
    <div className="min-h-screen px-5 py-8 md:py-14">
      <div className="mx-auto max-w-3xl">
        <Logo />
        <p className="mt-10 text-muted-foreground">Hi {account?.name.split(" ")[0]} 👋</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight md:text-4xl">
          How would you like to use GAW?
        </h1>
        <p className="mt-2 text-muted-foreground">
          You can switch anytime — your bookings and jobs stay saved.
        </p>
        <div className="mt-8">
          <ModeSelector onPick={pick} />
        </div>
      </div>
    </div>
  );
}
