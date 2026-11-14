import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ArrowLeft,
  Briefcase,
  CalendarCheck,
  ChevronDown,
  ClipboardList,
  Crown,
  Home,
  LogOut,
  MapPin,
  Monitor,
  Moon,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sun,
} from "lucide-react";
import { toast } from "sonner";
import {
  FOCUS_RING,
  REDUCED_MOTION_RESET,
  segmentedOptionClass,
} from "@/components/gaw/interactions";
import { Avatar, HeaderBrand } from "@/components/gaw/primitives";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuHighlightGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  bookingsFor,
  canPerformProtectedAction,
  hasPlan,
  hiringOriginLabel,
  initialsOf,
  useGaw,
  type Mode,
} from "@/lib/gaw/store";
import { useTheme, type ThemePref } from "@/lib/gaw/theme";
import { cn } from "@/lib/utils";

const NAV = {
  hire: [
    { to: "/hire" as const, label: "Home", icon: Home },
    { to: "/find" as const, label: "Find", icon: Search },
    { to: "/gigs" as const, label: "My Gigs", icon: ClipboardList },
    { to: "/bookings" as const, label: "Bookings", icon: CalendarCheck },
  ],
  work: [
    { to: "/work" as const, label: "Home", icon: Home },
    { to: "/jobs" as const, label: "Jobs", icon: Briefcase },
    { to: "/my-jobs" as const, label: "My Jobs", icon: ClipboardList },
  ],
};

export function useRequireSignIn() {
  const { hydrated, signedIn } = useGaw();
  const navigate = useNavigate();

  useEffect(() => {
    if (hydrated && !signedIn) {
      void navigate({ to: "/login" });
    }
  }, [hydrated, signedIn, navigate]);

  return hydrated && signedIn;
}

