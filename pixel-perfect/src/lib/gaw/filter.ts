import {
  BARANGAYS,
  barangayName,
  calculateJobDistanceKm,
  estimateTravelMinutes,
  type Category,
  type Job,
  type Worker,
} from "./data";

/** Straight-line distance in km. Used only for SIMULATED proximity in the demo. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function simulatedDistance(
  worker: Worker,
  fromBarangayId: string,
  origin?: { lat: number; lng: number },
) {
  const from = origin ?? BARANGAYS.find((b) => b.id === fromBarangayId) ?? BARANGAYS[0]!;
  return Math.round(distanceKm(from, worker) * 10) / 10;
}

export interface WorkerFilters {
  barangayId: string;
  origin?: { lat: number; lng: number } | undefined;
  category: Category | "all";
  query: string;
  radius: number;
  availableOnly: boolean;
}

export type WorkerWithDistance = Worker & { distance: number };

export function filterWorkers(workers: Worker[], f: WorkerFilters): WorkerWithDistance[] {
  const q = f.query.trim().toLowerCase();
  return workers
    .map((w) => ({ ...w, distance: simulatedDistance(w, f.barangayId, f.origin) }))
    .filter((w) => w.distance <= f.radius)
    .filter((w) => f.category === "all" || w.skill === f.category)
    .filter((w) => !f.availableOnly || w.available)
    .filter((w) => {
      if (!q) return true;
      const hay = [w.name, w.skill, ...w.skills, barangayName(w.barangayId)]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    })
    .sort((a, b) => Number(b.available) - Number(a.available) || a.distance - b.distance);
}

export type JobSort = "nearest" | "pay" | "urgent";

export type JobWithDistance = Job & {
  distanceKm: number;
  rideMin: number;
  walkMin: number;
};

export interface JobFilters {
  category: Category | "all";
  barangayId: string | "all";
  query: string;
}

export function filterJobs(jobs: Job[], f: JobFilters): Job[] {
  const q = f.query.trim().toLowerCase();
  return jobs.filter(
    (j) =>
      (f.category === "all" || j.category === f.category) &&
      (f.barangayId === "all" || j.barangayId === f.barangayId) &&
      (!q || `${j.title} ${j.description} ${j.poster} ${j.landmark}`.toLowerCase().includes(q)),
  );
}

export function filterAndSortJobs(
  jobs: Job[],
  f: JobFilters & {
    sortBy?: JobSort;
    userGps: { lat: number; lng: number };
    maxRadiusKm?: number;
  },
): JobWithDistance[] {
  const filtered = filterJobs(jobs, f)
    .map((job): JobWithDistance => {
      const dKm = calculateJobDistanceKm(f.userGps.lat, f.userGps.lng, job.lat, job.lng);
      const eta = estimateTravelMinutes(dKm);
      return {
        ...job,
        distanceKm: dKm,
        rideMin: eta.rideMin,
        walkMin: eta.walkMin,
      };
    })
    .filter((job) => f.maxRadiusKm === undefined || job.distanceKm <= f.maxRadiusKm);

  const sortBy = f.sortBy ?? "nearest";
  return filtered.sort((a, b) => {
    if (sortBy === "pay") {
      return b.budgetNum - a.budgetNum || a.distanceKm - b.distanceKm;
    }
    if (sortBy === "urgent") {
      return Number(Boolean(b.urgent)) - Number(Boolean(a.urgent)) || a.distanceKm - b.distanceKm;
    }
    return a.distanceKm - b.distanceKm;
  });
}
