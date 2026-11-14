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
  barangayById,
  DAVAO_GPS_ROUTE_WAYPOINTS,
  DEMO_PERSONAS,
  describeGpsLocation,
  estimateDavaoJobPricing,
  JOBS,
  type Category,
  type Job,
} from "./data";

export type BookingStatus = "pending" | "confirmed" | "declined" | "completed";
export type Mode = "hire" | "work";
export type GpsSource = "gps" | "simulated" | "barangay" | "manual";

export interface UserGpsState {
  lat: number;
  lng: number;
  accuracyMeters: number;
  source: GpsSource;
  label: string;
}

export interface Account {
  name: string;
  email: string;
  mobile: string;
  isDemo: boolean;
}

export interface Booking {
  id: string;
  workerId: string;
  service: string;
  description: string;
  date: string;
  time: string;
  barangayId: string;
  /** null means the user asked the worker for a quote. */
  budget: number | null;
  status: BookingStatus;
  createdAt: number;
}

export interface Application {
  id: string;
  jobId: string;
  message: string;
  rate: string;
  createdAt: number;
}

export interface IncomingRequest {
  id: string;
  persona: string;
  initials: string;
  service: string;
  description: string;
  date: string;
  time: string;
  barangayId: string;
  budget: string;
  status: BookingStatus;
}

export interface WorkerProfile {
  skill: Category;
  barangayId: string;
  experience: string;
  description: string;
}

export type ProPlan = "employer";

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
  userGps: UserGpsState;
  workerProfile: WorkerProfile | null;
  available: boolean;
  bookings: Booking[];
  applications: Application[];
  savedJobIds: string[];
  customJobs: Job[];
  requests: IncomingRequest[];
  plans: ProPlan[];
}

const STORAGE_KEY = "gaw:demo:v2";
const FREE_OPEN_JOBS_LIMIT = 3;

const DEFAULT_GPS: UserGpsState = {
  lat: 7.085,
  lng: 125.61,
  accuracyMeters: 15,
  source: "barangay",
  label: "Bajada (J.P. Laurel Ave)",
};

export const initialState: GawState = {
  account: null,
  signedIn: false,
  mode: null,
  locationId: "bajada",
  userGps: DEFAULT_GPS,
  workerProfile: null,
  available: true,
  bookings: [],
  applications: [],
  savedJobIds: ["j-1", "j-9"],
  customJobs: [],
  requests: [],
  plans: [],
};

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function seedRequests(): IncomingRequest[] {
  return [
    {
      id: "r-1",
      persona: DEMO_PERSONAS[0].name,
      initials: DEMO_PERSONAS[0].initials,
      service: "Leaking kitchen sink",
      description: "Water drips under the sink cabinet whenever we use the faucet.",
      date: "Tomorrow",
      time: "9:00 AM",
      barangayId: "bajada",
      budget: "₱900",
      status: "pending",
    },
    {
      id: "r-2",
      persona: DEMO_PERSONAS[1].name,
      initials: DEMO_PERSONAS[1].initials,
      service: "Install shelves in garage",
      description: "Two wall shelves for tools. I already have the brackets.",
      date: "Saturday",
      time: "1:00 PM",
      barangayId: "buhangin",
      budget: "Request quote",
      status: "pending",
    },
    {
      id: "r-3",
      persona: DEMO_PERSONAS[2].name,
      initials: DEMO_PERSONAS[2].initials,
      service: "Fix loose door hinges",
      description: "Bedroom and bathroom doors don't close properly.",
      date: "Next Monday",
      time: "10:00 AM",
      barangayId: "matina",
      budget: "₱600",
      status: "pending",
    },
  ];
}

