import { Crown } from "lucide-react";
import gawIconUrl from "@/assets/gaw-icon.jpg";
import gawWordmarkOriginalUrl from "@/assets/grab-a-work-wordmark.png";
import gawWordmarkTransparentUrl from "@/assets/grab-a-work-wordmark-transparent.png";
import { cn } from "@/lib/utils";

export type GAWBrandVariant = "icon" | "compact" | "full" | "expanded";
export type GAWBrandSize = "sm" | "md" | "lg" | "xl";

export interface GAWBrandProps {
  /**
   * - `icon`: Official green G symbol only (compact headers, loading state, badges)
   * - `compact`: [G Icon] GAW lockup for navigation bars & application headers (32–36px icon)
   * - `full`: [G Icon] GAW primary lockup for authentication & feature headers (44–56px icon)
   * - `expanded`: [G Icon] GAW + "Grab a Work" secondary lockup for welcome, onboarding & hero sections
   */
  variant?: GAWBrandVariant | undefined;
  size?: GAWBrandSize | undefined;
  /** Render text for deep-forest (`#123C39`) or dark hero surfaces */
  onDeep?: boolean | undefined;
  /** Append an elegant Durian Gold PRO badge beside GAW without modifying the icon */
  proBadge?: boolean | undefined;
  /** Optional subtitle override for `expanded` variant */
  tagline?: string | undefined;
  className?: string | undefined;
}

const DEFAULT_SIZE_BY_VARIANT: Record<GAWBrandVariant, GAWBrandSize> = {
  icon: "md",
  compact: "sm",
  full: "lg",
  expanded: "lg",
};

const ICON_DIMENSIONS: Record<GAWBrandSize, { px: number; boxClass: string; radiusClass: string }> =
  {
    sm: {
      px: 42,
      boxClass: "size-9 sm:size-10 md:size-[42px]",
      radiusClass: "rounded-[10px] sm:rounded-[11px]",
    },
    md: { px: 44, boxClass: "size-10 sm:size-11", radiusClass: "rounded-[11px] sm:rounded-[12px]" },
    lg: {
      px: 52,
      boxClass: "size-12 sm:size-[52px]",
      radiusClass: "rounded-[13px] sm:rounded-[14px]",
    },
    xl: {
      px: 60,
      boxClass: "size-[54px] sm:size-[60px]",
      radiusClass: "rounded-[14px] sm:rounded-[16px]",
    },
  };

const TITLE_CLASSES: Record<GAWBrandSize, string> = {
  sm: "text-[1.2rem] leading-none tracking-[-0.03em]",
  md: "text-[1.375rem] leading-none tracking-[-0.035em]",
  lg: "text-[1.65rem] leading-none tracking-[-0.04em]",
  xl: "text-[1.95rem] md:text-[2.1rem] leading-none tracking-[-0.04em]",
};

const SUBTITLE_CLASSES: Record<GAWBrandSize, string> = {
  sm: "text-[0.65rem] tracking-[0.04em]",
  md: "text-[0.72rem] tracking-[0.04em]",
  lg: "text-xs tracking-[0.045em]",
  xl: "text-[0.875rem] md:text-[0.95rem] tracking-[0.04em]",
};

const GAP_CLASSES: Record<GAWBrandSize, string> = {
  sm: "gap-2.5",
  md: "gap-3",
  lg: "gap-3.5",
  xl: "gap-4",
};

/**
 * Official GAW Brand Identity Lockup.
 * Uses the immutable official green G arrow icon paired with optically aligned typography.
 */
