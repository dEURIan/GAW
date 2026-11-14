import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { BookingStatus } from "@/lib/gaw/store";
import { BARANGAYS } from "@/lib/gaw/data";

export function Logo({ onDeep = false, className }: { onDeep?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-extrabold tracking-tight", className)}>
      <span
        aria-hidden
        className={cn(
          "relative grid size-8 place-items-center rounded-[10px] text-sm",
          onDeep ? "bg-deep-foreground text-deep" : "bg-primary text-primary-foreground",
        )}
      >
        g
        <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-gold ring-2 ring-background" />
      </span>
      <span className={cn("text-xl", onDeep ? "text-deep-foreground" : "text-foreground")}>
        GAW
      </span>
    </span>
  );
}

const AVATAR_TONES = [
  "bg-secondary text-secondary-foreground",
  "bg-gold-soft text-gold-foreground",
  "bg-deep text-deep-foreground",
  "bg-primary text-primary-foreground",
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
    lg: "size-16 text-lg",
    xl: "size-24 text-2xl",
  }[size];
  return (
    <span
      aria-hidden
      className={cn("grid shrink-0 place-items-center rounded-2xl font-bold", tone, sz, className)}
    >
      {initials}
    </span>
  );
}

const STATUS_STYLES: Record<BookingStatus, string> = {
  pending: "bg-status-pending-bg text-status-pending",
  confirmed: "bg-status-confirmed-bg text-status-confirmed",
  declined: "bg-status-declined-bg text-status-declined",
  completed: "bg-status-completed-bg text-status-completed",
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize",
        STATUS_STYLES[status],
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {status}
    </span>
  );
}

export function Availability({ available }: { available: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      <span
        aria-hidden
        className={cn(
          "size-2 rounded-full",
          available ? "bg-primary ring-4 ring-primary/15" : "bg-muted-foreground/40",
        )}
      />
      <span className={available ? "text-primary" : "text-muted-foreground"}>
        {available ? "Available now" : "Busy today"}
      </span>
    </span>
  );
}

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