function seedBookings(): Booking[] {
  return [
    {
      id: "b-confirmed-1",
      workerId: "w-ramon",
      service: "Leak repair",
      description: "Replace kitchen P-trap and check shutoff valve near Abreeza.",
      date: "2026-11-16",
      time: "10:00",
      barangayId: "bajada",
      budget: 850,
      status: "confirmed",
      createdAt: Date.now() - 1000 * 60 * 60 * 3,
    },
    {
      id: "b-pending-1",
      workerId: "w-dodong",
      service: "Furniture assembly",
      description: "Assemble bedroom shelving unit and mount 2 curtain rods.",
      date: "2026-11-18",
      time: "13:00",
      barangayId: "poblacion",
      budget: 950,
      status: "pending",
      createdAt: Date.now() - 1000 * 60 * 60 * 12,
    },
    {
      id: "b-seed",
      workerId: "w-joy",
      service: "Cleaning",
      description: "Deep clean before family visit.",
      date: "2026-10-24",
      time: "09:00",
      barangayId: "bajada",
      budget: 1500,
      status: "completed",
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 21,
    },
  ];
}

function freshAccountState(account: Account): GawState {
  return {
    ...initialState,
    account,
    signedIn: true,
    bookings: seedBookings(),
    requests: seedRequests(),
    savedJobIds: ["j-1", "j-9"],
  };
}

/* ---------- Pure transitions (unit-tested) ---------- */

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
  addBooking: (b: Omit<Booking, "id" | "status" | "createdAt">) => string;
  setBookingStatus: (id: string, s: BookingStatus) => void;
  applyToJob: (a: Omit<Application, "id" | "createdAt">) => void;
  toggleSaveJob: (jobId: string) => { ok: boolean; saved: boolean; reason?: string };
  createJob: (draft: NewJobDraft) => { ok: boolean; error?: string; job?: Job };
  setRequestStatus: (id: string, s: BookingStatus) => void;
  togglePlan: (p: ProPlan, on: boolean) => void;
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
    (nextGps: UserGpsState, statusMsg: string, nextLocationId?: string) => {
      userGpsRef.current = nextGps;
      if (nextLocationId) {
        locationIdRef.current = nextLocationId;
      }
      patch((s) => ({
        ...s,
        userGps: nextGps,
        ...(nextLocationId ? { locationId: nextLocationId } : {}),
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
        const parsed = JSON.parse(raw) as Partial<GawState>;
        initialGps = parsed.userGps ?? DEFAULT_GPS;
        initialLocId = parsed.locationId ?? initialState.locationId;
        setState({
          ...initialState,
          ...parsed,
          userGps: initialGps,
          savedJobIds: parsed.savedJobIds ?? initialState.savedJobIds,
          customJobs: parsed.customJobs ?? [],
          plans: (parsed.plans ?? []).filter((p): p is ProPlan => p === "employer"),
        });
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
    for (const j of backendJobs) if (!mergedMap.has(j.id)) mergedMap.set(j.id, j);
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
        );
      },
      setUserGps,
      nudgeUserGps,
      stepSimulatedWaypoint,
      requestBrowserGps,
      toggleSimulateGps,
      saveWorkerProfile: (workerProfile) => patch((s) => ({ ...s, workerProfile })),
      setAvailable: (available) => patch((s) => ({ ...s, available })),
      addBooking: (b) => {
        const id = uid("b");
        patch((s) => ({
          ...s,
          bookings: [{ ...b, id, status: "pending", createdAt: Date.now() }, ...s.bookings],
        }));
        return id;
      },
      setBookingStatus: (id, st) =>
        patch((s) => ({ ...s, bookings: updateStatus(s.bookings, id, st) })),
      applyToJob: (a) => {
        patch((s) =>
          s.applications.some((x) => x.jobId === a.jobId)
            ? s
            : {
                ...s,
                applications: [{ ...a, id: uid("a"), createdAt: Date.now() }, ...s.applications],
              },
        );
        void syncApplyGigOnApi(a.jobId, "w-ramon", a.message);
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
      setRequestStatus: (id, st) =>
        patch((s) => ({ ...s, requests: updateStatus(s.requests, id, st) })),
      togglePlan: (p, on) => {
        patch((s) => ({
          ...s,
          plans: on ? Array.from(new Set([...s.plans, p])) : s.plans.filter((x) => x !== p),
        }));
        void syncSubscriptionTierOnApi("emp-matina-resident", on ? "PRO" : "FREE");
      },
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
      setUserGps,
      nudgeUserGps,
      stepSimulatedWaypoint,
      requestBrowserGps,
      toggleSimulateGps,
      stopRealGpsWatch,
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
