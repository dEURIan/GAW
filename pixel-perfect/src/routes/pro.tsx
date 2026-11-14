import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Crown, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/gaw/AppLayout";
import { Button } from "@/components/ui/button";
import { useGaw } from "@/lib/gaw/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pro")({
  head: () => ({
    meta: [
      { title: "GAW Employer Pro Membership" },
      {
        name: "description",
        content:
          "Compare Employer Standard (Free) and Employer Pro Membership (₱299/mo · 2% settlement fee & unlimited Davao City open gigs).",
      },
    ],
  }),
  component: () => (
    <AppLayout mode="hire" title="Employer Pro Membership">
      <ProPlansPage />
    </AppLayout>
  ),
});

function ProPlansPage() {
  const { plans, togglePlan } = useGaw();
  const isEmployerPro = plans.includes("employer");

  const handleEmployerToggle = () => {
    togglePlan("employer", !isEmployerPro);
    toast.success(
      !isEmployerPro
        ? "GAW Employer Pro Buyout activated (2% fee + unlimited gigs)!"
        : "GAW Employer Pro switched back to Standard Free tier.",
    );
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="rounded-3xl bg-contour p-6 text-deep-foreground shadow-lift">
        <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gold">
          <ShieldCheck className="size-4" aria-hidden /> Employer Membership Plans
        </p>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight md:text-3xl">
          Start free as an employer. Upgrade only when posting more.
        </h2>
        <p className="mt-1.5 max-w-2xl text-sm text-deep-muted">
          GAW Employer Pro lowers your settlement fee to 2% and unlocks unlimited open Davao City
          gig postings. Employees never pay or subscribe to a membership tier.
        </p>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Employer Standard (Free Tier) */}
        <article
          className={cn(
            "flex flex-col justify-between rounded-3xl border bg-card p-6 shadow-soft",
            !isEmployerPro && "border-primary ring-2 ring-primary/20",
          )}
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-extrabold text-secondary-foreground">
                <ShieldCheck className="size-3.5" aria-hidden /> Standard Employer
              </span>
              {!isEmployerPro && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-900">
                  Current Plan
                </span>
              )}
            </div>

            <h3 className="mt-4 text-xl font-extrabold">Employer Standard</h3>
            <p className="mt-1 text-3xl font-extrabold text-deep">₱0 / month</p>
            <p className="mt-1.5 text-sm font-medium text-primary">
              5% employer settlement fee per completed booking
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Great for occasional home repairs and errands
            </p>

            <ul className="mt-5 space-y-2.5 border-t pt-4">
              {[
                "Up to 3 active open gigs at a time",
                "AI Price Advisor + Region XI ₱63.50/hr floor protection",
                "Browse verified Davao workers within 1–10 km",
                "Direct booking requests & quote management",
              ].map((perk) => (
                <li key={perk} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  <span>{perk}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 rounded-2xl bg-muted px-4 py-3 text-center text-xs font-bold text-muted-foreground">
            {isEmployerPro ? "Available anytime when cancelling Pro" : "Active Free Employer Tier"}
          </div>
        </article>

        {/* Employer Pro Buyout */}
        <article
          className={cn(
            "flex flex-col justify-between rounded-3xl border bg-card p-6 shadow-soft transition-shadow",
            isEmployerPro && "border-primary ring-2 ring-primary/25",
          )}
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-soft px-3 py-1 text-xs font-extrabold text-gold-foreground">
                <Crown className="size-3.5" aria-hidden /> Employer Pro Buyout
              </span>
              {isEmployerPro && (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-bold text-primary">
                  <Zap className="size-3.5" aria-hidden /> Active
                </span>
              )}
            </div>

            <h3 className="mt-4 text-xl font-extrabold">GAW Employer Pro</h3>
            <p className="mt-1 text-3xl font-extrabold text-deep">₱299 / month</p>
            <p className="mt-1.5 text-sm font-medium text-primary">
              Reduced 2% employer settlement fee (down from 5% Standard)
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Built for households, cafés, and Davao businesses hiring frequently
            </p>

            <ul className="mt-5 space-y-2.5 border-t pt-4">
              {[
                "Unlimited open gig postings across Davao City barangays",
                "Reduced 2% transaction fee (down from 5% Standard)",
                "Priority placement on nearby Davao gig feeds",
                "AI Price Advisor + automatic ₱63.50/hr wage compliance check",
              ].map((perk) => (
                <li key={perk} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  <span>{perk}</span>
                </li>
              ))}
            </ul>
          </div>

          <Button
            type="button"
            size="lg"
            variant={isEmployerPro ? "outline" : "gold"}
            onClick={handleEmployerToggle}
            className="mt-6 w-full"
          >
            {isEmployerPro ? "Switch Employer Pro to Free" : "Activate Employer Pro Buyout (Demo)"}
          </Button>
        </article>
      </div>

      <section className="rounded-2xl border bg-muted/50 p-4 text-xs text-muted-foreground">
        <p className="flex items-center gap-1.5 font-semibold text-foreground">
          <Sparkles className="size-4 text-primary" aria-hidden /> Minimum-Wage Protection Rule
        </p>
        <p className="mt-1">
          Every gig in Davao City enforces at least the Region XI ₱508/day (₱63.50/hr) minimum wage
          floor before publishing, with transparent AI pricing guidance for employers.
        </p>
      </section>
    </div>
  );
}
