import { useState, type FormEvent } from "react";
import { Field, LocationFilter } from "./primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Worker } from "@/lib/gaw/data";
import { cn } from "@/lib/utils";

export interface BookingDraft {
  service: string;
  description: string;
  date: string;
  time: string;
  barangayId: string;
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
  if (!d.service) e.service = "Choose a service type.";
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
  const [errors, setErrors] = useState<ReturnType<typeof validateBooking>>({});
  const set = <K extends keyof BookingDraft>(k: K, v: BookingDraft[K]) =>
    setD((s) => ({ ...s, [k]: v }));
  const services = Array.from(new Set([worker.skill, ...worker.skills]));

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

  return (
    <form noValidate onSubmit={submit} className="space-y-5">
      <Field id="service" label="Service Type" error={errors.service}>
        <select
          id="service"
          className="field"
          value={d.service}
          onChange={(e) => set("service", e.target.value)}
          {...aria("service")}
        >
          <option value="">Select a service</option>
          {services.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </Field>
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
      <LocationFilter
        id="barangayId"
        label="Barangay / Service Area"
        value={d.barangayId}
        onChange={(v) => set("barangayId", v)}
      />

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
                "flex h-11 cursor-pointer items-center justify-center rounded-xl border text-sm font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                d.budgetMode === v
                  ? "border-primary bg-secondary text-secondary-foreground"
                  : "bg-card text-muted-foreground",
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
