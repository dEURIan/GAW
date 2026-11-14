import { type MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bookmark,
  Crosshair,
  Footprints,
  MapPin,
  Minus,
  Navigation,
  Pause,
  Play,
  Plus,
  ShieldCheck,
  SkipForward,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatDistanceBadge, type Job } from "@/lib/gaw/data";
import type { JobWithDistance } from "@/lib/gaw/filter";
import { useGaw } from "@/lib/gaw/store";
import { cn } from "@/lib/utils";

const MAP_BOUNDS = {
  minLat: 7.008,
  maxLat: 7.125,
  minLng: 125.485,
  maxLng: 125.652,
} as const;

const TILE_SIZE = 256;
const MIN_ZOOM = 12;
const MAX_ZOOM = 18;

function latLngToWorldPx(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const scale = TILE_SIZE * 2 ** zoom;
  const x = ((lng + 180) / 360) * scale;
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const clampedSin = Math.min(0.9999, Math.max(-0.9999, sinLat));
  const y = (0.5 - Math.log((1 + clampedSin) / (1 - clampedSin)) / (4 * Math.PI)) * scale;
  return { x, y };
}

function worldPxToLatLng(
  worldX: number,
  worldY: number,
  zoom: number,
): { lat: number; lng: number } {
  const scale = TILE_SIZE * 2 ** zoom;
  const lng = (worldX / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * worldY) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return {
    lat: Number(lat.toFixed(5)),
    lng: Number(lng.toFixed(5)),
  };
}

function projectToViewportPx(
  lat: number,
  lng: number,
  centerWorld: { x: number; y: number },
  viewport: { width: number; height: number },
  zoom: number,
): { x: number; y: number } {
  const pt = latLngToWorldPx(lat, lng, zoom);
  const rawX = pt.x - centerWorld.x + viewport.width / 2;
  const rawY = pt.y - centerWorld.y + viewport.height / 2;
  const padX = Math.min(28, Math.floor(viewport.width / 4));
  const padY = Math.min(24, Math.floor(viewport.height / 4));
  return {
    x: Math.round(Math.min(viewport.width - padX, Math.max(padX, rawX))),
    y: Math.round(Math.min(viewport.height - padY, Math.max(padY, rawY))),
  };
}

interface MapTileItem {
  key: string;
  url: string;
  fallbackUrl: string;
  leftPx: number;
  topPx: number;
}

