// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// Never set ssr.external or resolve.external: the Worker has no runtime module resolution, so
// the build fails. Never add compression (compressPublicAssets, vite-plugin-compression):
// hosting already compresses at the edge.
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

type ExpressHandler = (req: { url?: string }, res: unknown, next: () => void) => void;

function gawBackendApiPlugin() {
  let apiHandlerPromise: Promise<ExpressHandler> | undefined;

  async function getApiHandler(): Promise<ExpressHandler> {
    if (!apiHandlerPromise) {
      apiHandlerPromise = (async () => {
        const distDir = resolve(process.cwd(), "../dist");
        const [{ createDatabase }, { GawRepository }, { seedDemoMarketplace }, { createApp }] =
          await Promise.all([
            import(pathToFileURL(resolve(distDir, "db/database.js")).href),
            import(pathToFileURL(resolve(distDir, "db/repository.js")).href),
            import(pathToFileURL(resolve(distDir, "db/seed.js")).href),
            import(pathToFileURL(resolve(distDir, "api/app.js")).href),
          ]);
        const db = createDatabase();
        const repo = new GawRepository(db);
        seedDemoMarketplace(repo);
        return createApp(db) as ExpressHandler;
      })();
    }
    return apiHandlerPromise;
  }

  const mountMiddleware = (middlewares: {
    use: (fn: (req: { url?: string }, res: unknown, next: () => void) => void) => void;
  }) => {
    middlewares.use((req, res, next) => {
      if (!req.url?.startsWith("/api/v1")) {
        next();
        return;
      }
      void getApiHandler()
        .then((app) => app(req, res, next))
        .catch(() => next());
    });
  };

  return {
    name: "gaw:backend-api-bridge",
    configureServer(server: {
      middlewares: {
        use: (fn: (req: { url?: string }, res: unknown, next: () => void) => void) => void;
      };
    }) {
      mountMiddleware(server.middlewares);
    },
    configurePreviewServer(server: {
      middlewares: {
        use: (fn: (req: { url?: string }, res: unknown, next: () => void) => void) => void;
      };
    }) {
      mountMiddleware(server.middlewares);
    },
  };
}

export default defineConfig({
  plugins: [gawBackendApiPlugin()],
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
