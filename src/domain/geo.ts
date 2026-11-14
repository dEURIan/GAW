import { DAVAO_BOUNDS } from './constants.js';

export interface Coordinates {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Checks whether a latitude/longitude pair lies inside Davao City / Region XI operating bounds.
 */
export function isWithinDavaoRegion(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return false;
  }

  return (
    lat >= DAVAO_BOUNDS.minLat &&
    lat <= DAVAO_BOUNDS.maxLat &&
    lng >= DAVAO_BOUNDS.minLng &&
    lng <= DAVAO_BOUNDS.maxLng
  );
}

/**
 * Computes great-circle Haversine distance in kilometers, rounded to 1-meter precision (3 decimals).
 */
export function calculateHaversineDistanceKm(
  a: Coordinates,
  b: Coordinates,
): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);

  const h =
    sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

  return Math.round(EARTH_RADIUS_KM * c * 1000) / 1000;
}
