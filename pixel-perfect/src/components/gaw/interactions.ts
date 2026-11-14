import { cn } from "@/lib/utils";

/** Accessible keyboard focus rings shared across interactive GAW controls. */
export const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export const FOCUS_RING_INSET =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/85 focus-visible:ring-inset";

/** Ensures positional hover/press transforms never jump when reduced motion is preferred. */
export const REDUCED_MOTION_RESET =
  "motion-reduce:transition-none motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0 motion-reduce:hover:scale-100 motion-reduce:active:scale-100 motion-reduce:hover:[&>svg]:scale-100 motion-reduce:hover:[&>svg]:translate-x-0";

export type SegmentedVariant = "card" | "deep" | "primary";

/** Consistent interactive styling for segmented controls (Appearance, Mode, Radius, ViewMode). */
export function segmentedOptionClass(
  active: boolean,
  variant: SegmentedVariant = "card",
  extra?: string,
) {
  const activeStyles: Record<SegmentedVariant, string> = {
    card: "bg-card text-primary shadow-soft ring-1 ring-inset ring-primary/25 hover:ring-primary/45 dark:bg-[#192820] dark:ring-primary/40",
    deep: "bg-deep text-deep-foreground shadow-xs ring-1 ring-inset ring-white/15 hover:brightness-[1.06] dark:ring-primary/30",
    primary: "bg-primary text-primary-foreground shadow-xs hover:brightness-[1.06]",
  };

  return cn(
    "group/seg cursor-pointer transition-[background-color,color,box-shadow,border-color,transform,filter] duration-180 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.97] [&>svg]:transition-[color,transform] [&>svg]:duration-150 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
    FOCUS_RING_INSET,
    REDUCED_MOTION_RESET,
    active
      ? activeStyles[variant]
      : "text-muted-foreground hover:bg-hover-surface hover:text-foreground hover:[&>svg]:scale-110 hover:[&>svg]:text-primary",
    extra,
  );
}

/** Shared horizontal tab and filter pill interaction styles (My Jobs, Bookings). */
export function filterTabPillClass(active: boolean, extra?: string) {
  return cn(
    "cursor-pointer transition-[background-color,border-color,color,box-shadow,transform,filter] duration-180 ease-out active:scale-[0.97]",
    FOCUS_RING,
    REDUCED_MOTION_RESET,
    active
      ? "border-deep bg-deep text-deep-foreground shadow-soft hover:brightness-[1.06] dark:border-primary/45"
      : "border-border/80 bg-card text-muted-foreground hover:border-hover-border hover:bg-hover-surface hover:text-foreground",
    extra,
  );
}

/** Selectable option cards (Settings theme radio cards, Pro track tabs). */
export function selectableOptionCardClass(active: boolean, extra?: string) {
  return cn(
    "group cursor-pointer transition-[background-color,border-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:translate-y-0 active:scale-[0.99]",
    FOCUS_RING,
    REDUCED_MOTION_RESET,
    active
      ? "border-primary bg-card shadow-lift ring-2 ring-primary/25 dark:bg-[#1E3227]"
      : "border-border/85 bg-card/85 hover:-translate-y-[1.5px] hover:border-hover-border hover:bg-hover-surface/40 hover:shadow-soft",
    extra,
  );
}

/** Clickable link cards (Recent Booking row, Incoming Request card, Service Category tiles). */
export const interactiveNavCardClass = cn(
  "group cursor-pointer transition-[background-color,border-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1.5px] hover:border-hover-border hover:bg-hover-surface/55 hover:shadow-soft active:translate-y-0 active:scale-[0.99]",
  FOCUS_RING,
  REDUCED_MOTION_RESET,
);

/** Full-card linkable directory entities (WorkerCard, JobCard) with stretched link focus ring. */
export const interactiveEntityCardClass = cn(
  "group relative animate-fade-up rounded-2xl border bg-card p-4 shadow-soft transition-[border-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[2px] hover:border-hover-border hover:shadow-lift active:translate-y-0 active:scale-[0.995] has-[a:focus-visible]:outline-none has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring has-[a:focus-visible]:ring-offset-2 has-[a:focus-visible]:ring-offset-background md:p-5",
  REDUCED_MOTION_RESET,
);

/** Compact icon action buttons (close preview, toggle password visibility, chip edit/delete). */
export function iconActionButtonClass(tone: "default" | "destructive" = "default", extra?: string) {
  return cn(
    "inline-flex cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-[background-color,color,transform] duration-150 ease-out active:scale-95 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45",
    FOCUS_RING_INSET,
    REDUCED_MOTION_RESET,
    tone === "destructive"
      ? "hover:bg-danger-hover-surface hover:text-destructive"
      : "hover:bg-hover-surface hover:text-primary",
    extra,
  );
}

/** Consistent inline link and action-arrow microinteraction classes. */
export const subtleLinkClass = cn(
  "group inline-flex items-center gap-1 rounded-md text-sm font-semibold text-primary underline-offset-4 transition-colors duration-150 hover:text-primary/80 hover:underline",
  FOCUS_RING,
);

export const subtleArrowIconClass =
  "size-4 transition-transform duration-180 ease-out group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0";
