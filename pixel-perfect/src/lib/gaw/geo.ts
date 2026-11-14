import { useCallback, useEffect, useRef, useState } from "react";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface GeoFix extends LatLng {
  /** Accuracy radius in metres, as reported by the browser. */
  accuracy: number;
  at: number;
}

export type GeoStatus =
  "idle" | "locating" | "ready" | "denied" | "unavailable" | "timeout" | "unsupported";

export function geoErrorMessage(status: GeoStatus): string | null {
  switch (status) {
    case "denied":
      return "Location permission was denied. You can allow it in your browser settings, or set your location by dropping a pin or choosing a barangay.";
    case "unavailable":
      return "Your device couldn't find its location right now. Drop a pin on the map or choose a barangay instead.";
    case "timeout":
      return "Finding your location took too long. Try Refresh Location, or set it manually.";
    case "unsupported":
      return "This browser can't share its location here. Set your location by dropping a pin or choosing a barangay.";
    default:
      return null;
  }
}

function statusFromError(e: GeolocationPositionError): GeoStatus {
  if (e.code === e.PERMISSION_DENIED) return "denied";
  if (e.code === e.TIMEOUT) return "timeout";
  return "unavailable";
}

const OPTIONS: PositionOptions = { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 };

/**
 * Real browser geolocation. getCurrentPosition for a one-off fix, watchPosition only while
 * `watching` is on. The watch is always cleared on stop and on unmount.
 */
export function useGeolocation() {
  const [status, setStatus] = useState<GeoStatus>("idle");
  const [fix, setFix] = useState<GeoFix | null>(null);
  const [watching, setWatching] = useState(false);
  const watchId = useRef<number | null>(null);

  const supported = () =>
    typeof navigator !== "undefined" &&
    "geolocation" in navigator &&
    window.isSecureContext !== false;

  const onPos = useCallback((p: GeolocationPosition) => {
    setFix({
      lat: p.coords.latitude,
      lng: p.coords.longitude,
      accuracy: p.coords.accuracy,
      at: p.timestamp,
    });
    setStatus("ready");
  }, []);

  const locate = useCallback(() => {
    if (!supported()) {
      setStatus("unsupported");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(onPos, (e) => setStatus(statusFromError(e)), OPTIONS);
  }, [onPos]);

  const stopWatch = useCallback(() => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    setWatching(false);
  }, []);

  const startWatch = useCallback(() => {
    if (!supported()) {
      setStatus("unsupported");
      return;
    }
    if (watchId.current !== null) return;
    setStatus((s) => (s === "ready" ? s : "locating"));
    watchId.current = navigator.geolocation.watchPosition(
      onPos,
      (e) => {
        setStatus(statusFromError(e));
        if (e.code === e.PERMISSION_DENIED) stopWatch();
      },
      OPTIONS,
    );
    setWatching(true);
  }, [onPos, stopWatch]);

  useEffect(
    () => () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    },
    [],
  );

  return { status, fix, watching, locate, startWatch, stopWatch, error: geoErrorMessage(status) };
}

export function formatAccuracy(m: number) {
  return m < 1000 ? `±${Math.round(m)} m` : `±${(m / 1000).toFixed(1)} km`;
}
