import {
  Briefcase,
  Camera,
  Droplets,
  Flame,
  GraduationCap,
  Hammer,
  HardHat,
  Laptop,
  Leaf,
  PaintRoller,
  Plug,
  Snowflake,
  Sofa,
  Sparkles,
  Truck,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Plumbing: Droplets,
  Electrical: Zap,
  Carpentry: Hammer,
  Cleaning: Sparkles,
  Painting: PaintRoller,
  Handyman: Wrench,
  Gardening: Leaf,
  "Appliance Repair": Plug,
  "Air Conditioning Services": Snowflake,
  Welding: Flame,
  "Furniture Assembly": Sofa,
  "Moving Assistance": Truck,
  "Computer Repair": Laptop,
  Tutoring: GraduationCap,
  Photography: Camera,
  "General Labor": HardHat,
};

/** Icon for a service; custom services get a generic briefcase. */
export function iconFor(service: string): LucideIcon {
  return CATEGORY_ICONS[service] ?? Briefcase;
}