export function GAWBrand({
  variant = "compact",
  size,
  onDeep = false,
  proBadge = false,
  tagline = "Grab a Work",
  className,
}: GAWBrandProps) {
  const resolvedSize = size ?? DEFAULT_SIZE_BY_VARIANT[variant];
  const dim = ICON_DIMENSIONS[resolvedSize];

  const iconElement = (
    <span
      className={cn(
        "relative inline-flex shrink-0 overflow-hidden select-none",
        dim.boxClass,
        dim.radiusClass,
        onDeep
          ? "ring-1 ring-white/20 shadow-[0_2px_10px_rgba(0,0,0,0.28)]"
          : "ring-1 ring-black/10 dark:ring-white/20 shadow-[0_1px_4px_rgba(18,60,57,0.14)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.45)]",
      )}
    >
      <img
        src={gawIconUrl}
        alt="GAW"
        width={dim.px}
        height={dim.px}
        decoding="async"
        className="size-full object-cover"
      />
    </span>
  );

  if (variant === "icon") {
    return (
      <span className={cn("inline-flex items-center", className)} aria-label="GAW — Grab a Work">
        {iconElement}
      </span>
    );
  }

  return (
    <span
      className={cn("inline-flex items-center select-none", GAP_CLASSES[resolvedSize], className)}
      aria-label={variant === "expanded" ? `GAW — ${tagline}` : "GAW"}
    >
      {iconElement}
      <span className="flex flex-col justify-center">
        <span className="inline-flex items-center gap-2">
          <span
            className={cn(
              "font-extrabold",
              TITLE_CLASSES[resolvedSize],
              onDeep ? "text-deep-foreground" : "text-foreground",
            )}
          >
            GAW
          </span>
          {proBadge && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gold px-2.5 py-0.5 text-[0.68rem] font-extrabold uppercase tracking-[0.08em] text-gold-foreground shadow-2xs">
              <Crown className="size-3" aria-hidden />
              Pro
            </span>
          )}
        </span>

        {variant === "expanded" && (
          <span
            className={cn(
              "mt-1 font-semibold leading-none",
              SUBTITLE_CLASSES[resolvedSize],
              onDeep ? "text-deep-muted" : "text-muted-foreground",
            )}
          >
            {tagline}
          </span>
        )}
      </span>
    </span>
  );
}

export interface GAWWordmarkProps {
  /**
   * - `transparent`: Uses the exact luminance-preserved cropped derivative on dark/branded surfaces
   * - `original`: Uses the untouched 1024x1024 black-canvas asset inside a dark frame
   */
  mode?: "transparent" | "original" | undefined;
  /** Wrap in a styled obsidian/deep-forest brand pill or render bare on an already-dark surface */
  framed?: boolean | undefined;
  size?: "sm" | "md" | "lg" | undefined;
  className?: string | undefined;
}

const WORDMARK_HEIGHTS: Record<"sm" | "md" | "lg", string> = {
  sm: "h-4 sm:h-[18px]",
  md: "h-5 sm:h-[22px] lg:h-6",
  lg: "h-6 sm:h-8 md:h-9",
};

/**
 * Official Expressive "GRAB A WORK" Secondary Wordmark.
 * Preserves the exact custom lettering proportions and always sits on an intentional dark surface.
 */
export function GAWWordmark({
  mode = "transparent",
  framed = false,
  size = "md",
  className,
}: GAWWordmarkProps) {
  if (mode === "original") {
    return (
      <div
        className={cn(
          "inline-flex items-center justify-center overflow-hidden rounded-2xl bg-black px-4 py-2 ring-1 ring-white/10",
          className,
        )}
      >
        <img
          src={gawWordmarkOriginalUrl}
          alt="GRAB A WORK"
          width={1024}
          height={1024}
          decoding="async"
          className="h-16 w-auto object-contain"
        />
      </div>
    );
  }

  const img = (
    <img
      src={gawWordmarkTransparentUrl}
      alt="GRAB A WORK"
      width={951}
      height={145}
      decoding="async"
      className={cn("w-auto max-w-full object-contain select-none", WORDMARK_HEIGHTS[size])}
    />
  );

  if (!framed) {
    return <span className={cn("inline-flex items-center", className)}>{img}</span>;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-xl bg-[#0D1512] px-3.5 py-2 ring-1 ring-white/14 shadow-soft",
        className,
      )}
    >
      {img}
    </span>
  );
}
