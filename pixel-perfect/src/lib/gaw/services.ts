import { CATEGORIES, OTHER_CATEGORY } from "./data";

const PREDEFINED = new Set<string>(CATEGORIES.map((c) => c.toLowerCase()));

export function isPredefinedService(s: string) {
  return PREDEFINED.has(s.trim().toLowerCase());
}

/** Tidy a typed service or skill name: trim, collapse spaces, capitalise the first letter. */
export function normalizeService(raw: string) {
  const s = raw.replace(/\s+/g, " ").trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

/** Returns an error message, or null when the custom name is acceptable. */
export function validateCustomService(raw: string): string | null {
  const s = normalizeService(raw);
  if (s.length < 2) return "Enter a service name (at least 2 characters).";
  if (s.length > 40) return "Keep it under 40 characters.";
  if (!/^[\p{L}\p{N}][\p{L}\p{N} &'()/.,+-]*$/u.test(s))
    return "Use letters, numbers and simple punctuation only.";
  if (s.toLowerCase() === OTHER_CATEGORY.toLowerCase())
    return "Type the actual service, like “Motorcycle Repair”.";
  return null;
}

/** True when a worker offers the given service category. "Other Services" matches any custom skill. */
export function offersService(worker: { skill: string; skills: string[] }, category: string) {
  const c = category.toLowerCase();
  if (c === OTHER_CATEGORY.toLowerCase()) return !isPredefinedService(worker.skill);
  return worker.skill.toLowerCase() === c || worker.skills.some((s) => s.toLowerCase() === c);
}

/** Adds a skill to a list without duplicates (case-insensitive) and never repeating the primary skill. */
export function addSkill(list: string[], raw: string, primary = ""): string[] {
  const s = normalizeService(raw);
  if (!s || s.toLowerCase() === primary.toLowerCase()) return list;
  return list.some((x) => x.toLowerCase() === s.toLowerCase()) ? list : [...list, s];
}
