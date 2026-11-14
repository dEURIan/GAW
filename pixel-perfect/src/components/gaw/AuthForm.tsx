import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Info, Loader2, ShieldCheck } from "lucide-react";
import { FOCUS_RING, iconActionButtonClass, subtleLinkClass } from "./interactions";
import { Field } from "./primitives";
import { GAWBrand } from "./GAWBrand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGaw } from "@/lib/gaw/store";

type Kind = "login" | "signup";
export type AuthValues = {
  name: string;
  email: string;
  mobile: string;
  password: string;
  confirm: string;
  terms?: boolean;
};
type Errors = Partial<Record<keyof AuthValues | "form", string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_RE = /^(09|\+639)\d{9}$/;

export function validateAuth(kind: Kind, v: AuthValues): Errors {
  const e: Errors = {};
  if (kind === "signup" && v.name.trim().length < 2) e.name = "Please enter your full name.";
  if (!EMAIL_RE.test(v.email.trim())) e.email = "Enter a valid email, like juan@email.com.";
  if (kind === "signup" && !MOBILE_RE.test(v.mobile.replace(/[\s-]/g, "")))
    e.mobile = "Enter a PH mobile number, like 0917 123 4567.";
  if (v.password.length < 8) e.password = "Password needs at least 8 characters.";
  if (kind === "signup" && v.confirm !== v.password) e.confirm = "Passwords don't match.";
  if (kind === "signup" && v.terms === false) {
    e.terms = "Please accept the Terms and Privacy Policy to continue.";
  }
  return e;
}

export function AuthForm({ kind }: { kind: Kind }) {
  const gaw = useGaw();
  const navigate = useNavigate();
  const [v, setV] = useState<AuthValues>({
    name: "",
    email: "",
    mobile: "",
    password: "",
    confirm: "",
    terms: false,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const set = (k: Exclude<keyof AuthValues, "terms">) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setV((s) => ({ ...s, [k]: e.target.value }));

  const finish = () => {
    setBusy(true);
    setTimeout(() => navigate({ to: "/mode" }), 350);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const errs = validateAuth(kind, v);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    if (kind === "signup") {
      gaw.signUp({ name: v.name.trim(), email: v.email.trim(), mobile: v.mobile.trim() });
      finish();
    } else if (gaw.logIn(v.email)) {
      finish();
    } else {
      setErrors({
        form: "No account with this email on this device yet. Sign up, or use the demo account below.",
      });
    }
  };

  const demo = () => {
    gaw.demoLogin();
    finish();
  };

  const input = (
    k: Exclude<keyof AuthValues, "terms">,
    label: string,
    type: string,
    auto: string,
    placeholder: string,
  ) => {
    const isPassword = k === "password" || k === "confirm";
    const visible = k === "password" ? showPassword : showConfirm;
    const toggleVisible = () =>
      k === "password" ? setShowPassword((s) => !s) : setShowConfirm((s) => !s);
    const effectiveType = isPassword ? (visible ? "text" : "password") : type;

    return (
      <Field id={k} label={label} error={errors[k]}>
        <div className="relative">
          <Input
            id={k}
            type={effectiveType}
            autoComplete={auto}
            placeholder={placeholder}
            value={v[k]}
            onChange={set(k)}
            aria-invalid={!!errors[k]}
            aria-describedby={errors[k] ? `${k}-error` : undefined}
            className={isPassword ? "pr-11" : undefined}
          />
          {isPassword && (
            <button
              type="button"
              onClick={toggleVisible}
              aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
              className={iconActionButtonClass(
                "default",
                "absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5",
              )}
            >
              {visible ? (
                <EyeOff className="size-4" aria-hidden />
              ) : (
                <Eye className="size-4" aria-hidden />
              )}
            </button>
          )}
        </div>
      </Field>
    );
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="flex items-center justify-between">
        <Link
          to="/"
          aria-label="GAW welcome page"
          className={`inline-flex rounded-2xl transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
        >
          <GAWBrand variant="expanded" size="lg" />
        </Link>
      </div>

      <div className="mt-7 rounded-3xl border bg-card p-6 shadow-soft md:p-8">
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">
          {kind === "signup" ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {kind === "signup"
            ? "One GAW account to hire nearby talent and discover local work in Davao City."
            : "Log in to continue on GAW — Grab a Work."}
        </p>

        <form noValidate onSubmit={onSubmit} className="mt-6 space-y-4">
          {kind === "signup" && input("name", "Full Name", "text", "name", "Juan Dela Cruz")}
          {input("email", "Email Address", "email", "email", "juan@email.com")}
          {kind === "signup" &&
            input("mobile", "Philippine Mobile Number", "tel", "tel", "0917 123 4567")}
          {input(
            "password",
            "Password",
            "password",
            kind === "signup" ? "new-password" : "current-password",
            "At least 8 characters",
          )}
          {kind === "signup" &&
            input(
              "confirm",
              "Password Confirmation",
              "password",
              "new-password",
              "Re-enter password",
            )}

          {kind === "signup" && (
            <div className="space-y-1.5">
              <label
                htmlFor="terms"
                className="flex cursor-pointer items-start gap-2.5 rounded-2xl border bg-muted/40 p-3.5 text-xs leading-relaxed transition-[border-color,background-color] duration-150 hover:border-hover-border hover:bg-muted/70 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
              >
                <input
                  id="terms"
                  type="checkbox"
                  checked={!!v.terms}
                  onChange={(e) => setV((s) => ({ ...s, terms: e.target.checked }))}
                  className="mt-0.5 size-4 rounded border-input accent-primary"
                  aria-invalid={!!errors.terms}
                  aria-describedby={errors.terms ? "terms-error" : undefined}
                />
                <span>
                  I accept the <strong>GAW Terms of Service</strong> and{" "}
                  <strong>Privacy Policy</strong>, and understand this is a local Davao City
                  marketplace prototype.
                </span>
              </label>
              {errors.terms && (
                <p id="terms-error" role="alert" className="text-sm font-medium text-destructive">
                  {errors.terms}
                </p>
              )}
            </div>
          )}

          {errors.form && (
            <p
              role="alert"
              className="rounded-xl bg-status-declined-bg px-3.5 py-3 text-sm font-medium text-status-declined"
            >
              {errors.form}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy && <Loader2 className="animate-spin" />}
            {kind === "signup" ? "Create Account" : "Log In"}
          </Button>
        </form>

        {kind === "signup" && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-secondary/50 px-3.5 py-2.5 text-xs text-secondary-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <span>
              Join freely, choose your role, and explore opportunities right away. Identity
              verification is only requested when you apply for a job or submit a hiring request.
            </span>
          </div>
        )}

        <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
        </div>

        <Button
          type="button"
          variant="gold"
          size="lg"
          className="w-full"
          onClick={demo}
          disabled={busy}
        >
          Continue with Demo Account (for judges)
        </Button>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          {kind === "signup" ? "Already have an account? " : "New to GAW? "}
          <Link to={kind === "signup" ? "/login" : "/signup"} className={subtleLinkClass}>
            {kind === "signup" ? "Log in" : "Sign up"}
          </Link>
        </p>
      </div>

      <p className="mt-5 flex gap-2 rounded-xl bg-muted px-3.5 py-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        Prototype only: sign-in is simulated on this device. Passwords are checked for format but
        never stored. Not production-grade security.
      </p>
    </div>
  );
}
