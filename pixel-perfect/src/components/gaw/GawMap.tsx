import { useEffect, useRef, useState } from "react";
import {
  Check,
  Compass,
  Crosshair,
  Loader2,
  LocateFixed,
  MapPin,
  Navigation,
  Radio,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { segmentedOptionClass } from "./interactions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BARANGAYS,
  barangayName,
  DAVAO_CENTER,
  nearestBarangay,
  RADIUS_OPTIONS,
} from "@/lib/gaw/data";
import { distanceKm, roundKm, type WorkerWithDistance } from "@/lib/gaw/filter";
import { formatAccuracy, useGeolocation, type GeoFix, type LatLng } from "@/lib/gaw/geo";
import type { PlacedLocation } from "@/lib/gaw/store";
import { useTheme } from "@/lib/gaw/theme";
import { cn } from "@/lib/utils";

const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

/**
 * Reads an optional CARTO Basemaps API key from Vite environment variables.
 * Never returns placeholder strings so unauthenticated requests to commercial CARTO endpoints
 * (which return "API KEY REQUIRED" watermarked tiles) are never made without a configured key.
 */
export function getConfiguredCartoKey(): string | null {
  const env = (import.meta as unknown as { env?: Record<string, unknown> }).env;
  const raw = env?.["VITE_CARTO_API_KEY"] ?? env?.["VITE_MAP_API_KEY"];
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (
    !trimmed ||
    trimmed === "YOUR_KEY" ||
    trimmed === "YOUR_API_KEY" ||
    trimmed === "undefined" ||
    trimmed === "null"
  ) {
    return null;
  }
  return trimmed;
}

/**
 * Resolves the authorized tile layer URL and attribution for Light and Dark modes.
 * - If Dark Mode is active AND a valid `VITE_CARTO_API_KEY` is configured, uses CARTO Dark Matter with `?key=...`.
 * - Otherwise uses the authorized OpenStreetMap standard tile layer so the map never displays "API KEY REQUIRED" watermarks.
 */
export function resolveMapTileConfig(
  isDark: boolean,
  forceOsmFallback = false,
): {
  url: string;
  attribution: string;
  provider: "carto-dark" | "osm";
} {
  const cartoKey = getConfiguredCartoKey();
  if (isDark && cartoKey && !forceOsmFallback) {
    return {
      url: `https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png?key=${encodeURIComponent(cartoKey)}`,
      attribution: CARTO_ATTRIBUTION,
      provider: "carto-dark",
    };
  }
  return {
    url: OSM_TILE_URL,
    attribution: OSM_ATTRIBUTION,
    provider: "osm",
  };
}

export interface InteractiveMapProps {
  center: LatLng;
  zoom?: number;
  pin?: LatLng | null;
  pinLabel?: string;
  draggablePin?: boolean;
  onMovePin?: (pos: LatLng) => void;
  gpsFix?: GeoFix | null;
  radiusKm?: number | null;
  workers?: WorkerWithDistance[];
  selectedWorkerId?: string | null;
  onSelectWorker?: (worker: WorkerWithDistance) => void;
  recenterKey?: number;
  showLegend?: boolean;
  className?: string;
}

/**
 * Interactive Leaflet + OpenStreetMap / CARTO component.
 * Dynamically imports Leaflet on the client so SSR never touches `window`.
 */