export function ModeSwitcher({ className }: { className?: string }) {
  const { mode, setMode } = useGaw();
  const navigate = useNavigate();

  const pick = (m: Mode) => {
    setMode(m);
    void navigate({ to: m === "hire" ? "/hire" : "/work" });
  };

  return (
    <div
      role="group"
      aria-label="Current mode"
      className={cn(
        "inline-flex rounded-full border bg-muted p-0.5 text-xs font-semibold",
        className,
      )}
    >
      {(
        [
          ["hire", "Hiring"],
          ["work", "Working"],
        ] as const
      ).map(([m, label]) => (
        <button
          key={m}
          type="button"
          onClick={() => pick(m)}
          aria-pressed={mode === m}
          className={segmentedOptionClass(mode === m, "primary", "rounded-full px-3 py-1")}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function ThemeSegmentedControl({ compact = false }: { compact?: boolean }) {
  const { pref, setPref } = useTheme();
  const options: { value: ThemePref; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  return (
    <div
      role="group"
      aria-label="Theme preference"
      className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1"
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = pref === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setPref(opt.value)}
            aria-pressed={active}
            aria-label={compact ? `${opt.label} theme` : undefined}
            title={`${opt.label} theme`}
            className={segmentedOptionClass(
              active,
              "card",
              "inline-flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold",
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            {!compact && <span>{opt.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

export const ThemeToggle = ThemeSegmentedControl;

export function AccountMenu() {
  const { account, mode, plans, verification, logOut, resetDemo } = useGaw();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (!account) return null;

  const isEmployerPro = hasPlan(plans, "employer");
  const showProBadge = mode === "hire" && isEmployerPro;
  const verif = canPerformProtectedAction(verification);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className={cn(
            "inline-flex cursor-pointer items-center gap-2 rounded-full border bg-card py-1 pr-2.5 pl-1 text-left transition-[background-color,border-color,box-shadow,transform] duration-180 ease-out hover:border-hover-border hover:bg-hover-surface active:scale-[0.98] aria-[expanded=true]:ring-2 aria-[expanded=true]:ring-primary aria-[expanded=true]:ring-offset-2 aria-[expanded=true]:ring-offset-background",
            FOCUS_RING,
            REDUCED_MOTION_RESET,
          )}
        >
          <Avatar initials={initialsOf(account.name)} size="sm" />
          <span className="hidden max-w-28 truncate text-xs font-bold sm:inline">
            {account.name}
          </span>
          {showProBadge && (
            <span className="hidden rounded-full bg-gold-soft px-1.5 py-0.5 text-[10px] font-extrabold text-gold-foreground sm:inline">
              PRO
            </span>
          )}
          <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2">
        <DropdownMenuLabel className="px-2.5 py-2">
          <div className="flex items-center gap-2.5">
            <Avatar initials={initialsOf(account.name)} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{account.name}</p>
              <p className="truncate text-xs font-normal text-muted-foreground">{account.email}</p>
            </div>
          </div>
          {showProBadge && (
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-gold-soft px-2.5 py-0.5 text-[11px] font-bold text-gold-foreground">
              <Crown className="size-3" aria-hidden /> Employer Pro Active
            </span>
          )}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <div className="px-2 py-1.5">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Appearance
          </p>
          <ThemeSegmentedControl />
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuHighlightGroup>
          <DropdownMenuItem asChild className="rounded-xl">
            <Link to="/verify" className="flex w-full items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2">
                {verif.allowed ? (
                  <ShieldCheck className="size-4 text-status-confirmed" aria-hidden />
                ) : (
                  <ShieldAlert className="size-4 text-gold" aria-hidden />
                )}
                Verification & ID
              </span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-bold",
                  verif.allowed
                    ? "bg-status-confirmed-bg text-status-confirmed"
                    : verif.isPending
                      ? "bg-status-pending-bg text-status-pending"
                      : "bg-gold-soft text-gold-foreground",
                )}
              >
                {verif.allowed ? "Verified" : verif.isPending ? "Pending" : "Unverified"}
              </span>
            </Link>
          </DropdownMenuItem>

          {mode === "hire" && (
            <>
              <DropdownMenuItem asChild className="rounded-xl">
                <Link to="/gigs" className="flex items-center gap-2">
                  <ClipboardList className="size-4" aria-hidden />
                  My Posted Gigs
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-xl">
                <Link to="/pro" className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2">
                    <Crown className="size-4 text-gold" aria-hidden />
                    GAW Employer Pro
                  </span>
                  {isEmployerPro && (
                    <span className="rounded-full bg-gold-soft px-2 py-0.5 text-[10px] font-bold text-gold-foreground">
                      Active
                    </span>
                  )}
                </Link>
              </DropdownMenuItem>
            </>
          )}

          <DropdownMenuItem asChild className="rounded-xl">
            <Link to="/settings" className="flex items-center gap-2">
              <Settings className="size-4" aria-hidden />
              Settings
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild className="rounded-xl">
            <Link to="/mode" className="flex items-center gap-2">
              <RefreshCw className="size-4" aria-hidden />
              Switch role
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            tone="warning"
            onClick={() => {
              resetDemo();
              toast.success("Demo data reset.");
              void navigate({ to: "/login" });
            }}
            className="rounded-xl"
          >
            <RotateCcw className="size-4" aria-hidden />
            Reset demo data
          </DropdownMenuItem>

          <DropdownMenuItem
            tone="destructive"
            onClick={() => {
              logOut();
              void navigate({ to: "/login" });
            }}
            className="rounded-xl"
          >
            <LogOut className="size-4" aria-hidden />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuHighlightGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppLayout({
  children,
  mode,
  back,
  title,
  hideNav,
}: {
  children: ReactNode;
  mode?: Mode;
  back?: ReactNode;
  title?: string;
  hideNav?: boolean;
}) {
  const ready = useRequireSignIn();
  const { mode: storedMode, setMode, bookings, locationId, serviceLocation, customJobs } = useGaw();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (ready && mode && storedMode !== mode) {
      setMode(mode);
    }
  }, [ready, mode, storedMode, setMode]);

  if (!ready) return null;

  const activeMode = mode ?? storedMode;
  const items = activeMode ? NAV[activeMode] : [];
  const hiringPending = bookingsFor(bookings, "hiring").filter(
    (b) => b.status === "pending",
  ).length;
  const workingPending = bookingsFor(bookings, "working").filter(
    (b) => b.status === "pending",
  ).length;

  const badgeFor = (to: string) => {
    if (to === "/bookings" && hiringPending > 0) return hiringPending;
    if (to === "/my-jobs" && workingPending > 0) return workingPending;
    if (to === "/gigs" && customJobs.length > 0) return customJobs.length;
    return 0;
  };

  const locLabel =
    activeMode === "hire"
      ? hiringOriginLabel({ serviceLocation, locationId })
      : "Live GPS · General Area";

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {back ? (
              <>
                {back}
                {title && (
                  <h1 className="truncate text-lg font-extrabold tracking-tight sm:text-xl">
                    {title}
                  </h1>
                )}
              </>
            ) : (
              <HeaderBrand />
            )}

            {activeMode && !back && (
              <Link
                to={activeMode === "hire" ? "/find" : "/jobs"}
                className="hidden items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground lg:inline-flex"
              >
                <MapPin className="size-3.5 text-primary" aria-hidden />
                <span className="max-w-44 truncate">{locLabel}</span>
              </Link>
            )}
          </div>

          {!hideNav && activeMode && (
            <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
              {items.map((it) => {
                const Icon = it.icon;
                const active = pathname === it.to || pathname.startsWith(`${it.to}/`);
                const badge = badgeFor(it.to);
                return (
                  <Link
                    key={it.to}
                    to={it.to}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-[background-color,color,box-shadow,transform] duration-160 ease-out active:scale-[0.97] [&>svg]:transition-transform [&>svg]:duration-160",
                      FOCUS_RING,
                      REDUCED_MOTION_RESET,
                      active
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:bg-hover-surface hover:text-foreground hover:[&>svg]:scale-110 hover:[&>svg]:text-primary",
                    )}
                  >
                    <Icon className="size-4" aria-hidden />
                    {it.label}
                    {badge > 0 && (
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[10px] font-extrabold leading-none",
                          active ? "bg-white/20 text-white" : "bg-primary/15 text-primary",
                        )}
                      >
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          )}

          <div className="flex items-center gap-2">
            {activeMode && (
              <div className="hidden sm:block">
                <ModeSwitcher />
              </div>
            )}
            <AccountMenu />
          </div>
        </div>
      </header>

      <main
        id="main-content"
        className={cn(
          "mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8",
          !hideNav && activeMode && items.length > 0 && "pb-24 md:pb-10",
        )}
      >
        {title && !back && (
          <h1 className="mb-6 text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
        )}
        {children}
      </main>

      {!hideNav && activeMode && items.length > 0 && (
        <nav
          aria-label="Mobile navigation"
          className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur-md md:hidden"
        >
          <ul
            className={cn(
              "mx-auto grid max-w-md",
              items.length === 3 ? "grid-cols-3" : "grid-cols-4",
            )}
          >
            {items.map((it) => {
              const Icon = it.icon;
              const active = pathname === it.to || pathname.startsWith(`${it.to}/`);
              const badge = badgeFor(it.to);
              return (
                <li key={it.to}>
                  <Link
                    to={it.to}
                    className={cn(
                      "relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition-colors",
                      active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="size-5" aria-hidden />
                    {badge > 0 && (
                      <span className="absolute top-1.5 right-1/4 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-extrabold leading-none text-primary-foreground">
                        {badge}
                      </span>
                    )}
                    {it.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}

export function BackButton({
  to,
  label = "Back",
}: {
  to:
    | "/hire"
    | "/find"
    | "/gigs"
    | "/work"
    | "/jobs"
    | "/bookings"
    | "/my-jobs"
    | "/verify"
    | "/settings"
    | "/pro";
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
