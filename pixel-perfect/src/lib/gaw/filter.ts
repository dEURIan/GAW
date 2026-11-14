import {
  BARANGAYS,
  DAVAO_CENTER,
  barangayName,
  calculateJobDistanceKm,
  estimateTravelMinutes,
  type Job,
  type Worker,
} from "./data";
import type { LatLng } from "./geo";
import { offersService } from "./services";

export type { LatLng };

const EARTH_RADIUS_KM = 6371;
const DEG_TO_RAD = Math.PI / 180;

/** Straight-line (great-circle) distance in km. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = (b.lat - a.lat) * DEG_TO_RAD;
  const dLng = (b.lng - a.lng) * DEG_TO_RAD;
  const lat1 = a.lat * DEG_TO_RAD;
  const lat2 = b.lat * DEG_TO_RAD;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function roundKm(km: number): number {
  return Math.round(km * 10) / 10;
}

export function simulatedDistance(worker: Worker, fromBarangayId: string, origin?: LatLng): number {
  const start = origin ?? BARANGAYS.find((b) => b.id === fromBarangayId) ?? DAVAO_CENTER;
  return roundKm(distanceKm(start, worker));
}

export interface WorkerFilters {
  origin?: LatLng;
  barangayId?: string;
  category: string | "all";
  query: string;
  radius: number | null;
  availableOnly: boolean;
  /** Employer Pro (demo) filter. */
  topRatedOnly?: boolean;
}

export type WorkerWithDistance = Worker & { distance: number };

export function filterWorkers(workers: readonly Worker[], f: WorkerFilters): WorkerWithDistance[] {
  const origin =
    f.origin ?? BARANGAYS.find((b) => b.id === f.barangayId) ?? BARANGAYS[0] ?? DAVAO_CENTER;
  const q = f.query.trim().toLowerCase();

  return workers
    .map((w) => ({
      ...w,
      distance: roundKm(distanceKm(origin, w)),
    }))
    .filter((w) => (f.radius === null ? true : w.distance <= f.radius))
    .filter((w) => f.category === "all" || offersService(w, f.category))
    .filter((w) => !f.availableOnly || w.available)
    .filter((w) => !f.topRatedOnly || w.rating >= 4.8)
    .filter((w) => {
      if (!q) return true;
      const haystack = [w.name, w.skill, ...(w.skills ?? []), w.bio, barangayName(w.barangayId)]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    })
    .sort(
      (a, b) =>
        a.distance - b.distance || Number(b.available) - Number(a.available) || b.rating - a.rating,
    );
}

export interface JobFilters {
  category: string | "all";
  barangayId: string | "all";
  query: string;
}

export function filterJobs(jobs: readonly Job[], f: JobFilters): Job[] {
  const q = f.query.trim().toLowerCase();

  return jobs.filter(
    (j) =>
      (f.category === "all" || offersService({ skill: j.category, skills: [] }, f.category)) &&
      (f.barangayId === "all" || j.barangayId === f.barangayId) &&
      (!q ||
        `${j.title} ${j.description} ${j.poster} ${j.category} ${j.landmark}`
          .toLowerCase()
          .includes(q)),
  );
}

export type JobSort = "nearest" | "pay" | "urgent";

export type JobWithDistance = Job & {
  distanceKm: number;
  rideMin: number;
  walkMin: number;
};

export interface JobSortFilters extends JobFilters {
  userGps: LatLng;
  sortBy?: JobSort;
  maxRadiusKm?: number | null;
}

export function filterAndSortJobs(jobs: readonly Job[], f: JobSortFilters): JobWithDistance[] {
  const sortBy = f.sortBy ?? "nearest";
  const mapped = filterJobs(jobs, f)
    .map((job) => {
      const dist = calculateJobDistanceKm(f.userGps.lat, f.userGps.lng, job.lat, job.lng);
      const eta = estimateTravelMinutes(dist);
      return {
        ...job,
        distanceKm: dist,
        rideMin: eta.rideMin,
        walkMin: eta.walkMin,
      };
    })
    .filter((job) => (f.maxRadiusKm == null ? true : job.distanceKm <= f.maxRadiusKm));

  return mapped.sort((a, b) => {
    if (sortBy === "pay") {
      const diff = b.budgetNum - a.budgetNum;
      return diff !== 0 ? diff : a.distanceKm - b.distanceKm;
    }
    if (sortBy === "urgent") {
      const urg = Number(Boolean(b.urgent)) - Number(Boolean(a.urgent));
      return urg !== 0 ? urg : a.distanceKm - b.distanceKm;
    }
    const distDiff = a.distanceKm - b.distanceKm;
    if (distDiff !== 0) return distDiff;
    return Number(Boolean(b.urgent)) - Number(Boolean(a.urgent));
  });
}
