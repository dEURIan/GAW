import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Field, LocationFilter } from "./primitives";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIES, type Category } from "@/lib/gaw/data";
import { useGaw, type WorkerProfile } from "@/lib/gaw/store";

export const EXPERIENCE = ["Less than 1 year", "1–3 years", "3–5 years", "5–10 years", "10+ years"];

export function ProfileSetup() {
  const { saveWorkerProfile, locationId } = useGaw();
  const [p, setP] = useState<WorkerProfile>({
    skill: "Handyman",
    barangayId: locationId,
    experience: "",
    description: "",
  });
  const [errors, setErrors] = useState<{ experience?: string; description?: string }>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!p.experience) errs.experience = "Select your experience.";
    if (p.description.trim().length < 15)
      errs.description = "Write at least 15 characters so residents know you.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    saveWorkerProfile({ ...p, description: p.description.trim() });
    toast.success("Worker profile ready! You can now apply for jobs.");
  };

  return (
    <div className="mx-auto max-w-xl">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary">
        Step 1 of 1 · takes a minute
      </p>
      <h1 className="mt-1 text-2xl font-extrabold tracking-tight md:text-3xl">
        Set up your worker profile
      </h1>
      <p className="mt-1.5 text-muted-foreground">
        Tell nearby residents what you do. You can edit this later.
      </p>
      <form
        noValidate
        onSubmit={submit}
        className="mt-6 space-y-5 rounded-3xl border bg-card p-5 shadow-soft md:p-7"
      >
        <Field id="skill" label="Primary Skill">
          <select
            id="skill"
            className="field"
            value={p.skill}
            onChange={(e) => setP({ ...p, skill: e.target.value as Category })}
          >
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <LocationFilter
          id="area"
          label="Service Area"
          value={p.barangayId}
          onChange={(v) => setP({ ...p, barangayId: v })}
        />
        <Field id="experience" label="Experience" error={errors.experience}>
          <select
            id="experience"
            className="field"
            value={p.experience}
            onChange={(e) => setP({ ...p, experience: e.target.value })}
            aria-invalid={!!errors.experience}
            aria-describedby={errors.experience ? "experience-error" : undefined}
          >
            <option value="">Select experience</option>
            {EXPERIENCE.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Field>
        <Field id="description" label="Short Description" error={errors.description}>
          <Textarea
            id="description"
            value={p.description}
            onChange={(e) => setP({ ...p, description: e.target.value })}
            placeholder="e.g. Reliable handyman for repairs, assembly and small installs around Bajada."
            aria-invalid={!!errors.description}
            aria-describedby={errors.description ? "description-error" : undefined}
          />
        </Field>
        <Button type="submit" size="lg" className="w-full">
          Save & Start Working
        </Button>
      </form>
    </div>
  );
}
