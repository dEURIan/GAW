import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  createGigOnApi,
  fetchNearbyGigsFromApi,
  syncApplyGigOnApi,
  syncMarketplaceSeedAndFetchGigs,
  syncSavedGigOnApi,
  syncSubscriptionTierOnApi,
} from "./api";
import {
  applyAction,
  canWithdraw,
  type ApplicationStatus,
  type BookingAction,
  type BookingStatus,
} from "./bookings";
import {
  BARANGAYS,
  DAVAO_GPS_ROUTE_WAYPOINTS,
  DEMO_PERSONAS,
  JOBS,
  WORKERS,
  barangayById,
  describeGpsLocation,
  estimateDavaoJobPricing,
  nearestBarangay,
  type Category,
  type Job,
} from "./data";
import type { LatLng } from "./geo";
import {
  DEFAULT_REJECTION_REASON,
  DEFAULT_RESUBMISSION_REASON,
  evaluateVerificationGuard,
  type CredentialKey,
  type VerifStatus,
} from "./verification";

export type { BookingStatus } from "./bookings";
export type Mode = "hire" | "work";

export interface Account {
  name: string;
  email: string;
  mobile: string;
  isDemo: boolean;
}

export interface Party {
  name: string;
  initials: string;
}

export interface PlacedLocation extends LatLng {
  label: string;
  source: "gps" | "pin" | "barangay";
}

/**
 * One booking record, shared by both sides of GAW.
 * side "hiring": the user is the employer, `workerId` is a demo worker.
 * side "working": the user is the worker, `client` is a demo resident.
 */
export interface Booking {
  id: string;
  side: "hiring" | "working";
  workerId: string;
  client: Party;
  service: string;
  description: string;
  /** ISO date (yyyy-mm-dd). */
  date: string;
  /** 24h time (HH:mm). */
  time: string;
  barangayId: string;
  location: PlacedLocation | null;
  /** null means a quote was requested. */
  budget: number | null;
  /** Free-text rate for jobs that came from an application. */
  rateText?: string;
  jobId?: string;
  status: BookingStatus;
  createdAt: number;
}

export interface Application {
  id: string;
  jobId: string;
  message: string;
  rate: string;
  status: ApplicationStatus;
  createdAt: number;
}

export interface WorkerProfile {
  skill: string;
  skills: string[];
  barangayId: string;
  /** Centre of the public service area (not the live device position). */
  area: LatLng | null;
  radiusKm: number;
  experience: string;
  description: string;
}

export interface VerifDoc {
  kind: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  isSample: boolean;
  status: VerifStatus;
  reason?: string | undefined;
  submittedAt: number;
}

export interface Verification {
  identity: VerifDoc | null;
  credentials: Partial<Record<CredentialKey, VerifDoc>>;
}

export type ProPlan = "worker" | "employer";
export type GpsSource = "gps" | "simulated" | "manual" | "barangay";

export interface UserGpsState {
  lat: number;
  lng: number;
  accuracyMeters: number;
  source: GpsSource;
  label: string;
}

export interface NewJobDraft {
  title: string;
  category: Category;
  barangayId: string;
  landmark: string;
  estimatedHours: number;
  budgetNum: number;
  schedule: string;
  description: string;
  urgent: boolean;
}

export interface GawState {
  account: Account | null;
  signedIn: boolean;
  mode: Mode | null;
  locationId: string;
  /** Exact hiring location chosen with GPS or a map pin. null = use the barangay centre. */
  serviceLocation: PlacedLocation | null;
  userGps: UserGpsState;
  workerProfile: WorkerProfile | null;
  available: boolean;
  bookings: Booking[];
  applications: Application[];
  savedJobIds: string[];
  customJobs: Job[];
  plans: ProPlan[];
  verification: Verification;
}

export const STORAGE_KEY = "gaw:demo:v2";
export const ME = "me";
export const FREE_OPEN_JOBS_LIMIT = 3;

const DEFAULT_GPS: UserGpsState = {
  lat: 7.085,
  lng: 125.61,
  accuracyMeters: 15,
  source: "barangay",
  label: "Live GPS · Same General Area (Davao City)",
};

