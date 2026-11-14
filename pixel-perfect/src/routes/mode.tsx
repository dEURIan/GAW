import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import roleFindWorkImg from "@/assets/role-find-work.jpg";
import roleHireWorkerImg from "@/assets/role-hire-worker.jpg";
import { AccountMenu, ThemeToggle, useRequireSignIn } from "@/components/gaw/AppLayout";
import { FOCUS_RING, REDUCED_MOTION_RESET } from "@/components/gaw/interactions";
import { HeaderBrand } from "@/components/gaw/primitives";
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

/** ModeSelector: the two equal-height contextual visual role cards. */
function ModeSelector({ onPick }: { onPick: (m: Mode) => void }) {
  const cards = [
    {
      mode: "hire" as Mode,
      title: "Hire a Worker",
      body: "Find skilled workers near you.",
      image: roleHireWorkerImg,
      imageAlt: "Skilled local worker arriving with tools to assist a homeowner in Davao City",
      imagePosition: "object-[68%_28%]",
      borderTone:
        "border-border/80 dark:border-white/12 hover:border-primary dark:hover:border-primary",
      overlayTone:
        "bg-[linear-gradient(180deg,rgba(9,22,18,0.12)_0%,rgba(9,22,18,0.44)_48%,rgba(9,22,18,0.92)_100%),linear-gradient(110deg,rgba(9,24,19,0.82)_0%,rgba(9,24,19,0.38)_54%,rgba(9,24,19,0.08)_100%)]",
    },
    {
      mode: "work" as Mode,
      title: "Find Work",
      body: "Discover jobs in your area.",
      image: roleFindWorkImg,
      imageAlt: "Skilled local technician actively performing electrical work in Davao City",
      imagePosition: "object-[66%_26%]",
      borderTone:
        "border-border/80 dark:border-white/14 hover:border-gold dark:hover:border-gold/80",
      overlayTone:
        "bg-[radial-gradient(85%_85%_at_88%_12%,rgba(244,181,68,0.18)_0%,transparent_60%),linear-gradient(180deg,rgba(11,31,28,0.10)_0%,rgba(11,31,28,0.44)_48%,rgba(8,24,21,0.93)_100%),linear-gradient(110deg,rgba(10,30,27,0.84)_0%,rgba(10,30,27,0.40)_54%,rgba(10,30,27,0.08)_100%)]",
    },
  ];

  return (
    <div className="grid gap-5 md:grid-cols-2 lg:gap-6">
      {cards.map((c, i) => (
        <button
          key={c.mode}
          type="button"
          onClick={() => onPick(c.mode)}
          style={{ animationDelay: `${i * 80}ms` }}
          className={`group relative flex h-full min-h-[230px] animate-fade-up cursor-pointer flex-col justify-end overflow-hidden rounded-3xl border bg-[#0D1A15] p-6 text-left text-white shadow-soft transition-[transform,translate,scale,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:shadow-lift active:translate-y-0 active:scale-[0.99] motion-reduce:hover:-translate-y-0 sm:min-h-[260px] sm:p-7 md:min-h-[296px] md:p-8 lg:min-h-[324px] lg:p-10 ${FOCUS_RING} ${REDUCED_MOTION_RESET} ${c.borderTone}`}
        >
          {/* Contextual background photograph */}
          <img
            src={c.image}
            alt={c.imageAlt}
            width={1376}
            height={768}
            decoding="async"
            className={`pointer-events-none absolute inset-0 size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04] ${c.imagePosition}`}
          />

          {/* Layered directional gradient overlay for contrast and legibility */}
          <span
            aria-hidden
            className={`pointer-events-none absolute inset-0 transition-opacity duration-300 ${c.overlayTone}`}
          />

          {/* Subtle inner highlight ring */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/10"
          />

          {/* Bottom-anchored content layer */}
          <span className="relative z-10 flex w-full items-end justify-between gap-4 pt-24">
            <span className="max-w-[24rem]">
              <span className="block text-[1.55rem] font-extrabold leading-tight tracking-[-0.02em] text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)] sm:text-[1.75rem] lg:text-[1.95rem]">
                {c.title}
              </span>
              <span className="mt-2 block text-[1rem] font-medium leading-snug text-white/85 drop-shadow-[0_1px_6px_rgba(0,0,0,0.4)] sm:text-[1.0625rem] lg:text-[1.15rem]">
                {c.body}
              </span>
            </span>
            <ArrowRight
              className="size-6 shrink-0 text-white/95 drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)] transition-transform duration-200 group-hover:translate-x-1.5 group-hover:text-white sm:size-7"
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
    <div className="min-h-screen px-5 py-6 sm:px-8 md:py-10">
      <div className="mx-auto w-full max-w-[1040px]">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 pb-5">
          <Link
            to="/"
            aria-label="GAW — Grab a Work welcome page"
            className={`inline-flex shrink-0 rounded-xl transition-opacity duration-150 hover:opacity-85 ${FOCUS_RING}`}
          >
            <HeaderBrand size="md" />
          </Link>
          <div className="flex items-center gap-2.5">
            <ThemeToggle compact />
            <AccountMenu />
          </div>
        </header>

        <main className="mt-10 pb-12 sm:mt-12 md:mt-14 lg:mt-16">
          <p className="text-[1.0625rem] font-medium text-muted-foreground sm:text-[1.125rem] md:text-[1.2rem]">
            Hi {account?.name.split(" ")[0]} 👋
          </p>
          <h1 className="mt-2 text-[clamp(2rem,3.6vw,2.875rem)] font-extrabold leading-[1.1] tracking-[-0.025em]">
            How would you like to use GAW?
          </h1>
          <p className="mt-3 max-w-2xl text-[1rem] leading-relaxed text-muted-foreground sm:text-[1.125rem] md:text-[1.1875rem]">
            You can switch anytime — your bookings and jobs stay saved.
          </p>

          <div className="mt-8 sm:mt-10 md:mt-11">
            <ModeSelector onPick={pick} />
          </div>
        </main>
      </div>
    </div>
  );
}
