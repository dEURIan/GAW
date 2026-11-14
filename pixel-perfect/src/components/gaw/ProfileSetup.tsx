import { useState, type FormEvent } from "react";
import { Check, Pencil, Plus, ShieldCheck, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { LocationPicker } from "./GawMap";
import { iconActionButtonClass } from "./interactions";
import { Field } from "./primitives";
import { ServicePicker } from "./ServicePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BARANGAYS, barangayName, SKILL_SUGGESTIONS } from "@/lib/gaw/data";
import { addSkill, normalizeService, validateCustomService } from "@/lib/gaw/services";
import { useGaw, type WorkerProfile } from "@/lib/gaw/store";

export const EXPERIENCE = ["Less than 1 year", "1–3 years", "3–5 years", "5–10 years", "10+ years"];

export function ProfileSetup({
  initial,
  onDone,
}: {
  initial?: WorkerProfile | null | undefined;
  onDone?: (() => void) | undefined;
} = {}) {
  const { saveWorkerProfile, locationId, workerProfile } = useGaw();
  const seed = initial ?? workerProfile;
  const defaultBrgy =
    BARANGAYS.find((b) => b.id === (seed?.barangayId ?? locationId)) ?? BARANGAYS[0]!;

  const [p, setP] = useState<WorkerProfile>({
    skill: seed?.skill ?? "Handyman",
    skills: seed?.skills ?? ["Door & window repair", "Shelf mounting"],
    barangayId: seed?.barangayId ?? locationId,
    area: seed?.area ?? { lat: defaultBrgy.lat, lng: defaultBrgy.lng },
    radiusKm: seed?.radiusKm ?? 5,
    experience: seed?.experience ?? "1–3 years",
    description: seed?.description ?? "",
  });

  const [skillInput, setSkillInput] = useState("");
  const [skillSearch, setSkillSearch] = useState("");
  const [skillError, setSkillError] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [errors, setErrors] = useState<{
    skill?: string;
    experience?: string;
    description?: string;
  }>({});

  const filteredSuggestions = SKILL_SUGGESTIONS.filter(
    (s) =>
      s.toLowerCase() !== p.skill.toLowerCase() &&
      !p.skills.some((x) => x.toLowerCase() === s.toLowerCase()) &&
      (!skillSearch.trim() || s.toLowerCase().includes(skillSearch.trim().toLowerCase())),
  ).slice(0, 8);

  const handleAddSkill = (raw = skillInput) => {
    const err = validateCustomService(raw);
    if (err) {
      setSkillError(err);
      return;
    }
    setSkillError(null);
    const next = addSkill(p.skills, raw, p.skill);
    setP((prev) => ({ ...prev, skills: next }));
    setSkillInput("");
    toast.success(`Added skill: ${normalizeService(raw)}`);
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setP((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skillToRemove),
    }));
  };

  const handleSaveEditedSkill = (idx: number) => {
    const err = validateCustomService(editingValue);
    if (err) {
      setSkillError(err);
      return;
    }
    setSkillError(null);
    const clean = normalizeService(editingValue);
    setP((prev) => ({
      ...prev,
      skills: prev.skills.map((s, i) => (i === idx ? clean : s)),
    }));
    setEditingIndex(null);
    setEditingValue("");
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    const skillErr = validateCustomService(p.skill);
    if (skillErr) errs.skill = skillErr;
    if (!p.experience) errs.experience = "Select your experience.";
    if (p.description.trim().length < 15)
      errs.description = "Write at least 15 characters so residents know you.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    saveWorkerProfile({
      ...p,
      skill: normalizeService(p.skill),
      description: p.description.trim(),
    });
    toast.success(
      seed ? "Worker profile updated!" : "Worker profile ready! You can now apply for jobs.",
    );
    onDone?.();
  };

  const mapOrigin = p.area ?? { lat: defaultBrgy.lat, lng: defaultBrgy.lng };

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary">
        {seed ? "Edit Worker Profile & Skills" : "Step 1 of 1 · takes a minute"}
      </p>
      <h1 className="mt-1 text-2xl font-extrabold tracking-tight md:text-3xl">
        {seed ? "Update your skills & service area" : "Set up your worker profile"}
      </h1>
      <p className="mt-1.5 text-muted-foreground">
        Choose a predefined or custom primary skill, add multiple additional skills, and set your
        Davao City working radius.
      </p>

      <form
        noValidate
        onSubmit={submit}
        className="mt-6 space-y-6 rounded-3xl border bg-card p-5 shadow-soft md:p-7"
      >
        {/* 1. Primary Skill (Predefined or Custom) */}
        <ServicePicker
          id="skill"
          label="Primary Skill (Predefined or Custom)"
          value={p.skill}
          onChange={(skill) =>
            setP((prev) => ({
              ...prev,
              skill,
              skills: prev.skills.filter((s) => s.toLowerCase() !== skill.toLowerCase()),
            }))
          }
          extraOptions={SKILL_SUGGESTIONS.slice(0, 8)}
          allowCustom
          error={errors.skill}
        />

        {/* 2. Additional Skills (Multi-skill tags, edit, remove, custom input) */}
        <div className="space-y-3 rounded-2xl border bg-muted/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <label htmlFor="additional-skill-input" className="block text-sm font-bold">
                Additional Skills & Specialties
              </label>
              <p className="text-xs text-muted-foreground">
                Add custom skills or specialties so residents can find you for more tasks.
              </p>
            </div>
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-bold text-secondary-foreground">
              {p.skills.length} additional {p.skills.length === 1 ? "skill" : "skills"}
            </span>
          </div>

          {/* Skill Chips / Tags with Edit & Remove */}
          {p.skills.length > 0 ? (
            <ul className="flex flex-wrap gap-2" aria-label="Selected additional skills">
              {p.skills.map((s, idx) => (
                <li
                  key={s}
                  className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-semibold shadow-soft"
                >
                  {editingIndex === idx ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        className="h-6 w-36 px-2 text-xs"
                        aria-label={`Edit skill ${s}`}
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEditedSkill(idx)}
                        className={iconActionButtonClass("default", "p-1 text-primary")}
                        aria-label="Save edited skill"
                      >
                        <Check className="size-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span>{s}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingIndex(idx);
                          setEditingValue(s);
                        }}
                        className={iconActionButtonClass("default", "p-1")}
                        title={`Edit ${s}`}
                        aria-label={`Edit skill ${s}`}
                      >
                        <Pencil className="size-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(s)}
                        className={iconActionButtonClass("destructive", "p-1")}
                        title={`Remove ${s}`}
                        aria-label={`Remove skill ${s}`}
                      >
                        <X className="size-3.5" />
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">No additional skills added yet.</p>
          )}

          {/* Add Custom Skill Input */}
          <div className="flex gap-2">
            <Input
              id="additional-skill-input"
              value={skillInput}
              onChange={(e) => {
                setSkillInput(e.target.value);
                setSkillSearch(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddSkill();
                }
              }}
              placeholder="Add custom skill (e.g. Graphic Designer, Motorcycle Mechanic, Tutor)…"
            />
            <Button type="button" variant="outline" onClick={() => handleAddSkill()}>
              <Plus className="size-4" /> Add Skill
            </Button>
          </div>

          {skillError && (
            <p role="alert" className="text-xs font-medium text-destructive">
              {skillError}
            </p>
          )}

          {/* Quick-Add Suggestions */}
          {filteredSuggestions.length > 0 && (
            <div className="space-y-1.5">
              <p className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                <Sparkles className="size-3 text-primary" aria-hidden /> Quick-add suggestions:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {filteredSuggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleAddSkill(s)}
                    className="cursor-pointer rounded-full border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground transition-[background-color,border-color,color,transform] duration-150 ease-out hover:-translate-y-[0.5px] hover:border-hover-border hover:bg-hover-surface hover:text-foreground active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 3. Working Mode — Service Area Map & Working Radius (1, 3, 5, 10 km) */}
        <div className="space-y-2">
          <div className="flex items-start gap-2 rounded-2xl bg-secondary/50 px-3.5 py-2.5 text-xs text-secondary-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <span>
              <strong>Worker Location Privacy:</strong> Your live device GPS position never
              automatically becomes your public location. Employers only see your general service
              area ({barangayName(p.barangayId)}) and {p.radiusKm} km coverage radius.
            </span>
          </div>

          <LocationPicker
            modeLabel="Worker Service Area & Radius"
            initialLocation={mapOrigin}
            initialBarangayId={p.barangayId}
            initialLabel={`${barangayName(p.barangayId)} service area`}
            radiusKm={p.radiusKm}
            onRadiusChange={(km) => setP((prev) => ({ ...prev, radiusKm: km }))}
            onConfirm={(placed, brgyId) => {
              setP((prev) => ({
                ...prev,
                barangayId: brgyId,
                area: { lat: placed.lat, lng: placed.lng },
              }));
            }}
            confirmLabel="Confirm Service Area"
          />
        </div>

        {/* 4. Experience & Bio */}
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
            placeholder={`e.g. Reliable ${p.skill.toLowerCase()} specialist serving ${barangayName(p.barangayId)} and nearby barangays within ${p.radiusKm} km.`}
            aria-invalid={!!errors.description}
            aria-describedby={errors.description ? "description-error" : undefined}
          />
        </Field>

        <div className="flex flex-wrap gap-3">
          {onDone && (
            <Button type="button" variant="outline" size="lg" className="flex-1" onClick={onDone}>
              Cancel
            </Button>
          )}
          <Button type="submit" size="lg" className="flex-1">
            {seed ? "Save Profile Changes" : "Save & Start Working"}
          </Button>
        </div>
      </form>
    </div>
  );
}
