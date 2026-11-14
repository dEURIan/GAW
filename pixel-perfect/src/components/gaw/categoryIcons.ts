import {
  Droplets,
  Hammer,
  PaintRoller,
  Sparkles,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { Category } from "@/lib/gaw/data";

export const CATEGORY_ICONS: Record<Category, LucideIcon> = {
  Plumbing: Droplets,
  Electrical: Zap,
  Carpentry: Hammer,
  Cleaning: Sparkles,
  Painting: PaintRoller,
  Handyman: Wrench,
};
