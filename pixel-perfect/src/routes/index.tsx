import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/gaw/primitives";
import { useGaw } from "@/lib/gaw/store";
import welcome from "@/assets/gaw-welcome.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GAW — Find Local Talent. Discover Nearby Work." },
      {
        name: "description",
        content:
          "GAW connects Davao City residents with nearby plumbers, electricians, cleaners and more.",
      },
      { property: "og:title", content: "GAW — Find Local Talent. Discover Nearby Work." },
      {
        property: "og:description",
        content:
          "GAW connects Davao City residents with nearby plumbers, electricians, cleaners and more.",
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
      <div className="mx-auto grid min-h-screen max-w-6xl md:grid-cols-2 md:items-center md:gap-12 md:px-8">
        <div className="relative md:order-2">
          <img
            src={welcome}
            alt="Illustration of Davao City with Mt. Apo, and local workers greeting a resident"
            width={1280}
            height={1024}
            className="h-[44vh] min-h-72 w-full object-cover object-[60%_center] md:h-[78vh] md:rounded-[2rem] md:shadow-lift"
          />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-deep to-transparent md:hidden" />
        </div>

        <div className="relative px-6 pb-10 pt-2 md:px-0 md:py-16">
          <Logo onDeep />
          <p className="mt-8 text-sm font-semibold uppercase tracking-[0.18em] text-gold">
            Local Work. Nearby Opportunities.
          </p>
          <h1 className="mt-3 text-[2.35rem] font-extrabold leading-[1.05] tracking-tight md:text-6xl">
            Find Local Talent. Discover Nearby Work.
          </h1>
          <p className="mt-4 max-w-md text-base text-deep-muted md:text-lg">
            Trusted plumbers, electricians, cleaners and more — right in your barangay. Or find your
            next job close to home.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {resume ? (
              <Button asChild size="xl" variant="gold">
                <Link to={mode === "work" ? "/work" : mode === "hire" ? "/hire" : "/mode"}>
                  Continue to GAW
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild size="xl" variant="gold">
                  <Link to="/signup">Get Started</Link>
                </Button>
                <Button asChild size="xl" variant="ghostOnDeep">
                  <Link to="/login">Log In</Link>
                </Button>
              </>
            )}
          </div>

          <ul className="mt-10 grid grid-cols-3 gap-3 text-xs text-deep-muted">
            <li className="flex flex-col gap-1.5">
              <MapPin className="size-5 text-gold" aria-hidden /> Workers near your barangay
            </li>
            <li className="flex flex-col gap-1.5">
              <ShieldCheck className="size-5 text-gold" aria-hidden /> Reviews from neighbors
            </li>
            <li className="flex flex-col gap-1.5">
              <Sparkles className="size-5 text-gold" aria-hidden /> Hire or work, one account
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
