import { HeadContent, Link, Scripts, createRootRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { GAWBrand } from "@/components/gaw/GAWBrand";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { GawProvider } from "@/lib/gaw/store";
import { THEME_BOOT_SCRIPT, ThemeProvider } from "@/lib/gaw/theme";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "GAW · Grab-A-Work — Trusted local help in Davao" },
      { name: "theme-color", content: "#0e7048" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      {
        name: "description",
        content: "Find nearby skilled workers across Davao City, or pick up local jobs near you.",
      },
      { property: "og:type", content: "website" },
      {
        property: "og:title",
        content: "GAW · Grab-A-Work — Trusted local help in Davao",
      },
      {
        property: "og:description",
        content: "Find nearby skilled workers across Davao City, or pick up local jobs near you.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "icon", href: "/favicon.ico" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
  }),
  notFoundComponent: NotFound,
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("serviceWorker" in navigator && window.isSecureContext) {
      void navigator.serviceWorker.register("/sw.js").catch(() => {
        /* ignore registration failure in dev or unsupported contexts */
      });
    }
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <HeadContent />
      </head>
      <body>
        <ThemeProvider>
          <GawProvider>
            {children}
            <Toaster position="top-center" richColors />
          </GawProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}

function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <div className="mx-auto mb-5 flex justify-center">
        <GAWBrand variant="compact" />
      </div>
      <h1 className="text-2xl font-extrabold">That page wasn’t found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The link may be broken or the item is no longer available in this demo.
      </p>
      <Button asChild size="lg" className="mt-6">
        <Link to="/mode">Back to GAW</Link>
      </Button>
    </div>
  );
}