export const initialState: GawState = {
  account: null,
  signedIn: false,
  mode: null,
  locationId: "bajada",
  serviceLocation: null,
  userGps: DEFAULT_GPS,
  workerProfile: null,
  available: true,
  bookings: [],
  applications: [],
  savedJobIds: ["j-1", "j-9"],
  customJobs: [],
  plans: [],
  verification: { identity: null, credentials: {} },
};

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function isoDay(offsetDays: number, from = new Date()) {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function initialsOf(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function persona(i: number): Party {
  const p = DEMO_PERSONAS[i % DEMO_PERSONAS.length]!;
  return { name: p.name, initials: p.initials };
}

function seedBookings(me: Party): Booking[] {
  const now = Date.now();
  const base = { workerId: ME, location: null, createdAt: now } as const;
  return [
    // Working side: requests from fictional demo residents to the user's worker profile.
    {
      ...base,
      id: "r-1",
      side: "working",
      client: persona(0),
      service: "Leaking kitchen sink",
      description: "Water drips under the sink cabinet whenever we use the faucet.",
      date: isoDay(1),
      time: "09:00",
      barangayId: "bajada",
      budget: 900,
      status: "pending",
    },
    {
      ...base,
      id: "r-2",
      side: "working",
      client: persona(1),
      service: "Install shelves in garage",
      description: "Two wall shelves for tools. I already have the brackets.",
      date: isoDay(3),
      time: "13:00",
      barangayId: "buhangin",
      budget: null,
      status: "pending",
    },
    {
      ...base,
      id: "r-3",
      side: "working",
      client: persona(2),
      service: "Fix loose door hinges",
      description: "Bedroom and bathroom doors don't close properly.",
      date: isoDay(5),
      time: "10:00",
      barangayId: "matina",
      budget: 600,
      status: "pending",
    },
    {
      ...base,
      id: "r-4",
      side: "working",
      client: persona(3),
      service: "Replace broken window latch",
      description: "Living room window latch snapped off; needs a replacement.",
      date: isoDay(2),
      time: "15:00",
      barangayId: "poblacion",
      budget: 500,
      status: "confirmed",
    },
    {
      ...base,
      id: "r-5",
      side: "working",
      client: persona(4),
      service: "Mount curtain rods",
      description: "Three curtain rods in the bedrooms.",
      date: isoDay(-9),
      time: "10:00",
      barangayId: "bajada",
      budget: 750,
      status: "completed",
    },
    {
      ...base,
      id: "r-6",
      side: "working",
      client: persona(1),
      service: "Patch ceiling leak",
      description: "Cancelled by the resident — the landlord fixed it.",
      date: isoDay(-4),
      time: "08:00",
      barangayId: "buhangin",
      budget: 1200,
      status: "cancelled",
    },
    // Hiring side: bookings made by the user as an employer.
    {
      id: "b-confirmed-1",
      side: "hiring",
      workerId: "w-ramon",
      client: me,
      service: "Leak repair",
      description: "Replace kitchen P-trap and check shutoff valve near Abreeza.",
      date: isoDay(2),
      time: "10:00",
      barangayId: "bajada",
      location: null,
      budget: 850,
      status: "confirmed",
      createdAt: now - 1000 * 60 * 60 * 3,
    },
    {
      id: "b-pending-1",
      side: "hiring",
      workerId: "w-dodong",
      client: me,
      service: "Furniture assembly",
      description: "Assemble bedroom shelving unit and mount 2 curtain rods.",
      date: isoDay(4),
      time: "13:00",
      barangayId: "poblacion",
      location: null,
      budget: 950,
      status: "pending",
      createdAt: now - 1000 * 60 * 60 * 12,
    },
    {
      id: "b-seed",
      side: "hiring",
      workerId: "w-joy",
      client: me,
      service: "Cleaning",
      description: "Deep clean before family visit.",
      date: isoDay(-21),
      time: "09:00",
      barangayId: "bajada",
      location: null,
      budget: 1500,
      status: "completed",
      createdAt: now - 1000 * 60 * 60 * 24 * 21,
    },
  ];
}

function seedCustomJobs(posterName: string): Job[] {
  const hours = 3;
  const pricing = estimateDavaoJobPricing("Electrical", hours, false);
  const b = barangayById("bajada");
  return [
    {
      id: "j-emp-seed-1",
      title: "Install bathroom exhaust fan & check wiring",
      category: "Electrical",
      barangayId: b.id,
      landmark: "Near Abreeza Mall, J.P. Laurel Ave, Bajada",
      lat: 7.0872,
      lng: 125.6114,
      poster: posterName,
      budget: "₱750",
      budgetNum: 750,
      estimatedHours: hours,
      minimumRequiredPhp: pricing.minimumRequiredPhp,
      aiRecommendedPhp: pricing.aiRecommendedPhp,
      posted: "2 hours ago",
      schedule: "Tomorrow, 9:00 AM",
      description:
        "Replace an old bathroom exhaust fan, test the wall switch connection, and seal the ceiling vent cleanly.",
      urgent: false,
    },
  ];
}

function freshAccountState(account: Account): GawState {
  return {
    ...initialState,
    account,
    signedIn: true,
    bookings: seedBookings({
      name: account.name,
      initials: initialsOf(account.name),
    }),
    customJobs: seedCustomJobs(account.name),
    savedJobIds: ["j-1", "j-9"],
  };
}

/** Where distances are measured from when hiring. */
export function hiringOrigin(s: Pick<GawState, "serviceLocation" | "locationId">): LatLng {
  if (s.serviceLocation) return s.serviceLocation;
  const b = BARANGAYS.find((x) => x.id === s.locationId) ?? BARANGAYS[0]!;
  return { lat: b.lat, lng: b.lng };
}

export function hiringOriginLabel(s: Pick<GawState, "serviceLocation" | "locationId">) {
  if (s.serviceLocation) return s.serviceLocation.label;
  return "Live GPS · Same General Area";
}

/** Bookings the user can see as the worker (My Jobs) or as the employer (My Bookings). */
export function bookingsFor(bookings: Booking[], side: Booking["side"]) {
  return bookings.filter((b) => b.side === side);
}

export function hasPlan(plans: ProPlan[], p: ProPlan) {
  return plans.includes(p);
}

/* ---------- Legacy pure transitions ---------- */

export function bookingNextStatuses(status: BookingStatus): BookingStatus[] {
  if (status === "pending") return ["confirmed", "declined"];
  if (status === "confirmed") return ["completed"];
  return [];
}

export function updateStatus<T extends { id: string; status: BookingStatus }>(
  items: T[],
  id: string,
  next: BookingStatus,
): T[] {
  return items.map((it) =>
    it.id === id && bookingNextStatuses(it.status).includes(next) ? { ...it, status: next } : it,
  );
}

function normalizeLoadedState(raw: string): GawState {
  const parsed = JSON.parse(raw) as Partial<GawState>;
  const meParty = parsed.account
    ? { name: parsed.account.name, initials: initialsOf(parsed.account.name) }
    : { name: "You", initials: "ME" };

  const bookings: Booking[] = Array.isArray(parsed.bookings)
    ? parsed.bookings.map((b) => ({
        ...b,
        side: b.side ?? "hiring",
        client: b.client ?? meParty,
        location: b.location ?? null,
      }))
    : [];

  const wp = parsed.workerProfile
    ? {
        ...parsed.workerProfile,
        skills: Array.isArray(parsed.workerProfile.skills) ? parsed.workerProfile.skills : [],
        area: parsed.workerProfile.area ?? null,
        radiusKm:
          typeof parsed.workerProfile.radiusKm === "number" ? parsed.workerProfile.radiusKm : 5,
      }
    : null;

  const applications: Application[] = Array.isArray(parsed.applications)
    ? parsed.applications.map((a) => ({
        ...a,
        status: a.status ?? "submitted",
      }))
    : [];

  return {
    ...initialState,
    ...parsed,
    userGps: parsed.userGps ?? DEFAULT_GPS,
    serviceLocation: parsed.serviceLocation ?? null,
    workerProfile: wp,
    bookings,
    applications,
    savedJobIds: Array.isArray(parsed.savedJobIds) ? parsed.savedJobIds : initialState.savedJobIds,
    customJobs: Array.isArray(parsed.customJobs) ? parsed.customJobs : [],
    plans: Array.isArray(parsed.plans)
      ? parsed.plans.filter((p): p is ProPlan => p === "employer")
      : [],
    verification: {
      identity: parsed.verification?.identity ?? null,
      credentials: parsed.verification?.credentials ?? {},
    },
  };
}

/* ---------- Context ---------- */

interface GawContext extends GawState {
  hydrated: boolean;
  allJobs: Job[];
  isSimulatingGps: boolean;
  isLiveGpsWatching: boolean;
  gpsStatusMessage: string | null;
  signUp: (a: Omit<Account, "isDemo">) => void;
  logIn: (email: string) => boolean;
  demoLogin: () => void;
  logOut: () => void;
  setMode: (m: Mode) => void;
  setLocation: (id: string) => void;
  setServiceLocation: (l: PlacedLocation) => void;
  setUserGps: (
    lat: number,
    lng: number,
    source?: GpsSource,
    label?: string,
    accuracyMeters?: number,
  ) => void;
  nudgeUserGps: (dLat: number, dLng: number, directionLabel?: string) => void;
  stepSimulatedWaypoint: () => void;
  requestBrowserGps: () => void;
  toggleSimulateGps: () => void;
  saveWorkerProfile: (p: WorkerProfile) => void;
  setAvailable: (v: boolean) => void;
  addBooking: (b: Omit<Booking, "id" | "status" | "createdAt" | "side" | "client">) => string;
  bookingAction: (id: string, a: BookingAction) => void;
  setBookingStatus: (id: string, s: BookingStatus) => void;
  applyToJob: (a: Pick<Application, "jobId" | "message" | "rate">) => boolean;
  withdrawApplication: (id: string) => void;
  simulateHire: (applicationId: string) => string | null;
  toggleSaveJob: (jobId: string) => {
    ok: boolean;
    saved: boolean;
    reason?: string;
  };
  createJob: (draft: NewJobDraft) => {
    ok: boolean;
    error?: string;
    job?: Job;
  };
  removeJob: (jobId: string) => void;
  setPlan: (p: ProPlan, on: boolean) => void;
  togglePlan: (p: ProPlan, on: boolean) => void;
  submitVerification: (
    target: "identity" | CredentialKey,
    doc: Omit<VerifDoc, "status" | "submittedAt">,
  ) => void;
  setVerificationStatus: (
    target: "identity" | CredentialKey,
    s: VerifStatus,
    reason?: string,
  ) => void;
  removeVerification: (target: "identity" | CredentialKey) => void;
  resetDemo: () => void;
}

const Ctx = createContext<GawContext | null>(null);

export function GawProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GawState>(initialState);
  const [backendJobs, setBackendJobs] = useState<Job[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [isSimulatingGps, setIsSimulatingGps] = useState(false);
  const [isLiveGpsWatching, setIsLiveGpsWatching] = useState(false);
  const [gpsStatusMessage, setGpsStatusMessage] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const simStepRef = useRef(0);
  const userGpsRef = useRef<UserGpsState>(initialState.userGps);
  const locationIdRef = useRef<string>(initialState.locationId);

  const patch = useCallback((fn: (s: GawState) => GawState) => setState(fn), []);

  const refreshNearbyGigs = useCallback((lat: number, lng: number) => {
    void fetchNearbyGigsFromApi(lat, lng).then((fetched) => {
      if (fetched && fetched.length > 0) {
        setBackendJobs(fetched);
      }
    });
  }, []);

  const stopRealGpsWatch = useCallback(() => {
    if (
      watchIdRef.current !== null &&
      typeof navigator !== "undefined" &&
      navigator.geolocation &&
      typeof navigator.geolocation.clearWatch === "function"
    ) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = null;
    setIsLiveGpsWatching(false);
  }, []);

  const applyGpsFix = useCallback(
    (
      nextGps: UserGpsState,
      statusMsg: string,
      nextLocationId?: string,
      syncServiceLocation?: PlacedLocation | null,
    ) => {
      userGpsRef.current = nextGps;
      if (nextLocationId) {
        locationIdRef.current = nextLocationId;
      }
      patch((s) => ({
        ...s,
        userGps: nextGps,
        ...(nextLocationId ? { locationId: nextLocationId } : {}),
        ...(syncServiceLocation !== undefined
          ? {
              serviceLocation:
                syncServiceLocation === null
                  ? null
                  : s.serviceLocation?.source === "pin"
                    ? s.serviceLocation
                    : syncServiceLocation,
            }
          : {}),
      }));
      setGpsStatusMessage(statusMsg);
    },
    [patch],
  );

  const requestBrowserGps = useCallback(() => {
    setIsSimulatingGps(false);
    stopRealGpsWatch();
    if (
      typeof navigator === "undefined" ||
      !navigator.geolocation ||
      typeof navigator.geolocation.getCurrentPosition !== "function"
    ) {
      const b = barangayById(locationIdRef.current);
      applyGpsFix(
        {
          lat: b.lat,
          lng: b.lng,
          accuracyMeters: 25,
          source: "barangay",
          label: `${b.name}, Davao City (Center)`,
        },
        "Browser GPS unavailable — using simulated Davao pin",
      );
      return;
    }

    setGpsStatusMessage("Acquiring live device GPS fix...");
    const handlePos = (pos: GeolocationPosition) => {
      const { latitude, longitude, accuracy, speed } = pos.coords;
      const safeAcc = Math.max(5, Math.round(accuracy || 10));
      const loc = describeGpsLocation(latitude, longitude);
      const speedText =
        typeof speed === "number" && Number.isFinite(speed) && speed > 0
          ? ` · ${(speed * 3.6).toFixed(1)} km/h`
          : "";
      setIsLiveGpsWatching(true);
      applyGpsFix(
        {
          lat: latitude,
          lng: longitude,
          accuracyMeters: safeAcc,
          source: "gps",
          label: loc.label,
        },
        `Live GPS tracking active (±${safeAcc}m${speedText})`,
        loc.inDavaoMetro ? loc.nearestBarangayId : undefined,
        {
          lat: latitude,
          lng: longitude,
          label: loc.label,
          source: "gps",
        },
      );
      refreshNearbyGigs(latitude, longitude);
    };

    const handleErr = () => {
      setIsLiveGpsWatching(false);
      setGpsStatusMessage(
        "Live GPS permission denied or unavailable — use Simulate Location controls below to change locations",
      );
    };

    navigator.geolocation.getCurrentPosition(handlePos, handleErr, {
      enableHighAccuracy: true,
      timeout: 6000,
      maximumAge: 3000,
    });

    if (typeof navigator.geolocation.watchPosition === "function") {
      watchIdRef.current = navigator.geolocation.watchPosition(handlePos, handleErr, {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 10000,
      });
      setIsLiveGpsWatching(true);
    }
  }, [applyGpsFix, refreshNearbyGigs, stopRealGpsWatch]);

  useEffect(() => {
    let initialGps = DEFAULT_GPS;
    let initialLocId = initialState.locationId;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const normalized = normalizeLoadedState(raw);
        initialGps = normalized.userGps;
        initialLocId = normalized.locationId;
        setState(normalized);
      }
    } catch {
      /* corrupted demo data: start fresh */
    }
    userGpsRef.current = initialGps;
    locationIdRef.current = initialLocId;
    setHydrated(true);

    // Sync seeded marketplace gigs from SQLite backend when available.
    syncMarketplaceSeedAndFetchGigs(initialGps.lat, initialGps.lng).then((fetched) => {
      if (fetched && fetched.length > 0) {
        setBackendJobs(fetched);
      }
    });

    // Auto-start real continuous GPS tracking on browsers that support Geolocation.
    if (
      typeof navigator !== "undefined" &&
      navigator.geolocation &&
      typeof navigator.geolocation.watchPosition === "function"
    ) {
      requestBrowserGps();
    }

    return () => {
      stopRealGpsWatch();
    };
    // Mount-only initialization for localStorage hydration + initial geolocation watcher.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    userGpsRef.current = state.userGps;
    locationIdRef.current = state.locationId;
    if (hydrated && typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state, hydrated]);

  // Smooth Davao City worker walk/commute GPS simulation along main corridors.
  useEffect(() => {
    if (!isSimulatingGps) return;
    const timer = window.setInterval(() => {
      simStepRef.current = (simStepRef.current + 1) % DAVAO_GPS_ROUTE_WAYPOINTS.length;
      const wp = DAVAO_GPS_ROUTE_WAYPOINTS[simStepRef.current]!;
      applyGpsFix(
        {
          lat: wp.lat,
          lng: wp.lng,
          accuracyMeters: 8,
          source: "simulated",
          label: wp.label,
        },
        `Simulated route moving: ${wp.label}`,
      );
    }, 1800);
    return () => window.clearInterval(timer);
  }, [applyGpsFix, isSimulatingGps]);

  const allJobs = useMemo(() => {
    const mergedMap = new Map<string, Job>();
    for (const j of state.customJobs) mergedMap.set(j.id, j);
    for (const j of JOBS) if (!mergedMap.has(j.id)) mergedMap.set(j.id, j);
    for (const j of backendJobs) {
      if (!mergedMap.has(j.id)) mergedMap.set(j.id, j);
    }
    return Array.from(mergedMap.values());
  }, [state.customJobs, backendJobs]);

  const setUserGps = useCallback(
    (
      lat: number,
      lng: number,
      source: GpsSource = "manual",
      label = "Pinned Davao Street Location",
      accuracyMeters = 10,
    ) => {
      stopRealGpsWatch();
      setIsSimulatingGps(false);
      applyGpsFix(
        { lat, lng, accuracyMeters, source, label },
        `Simulated pin updated (${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E)`,
      );
      refreshNearbyGigs(lat, lng);
    },
    [applyGpsFix, refreshNearbyGigs, stopRealGpsWatch],
  );

  const nudgeUserGps = useCallback(
    (dLat: number, dLng: number, directionLabel?: string) => {
      stopRealGpsWatch();
      setIsSimulatingGps(false);
      const nextLat = Number((userGpsRef.current.lat + dLat).toFixed(5));
      const nextLng = Number((userGpsRef.current.lng + dLng).toFixed(5));
      const loc = describeGpsLocation(nextLat, nextLng);
      const nearestName = barangayById(loc.nearestBarangayId).name;
      const label = loc.inDavaoMetro
        ? `Simulated Pin · Near ${nearestName}, Davao City`
        : `Simulated Pin (${nextLat.toFixed(4)}°N, ${nextLng.toFixed(4)}°E)`;
      applyGpsFix(
        {
          lat: nextLat,
          lng: nextLng,
          accuracyMeters: 10,
          source: "simulated",
          label,
        },
        `Simulated step ${directionLabel ? `${directionLabel} ` : ""}(${nextLat.toFixed(4)}°N, ${nextLng.toFixed(4)}°E)`,
      );
      refreshNearbyGigs(nextLat, nextLng);
    },
    [applyGpsFix, refreshNearbyGigs, stopRealGpsWatch],
  );

  const stepSimulatedWaypoint = useCallback(() => {
    stopRealGpsWatch();
    setIsSimulatingGps(false);
    simStepRef.current = (simStepRef.current + 1) % DAVAO_GPS_ROUTE_WAYPOINTS.length;
    const wp = DAVAO_GPS_ROUTE_WAYPOINTS[simStepRef.current]!;
    applyGpsFix(
      {
        lat: wp.lat,
        lng: wp.lng,
        accuracyMeters: 8,
        source: "simulated",
        label: wp.label,
      },
      `Simulated stop: ${wp.label}`,
    );
    refreshNearbyGigs(wp.lat, wp.lng);
  }, [applyGpsFix, refreshNearbyGigs, stopRealGpsWatch]);

  const toggleSimulateGps = useCallback(() => {
    setIsSimulatingGps((prev) => {
      const next = !prev;
      if (next) {
        stopRealGpsWatch();
        const wp = DAVAO_GPS_ROUTE_WAYPOINTS[simStepRef.current]!;
        applyGpsFix(
          {
            lat: wp.lat,
            lng: wp.lng,
            accuracyMeters: 8,
            source: "simulated",
            label: wp.label,
          },
          `Worker GPS Walk Demo active: ${wp.label}`,
        );
      } else {
        setGpsStatusMessage("Worker GPS Walk Demo paused");
      }
      return next;
    });
  }, [applyGpsFix, stopRealGpsWatch]);

  const setServiceLocation = useCallback(
    (l: PlacedLocation) => {
      stopRealGpsWatch();
      setIsSimulatingGps(false);
      const nearest = nearestBarangay(l);
      const nextGps: UserGpsState = {
        lat: l.lat,
        lng: l.lng,
        accuracyMeters: l.source === "gps" ? 10 : 15,
        source: l.source === "gps" ? "gps" : "manual",
        label: l.label,
      };
      userGpsRef.current = nextGps;
      locationIdRef.current = nearest.id;
      patch((s) => ({
        ...s,
        serviceLocation: l,
        locationId: nearest.id,
        userGps: nextGps,
      }));
      setGpsStatusMessage(`Location updated: ${l.label}`);
      refreshNearbyGigs(l.lat, l.lng);
    },
    [patch, refreshNearbyGigs, stopRealGpsWatch],
  );

  const setPlan = useCallback(
    (p: ProPlan, on: boolean) => {
      patch((s) => ({
        ...s,
        plans: on ? Array.from(new Set([...s.plans, p])) : s.plans.filter((x) => x !== p),
      }));
      void syncSubscriptionTierOnApi("emp-matina-resident", on ? "PRO" : "FREE");
    },
    [patch],
  );

  const value = useMemo<GawContext>(
    () => ({
      ...state,
      hydrated,
      allJobs,
      isSimulatingGps,
      isLiveGpsWatching,
      gpsStatusMessage,
      signUp: (a) => patch(() => freshAccountState({ ...a, isDemo: false })),
      logIn: (email) => {
        const ok =
          !!state.account && state.account.email.toLowerCase() === email.trim().toLowerCase();
        if (ok) patch((s) => ({ ...s, signedIn: true, mode: null }));
        return ok;
      },
      demoLogin: () =>
        patch((s) =>
          s.account?.isDemo
            ? { ...s, signedIn: true, mode: null }
            : freshAccountState({
                name: "Juan Dela Cruz",
                email: "judge@gaw.demo",
                mobile: "09171234567",
                isDemo: true,
              }),
        ),
      logOut: () => patch((s) => ({ ...s, signedIn: false, mode: null })),
      setMode: (mode) => patch((s) => ({ ...s, mode })),
      setLocation: (locationId) => {
        stopRealGpsWatch();
        setIsSimulatingGps(false);
        const b = barangayById(locationId);
        applyGpsFix(
          {
            lat: b.lat,
            lng: b.lng,
            accuracyMeters: 15,
            source: "barangay",
            label: `${b.name}, Davao City`,
          },
          `Simulated pin updated (${b.lat.toFixed(4)}°N, ${b.lng.toFixed(4)}°E)`,
          locationId,
          null,
        );
      },
      setServiceLocation,
      setUserGps,
      nudgeUserGps,
      stepSimulatedWaypoint,
      requestBrowserGps,
      toggleSimulateGps,
      saveWorkerProfile: (workerProfile) => patch((s) => ({ ...s, workerProfile })),
      setAvailable: (available) => patch((s) => ({ ...s, available })),
      addBooking: (b) => {
        if (!identityVerified(state.verification)) return "";
        const id = uid("b");
        patch((s) => {
          if (!identityVerified(s.verification)) return s;
          const me = s.account
            ? { name: s.account.name, initials: initialsOf(s.account.name) }
            : { name: "You", initials: "ME" };
          return {
            ...s,
            bookings: [
              {
                ...b,
                id,
                side: "hiring",
                client: me,
                status: "pending",
                createdAt: Date.now(),
              },
              ...s.bookings,
            ],
          };
        });
        return id;
      },
      bookingAction: (id, a) => patch((s) => ({ ...s, bookings: applyAction(s.bookings, id, a) })),
      setBookingStatus: (id, st) =>
        patch((s) => ({ ...s, bookings: updateStatus(s.bookings, id, st) })),
      applyToJob: (a) => {
        if (!identityVerified(state.verification)) return false;
        patch((s) => {
          if (!identityVerified(s.verification)) return s;
          const existing = s.applications.find((x) => x.jobId === a.jobId);
          if (existing && existing.status !== "withdrawn") return s;
          const rest = s.applications.filter((x) => x.jobId !== a.jobId);
          return {
            ...s,
            applications: [
              {
                ...a,
                id: uid("a"),
                status: "submitted",
                createdAt: Date.now(),
              },
              ...rest,
            ],
          };
        });
        void syncApplyGigOnApi(a.jobId, "w-ramon", a.message);
        return true;
      },
      withdrawApplication: (id) =>
        patch((s) => ({
          ...s,
          applications: s.applications.map((x) =>
            x.id === id && canWithdraw(x.status) ? { ...x, status: "withdrawn" } : x,
          ),
        })),
      simulateHire: (applicationId) => {
        const app = state.applications.find((x) => x.id === applicationId);
        const job = app && allJobs.find((j) => j.id === app.jobId);
        if (!app || !job || app.status !== "submitted") return null;
        const id = uid("r");
        patch((s) => ({
          ...s,
          applications: s.applications.map((x) =>
            x.id === applicationId ? { ...x, status: "hired" } : x,
          ),
          bookings: [
            {
              id,
              side: "working",
              workerId: ME,
              client: { name: job.poster, initials: initialsOf(job.poster) },
              service: job.title,
              description: job.description,
              date: isoDay(2),
              time: "09:00",
              barangayId: job.barangayId,
              location: null,
              budget: null,
              rateText: app.rate,
              jobId: job.id,
              status: "confirmed",
              createdAt: Date.now(),
            },
            ...s.bookings,
          ],
        }));
        return id;
      },
      toggleSaveJob: (jobId) => {
        const already = state.savedJobIds.includes(jobId);
        patch((s) => ({
          ...s,
          savedJobIds: already
            ? s.savedJobIds.filter((id) => id !== jobId)
            : [jobId, ...s.savedJobIds],
        }));
        void syncSavedGigOnApi("w-ramon", jobId, !already);
        return { ok: true, saved: !already };
      },
      createJob: (draft) => {
        const isEmployerPro = state.plans.includes("employer");
        if (!isEmployerPro && state.customJobs.length >= FREE_OPEN_JOBS_LIMIT) {
          return {
            ok: false,
            error: `Free employers can have up to ${FREE_OPEN_JOBS_LIMIT} posted open gigs. Upgrade to Employer Pro for unlimited postings.`,
          };
        }
        const pricing = estimateDavaoJobPricing(draft.category, draft.estimatedHours, draft.urgent);
        if (draft.budgetNum < pricing.minimumRequiredPhp) {
          return {
            ok: false,
            error: `Offered pay ₱${draft.budgetNum} is below Davao Region XI minimum floor ₱${pricing.minimumRequiredPhp.toFixed(2)} (${draft.estimatedHours}h × ₱63.50/hr).`,
          };
        }
        const b = barangayById(draft.barangayId);
        // Offset pin slightly inside the barangay so multiple jobs don't overlap identically.
        const jitterLat = (Math.random() - 0.5) * 0.006;
        const jitterLng = (Math.random() - 0.5) * 0.006;
        const newJob: Job = {
          id: uid("j-post"),
          title: draft.title.trim(),
          category: draft.category,
          barangayId: draft.barangayId,
          landmark: draft.landmark.trim() || `${b.name}, Davao City`,
          lat: Number((b.lat + jitterLat).toFixed(5)),
          lng: Number((b.lng + jitterLng).toFixed(5)),
          poster: state.account?.name ?? "Davao Employer",
          budget: `₱${Math.round(draft.budgetNum).toLocaleString("en-PH")}`,
          budgetNum: Math.round(draft.budgetNum),
          estimatedHours: draft.estimatedHours,
          minimumRequiredPhp: pricing.minimumRequiredPhp,
          aiRecommendedPhp: pricing.aiRecommendedPhp,
          posted: "Just now",
          schedule: draft.schedule.trim() || "Flexible",
          description: draft.description.trim(),
          urgent: draft.urgent,
        };
        patch((s) => ({ ...s, customJobs: [newJob, ...s.customJobs] }));
        void createGigOnApi({
          employerId: "emp-homeowner-bajada",
          title: newJob.title,
          description: newJob.description,
          category: newJob.category,
          estimatedHours: newJob.estimatedHours,
          offeredPricePhp: newJob.budgetNum,
          urgency: newJob.urgent ? "urgent" : "standard",
          barangay: newJob.landmark,
          lat: newJob.lat,
          lng: newJob.lng,
        });
        return { ok: true, job: newJob };
      },
      removeJob: (jobId) =>
        patch((s) => ({
          ...s,
          customJobs: s.customJobs.filter((j) => j.id !== jobId),
        })),
      setPlan,
      togglePlan: setPlan,
      submitVerification: (target, doc) =>
        patch((s) => {
          const full: VerifDoc = {
            ...doc,
            status: "pending",
            reason: undefined,
            submittedAt: Date.now(),
          };
          return target === "identity"
            ? { ...s, verification: { ...s.verification, identity: full } }
            : {
                ...s,
                verification: {
                  ...s.verification,
                  credentials: {
                    ...s.verification.credentials,
                    [target]: full,
                  },
                },
              };
        }),
      setVerificationStatus: (target, st, customReason) =>
        patch((s) => {
          const cur =
            target === "identity" ? s.verification.identity : s.verification.credentials[target];
          if (!cur || cur.status !== "pending") return s;
          const resolvedReason =
            st === "rejected"
              ? (customReason ?? DEFAULT_REJECTION_REASON)
              : st === "resubmission_required"
                ? (customReason ?? DEFAULT_RESUBMISSION_REASON)
                : undefined;
          const next: VerifDoc = { ...cur, status: st, reason: resolvedReason };
          return target === "identity"
            ? { ...s, verification: { ...s.verification, identity: next } }
            : {
                ...s,
                verification: {
                  ...s.verification,
                  credentials: {
                    ...s.verification.credentials,
                    [target]: next,
                  },
                },
              };
        }),
      removeVerification: (target) =>
        patch((s) => {
          if (target === "identity") {
            return { ...s, verification: { ...s.verification, identity: null } };
          }
          const credentials = { ...s.verification.credentials };
          delete credentials[target];
          return { ...s, verification: { ...s.verification, credentials } };
        }),
      resetDemo: () => {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(STORAGE_KEY);
        }
        stopRealGpsWatch();
        setIsSimulatingGps(false);
        setGpsStatusMessage(null);
        userGpsRef.current = initialState.userGps;
        locationIdRef.current = initialState.locationId;
        setState(initialState);
      },
    }),
    [
      state,
      hydrated,
      allJobs,
      isSimulatingGps,
      isLiveGpsWatching,
      gpsStatusMessage,
      patch,
      applyGpsFix,
      setServiceLocation,
      setUserGps,
      nudgeUserGps,
      stepSimulatedWaypoint,
      requestBrowserGps,
      toggleSimulateGps,
      stopRealGpsWatch,
      setPlan,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGaw() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useGaw must be used inside GawProvider");
  return c;
}

export function formatPeso(n: number) {
  return `₱${n.toLocaleString("en-PH")}`;
}

export function workerById(id: string) {
  return WORKERS.find((w) => w.id === id);
}

export function identityVerified(v: Verification) {
  return evaluateVerificationGuard(v.identity).allowed;
}

export function canPerformProtectedAction(v: Verification) {
  return evaluateVerificationGuard(v.identity);
}
