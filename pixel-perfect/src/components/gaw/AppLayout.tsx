import { useEffect, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ArrowLeft,
  Briefcase,
  CalendarCheck,
  ClipboardList,
  Crown,
  Home,
  LogOut,
  RotateCcw,
  Search,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Logo, Avatar } from "./primitives";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useGaw, type Mode } from "@/lib/gaw/store";

type NavItem = {
  to: "/hire" | "/find" | "/bookings" | "/work" | "/jobs" | "/my-jobs";
  label: string;
  icon: LucideIcon;
};

const NAV: Record<Mode, NavItem[]> = {
  hire: [
    { to: "/hire", label: "Home", icon: Home },
    { to: "/find", label: "Find", icon: Search },
    { to: "/bookings", label: "Bookings", icon: CalendarCheck },
  ],
  work: [
    { to: "/work", label: "Home", icon: Home },
    { to: "/jobs", label: "Jobs", icon: Briefcase },
    { to: "/my-jobs", label: "My Jobs", icon: ClipboardList },
  ],
};

/** Redirects to /login once demo state has loaded and nobody is signed in. */
export function useRequireSignIn() {
  const { hydrated, signedIn } = useGaw();
  const navigate = useNavigate();
  useEffect(() => {
    if (hydrated && !signedIn) navigate({ to: "/login" });
  }, [hydrated, signedIn, navigate]);
  return hydrated && signedIn;
}

