import { barangayById, type Category, type Job } from "./data";

export interface BackendGigDto {
  id: string;
  employerId: string;
  employerName?: string;
  title: string;
  description: string;
  category: string;
  estimatedHours: number;
  offeredPricePhp: number;
  minimumRequiredPhp: number;
  aiRecommendedPhp: number;
  urgency: "standard" | "urgent";
  barangay: string;
  lat: number;
  lng: number;
  status: string;
  createdAt: string;
}

export interface ApiPricingEstimate {
  minimumWageFloorPhp: number;
  suggestedMinPhp: number;
  recommendedPhp: number;
  suggestedMaxPhp: number;
  hourlyRateRecommendedPhp: number;
  source: "heuristic" | "external_ai";
  rationale: string;
}

const CATEGORY_TO_BACKEND: Record<Category, string> = {
  Plumbing: "plumbing",
  Electrical: "electrical",
  Carpentry: "carpentry",
  Cleaning: "cleaning",
  Painting: "painting",
  Handyman: "handyman",
};

const BACKEND_TO_CATEGORY: Record<string, Category> = {
  plumbing: "Plumbing",
  electrical: "Electrical",
  carpentry: "Carpentry",
  cleaning: "Cleaning",
  painting: "Painting",
  handyman: "Handyman",
  construction: "Carpentry",
};

export function toBackendCategory(category: Category): string {
  return CATEGORY_TO_BACKEND[category];
}

export function fromBackendCategory(raw: string): Category {
  return BACKEND_TO_CATEGORY[raw.toLowerCase()] ?? "Handyman";
}

function inferBarangayId(barangayLabel: string, lat: number, lng: number): string {
  const lower = barangayLabel.toLowerCase();
  for (const candidate of [
    "poblacion",
    "bajada",
    "buhangin",
    "lanang",
    "matina",
    "talomo",
    "mintal",
    "toril",
  ]) {
    if (lower.includes(candidate)) return candidate;
  }
  // Fallback nearest barangay id
  const ref = barangayById("poblacion");
  if (Math.abs(lat - ref.lat) < 0.01 && Math.abs(lng - ref.lng) < 0.01) return "poblacion";
  return "bajada";
}

export function mapBackendGigToUiJob(dto: BackendGigDto): Job {
  return {
    id: dto.id,
    title: dto.title,
    category: fromBackendCategory(dto.category),
    barangayId: inferBarangayId(dto.barangay, dto.lat, dto.lng),
    landmark: dto.barangay,
    lat: dto.lat,
    lng: dto.lng,
    poster: dto.employerName ?? "Davao Employer",
    budget: `₱${Math.round(dto.offeredPricePhp).toLocaleString("en-PH")}`,
    budgetNum: Math.round(dto.offeredPricePhp),
    estimatedHours: dto.estimatedHours,
    minimumRequiredPhp: dto.minimumRequiredPhp,
    aiRecommendedPhp: dto.aiRecommendedPhp,
    posted: "Live",
    schedule: dto.urgency === "urgent" ? "Today, Urgent" : "Flexible",
    description: dto.description,
    urgent: dto.urgency === "urgent",
  };
}

async function safeJsonFetch<T>(url: string, init?: RequestInit): Promise<T | null> {
  if (typeof window === "undefined" || typeof fetch !== "function") return null;
  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Fetch open Davao City gigs ranked by proximity to the given coordinates. */
export async function fetchNearbyGigsFromApi(lat: number, lng: number): Promise<Job[] | null> {
  const data = await safeJsonFetch<{ gigs?: BackendGigDto[] }>(
    `/api/v1/gigs/nearby?lat=${lat}&lng=${lng}&radiusKm=35&limit=50`,
  );
  if (!data?.gigs || data.gigs.length === 0) return null;
  return data.gigs.map(mapBackendGigToUiJob);
}

export async function syncMarketplaceSeedAndFetchGigs(
  lat: number,
  lng: number,
): Promise<Job[] | null> {
  await safeJsonFetch("/api/v1/marketplace/seed", { method: "POST" });
  return fetchNearbyGigsFromApi(lat, lng);
}

export async function requestPricingEstimateFromApi(input: {
  category: Category;
  estimatedHours: number;
  urgency: "standard" | "urgent";
}): Promise<ApiPricingEstimate | null> {
  return safeJsonFetch<ApiPricingEstimate>("/api/v1/pricing/estimate", {
    method: "POST",
    body: JSON.stringify({
      category: toBackendCategory(input.category),
      estimatedHours: input.estimatedHours,
      urgency: input.urgency,
      requiredSkills: [input.category],
    }),
  });
}

export async function createGigOnApi(input: {
  employerId: string;
  title: string;
  description: string;
  category: Category;
  estimatedHours: number;
  offeredPricePhp: number;
  urgency: "standard" | "urgent";
  barangay: string;
  lat: number;
  lng: number;
}): Promise<{ gig?: BackendGigDto; error?: { code: string; message: string } } | null> {
  if (typeof window === "undefined" || typeof fetch !== "function") return null;
  try {
    const res = await fetch("/api/v1/gigs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...input,
        category: toBackendCategory(input.category),
        requiredSkills: [input.category],
      }),
    });
    return (await res.json()) as {
      gig?: BackendGigDto;
      error?: { code: string; message: string };
    };
  } catch {
    return null;
  }
}

export async function syncSavedGigOnApi(
  employeeId: string,
  gigId: string,
  save: boolean,
): Promise<void> {
  if (save) {
    await safeJsonFetch(`/api/v1/users/${employeeId}/saved-gigs`, {
      method: "POST",
      body: JSON.stringify({ gigId, note: "" }),
    });
  } else {
    await safeJsonFetch(`/api/v1/users/${employeeId}/saved-gigs/${gigId}`, {
      method: "DELETE",
    });
  }
}

export async function syncApplyGigOnApi(
  gigId: string,
  employeeId: string,
  message: string,
): Promise<void> {
  await safeJsonFetch(`/api/v1/gigs/${gigId}/applications`, {
    method: "POST",
    body: JSON.stringify({ employeeId, message }),
  });
}

export async function syncSubscriptionTierOnApi(
  userId: string,
  tier: "FREE" | "PRO",
): Promise<void> {
  await safeJsonFetch(`/api/v1/users/${userId}/subscription`, {
    method: "PATCH",
    body: JSON.stringify({ tier }),
  });
}