function buildViewportTiles(
  centerWorld: { x: number; y: number },
  viewport: { width: number; height: number },
  zoom: number,
): MapTileItem[] {
  const minWorldX = centerWorld.x - viewport.width / 2;
  const maxWorldX = centerWorld.x + viewport.width / 2;
  const minWorldY = centerWorld.y - viewport.height / 2;
  const maxWorldY = centerWorld.y + viewport.height / 2;
  const maxTileIdx = 2 ** zoom - 1;

  const minTx = Math.max(0, Math.floor(minWorldX / TILE_SIZE));
  const maxTx = Math.min(maxTileIdx, Math.floor(maxWorldX / TILE_SIZE));
  const minTy = Math.max(0, Math.floor(minWorldY / TILE_SIZE));
  const maxTy = Math.min(maxTileIdx, Math.floor(maxWorldY / TILE_SIZE));

  const tiles: MapTileItem[] = [];
  for (let tx = minTx; tx <= maxTx; tx += 1) {
    const leftPx = Math.round(tx * TILE_SIZE - centerWorld.x + viewport.width / 2);
    for (let ty = minTy; ty <= maxTy; ty += 1) {
      const topPx = Math.round(ty * TILE_SIZE - centerWorld.y + viewport.height / 2);
      tiles.push({
        key: `${zoom}-${tx}-${ty}`,
        url: `https://tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`,
        fallbackUrl: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${zoom}/${ty}/${tx}`,
        leftPx,
        topPx,
      });
    }
  }
  return tiles;
}

export function projectDavaoCoord(lat: number, lng: number): { x: number; y: number } {
  const xRaw = ((lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * 100;
  const yRaw = ((MAP_BOUNDS.maxLat - lat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * 100;
  return {
    x: Math.min(93, Math.max(7, xRaw)),
    y: Math.min(91, Math.max(9, yRaw)),
  };
}

export function unprojectDavaoCoord(xPct: number, yPct: number): { lat: number; lng: number } {
  const clampedX = Math.min(98, Math.max(2, xPct));
  const clampedY = Math.min(98, Math.max(2, yPct));
  const lng = MAP_BOUNDS.minLng + (clampedX / 100) * (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng);
  const lat = MAP_BOUNDS.maxLat - (clampedY / 100) * (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat);
  return {
    lat: Number(lat.toFixed(5)),
    lng: Number(lng.toFixed(5)),
  };
}

export function LiveGpsTracker({
  jobs,
  selectedJobId,
  onSelectJob,
  singleJobMode = false,
}: {
  jobs: JobWithDistance[];
  selectedJobId?: string | undefined;
  onSelectJob?: ((job: Job) => void) | undefined;
  singleJobMode?: boolean;
}) {
  const {
    userGps,
    setUserGps,
    nudgeUserGps,
    stepSimulatedWaypoint,
    requestBrowserGps,
    isSimulatingGps,
    isLiveGpsWatching,
    toggleSimulateGps,
    gpsStatusMessage,
    savedJobIds,
    toggleSaveJob,
  } = useGaw();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [viewport, setViewport] = useState({ width: 760, height: 360 });
  const [zoom, setZoom] = useState<number>(14);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      if (el.clientWidth > 0 && el.clientHeight > 0) {
        setViewport({ width: el.clientWidth, height: el.clientHeight });
      }
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const activeJob =
    jobs.find((j) => j.id === selectedJobId) ?? (jobs.length > 0 ? jobs[0] : undefined);

  const mapCenter = useMemo(() => {
    if (zoom >= 14) {
      return { lat: userGps.lat, lng: userGps.lng };
    }
    if (userGps.lng < 125.55 || userGps.lat < 7.04) {
      return {
        lat: userGps.lat * 0.7 + 7.072 * 0.3,
        lng: userGps.lng * 0.7 + 125.602 * 0.3,
      };
    }
    return { lat: 7.074, lng: 125.606 };
  }, [userGps.lat, userGps.lng, zoom]);

  const centerWorld = useMemo(
    () => latLngToWorldPx(mapCenter.lat, mapCenter.lng, zoom),
    [mapCenter.lat, mapCenter.lng, zoom],
  );
  const mapTiles = useMemo(
    () => buildViewportTiles(centerWorld, viewport, zoom),
    [centerWorld, viewport, zoom],
  );

  const userPoint = projectToViewportPx(userGps.lat, userGps.lng, centerWorld, viewport, zoom);
  const activePoint = activeJob
    ? projectToViewportPx(activeJob.lat, activeJob.lng, centerWorld, viewport, zoom)
    : null;

  const handleMapClick = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const worldX = centerWorld.x + clickX - rect.width / 2;
    const worldY = centerWorld.y + clickY - rect.height / 2;
    const coords = worldPxToLatLng(worldX, worldY, zoom);
    setUserGps(coords.lat, coords.lng, "manual", "Custom Pinned Davao Location", 10);
  };

  const handleSaveToggle = (jobId: string) => {
    const result = toggleSaveJob(jobId);
    if (!result.ok) {
      toast.error(result.reason ?? "Could not save job");
      return;
    }
    toast.success(result.saved ? "Saved to your Desired Gigs queue" : "Removed from Desired Gigs");
  };

  const isSaved = activeJob ? savedJobIds.includes(activeJob.id) : false;
  const gpsModeLabel = isSimulatingGps
    ? "Worker Walk Sim"
    : userGps.source === "gps" || isLiveGpsWatching
      ? "Live GPS Active"
      : "Simulated Location";

  return (
    <section
      aria-label="Live Davao City GPS Job Tracker"
      className="overflow-hidden rounded-3xl border bg-card shadow-lift"
    >
      {/* Grab / Foodpanda Top GPS HUD */}
      <div className="flex flex-col gap-3 border-b bg-deep px-4 py-3.5 text-deep-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-300">
              <span className="size-2 animate-pulse rounded-full bg-emerald-400" aria-hidden />
              {gpsModeLabel}
            </span>
            <span className="font-mono text-[11px] text-deep-muted">
              {userGps.lat.toFixed(4)}°N, {userGps.lng.toFixed(4)}°E · ±{userGps.accuracyMeters}m
            </span>
          </div>
          <p className="mt-1 truncate text-sm font-bold">{userGps.label}</p>
          {gpsStatusMessage && (
            <p className="truncate text-xs text-deep-muted" aria-live="polite">
              {gpsStatusMessage}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="gold"
            onClick={requestBrowserGps}
            className="min-h-10 gap-1.5"
          >
            <Crosshair className="size-4" aria-hidden />
            Pinpoint My GPS
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={toggleSimulateGps}
            aria-pressed={isSimulatingGps}
            className={cn(
              "min-h-10 gap-1.5 border-deep-foreground/25 bg-deep-foreground/10 text-deep-foreground hover:bg-deep-foreground/20 hover:text-deep-foreground",
              isSimulatingGps && "border-gold bg-gold/25 text-gold",
            )}
          >
            {isSimulatingGps ? (
              <>
                <Pause className="size-3.5" aria-hidden /> Pause Sim
              </>
            ) : (
              <>
                <Play className="size-3.5" aria-hidden /> Worker Walk Demo
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Live GPS Proximity Notice & Simulate Location Toolbar */}
      {!singleJobMode && (
        <div className="border-b bg-muted/40">
          <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2 text-xs text-muted-foreground">
            <Navigation className="size-3.5 shrink-0 text-primary" aria-hidden />
            <span>
              <strong className="text-foreground">Live GPS Tracking System:</strong> Connecting
              workers and employers in the same general area in real time.
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 px-3 py-2">
            <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Simulate Move (~250m):
            </span>
            {(
              [
                ["Step North", "Step N", 0.0022, 0, "North", ArrowUp],
                ["Step South", "Step S", -0.0022, 0, "South", ArrowDown],
                ["Step West", "Step W", 0, -0.0022, "West", ArrowLeft],
                ["Step East", "Step E", 0, 0.0022, "East", ArrowRight],
              ] as const
            ).map(([ariaLabel, shortLabel, dLat, dLng, dir, Icon]) => (
              <button
                key={ariaLabel}
                type="button"
                aria-label={ariaLabel}
                onClick={() => nudgeUserGps(dLat, dLng, dir)}
                className="inline-flex min-h-8 shrink-0 cursor-pointer items-center gap-1 rounded-full border bg-card px-2.5 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <Icon className="size-3.5" aria-hidden />
                {shortLabel}
              </button>
            ))}
            <button
              type="button"
              onClick={stepSimulatedWaypoint}
              className="inline-flex min-h-8 shrink-0 cursor-pointer items-center gap-1 rounded-full border border-primary/35 bg-secondary px-2.5 text-xs font-bold text-secondary-foreground transition-colors hover:border-primary"
            >
              <SkipForward className="size-3.5" aria-hidden />
              Next Route Stop
            </button>
          </div>
        </div>
      )}

      {/* Interactive Street / GPS Map Canvas */}
      <div
        ref={containerRef}
        role="region"
        aria-label="Interactive Davao City GPS map — click or tap anywhere to move your location pin"
        onClick={handleMapClick}
        className={cn(
          "relative w-full cursor-crosshair select-none overflow-hidden bg-[#E9F1EC]",
          singleJobMode ? "h-60 sm:h-72" : "h-72 sm:h-96",
        )}
      >
        {/* Vector Fallback: Davao Metro Geography + Street Grid + Davao River + Gulf Coast */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 size-full"
          aria-hidden="true"
        >
          {/* Davao Gulf water along East/South-East */}
          <path d="M 88 0 L 100 0 L 100 100 L 58 100 Q 74 78 82 55 T 88 0 Z" fill="#C7E3EA" />
          {/* Subtle Davao Grid Streets */}
          <g stroke="#D5E3DA" strokeWidth="0.35">
            <line x1="0" y1="20" x2="100" y2="20" />
            <line x1="0" y1="40" x2="100" y2="40" />
            <line x1="0" y1="60" x2="100" y2="60" />
            <line x1="0" y1="80" x2="100" y2="80" />
            <line x1="20" y1="0" x2="20" y2="100" />
            <line x1="40" y1="0" x2="40" y2="100" />
            <line x1="60" y1="0" x2="60" y2="100" />
            <line x1="80" y1="0" x2="80" y2="100" />
          </g>
          {/* Davao River */}
          <path
            d="M 18 14 Q 44 26 57 42 T 71 58"
            fill="none"
            stroke="#9BD0DF"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          {/* Major Arterial Roads: McArthur Hwy -> Poblacion -> J.P. Laurel (Bajada) -> Buhangin / Lanang */}
          <g stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" fill="none">
            <path d="M 8 88 Q 34 74 60 58 T 78 16" />
            <path d="M 60 58 Q 74 44 80 28 T 94 14" />
            <path d="M 10 28 Q 48 22 76 16" />
          </g>
        </svg>

        {/* Pixel-Exact 1:1 Retina @2x Street Tiles (256x256 CSS -> 512x512 HiDPI pixels) */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          {mapTiles.map((tile) => (
            <img
              key={tile.key}
              src={tile.url}
              alt=""
              width={TILE_SIZE}
              height={TILE_SIZE}
              draggable={false}
              referrerPolicy="origin"
              onError={(e) => {
                const img = e.currentTarget;
                if (!img.dataset["fallback"]) {
                  img.dataset["fallback"] = "1";
                  img.src = tile.fallbackUrl;
                } else {
                  img.style.display = "none";
                }
              }}
              style={{
                left: `${tile.leftPx}px`,
                top: `${tile.topPx}px`,
              }}
              className="absolute h-[256px] w-[256px] max-w-none select-none opacity-100"
            />
          ))}
        </div>

        {/* Live Route Overlay Path in 1:1 Viewport Pixels */}
        {activePoint && (
          <svg
            viewBox={`0 0 ${viewport.width} ${viewport.height}`}
            className="pointer-events-none absolute inset-0 z-10 size-full"
            aria-hidden="true"
          >
            <line
              x1={userPoint.x}
              y1={userPoint.y}
              x2={activePoint.x}
              y2={activePoint.y}
              stroke="#0E7048"
              strokeWidth="3"
              strokeDasharray="6 5"
              strokeLinecap="round"
            />
            <circle cx={activePoint.x} cy={activePoint.y} r="6" fill="#F4B544" />
          </svg>
        )}

        {/* Map Attribution & Zoom Level */}
        <span className="pointer-events-none absolute bottom-2 right-2 z-10 rounded bg-white/90 px-2 py-0.5 text-[10px] font-bold tracking-wide text-[#123C39] shadow-sm">
          © OpenStreetMap · z{zoom} · Tap map to pin
        </span>

        {/* Top-Right Crisp Zoom Controls */}
        <div className="absolute right-2.5 top-2.5 z-40 flex flex-col overflow-hidden rounded-xl border border-border/80 bg-white/95 shadow-soft backdrop-blur-sm">
          <button
            type="button"
            aria-label="Zoom in"
            disabled={zoom >= MAX_ZOOM}
            onClick={(ev) => {
              ev.stopPropagation();
              setZoom((z) => Math.min(MAX_ZOOM, z + 1));
            }}
            className="flex size-8 cursor-pointer items-center justify-center border-b text-deep transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Zoom out"
            disabled={zoom <= MIN_ZOOM}
            onClick={(ev) => {
              ev.stopPropagation();
              setZoom((z) => Math.max(MIN_ZOOM, z - 1));
            }}
            className="flex size-8 cursor-pointer items-center justify-center text-deep transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Minus className="size-4" aria-hidden />
          </button>
        </div>

        {/* Non-occluding Top-Left Route Telemetry HUD Badge (Foodpanda / Grab style) */}
        {activeJob && (
          <div className="pointer-events-none absolute left-2.5 top-2.5 z-40 flex items-center gap-1.5 rounded-full border border-primary/30 bg-white/95 px-2.5 py-1 text-[11px] font-extrabold text-deep shadow-soft backdrop-blur-sm">
            <span className="size-2 rounded-full bg-primary" aria-hidden />
            <span>
              {formatDistanceBadge(activeJob.distanceKm)} · ~{activeJob.walkMin}m walk · ~
              {activeJob.rideMin}m commute
            </span>
          </div>
        )}

        {/* Job Markers on Map */}
        {jobs.map((job) => {
          const pos = projectToViewportPx(job.lat, job.lng, centerWorld, viewport, zoom);
          const isSelected = activeJob?.id === job.id;
          return (
            <button
              key={job.id}
              type="button"
              onClick={(ev) => {
                ev.stopPropagation();
                onSelectJob?.(job);
              }}
              style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
              aria-label={`${job.title}, ${job.budget}, ${formatDistanceBadge(job.distanceKm)}`}
              aria-pressed={isSelected}
              className={cn(
                "absolute z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full border px-2 py-1 text-[11px] font-extrabold shadow-md transition-all",
                isSelected
                  ? "z-30 scale-110 border-gold bg-deep text-deep-foreground ring-4 ring-gold/50"
                  : job.urgent
                    ? "border-amber-500 bg-gold text-gold-foreground hover:scale-105"
                    : "border-primary/40 bg-card text-foreground hover:scale-105 hover:border-primary",
              )}
            >
              <span className="inline-flex items-center gap-1">
                {job.urgent && <Zap className="size-3 shrink-0" aria-hidden />}
                {job.budget}
              </span>
            </button>
          );
        })}

        {/* Live User GPS Pin ("YOU") with Pulsing Grab/Foodpanda Halo */}
        <div
          style={{ left: `${userPoint.x}px`, top: `${userPoint.y}px` }}
          className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2"
        >
          <span className="absolute -inset-4 animate-ping rounded-full bg-primary/30" />
          <span className="relative flex size-8 items-center justify-center rounded-full border-2 border-white bg-primary text-primary-foreground shadow-lg">
            <Navigation className="size-4 fill-current" aria-hidden />
          </span>
          <span className="mt-0.5 block rounded-full bg-deep px-1.5 py-0.5 text-center text-[9px] font-extrabold uppercase tracking-wider text-white shadow">
            You
          </span>
        </div>
      </div>

      {/* Selected Job Live Proximity Telemetry Card */}
      {activeJob && (
        <div className="border-t bg-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
                  {activeJob.category}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                  <ShieldCheck className="size-3.5" aria-hidden />
                  Above ₱63.50/hr floor
                </span>
                {activeJob.urgent && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gold-soft px-2 py-0.5 text-xs font-semibold text-gold-foreground">
                    <Zap className="size-3" aria-hidden /> Urgent
                  </span>
                )}
              </div>
              <h3 className="mt-1.5 truncate text-base font-extrabold">{activeJob.title}</h3>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 font-semibold text-primary">
                  <MapPin className="size-3.5" aria-hidden />
                  {formatDistanceBadge(activeJob.distanceKm)}
                </span>
                <span>~{activeJob.rideMin} min commute</span>
                <span className="inline-flex items-center gap-1">
                  <Footprints className="size-3.5" aria-hidden /> ~{activeJob.walkMin} min walk
                </span>
                <span>· {activeJob.landmark}</span>
              </p>
            </div>

            {!singleJobMode && (
              <div className="flex shrink-0 items-center gap-2">
                <div className="mr-1 text-right">
                  <p className="text-lg font-extrabold text-deep">{activeJob.budget}</p>
                  <p className="text-[11px] text-muted-foreground">
                    ~{activeJob.estimatedHours}h · Same general area
                  </p>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant={isSaved ? "gold" : "outline"}
                  aria-label={isSaved ? "Remove from Desired Gigs" : "Save to Desired Gigs"}
                  onClick={() => handleSaveToggle(activeJob.id)}
                  className="size-10 shrink-0 rounded-xl"
                >
                  <Bookmark className={cn("size-4", isSaved && "fill-current")} aria-hidden />
                </Button>
                <Button asChild size="sm" className="min-h-10">
                  <Link to="/jobs/$id" params={{ id: activeJob.id }}>
                    View & Apply
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