export function ModeSwitcher({ className }: { className?: string }) {
  const { mode, setMode } = useGaw();
  const navigate = useNavigate();
  const current: Mode = mode ?? "hire";
  const go = (m: Mode) => {
    if (m === current) return;
    setMode(m);
    navigate({ to: m === "hire" ? "/hire" : "/work" });
    toast.success(m === "hire" ? "Switched to Hiring mode" : "Switched to Working mode");
  };
  return (
    <div
      role="group"
      aria-label="Switch mode"
      className={cn(
        "inline-flex rounded-full border bg-card p-1 text-xs font-semibold shadow-soft",
        className,
      )}
    >
      {(["hire", "work"] as Mode[]).map((m) => (
        <button
          key={m}
          type="button"
          aria-pressed={current === m}
          onClick={() => go(m)}
          className={cn(
            "min-h-9 cursor-pointer rounded-full px-3.5 transition-colors",
            current === m
              ? "bg-deep text-deep-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {m === "hire" ? "Hiring" : "Working"}
        </button>
      ))}
    </div>
  );
}

function AccountMenu({ navMode }: { navMode: Mode }) {
  const { account, logOut, resetDemo, plans, togglePlan } = useGaw();
  const navigate = useNavigate();
  if (!account) return null;
  const isHiringSide = navMode === "hire";
  const isEmployerPro = isHiringSide && plans.includes("employer");
  const initials = account.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative cursor-pointer rounded-2xl"
          aria-label="Account menu"
        >
          <Avatar initials={initials} size="sm" />
          {isEmployerPro && (
            <span
              title="Employer Pro active"
              className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-gold text-gold-foreground shadow-sm"
            >
              <Crown className="size-2.5" aria-hidden />
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="z-50 w-72 overflow-hidden rounded-2xl border bg-card p-0 shadow-lift"
      >
        {/* Profile Banner */}
        <DropdownMenuLabel className="bg-contour px-4 py-3.5 text-deep-foreground">
          <div className="flex items-center gap-3">
            <Avatar initials={initials} size="sm" className="ring-2 ring-deep-foreground/20" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{account.name}</p>
              <p className="truncate text-xs font-normal text-deep-muted">{account.email}</p>
            </div>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-deep-foreground/15 px-2 py-0.5 text-[10px] font-bold text-deep-foreground">
              {isHiringSide ? "Hiring mode" : "Working mode"}
            </span>
            {isEmployerPro ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-gold-foreground">
                <Crown className="size-3" aria-hidden /> Employer Pro
              </span>
            ) : (
              account.isDemo && (
                <span className="rounded-full bg-deep-foreground/15 px-2 py-0.5 text-[10px] font-semibold text-deep-muted">
                  Demo Account
                </span>
              )
            )}
          </div>
        </DropdownMenuLabel>

        {/* Employer-only Premium Buyout Option directly under Profile Banner */}
        {isHiringSide && (
          <div className="border-b bg-gold-soft/55 p-2">
            <DropdownMenuItem
              onSelect={() => {
                if (!isEmployerPro) {
                  togglePlan("employer", true);
                  toast.success("Employer Pro Buyout activated (2% fee & unlimited gigs)!");
                } else {
                  navigate({ to: "/pro" });
                }
              }}
              className="flex items-start gap-2.5 rounded-xl bg-white/80 p-2.5 focus:bg-white"
            >
              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-gold text-gold-foreground">
                <Crown className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold text-foreground">
                  {isEmployerPro ? "Employer Pro Active" : "Employer Pro Buyout · ₱299"}
                </p>
                <p className="text-[11px] font-normal text-muted-foreground">
                  {isEmployerPro
                    ? "Manage plan & billing details"
                    : "Unlimited gig posts & reduced 2% fee"}
                </p>
              </div>
            </DropdownMenuItem>
          </div>
        )}

        {/* Settings & Account Actions */}
        <div className="p-1">
          {isHiringSide ? (
            <>
              <DropdownMenuItem onSelect={() => navigate({ to: "/pro" })}>
                <Settings /> Employer Pro & Billing Settings
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate({ to: "/mode" })}>
                <Briefcase /> Switch Role / Mode
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuItem onSelect={() => navigate({ to: "/work" })}>
                <Settings /> Worker Profile & Availability
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate({ to: "/my-jobs" })}>
                <ClipboardList /> Saved & Desired Gigs
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              resetDemo();
              toast("Demo data reset");
              navigate({ to: "/" });
            }}
          >
            <RotateCcw /> Reset demo data
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              logOut();
              navigate({ to: "/" });
            }}
          >
            <LogOut /> Log out
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppLayout({
  mode,
  title,
  back,
  children,
}: {
  /** Which side of GAW this page belongs to; omit for shared pages (e.g. Pro). */
  mode?: Mode;
  title?: string;
  back?: ReactNode;
  children: ReactNode;
}) {
  const ready = useRequireSignIn();
  const gaw = useGaw();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (ready && mode && gaw.mode !== mode) gaw.setMode(mode);
  }, [ready, mode, gaw]);

  const navMode: Mode = mode ?? gaw.mode ?? "hire";
  const items = NAV[navMode];
  const isActive = (to: string) =>
    pathname === to || (to !== "/hire" && to !== "/work" && pathname.startsWith(to));

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center" aria-busy="true">
        <div className="size-8 animate-spin rounded-full border-4 border-secondary border-t-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 md:pb-10">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 md:px-6">
          <Link to={navMode === "hire" ? "/hire" : "/work"} aria-label="GAW home">
            <Logo />
          </Link>
          <nav aria-label="Main" className="ml-6 hidden items-center gap-1 md:flex">
            {items.map((it) => (
              <Link
                key={it.to}
                to={it.to}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition-colors",
                  isActive(it.to)
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <it.icon className="size-4" aria-hidden />
                {it.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2.5">
            <ModeSwitcher />
            <AccountMenu navMode={navMode} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-5 md:px-6 md:pt-8">
        {(title || back) && (
          <div className="mb-5 flex items-center gap-3">
            {back}
            {title && (
              <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{title}</h1>
            )}
          </div>
        )}
        {children}
      </main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-3">
          {items.map((it) => {
            const active = isActive(it.to);
            return (
              <li key={it.to}>
                <Link
                  to={it.to}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-16 flex-col items-center justify-center gap-1 text-[0.7rem] font-semibold transition-colors",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-7 w-12 place-items-center rounded-full",
                      active && "bg-secondary",
                    )}
                  >
                    <it.icon className="size-5" aria-hidden />
                  </span>
                  {it.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

export function BackButton({
  to,
  label = "Back",
}: {
  to: "/hire" | "/find" | "/work" | "/jobs" | "/bookings" | "/my-jobs";
  label?: string;
}) {
  return (
    <Button asChild variant="outline" size="icon" className="shrink-0 rounded-full">
      <Link to={to} aria-label={label}>
        <ArrowLeft />
      </Link>
    </Button>
  );
}
