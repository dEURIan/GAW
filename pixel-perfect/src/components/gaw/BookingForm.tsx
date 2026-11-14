import { useState, type FormEvent } from "react";
import { MapPin, Navigation } from "lucide-react";
import { LocationPicker } from "./GawMap";
import { Field } from "./primitives";
import { ServicePicker } from "./ServicePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BARANGAYS, type Worker } from "@/lib/gaw/data";
import type { PlacedLocation } from "@/lib/gaw/store";
import { cn } from "@/lib/utils";

export interface BookingDraft {
  service: string;
  description: string;
  date: string;
  time: string;
  barangayId: string;
  location?: PlacedLocation | null;
  budgetMode: "budget" | "quote";
  budget: string;
}

export const TIME_SLOTS = ["08:00", "10:00", "13:00", "15:00", "17:00"];

export function formatTime(t: string) {
  const [h = 0, m = 0] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

function todayISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function validateBooking(d: BookingDraft, today = todayISO()) {
  const e: Partial<Record<keyof BookingDraft, string>> = {};
  if (!d.service || !d.service.trim()) e.service = "Choose or enter a service type.";
  if (d.description.trim().length < 10)
    e.description = "Describe the job in at least 10 characters.";
  if (!d.date) e.date = "Pick a preferred date.";
  else if (d.date < today) e.date = "Pick today or a future date.";
  if (!d.time) e.time = "Pick a preferred time.";
  if (d.budgetMode === "budget") {
    const n = Number(d.budget);
    if (!d.budget || Number.isNaN(n) || n < 100)
      e.budget = "Enter a budget of at least ₱100, or request a quote.";
  }
  return e;
}

export function BookingForm({
  worker,
  initial,
  onReview,
}: {
  worker: Worker;
  initial: BookingDraft;
  onReview: (d: BookingDraft) => void;
}) {
  const [d, setD] = useState<BookingDraft>(initial);
  const [showMap, setShowMap] = useState(false);
  const [errors, setErrors] = useState<ReturnType<typeof validateBooking>>({});
  const set = <K extends keyof BookingDraft>(k: K, v: BookingDraft[K]) =>
    setD((s) => ({ ...s, [k]: v }));
  const workerServices = Array.from(new Set([worker.skill, ...worker.skills]));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs = validateBooking(d);
    setErrors(errs);
    if (Object.keys(errs).length === 0) onReview(d);
    else document.getElementById(Object.keys(errs)[0] ?? "")?.focus();
  };

  const aria = (k: keyof BookingDraft) => ({
    "aria-invalid": !!errors[k],
    "aria-describedby": errors[k] ? `${k}-error` : undefined,
  });

  const currentBrgy = BARANGAYS.find((b) => b.id === d.barangayId) ?? BARANGAYS[0]!;
  const mapInit = d.location ?? { lat: currentBrgy.lat, lng: currentBrgy.lng };

  return (
    <form noValidate onSubmit={submit} className="space-y-5">
      <ServicePicker
        id="service"
        label="Service Type (Predefined or Custom)"
        value={d.service}
        onChange={(svc) => set("service", svc)}
        extraOptions={workerServices}
        allowCustom
        error={errors.service}
      />

      <Field
        id="description"
        label="Job Description"
        error={errors.description}
        hint="What needs fixing? Any details help."
      >
        <Textarea
          id="description"
          value={d.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="e.g. Water leaking under the kitchen sink since yesterday."
          {...aria("description")}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="date" label="Preferred Date" error={errors.date}>
          <Input
            id="date"
            type="date"
            min={todayISO()}
            value={d.date}
            onChange={(e) => set("date", e.target.value)}
            {...aria("date")}
          />
        </Field>
        <Field id="time" label="Preferred Time" error={errors.time}>
          <select
            id="time"
            className="field"
            value={d.time}
            onChange={(e) => set("time", e.target.value)}
            {...aria("time")}
          >
            <option value="">Select a time</option>
            {TIME_SLOTS.map((t) => (
              <option key={t} value={t}>
                {formatTime(t)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="space-y-3 rounded-2xl border bg-muted/40 p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Live GPS Service Area
            </p>
            <p className="text-xs text-muted-foreground">
              Through our live GPS tracking system, we connect you with workers in the same general
              area.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant={showMap ? "default" : "outline"}
            onClick={() => setShowMap((v) => !v)}
          >
            <Navigation className="size-3.5" />
            {showMap ? "Close Map" : "Pinpoint on Map / GPS"}
          </Button>
        </div>

        {d.location && (
          <p className="flex items-center gap-1.5 text-xs font-semibold text-primary">
            <MapPin className="size-3.5" aria-hidden /> Pinpointed: {d.location.label}
          </p>
        )}

        {showMap && (
          <LocationPicker
            modeLabel="Pinpoint Job Service Location"
            initialLocation={mapInit}
            initialBarangayId={d.barangayId}
            initialLabel={d.location?.label ?? "Live GPS · General Area"}
            onConfirm={(placed, brgyId) => {
              set("barangayId", brgyId);
              set("location", placed);
              setShowMap(false);
            }}
          />
        )}
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">Budget</legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["budget", "Set my budget"],
              ["quote", "Request a quote"],
            ] as const
          ).map(([v, l]) => (
            <label
              key={v}
              className={cn(
                "flex h-11 cursor-pointer items-center justify-center rounded-xl border text-sm font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-160 ease-out active:scale-[0.98] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring motion-reduce:transition-none motion-reduce:active:scale-100",
                d.budgetMode === v
                  ? "border-primary bg-secondary text-secondary-foreground shadow-xs ring-1 ring-inset ring-primary/25"
                  : "bg-card text-muted-foreground hover:border-hover-border hover:bg-hover-surface hover:text-foreground",
              )}
            >
              <input
                type="radio"
                name="budgetMode"
                value={v}
                checked={d.budgetMode === v}
                onChange={() => set("budgetMode", v)}
                className="sr-only"
              />
              {l}
            </label>
          ))}
        </div>
        {d.budgetMode === "budget" && (
          <Field id="budget" label="Amount (PHP)" error={errors.budget}>
            <Input
              id="budget"
              inputMode="numeric"
              placeholder="e.g. 1200"
              value={d.budget}
              onChange={(e) => set("budget", e.target.value.replace(/[^\d]/g, ""))}
              {...aria("budget")}
            />
          </Field>
        )}
      </fieldset>

      <Button type="submit" size="lg" className="w-full">
        Review Details
      </Button>
    </form>
  );
}
