import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GAWBrand, GAWWordmark } from "@/components/gaw/GAWBrand";
import { useGaw } from "@/lib/gaw/store";
import welcome from "@/assets/gaw-welcome.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GAW — Grab a Work | Find Local Talent. Discover Nearby Work." },
      {
        name: "description",
        content:
          "Through a live GPS tracking system, GAW (Grab a Work) connects workers and employers in the same general area across Davao City.",
      },
      {
        property: "og:title",
        content: "GAW — Grab a Work | Find Local Talent. Discover Nearby Work.",
      },
      {
        property: "og:description",
        content:
          "Through a live GPS tracking system, GAW (Grab a Work) connects workers and employers in the same general area across Davao City.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Welcome,
});

function Welcome() {
  const { hydrated, signedIn, mode } = useGaw();
  const resume = hydrated && signedIn;

  return (
    <div className="min-h-screen bg-contour text-deep-foreground">
      <div className="mx-auto grid min-h-screen w-full max-w-[1460px] items-center gap-8 px-5 py-8 sm:px-8 md:py-12 lg:grid-cols-[minmax(0,0.47fr)_minmax(0,0.53fr)] lg:gap-10 lg:px-12 xl:gap-12 xl:px-14">
        {/* Right Column on Desktop: Prominent Davao Landmarks Hero Card */}
        <figure className="relative w-full overflow-hidden rounded-3xl bg-[#0A1E1C] shadow-lift ring-1 ring-white/15 lg:order-2 lg:rounded-[2.25rem]">
          {/* Non-destructive CSS crop (scale-[1.105] inside overflow-hidden) trims the outer patterned frame while preserving all Davao landmarks */}
          <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#0D2623] sm:aspect-[16/9.6] lg:aspect-[16/10.2]">
            <img
              src={welcome}
              alt="Panoramic view of iconic Davao City landmarks featuring Mount Apo, San Pedro Cathedral, the Centennial Clock Tower, and the Durian Monument"
              width={1024}
              height={581}
              fetchPriority="high"
              decoding="async"
              className="h-full w-full scale-[1.105] object-cover object-[50%_46%] select-none"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0A1E1C] via-[#0A1E1C]/45 to-transparent sm:h-20"
            />
          </div>

          {/* Enhanced Bottom Overlay Plaque */}
          <figcaption className="relative flex flex-wrap items-center justify-between gap-4 border-t border-white/12 bg-[#0A1E1C]/95 px-5 py-4 backdrop-blur-md sm:px-6 sm:py-5 lg:px-7 lg:py-5">
            <div className="min-w-0">
              <GAWWordmark size="md" />
              <p className="mt-1.5 text-[0.8125rem] font-medium leading-snug text-deep-muted sm:text-[0.9375rem] lg:text-[1.02rem]">
                Davao City’s Hyperlocal Hiring & Work Marketplace
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-gold/15 px-3.5 py-1.5 text-[0.8125rem] font-bold text-gold ring-1 ring-gold/35 sm:px-4 sm:py-2 sm:text-[0.9375rem]">
              <MapPin className="size-4" aria-hidden /> Davao City, PH
            </span>
          </figcaption>
        </figure>

        {/* Left Column on Desktop: Brand Identity, Headline, Description, CTAs & Highlights */}
        <div className="relative flex flex-col justify-center pb-4 pt-1 lg:py-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <GAWBrand variant="expanded" size="xl" onDeep />
          </div>

          <p className="mt-7 text-[clamp(0.875rem,1.15vw,1.125rem)] font-extrabold uppercase tracking-[0.18em] text-gold lg:mt-8">
            Local Work. Nearby Opportunities.
          </p>

          <h1 className="mt-3.5 text-[clamp(2.5rem,4.6vw,4.65rem)] font-extrabold leading-[1.04] tracking-[-0.03em] text-deep-foreground">
            Find Local Talent. Discover Nearby Work.
          </h1>

          <p className="mt-5 max-w-[35rem] text-[clamp(1.0625rem,1.45vw,1.4rem)] leading-[1.55] text-deep-muted">
            Through our live GPS tracking system, we connect workers and employers in the same
            general area — find trusted plumbers, electricians, cleaners and more nearby, or
            discover your next job close to you.
          </p>

          <div className="mt-8 flex flex-col gap-3.5 sm:flex-row sm:items-center lg:mt-9">
            {resume ? (
              <Button
                asChild
                size="xl"
                variant="gold"
                className="h-14 rounded-2xl px-8 text-[1.0625rem] font-bold sm:h-[3.75rem] sm:px-10 sm:text-[1.1875rem]"
              >
                <Link to={mode === "work" ? "/work" : mode === "hire" ? "/hire" : "/mode"}>
                  Continue to GAW
                </Link>
              </Button>
            ) : (
              <>
                <Button
                  asChild
                  size="xl"
                  variant="gold"
                  className="h-14 rounded-2xl px-8 text-[1.0625rem] font-bold sm:h-[3.75rem] sm:px-10 sm:text-[1.1875rem]"
                >
                  <Link to="/signup">Get Started</Link>
                </Button>
                <Button
                  asChild
                  size="xl"
                  variant="ghostOnDeep"
                  className="h-14 rounded-2xl px-8 text-[1.0625rem] font-bold sm:h-[3.75rem] sm:px-9 sm:text-[1.1875rem]"
                >
                  <Link to="/login">Log In</Link>
                </Button>
              </>
            )}
          </div>

          <ul className="mt-9 grid grid-cols-1 gap-4 border-t border-white/12 pt-6 text-[0.9rem] font-medium leading-snug text-deep-foreground/90 sm:grid-cols-3 sm:gap-5 sm:text-[0.95rem] lg:mt-10 lg:pt-7 lg:text-[1.02rem]">
            <li className="flex items-start gap-2.5 sm:flex-col sm:gap-2">
              <MapPin className="mt-0.5 size-6 shrink-0 text-gold sm:mt-0" aria-hidden />
              <span>Live GPS connects you in the same general area</span>
            </li>
            <li className="flex items-start gap-2.5 sm:flex-col sm:gap-2">
              <ShieldCheck className="mt-0.5 size-6 shrink-0 text-gold sm:mt-0" aria-hidden />
              <span>Reviews from neighbors</span>
            </li>
            <li className="flex items-start gap-2.5 sm:flex-col sm:gap-2">
              <Sparkles className="mt-0.5 size-6 shrink-0 text-gold sm:mt-0" aria-hidden />
              <span>Hire or work, one account</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
