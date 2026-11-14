import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  CheckCircle2,
  Crown,
  Monitor,
  Moon,
  RotateCcw,
  ShieldCheck,
  Sun,
  User,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout, BackButton } from "@/components/gaw/AppLayout";
import { GAWBrand, GAWWordmark } from "@/components/gaw/GAWBrand";
import { selectableOptionCardClass } from "@/components/gaw/interactions";
import { Avatar } from "@/components/gaw/primitives";
import { Button } from "@/components/ui/button";
import { identityVerified, useGaw } from "@/lib/gaw/store";
import { useTheme, type ThemePref } from "@/lib/gaw/theme";
import { VERIF_LABEL } from "@/lib/gaw/verification";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Account Settings — GAW" },
      {
        name: "description",
        content: "Manage your GAW appearance theme, verification status, and account settings.",
      },
      { property: "og:title", content: "Account Settings — GAW" },
      {
        property: "og:description",
        content: "Manage your GAW appearance theme, verification status, and account settings.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { mode } = useGaw();
  const backTo = mode === "work" ? "/work" : "/hire";
  return (
    <AppLayout back={<BackButton to={backTo} label="Back to Dashboard" />} title="Account Settings">
      <SettingsBody />
    </AppLayout>
  );
}

const THEME_OPTIONS: { key: ThemePref; title: string; subtitle: string; icon: LucideIcon }[] = [
  {
    key: "light",
    title: "Light Mode",
    subtitle: "Bright Davao daylight palette with crisp cards and forest-green accents.",
    icon: Sun,
  },
  {
    key: "dark",
    title: "Dark Mode",
    subtitle: "High-contrast deep emerald dark surfaces designed for low-glare reading.",
    icon: Moon,
  },
  {
    key: "system",
    title: "System Default",
    subtitle: "Automatically matches your device or OS light/dark appearance preference.",
    icon: Monitor,
  },
];

function SettingsBody() {
  const { account, verification, plans, resetDemo } = useGaw();
  const { pref, resolved, setPref } = useTheme();
  const navigate = useNavigate();

  if (!account) return null;
  const initials = account.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const idStatus = verification.identity?.status ?? "not_submitted";
  const verified = identityVerified(verification);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Theme & Appearance Section */}
      <section
        className="rounded-3xl border bg-card p-5 shadow-soft md:p-7"
        aria-labelledby="theme-heading"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-primary">Appearance</p>
            <h2 id="theme-heading" className="text-xl font-extrabold tracking-tight">
              Theme Preference
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Updates the entire application immediately and persists across page refreshes.
            </p>
          </div>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">
            Active: {pref === "system" ? `System (${resolved})` : pref}
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Select theme">
          {THEME_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = pref === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  setPref(opt.key);
                  toast.success(`Theme set to ${opt.title}`);
                }}
                className={selectableOptionCardClass(
                  active,
                  "flex flex-col items-start justify-between rounded-2xl border p-4 text-left",
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <span
                    className={cn(
                      "grid size-10 place-items-center rounded-xl transition-[background-color,color,transform] duration-150",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground group-hover:scale-105 group-hover:bg-hover-surface group-hover:text-primary motion-reduce:group-hover:scale-100",
                    )}
                  >
                    <Icon className="size-5" aria-hidden />
                  </span>
                  {active && <CheckCircle2 className="size-4 text-primary" aria-hidden />}
                </div>
                <div className="mt-3">
                  <p className="font-bold">{opt.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{opt.subtitle}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Account Overview */}
      <section className="rounded-3xl border bg-card p-5 shadow-soft md:p-7">
        <div className="flex items-center gap-4">
          <Avatar initials={initials} size="lg" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-extrabold">{account.name}</h2>
              {verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-status-confirmed-bg px-2.5 py-0.5 text-xs font-bold text-status-confirmed">
                  <CheckCircle2 className="size-3.5" aria-hidden /> Verified
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {account.email} · {account.mobile}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-2xl border p-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Identity Verification
              </p>
              <p className="mt-0.5 font-bold">{VERIF_LABEL[idStatus]}</p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link to="/verify">
                <ShieldCheck className="size-4" /> Open Verification
              </Link>
            </Button>
          </div>

          <div className="flex items-center justify-between rounded-2xl border p-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                GAW Employer Pro
              </p>
              <p className="mt-0.5 font-bold">
                {plans.includes("employer") ? "Employer Pro Active" : "Free Plan"}
              </p>
            </div>
            <Button asChild size="sm" variant="gold">
              <Link to="/pro">
                <Crown className="size-4" /> Manage Pro
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Prototype Reset Section */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border bg-card p-5 shadow-soft">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground">
            <User className="size-5" aria-hidden />
          </span>
          <div>
            <p className="font-bold">Reset Prototype Data</p>
            <p className="text-xs text-muted-foreground">
              Clear local demo bookings, skills, verification state, and return to the welcome
              screen.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            resetDemo();
            toast("Demo data reset");
            navigate({ to: "/" });
          }}
        >
          <RotateCcw className="size-4" /> Reset Demo State
        </Button>
      </section>

      {/* Official GAW Brand Identity Footer Card */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border bg-card p-5 shadow-soft">
        <GAWBrand
          variant="expanded"
          size="md"
          tagline="Grab a Work · Local Work. Nearby Opportunities."
        />
        <GAWWordmark framed size="sm" />
      </section>
    </div>
  );
}