export function InteractiveMap({
  center,
  zoom = 13,
  pin,
  pinLabel = "Selected location",
  draggablePin = false,
  onMovePin,
  gpsFix,
  radiusKm,
  workers = [],
  selectedWorkerId,
  onSelectWorker,
  recenterKey = 0,
  showLegend = true,
  className,
}: InteractiveMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const tileLayerRef = useRef<import("leaflet").TileLayer | null>(null);
  const layerGroupRef = useRef<import("leaflet").LayerGroup | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const onMovePinRef = useRef(onMovePin);
  const onSelectWorkerRef = useRef(onSelectWorker);
  const [ready, setReady] = useState(false);
  const [tileFallback, setTileFallback] = useState(false);
  const { resolved } = useTheme();
  const isDark = resolved === "dark";

  onMovePinRef.current = onMovePin;
  onSelectWorkerRef.current = onSelectWorker;

  // Mount Leaflet map once on client
  useEffect(() => {
    let cancelled = false;
    if (!containerRef.current || typeof window === "undefined") return;

    import("leaflet").then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;

      const map = L.map(containerRef.current, {
        center: [center.lat, center.lng],
        zoom,
        zoomControl: true,
      });

      const initialTile = resolveMapTileConfig(isDark, false);
      const tileLayer = L.tileLayer(initialTile.url, {
        maxZoom: 19,
        attribution: initialTile.attribution,
      }).addTo(map);

      tileLayer.on("tileerror", () => {
        if (initialTile.provider === "carto-dark") {
          setTileFallback(true);
          tileLayer.setUrl(OSM_TILE_URL);
        }
      });

      const group = L.layerGroup().addTo(map);
      mapRef.current = map;
      tileLayerRef.current = tileLayer;
      layerGroupRef.current = group;

      map.on("click", (e: import("leaflet").LeafletMouseEvent) => {
        if (onMovePinRef.current) {
          onMovePinRef.current({
            lat: Number(e.latlng.lat.toFixed(5)),
            lng: Number(e.latlng.lng.toFixed(5)),
          });
        }
      });

      setReady(true);
    });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        tileLayerRef.current = null;
        layerGroupRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swap tile layer seamlessly when theme switches without resetting map center, zoom, or markers
  useEffect(() => {
    if (!ready || !tileLayerRef.current) return;
    const cfg = resolveMapTileConfig(isDark, tileFallback);
    tileLayerRef.current.setUrl(cfg.url);
  }, [isDark, ready, tileFallback]);

  // Recenter when recenterKey changes
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const target = gpsFix ?? pin ?? center;
    mapRef.current.setView([target.lat, target.lng], mapRef.current.getZoom(), { animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenterKey, ready]);

  // Keep layers (radius circle, GPS marker, pin marker, worker markers) synced
  useEffect(() => {
    if (!ready || !mapRef.current || !layerGroupRef.current || !leafletRef.current) return;
    const L = leafletRef.current;
    const group = layerGroupRef.current;
    group.clearLayers();

    const origin = pin ?? center;
    const primaryMarkerGreen = isDark ? "#43C486" : "#0E7048";
    const primaryMarkerFg = isDark ? "#071910" : "#FFFFFF";

    // 1. Service Coverage Radius Circle (Distinct from GPS Accuracy)
    if (radiusKm && radiusKm > 0) {
      L.circle([origin.lat, origin.lng], {
        radius: radiusKm * 1000,
        color: primaryMarkerGreen,
        weight: 2,
        fillColor: primaryMarkerGreen,
        fillOpacity: isDark ? 0.14 : 0.11,
        dashArray: "6 6",
      }).addTo(group);
    }

    // 2. Current GPS Position Marker (Blue dot + optional accuracy circle)
    if (gpsFix) {
      if (gpsFix.accuracy > 0) {
        L.circle([gpsFix.lat, gpsFix.lng], {
          radius: Math.max(gpsFix.accuracy, 25),
          color: "#2563EB",
          weight: 1.5,
          fillColor: "#3B82F6",
          fillOpacity: 0.16,
        }).addTo(group);
      }

      const gpsIcon = L.divIcon({
        className: "gaw-gps-marker",
        html: `<div style="width:18px;height:18px;border-radius:9999px;background:#2563EB;border:3px solid #FFFFFF;box-shadow:0 0 0 5px rgba(37,99,235,0.32),0 2px 6px rgba(0,0,0,0.45);" title="Current GPS position"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      L.marker([gpsFix.lat, gpsFix.lng], { icon: gpsIcon })
        .bindTooltip(`Current GPS position (${formatAccuracy(gpsFix.accuracy)})`, {
          direction: "top",
          offset: [0, -10],
        })
        .addTo(group);
    }

    // 3. Worker markers (for Employer Finder map)
    workers.forEach((w) => {
      const selected = w.id === selectedWorkerId;
      const bg = selected ? "#F4B544" : w.available ? primaryMarkerGreen : "#475569";
      const fg = selected ? "#1B1304" : w.available ? primaryMarkerFg : "#F3F7F4";
      const borderCol = isDark ? "#0D1512" : "#FFFFFF";
      const ring = selected ? "0 0 0 4px rgba(244,181,68,0.48)" : "0 2px 8px rgba(0,0,0,0.38)";
      const workerIcon = L.divIcon({
        className: "gaw-worker-marker",
        html: `<button type="button" aria-label="${w.name} (${w.skill})" style="display:grid;place-items:center;width:34px;height:34px;border-radius:9999px;background:${bg};color:${fg};font-weight:800;font-size:11px;border:2px solid ${borderCol};box-shadow:${ring};cursor:pointer;">${w.initials}</button>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      const marker = L.marker([w.lat, w.lng], { icon: workerIcon }).addTo(group);
      marker.bindTooltip(`${w.name} · ${w.skill} (≈${w.distance} km)`, {
        direction: "top",
        offset: [0, -16],
      });
      marker.on("click", () => {
        onSelectWorkerRef.current?.(w);
      });
    });

    // 4. Selected Service Location Pin (Distinct GAW green map pin, draggable)
    if (pin) {
      const pinOuterBg = isDark ? "#43C486" : "#0E7048";
      const pinCoreBg = "#123C39";
      const pinBorder = isDark ? "#0D1512" : "#FFFFFF";
      const pinIcon = L.divIcon({
        className: "gaw-pin-marker",
        html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-16px);">
          <div style="display:grid;place-items:center;width:34px;height:34px;border-radius:9999px;background:${pinOuterBg};border:2.5px solid ${pinBorder};box-shadow:0 4px 14px rgba(0,0,0,0.42);">
            <div style="display:grid;place-items:center;width:20px;height:20px;border-radius:9999px;background:${pinCoreBg};">
              <div style="width:8px;height:8px;border-radius:9999px;background:#F4B544;"></div>
            </div>
          </div>
          <div style="width:4px;height:9px;border-radius:2px;background:${pinOuterBg};margin-top:-2px;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>
        </div>`,
        iconSize: [34, 42],
        iconAnchor: [17, 38],
      });

      const marker = L.marker([pin.lat, pin.lng], {
        icon: pinIcon,
        draggable: draggablePin,
      }).addTo(group);

      marker.bindTooltip(draggablePin ? `${pinLabel} — drag pin or tap map to move` : pinLabel, {
        direction: "top",
        offset: [0, -30],
      });

      if (draggablePin) {
        marker.on("dragend", () => {
          const ll = marker.getLatLng();
          onMovePinRef.current?.({
            lat: Number(ll.lat.toFixed(5)),
            lng: Number(ll.lng.toFixed(5)),
          });
        });
      }
    }
  }, [
    ready,
    center,
    pin,
    pinLabel,
    draggablePin,
    gpsFix,
    radiusKm,
    workers,
    selectedWorkerId,
    isDark,
  ]);

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-border bg-muted shadow-soft",
          className,
        )}
      >
        <div
          ref={containerRef}
          className="h-full min-h-[260px] w-full"
          aria-label="Interactive location map"
        />
        {!ready && (
          <div className="absolute inset-0 grid place-items-center bg-muted/85 text-xs font-semibold text-muted-foreground">
            Loading interactive map…
          </div>
        )}
      </div>

      {showLegend && (
        <div
          aria-label="Map marker legend"
          className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 text-[11px] font-medium text-muted-foreground"
        >
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-grid size-3.5 place-items-center rounded-full bg-primary ring-2 ring-primary/25">
              <span className="size-1.5 rounded-full bg-gold" />
            </span>
            <span>Selected Service Location {draggablePin ? "(Draggable Pin)" : ""}</span>
          </span>
          {typeof radiusKm === "number" && radiusKm > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <span className="size-3 rounded-full border-2 border-dashed border-primary bg-primary/15" />
              <span>Service Coverage ({radiusKm} km radius)</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#2563EB] ring-2 ring-[#2563EB]/30" />
            <span>Current GPS Position</span>
          </span>
        </div>
      )}
    </div>
  );
}

export interface MapToolbarProps {
  locating: boolean;
  watching: boolean;
  onUseCurrentLocation: () => void;
  onToggleWatch: () => void;
  onRecenter: () => void;
  onRefresh: () => void;
}

/**
 * Compact, responsive geolocation control bar with clear primary/secondary action hierarchy.
 */
export function MapToolbar({
  locating,
  watching,
  onUseCurrentLocation,
  onToggleWatch,
  onRecenter,
  onRefresh,
}: MapToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label="Map and GPS controls"
      className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/80 bg-muted/60 p-2 dark:bg-[#111F19]"
    >
      {/* Primary Geolocation Action */}
      <Button
        type="button"
        size="sm"
        variant="default"
        onClick={onUseCurrentLocation}
        disabled={locating}
        aria-label="Use My Current Location"
        className="h-9 px-3.5 shadow-xs"
      >
        {locating ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Crosshair className="size-3.5" />
        )}
        <span>Use My Location</span>
      </Button>

      {/* Secondary Actions Cluster */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          type="button"
          size="sm"
          variant={watching ? "gold" : "outline"}
          aria-pressed={watching}
          onClick={onToggleWatch}
          className="h-9 px-3"
        >
          <Radio className={cn("size-3.5", watching && "animate-pulse")} />
          <span>{watching ? "Stop Live GPS" : "Track Live GPS"}</span>
          {watching && (
            <span className="ml-0.5 rounded-full bg-black/15 px-1.5 py-0.2 text-[10px] font-extrabold uppercase tracking-wider">
              ON
            </span>
          )}
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onRecenter}
          aria-label="Recenter Map"
          title="Recenter map on active pin or GPS"
          className="h-9 px-2.5"
        >
          <Compass className="size-3.5" />
          <span>Recenter</span>
        </Button>

        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onRefresh}
          disabled={locating}
          aria-label="Refresh Location"
          title="Refresh GPS location"
          className="h-9 px-2.5 text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={cn("size-3.5", locating && "animate-spin")} />
          <span>Refresh</span>
        </Button>
      </div>
    </div>
  );
}

export interface LocationPickerProps {
  /** Currently confirmed location or barangay origin */
  initialLocation: LatLng;
  initialBarangayId: string;
  initialLabel?: string | undefined;
  /** Optional working radius selector for Worker Mode */
  radiusKm?: number | undefined;
  onRadiusChange?: ((km: number) => void) | undefined;
  /** Called when user clicks Confirm Location */
  onConfirm: (placed: PlacedLocation, barangayId: string) => void;
  confirmLabel?: string | undefined;
  modeLabel?: string | undefined;
}

export function LocationPicker({
  initialLocation,
  initialBarangayId,
  initialLabel,
  radiusKm,
  onRadiusChange,
  onConfirm,
  confirmLabel = "Confirm Location",
  modeLabel = "Service Area & Location",
}: LocationPickerProps) {
  const geo = useGeolocation();
  const [pin, setPin] = useState<LatLng>(initialLocation);
  const [source, setSource] = useState<PlacedLocation["source"]>("pin");
  const [barangayId, setBarangayId] = useState<string>(initialBarangayId);
  const [customAddress, setCustomAddress] = useState<string>(initialLabel ?? "");
  const [recenterKey, setRecenterKey] = useState(0);
  const [confirmedOnce, setConfirmedOnce] = useState(false);

  // Sync pin when live GPS fix arrives
  useEffect(() => {
    if (geo.fix) {
      const next = { lat: Number(geo.fix.lat.toFixed(5)), lng: Number(geo.fix.lng.toFixed(5)) };
      setPin(next);
      setSource("gps");
      const near = nearestBarangay(next);
      setBarangayId(near.id);
      if (!customAddress.trim()) {
        setCustomAddress(`Near ${near.name} (GPS)`);
      }
      setRecenterKey((k) => k + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.fix]);

  const handleMovePin = (pos: LatLng) => {
    setPin(pos);
    setSource("pin");
    const near = nearestBarangay(pos);
    setBarangayId(near.id);
    setConfirmedOnce(false);
  };

  const handleBarangaySelect = (id: string) => {
    setBarangayId(id);
    const b = BARANGAYS.find((x) => x.id === id);
    if (b) {
      setPin({ lat: b.lat, lng: b.lng });
      setSource("barangay");
      setRecenterKey((k) => k + 1);
      setConfirmedOnce(false);
    }
  };

  const handleUseCurrentLocation = () => {
    setConfirmedOnce(false);
    geo.locate();
  };

  const handleConfirm = () => {
    const near = BARANGAYS.find((b) => b.id === barangayId) ?? nearestBarangay(pin);
    const trimmed = customAddress.trim();
    const label = trimmed || `${near.name} (${pin.lat.toFixed(4)}, ${pin.lng.toFixed(4)})`;
    onConfirm(
      {
        lat: pin.lat,
        lng: pin.lng,
        label,
        source,
      },
      near.id,
    );
    setConfirmedOnce(true);
    toast.success(`Location confirmed: ${label}`);
  };

  const distFromDavao = roundKm(distanceKm(pin, DAVAO_CENTER));
  const outsideDavao = distFromDavao > 30;
  const isWorkerAreaMode = typeof radiusKm === "number";

  return (
    <div className="space-y-4 rounded-3xl border bg-card p-4 shadow-soft md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-primary">{modeLabel}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isWorkerAreaMode
              ? "Through our live GPS tracking system, we connect workers and employers in the same general area. Use Live GPS or drag the green pin."
              : "Through our live GPS tracking system, we connect workers and employers in the same general area. Use Live GPS or drag the map pin to your general area."}
          </p>
        </div>
        {geo.fix ? (
          <span
            role="status"
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground"
          >
            <LocateFixed className="size-3.5 text-primary" aria-hidden />
            <span>
              {geo.watching ? "Live GPS" : "GPS Active"} · Accuracy{" "}
              {formatAccuracy(geo.fix.accuracy)}
            </span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            <MapPin className="size-3 text-primary" aria-hidden />
            <span>General area pin active</span>
          </span>
        )}
      </div>

      {/* Compact Responsive Map Toolbar */}
      <MapToolbar
        locating={geo.status === "locating"}
        watching={geo.watching}
        onUseCurrentLocation={handleUseCurrentLocation}
        onToggleWatch={() => (geo.watching ? geo.stopWatch() : geo.startWatch())}
        onRecenter={() => setRecenterKey((k) => k + 1)}
        onRefresh={handleUseCurrentLocation}
      />

      {/* Permission / Geolocation Error Fallback Banner */}
      {geo.error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-2xl border border-status-declined/30 bg-status-declined-bg p-3.5 text-xs font-medium text-status-declined"
        >
          <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div className="space-y-1">
            <p className="font-bold">GPS Location Unavailable</p>
            <p>{geo.error}</p>
          </div>
        </div>
      )}

      {outsideDavao && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-gold-soft px-3.5 py-2.5 text-xs text-gold-foreground">
          <span>
            Current pin is {distFromDavao} km from Davao City center. Demo workers are seeded in
            Davao City.
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              handleBarangaySelect("bajada");
              toast("Moved pin to Bajada, Davao City");
            }}
          >
            Jump to Davao City
          </Button>
        </div>
      )}

      {/* Interactive Map */}
      <InteractiveMap
        center={pin}
        pin={pin}
        pinLabel={customAddress.trim() || "General area pin"}
        draggablePin
        onMovePin={handleMovePin}
        gpsFix={geo.fix}
        radiusKm={radiusKm ?? null}
        recenterKey={recenterKey}
        className="h-64 md:h-72"
      />

      {/* General Area Label Input */}
      <div className="space-y-1.5">
        <label
          htmlFor="loc-picker-addr"
          className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          Street, Landmark, or General Area Label
        </label>
        <Input
          id="loc-picker-addr"
          value={customAddress}
          onChange={(e) => {
            setCustomAddress(e.target.value);
            setConfirmedOnce(false);
          }}
          placeholder="e.g. Near your street, landmark, or general area"
        />
      </div>

      {/* Optional Working Radius Selector (Worker Mode) */}
      {typeof radiusKm === "number" && onRadiusChange && (
        <fieldset>
          <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Working Radius (Service Coverage Circle)
          </legend>
          <div className="grid grid-cols-4 gap-1.5 rounded-xl border border-border/50 bg-muted p-1">
            {RADIUS_OPTIONS.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={radiusKm === r}
                onClick={() => onRadiusChange(r)}
                className={segmentedOptionClass(
                  radiusKm === r,
                  "card",
                  "h-9 rounded-lg text-xs font-bold",
                )}
              >
                {r} km
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {/* Selected Coordinates + Confirm Action */}
      <div className="flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">
            <MapPin className="mr-1 inline size-3.5 text-primary" aria-hidden />
            {customAddress.trim() || "Selected General Area Pin"}
          </p>
          <p className="mt-0.5">
            Coordinates: {pin.lat.toFixed(4)}° N, {pin.lng.toFixed(4)}° E · Connected via Live GPS
            in the same general area
          </p>
        </div>
        <Button type="button" onClick={handleConfirm} className="shrink-0">
          <Check className="size-4" />
          {confirmedOnce ? "Location Confirmed" : confirmLabel}
        </Button>
      </div>
    </div>
  );
}

/**
 * Explicit opt-in live location sharing control for an active (`in_progress`) booking.
 * Never shares automatically; stops immediately when turned off or unmounted.
 */
export function LiveJobSharingCard({
  bookingTitle,
  barangayId,
  targetLocation,
}: {
  bookingTitle: string;
  barangayId: string;
  targetLocation: LatLng | null;
}) {
  const geo = useGeolocation();
  const [sharing, setSharing] = useState(false);

  const fallbackCenter =
    targetLocation ?? BARANGAYS.find((b) => b.id === barangayId) ?? DAVAO_CENTER;

  const toggleSharing = () => {
    if (sharing) {
      geo.stopWatch();
      setSharing(false);
      toast("Stopped live location sharing");
    } else {
      setSharing(true);
      geo.startWatch();
      toast.success("Live location sharing started for this active booking");
    }
  };

  return (
    <div className="mt-3 rounded-2xl border bg-muted/50 p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "grid size-8 place-items-center rounded-xl",
              sharing
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground",
            )}
          >
            <Navigation className="size-4" aria-hidden />
          </span>
          <div>
            <p className="text-xs font-bold">
              {sharing ? "Live Job Location Sharing: ON" : "Optional Job Location Sharing"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {sharing
                ? geo.fix
                  ? `Sharing browser GPS (${formatAccuracy(geo.fix.accuracy)}) for “${bookingTitle}”`
                  : "Requesting browser GPS permission…"
                : "Share live location only during this active job. Off by default."}
            </p>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant={sharing ? "destructive" : "outline"}
          onClick={toggleSharing}
        >
          {sharing ? "Stop Sharing" : "Start Sharing"}
        </Button>
      </div>

      {sharing && (
        <div className="mt-3 space-y-2">
          {geo.error && (
            <p
              role="alert"
              className="rounded-xl bg-status-declined-bg px-3 py-2 text-xs text-status-declined"
            >
              {geo.error}
            </p>
          )}
          <InteractiveMap
            center={geo.fix ?? fallbackCenter}
            pin={fallbackCenter}
            pinLabel={`${bookingTitle} (${barangayName(barangayId)})`}
            gpsFix={geo.fix}
            recenterKey={geo.fix?.at ?? 0}
            className="h-44"
          />
          <p className="text-[11px] text-muted-foreground">
            Privacy note: Live sharing only runs while this tab is open and you keep sharing turned
            on. No background tracking is performed.
          </p>
        </div>
      )}
    </div>
  );
}
