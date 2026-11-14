import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Info, Loader2 } from "lucide-react";
import { Field, Logo } from "./primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGaw } from "@/lib/gaw/store";

type Kind = "login" | "signup";
type Values = { name: string; email: string; mobile: string; password: string; confirm: string };
type Errors = Partial<Record<keyof Values | "form", string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_RE = /^(09|\+639)\d{9}$/;

export function validateAuth(kind: Kind, v: Values): Errors {
  const e: Errors = {};
  if (kind === "signup" && v.name.trim().length < 2) e.name = "Please enter your full name.";
  if (!EMAIL_RE.test(v.email.trim())) e.email = "Enter a valid email, like juan@email.com.";
  if (kind === "signup" && !MOBILE_RE.test(v.mobile.replace(/[\s-]/g, "")))
    e.mobile = "Enter a PH mobile number, like 0917 123 4567.";
  if (v.password.length < 8) e.password = "Password needs at least 8 characters.";
  if (kind === "signup" && v.confirm !== v.password) e.confirm = "Passwords don't match.";
  return e;
}

export function AuthForm({ kind }: { kind: Kind }) {
  const gaw = useGaw();
  const navigate = useNavigate();
  const [v, setV] = useState<Values>({
    name: "",
    email: "",
    mobile: "",
    password: "",
    confirm: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  const set = (k: keyof Values) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setV((s) => ({ ...s, [k]: e.target.value }));

  const finish = () => {
    setBusy(true);
    // Short pause so the demo shows loading feedback.
    setTimeout(() => navigate({ to: "/mode" }), 450);
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
    k: keyof Values,
    label: string,
    type: string,
    auto: string,
    placeholder: string,
  ) => (
    <Field id={k} label={label} error={errors[k]}>
      <Input
        id={k}
        type={type}
        autoComplete={auto}
        placeholder={placeholder}
        value={v[k]}
        onChange={set(k)}
        aria-invalid={!!errors[k]}
        aria-describedby={errors[k] ? `${k}-error` : undefined}
      />
    </Field>
  );

  return (
    <div className="mx-auto w-full max-w-md">
      <Link to="/" aria-label="GAW welcome page">
        <Logo />
      </Link>
      <h1 className="mt-8 text-3xl font-extrabold tracking-tight">
        {kind === "signup" ? "Create your account" : "Welcome back"}
      </h1>
      <p className="mt-1.5 text-muted-foreground">
        {kind === "signup" ? "One account to hire and to work." : "Log in to continue on GAW."}
      </p>

      <form noValidate onSubmit={onSubmit} className="mt-7 space-y-4">
        {kind === "signup" && input("name", "Full Name", "text", "name", "Juan Dela Cruz")}
        {input("email", "Email", "email", "email", "juan@email.com")}
        {kind === "signup" && input("mobile", "Mobile Number", "tel", "tel", "0917 123 4567")}
        {input(
          "password",
          "Password",
          "password",
          kind === "signup" ? "new-password" : "current-password",
          "At least 8 characters",
        )}
        {kind === "signup" &&
          input("confirm", "Confirm Password", "password", "new-password", "Re-enter password")}

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

      <div className="my-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {kind === "signup" ? "Already have an account? " : "New to GAW? "}
        <Link
          to={kind === "signup" ? "/login" : "/signup"}
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          {kind === "signup" ? "Log in" : "Sign up"}
        </Link>
      </p>

      <p className="mt-6 flex gap-2 rounded-xl bg-muted px-3.5 py-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        Prototype only: sign-in is simulated on this device. Passwords are checked for format but
        never stored. Not production-grade security.
      </p>
    </div>
  );
}
