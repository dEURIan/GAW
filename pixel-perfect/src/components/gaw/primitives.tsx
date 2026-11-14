import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { STATUS_LABEL, type BookingStatus } from "@/lib/gaw/bookings";
import { BARANGAYS } from "@/lib/gaw/data";
import { GAWBrand, GAWWordmark, type GAWBrandProps } from "./GAWBrand";

export { GAWBrand, GAWWordmark, type GAWBrandProps };

export function Logo({
  onDeep = false,
  variant = "compact",
  size,
  proBadge = false,
  className,
}: {
  onDeep?: boolean;
  variant?: GAWBrandProps["variant"];
  size?: GAWBrandProps["size"];
  proBadge?: boolean;
  className?: string;
}) {
  return (
    <GAWBrand
      variant={variant}
      size={size}
      onDeep={onDeep}
      proBadge={proBadge}
      className={className}
    />
  );
}

/**
 * HeaderBrand: Standardized left-aligned header branding lockup ([GAW icon] GAW / Grab a Work).
 * Ensures the brand is established once on the left side of headers without right-side duplication.
 */
export function HeaderBrand({
  size = "sm",
  onDeep = false,
  proBadge = false,
  className,
}: {
  size?: GAWBrandProps["size"];
  onDeep?: boolean;
  proBadge?: boolean;
  className?: string;
}) {
  return (
    <GAWBrand
      variant="expanded"
      size={size}
      onDeep={onDeep}
      proBadge={proBadge}
      tagline="Grab a Work"
      className={className}
    />
  );
}

/**
 * Cohesive forest/emerald/olive avatar tones for Light and Dark Mode.
 * Avoids muddy brown in Dark Mode while keeping high-contrast initials and subtle border definition.
 */
const AVATAR_TONES = [
  "bg-[#E3F5EC] text-[#0E7048] ring-1 ring-inset ring-[#0E7048]/15 dark:bg-[#1E382B] dark:text-[#6EE7A8] dark:ring-[#43C486]/30",
  "bg-[#E5F0EC] text-[#123C39] ring-1 ring-inset ring-[#123C39]/15 dark:bg-[#1A332B] dark:text-[#8CE8B8] dark:ring-[#43C486]/28",
  "bg-[#123C39] text-[#F3F7F4] ring-1 ring-inset ring-white/12 dark:bg-[#22392E] dark:text-[#F3F7F4] dark:ring-[#43C486]/30",
  "bg-[#DCF2E7] text-[#0B5D3B] ring-1 ring-inset ring-[#0E7048]/20 dark:bg-[#20362B] dark:text-[#F4B544] dark:ring-[#F4B544]/28",
];

export function Avatar({
  initials,
  size = "md",
  className,
}: {
  initials: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const tone =
    AVATAR_TONES[[...initials].reduce((n, c) => n + c.charCodeAt(0), 0) % AVATAR_TONES.length];
  const sz = {
    sm: "size-9 text-xs",
    md: "size-12 text-sm",
    lg: "size-14 text-base tracking-tight",
    xl: "size-24 text-2xl",
  }[size];
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-2xl font-extrabold select-none",
        tone,
        sz,
        className,
      )}
    >
      {initials}
    </span>
  );
}

export function SkillChip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-border/80 bg-secondary/65 px-2.5 py-0.5 text-[11px] font-semibold text-foreground/90 dark:border-[#34483A] dark:bg-[#22352A] dark:text-[#DCE8E0]",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function PriceDisplay({
  formattedRate,
  unit = "/ hour",
  fallback = "Request Quote",
  className,
}: {
  formattedRate?: string | null | undefined;
  unit?: string;
  fallback?: string;
  className?: string;
}) {
  return (
    <p className={cn("text-sm", className)}>
      {formattedRate ? (
        <>
          <span className="text-base font-extrabold tracking-tight text-foreground">
            {formattedRate}
          </span>
          <span className="ml-1 text-xs font-medium text-muted-foreground">{unit}</span>
        </>
      ) : (
        <span className="text-sm font-semibold text-muted-foreground">{fallback}</span>
      )}
    </p>
  );
}

const STATUS_STYLES: Record<BookingStatus, string> = {
  pending: "bg-status-pending-bg text-status-pending",
  confirmed: "bg-status-confirmed-bg text-status-confirmed",
  declined: "bg-status-declined-bg text-status-declined",
  completed: "bg-status-completed-bg text-status-completed",
  in_progress: "bg-status-confirmed-bg text-status-confirmed",
  awaiting_confirmation: "bg-status-pending-bg text-status-pending",
  cancelled: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        STATUS_STYLES[status],
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function Availability({ available, className }: { available: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold", className)}>
      <span
        aria-hidden
        className={cn(
          "size-2 rounded-full",
          available ? "bg-primary ring-4 ring-primary/20" : "bg-muted-foreground/45",
        )}
      />
      <span className={available ? "text-primary" : "text-muted-foreground"}>
        {available ? "Available now" : "Busy today"}
      </span>
    </span>
  );
}

export const AvailabilityBadge = Availability;

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="text-lg font-bold tracking-tight">{title}</h2>
      {action}
    </div>
  );
}

export function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/** LocationFilter: barangay picker shared by dashboards, finder and forms. */
export function LocationFilter({
  id,
  value,
  onChange,
  label = "Barangay",
  includeAll = false,
  className,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  label?: string;
  includeAll?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={id}
        className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {label}
      </label>
      <select id={id} className="field" value={value} onChange={(e) => onChange(e.target.value)}>
        {includeAll && <option value="all">All areas</option>}
        {BARANGAYS.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed bg-card px-6 py-10 text-center">
      <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
        {icon}
      </div>
      <p className="font-bold">{title}</p>
      <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
