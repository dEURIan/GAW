import { useEffect, useState, type ChangeEvent } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileCheck2,
  FileText,
  Info,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { REDUCED_MOTION_RESET, segmentedOptionClass, subtleLinkClass } from "./interactions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  canPerformProtectedAction,
  identityVerified,
  useGaw,
  type VerifDoc,
} from "@/lib/gaw/store";
import {
  CREDENTIAL_TYPES,
  formatBytes,
  ID_TYPES,
  MAX_FILE_MB,
  validateUpload,
  VERIF_LABEL,
  VERIF_NEXT,
  type CredentialKey,
  type VerifStatus,
} from "@/lib/gaw/verification";
import { cn } from "@/lib/utils";

export function VerifStatusPill({ status }: { status: VerifStatus }) {
  const styles: Record<VerifStatus, string> = {
    not_submitted: "bg-muted text-muted-foreground",
    unverified: "bg-muted text-muted-foreground",
    pending: "bg-status-pending-bg text-status-pending",
    verified: "bg-status-confirmed-bg text-status-confirmed",
    rejected: "bg-status-declined-bg text-status-declined",
    resubmission_required: "bg-gold-soft text-gold-foreground",
  };
  const icons: Record<VerifStatus, typeof Clock> = {
    not_submitted: FileText,
    unverified: FileText,
    pending: Clock,
    verified: CheckCircle2,
    rejected: XCircle,
    resubmission_required: RefreshCw,
  };
  const Icon = icons[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
        styles[status],
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {VERIF_LABEL[status]}
    </span>
  );
}

interface PendingUpload {
  fileName: string;
  fileSize: number;
  fileType: string;
  isSample: boolean;
  previewUrl: string | null;
}

export interface VerificationGuardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: "hire" | "work";
  /** Context label describing the preserved draft (e.g. worker name or job title) */
  actionContext?: string | undefined;
  /** Invoked when the user is verified and clicks Continue to complete their protected action */
  onVerifiedContinue?: (() => void) | undefined;
}

/**
 * Reusable Action-Based Identity Verification Modal.
 * Triggered only when a user attempts a protected marketplace transaction
 * (applying for a job or submitting a hiring request) while preserving their draft state.
 */
export function VerificationGuardModal({
  open,
  onOpenChange,
  role,
  actionContext,
  onVerifiedContinue,
}: VerificationGuardModalProps) {
  const { account, verification, submitVerification, setVerificationStatus } = useGaw();
  const guard = canPerformProtectedAction(verification);
  const identityDoc = verification.identity;

  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedIdType, setSelectedIdType] = useState<string>(ID_TYPES[0]);
  const [stagedIdentity, setStagedIdentity] = useState<PendingUpload | null>(null);
  const [identityError, setIdentityError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setShowUploadForm(false);
      setIdentityError(null);
    } else if (guard.status === "rejected" || guard.status === "resubmission_required") {
      setShowUploadForm(true);
    }
  }, [open, guard.status]);

  const handleIdentityFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateUpload(file);
    if (err) {
      setIdentityError(err);
      return;
    }
    setIdentityError(null);
    const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
    setStagedIdentity({
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      isSample: false,
      previewUrl,
    });
  };

  const handleUseSampleIdentity = () => {
    setIdentityError(null);
    setStagedIdentity({
      fileName: `SAMPLE-${selectedIdType.replace(/[^a-zA-Z0-9]/g, "_")}-DEMO.png`,
      fileSize: 284 * 1024,
      fileType: "image/png",
      isSample: true,
      previewUrl: null,
    });
  };

  const handleSubmitIdentity = () => {
    if (!stagedIdentity) {
      setIdentityError("Select a file or choose a clearly labeled sample document first.");
      return;
    }
    submitVerification("identity", {
      kind: selectedIdType,
      fileName: stagedIdentity.fileName,
      fileSize: stagedIdentity.fileSize,
      fileType: stagedIdentity.fileType,
      isSample: stagedIdentity.isSample,
    });
    setStagedIdentity(null);
    setShowUploadForm(false);
    toast.success("Identity document submitted for review (Status: Pending Review)");
  };

  const displayStatus: VerifStatus = guard.status === "not_submitted" ? "unverified" : guard.status;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto rounded-3xl p-6 sm:p-7">
        <DialogHeader className="text-left">
          <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-bold text-primary">
              <ShieldCheck className="size-4" aria-hidden /> Identity Verification Required
            </span>
            <VerifStatusPill status={displayStatus} />
          </div>
          <DialogTitle className="mt-3 text-2xl font-extrabold tracking-tight">
            Verify Your Identity to Continue
          </DialogTitle>
          <DialogDescription className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            To keep GAW safe and trustworthy for everyone, identity verification is required before
            applying for jobs or hiring workers.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-4">
          {/* Draft preservation notice */}
          {actionContext && (
            <div className="flex items-center justify-between gap-2 rounded-2xl border bg-muted/50 px-3.5 py-2.5 text-xs">
              <span className="text-muted-foreground">
                Protected action: <strong className="text-foreground">{actionContext}</strong>
              </span>
              <span className="shrink-0 font-semibold text-primary">Draft saved</span>
            </div>
          )}

          {/* Rejected / Resubmission Required Alert Banner */}
          {(guard.status === "rejected" || guard.status === "resubmission_required") &&
            guard.reason && (
              <div
                role="alert"
                className={cn(
                  "rounded-2xl border p-4 text-xs leading-relaxed",
                  guard.status === "rejected"
                    ? "border-status-declined/35 bg-status-declined-bg text-status-declined"
                    : "border-gold/40 bg-gold-soft text-gold-foreground",
                )}
              >
                <p className="font-bold">
                  {guard.status === "rejected"
                    ? "Previous verification was rejected"
                    : "Resubmission required"}
                </p>
                <p className="mt-1">{guard.reason}</p>
              </div>
            )}

          {/* Verified State */}
          {guard.allowed && (
            <div className="space-y-4 rounded-2xl border border-status-confirmed/30 bg-status-confirmed-bg p-4 text-sm">
              <div className="flex items-center gap-2.5 font-bold text-status-confirmed">
                <CheckCircle2 className="size-5 shrink-0" aria-hidden />
                <span>Your identity is verified and approved!</span>
              </div>
              <p className="text-xs text-foreground/85">
                You can now complete your {role === "work" ? "job application" : "booking request"}{" "}
                immediately with all your details preserved.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  size="lg"
                  className="flex-1"
                  onClick={() => {
                    onOpenChange(false);
                    onVerifiedContinue?.();
                  }}
                >
                  Continue & Submit <ArrowRight className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}

          {/* Pending State */}
          {guard.isPending && identityDoc && (
            <div className="space-y-4">
              <div className="rounded-2xl border bg-muted/40 p-4">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-status-pending-bg text-status-pending">
                    <Clock className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">Verification Pending Review</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Submitted ID: <strong>{identityDoc.kind}</strong> ({identityDoc.fileName})
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                      Uploading a document does not automatically approve your account. An
                      authorized reviewer must verify your ID before you can submit{" "}
                      {role === "work" ? "job applications" : "hiring requests"}.
                    </p>
                  </div>
                </div>

                {/* Prototype Reviewer Simulation Controls */}
                <div className="mt-4 rounded-xl border border-dashed bg-card p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    Authorized Review Simulation (Prototype Demo)
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setVerificationStatus("identity", "verified");
                        toast.success("Identity verified! You can now continue your action.");
                      }}
                    >
                      <CheckCircle2 className="size-3.5" /> Approve (Verified)
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setVerificationStatus("identity", "resubmission_required");
                        setShowUploadForm(true);
                        toast("Status updated: Resubmission required");
                      }}
                    >
                      <RefreshCw className="size-3.5" /> Request Resubmission
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setVerificationStatus("identity", "rejected");
                        setShowUploadForm(true);
                        toast("Status updated: Rejected");
                      }}
                    >
                      <XCircle className="size-3.5" /> Reject
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Maybe Later
                </Button>
                <Button asChild variant="secondary">
                  <Link to="/verify" onClick={() => onOpenChange(false)}>
                    Open Verification Center
                  </Link>
                </Button>
              </div>
            </div>
          )}

          {/* Unverified / Rejected / Resubmission Required State */}
          {guard.requiresSubmission && (
            <>
              {!showUploadForm ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border bg-muted/35 p-4 text-xs leading-relaxed">
                    <p className="font-bold text-foreground">What you need to verify:</p>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
                      <li>
                        Valid government-issued photo ID matching{" "}
                        <strong>{account?.name ?? "your account"}</strong>
                      </li>
                      <li>Optional Barangay Clearance or trade certificate when applicable</li>
                      <li>
                        Documents are kept private and accessible only to authorized reviewers
                      </li>
                    </ul>
                  </div>

                  <div className="flex flex-col gap-2.5 sm:flex-row">
                    <Button
                      type="button"
                      size="lg"
                      className="flex-1"
                      onClick={() => setShowUploadForm(true)}
                    >
                      <ShieldCheck className="size-4" /> Verify Now
                    </Button>
                    <Button
                      type="button"
                      size="lg"
                      variant="outline"
                      className="flex-1"
                      onClick={() => onOpenChange(false)}
                    >
                      Maybe Later
                    </Button>
                  </div>

                  <p className="text-center text-xs text-muted-foreground">
                    Prefer the full page?{" "}
                    <Link
                      to="/verify"
                      onClick={() => onOpenChange(false)}
                      className={subtleLinkClass}
                    >
                      Go to Account Settings → Verification Center
                    </Link>
                  </p>
                </div>
              ) : (
                <div className="space-y-4 rounded-2xl border bg-card p-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="modal-id-type-select"
                      className="block text-xs font-bold uppercase tracking-wide text-primary"
                    >
                      Select Government-Issued Photo ID
                    </label>
                    <select
                      id="modal-id-type-select"
                      className="field"
                      value={selectedIdType}
                      onChange={(e) => setSelectedIdType(e.target.value)}
                    >
                      {ID_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <label
                      className={cn(
                        "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed bg-muted/40 p-3.5 text-center transition-[background-color,border-color,box-shadow,transform] duration-180 ease-out hover:-translate-y-[1px] hover:border-primary hover:bg-hover-surface/65 hover:shadow-soft active:translate-y-0 active:scale-[0.99] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                        REDUCED_MOTION_RESET,
                      )}
                    >
                      <Upload className="size-4 text-primary" aria-hidden />
                      <span className="text-xs font-bold">Upload ID Photo / PDF</span>
                      <span className="text-[11px] text-muted-foreground">
                        Max {MAX_FILE_MB} MB
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={handleIdentityFile}
                        className="sr-only"
                        aria-label="Upload government ID file"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={handleUseSampleIdentity}
                      className={cn(
                        "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border bg-gold-soft/60 p-3.5 text-center text-gold-foreground transition-[background-color,border-color,box-shadow,transform] duration-180 ease-out hover:-translate-y-[1px] hover:border-gold hover:bg-gold-soft hover:shadow-soft active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        REDUCED_MOTION_RESET,
                      )}
                    >
                      <Sparkles className="size-4" aria-hidden />
                      <span className="text-xs font-bold">Use Sample ID (Demo)</span>
                      <span className="text-[11px] opacity-85">
                        Safe sample {selectedIdType.split(" ")[0]}
                      </span>
                    </button>
                  </div>

                  {identityError && (
                    <p role="alert" className="text-xs font-semibold text-destructive">
                      {identityError}
                    </p>
                  )}

                  {stagedIdentity && (
                    <div className="rounded-xl border bg-muted/50 p-3">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="min-w-0">
                          <p className="truncate font-bold">{stagedIdentity.fileName}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {selectedIdType} · {formatBytes(stagedIdentity.fileSize)}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setStagedIdentity(null)}
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                    <Button type="button" className="flex-1" onClick={handleSubmitIdentity}>
                      {guard.status === "rejected" || guard.status === "resubmission_required"
                        ? "Resubmit ID for Review"
                        : "Submit ID for Verification Review"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                      Maybe Later
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function VerificationCenter({ showRoleToggle = true }: { showRoleToggle?: boolean }) {
  const gaw = useGaw();
  const {
    account,
    mode,
    verification,
    submitVerification,
    setVerificationStatus,
    removeVerification,
  } = gaw;
  const [roleView, setRoleView] = useState<"hire" | "work">(mode ?? "work");
  const [selectedIdType, setSelectedIdType] = useState<string>(ID_TYPES[0]);
  const [stagedIdentity, setStagedIdentity] = useState<PendingUpload | null>(null);
  const [identityError, setIdentityError] = useState<string | null>(null);

  const [credErrors, setCredErrors] = useState<Partial<Record<CredentialKey, string>>>({});
  const [stagedCreds, setStagedCreds] = useState<Partial<Record<CredentialKey, PendingUpload>>>({});

  const identityDoc: VerifDoc | null = verification.identity;
  const identityStatus: VerifStatus = identityDoc?.status ?? "not_submitted";

  const handleIdentityFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateUpload(file);
    if (err) {
      setIdentityError(err);
      return;
    }
    setIdentityError(null);
    const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
    setStagedIdentity({
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      isSample: false,
      previewUrl,
    });
  };

  const handleUseSampleIdentity = () => {
    setIdentityError(null);
    setStagedIdentity({
      fileName: `SAMPLE-${selectedIdType.replace(/[^a-zA-Z0-9]/g, "_")}-DEMO.png`,
      fileSize: 284 * 1024,
      fileType: "image/png",
      isSample: true,
      previewUrl: null,
    });
  };

  const handleSubmitIdentity = () => {
    if (!stagedIdentity) {
      setIdentityError("Select a file or choose a clearly labeled sample document first.");
      return;
    }
    submitVerification("identity", {
      kind: selectedIdType,
      fileName: stagedIdentity.fileName,
      fileSize: stagedIdentity.fileSize,
      fileType: stagedIdentity.fileType,
      isSample: stagedIdentity.isSample,
    });
    setStagedIdentity(null);
    toast.success("Identity document submitted for review (Status: Pending Review)");
  };

  const handleCredFile = (key: CredentialKey, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateUpload(file);
    if (err) {
      setCredErrors((s) => ({ ...s, [key]: err }));
      return;
    }
    setCredErrors((s) => {
      const next = { ...s };
      delete next[key];
      return next;
    });
    const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
    setStagedCreds((s) => ({
      ...s,
      [key]: {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        isSample: false,
        previewUrl,
      },
    }));
  };

  const handleUseSampleCred = (key: CredentialKey, label: string) => {
    setCredErrors((s) => {
      const next = { ...s };
      delete next[key];
      return next;
    });
    setStagedCreds((s) => ({
      ...s,
      [key]: {
        fileName: `SAMPLE-${key.toUpperCase()}-CREDENTIAL-DEMO.pdf`,
        fileSize: 196 * 1024,
        fileType: "application/pdf",
        isSample: true,
        previewUrl: null,
      },
    }));
    toast(`Sample ${label.split("/")[0]?.trim()} staged — click Submit to send for review`);
  };

  const handleSubmitCred = (key: CredentialKey, label: string) => {
    const staged = stagedCreds[key];
    if (!staged) {
      setCredErrors((s) => ({ ...s, [key]: "Upload a file or select the sample document first." }));
      return;
    }
    submitVerification(key, {
      kind: label,
      fileName: staged.fileName,
      fileSize: staged.fileSize,
      fileType: staged.fileType,
      isSample: staged.isSample,
    });
    setStagedCreds((s) => {
      const next = { ...s };
      delete next[key];
      return next;
    });
    toast.success(`${label.split("/")[0]?.trim()} submitted for review`);
  };

  return (
    <div className="space-y-6">
      {/* Purpose & Privacy Banner */}
      <section className="rounded-3xl border bg-card p-5 shadow-soft md:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary">
              <ShieldCheck className="size-4" aria-hidden /> GAW Trust & Verification Center
            </span>
            <h2 className="text-xl font-extrabold tracking-tight md:text-2xl">
              Role-aware verification for safer local hiring
            </h2>
            <p className="text-sm text-muted-foreground">
              Verification helps Davao City residents and workers know they are dealing with real
              people. Submitting an ID places it in <strong>Pending Review</strong> — a{" "}
              <strong>Verified</strong> badge only appears after review is approved.
            </p>
          </div>
          <div className="shrink-0">
            <VerifStatusPill status={identityStatus} />
          </div>
        </div>

        {/* Account Summary (Never duplicates inputs; reuses existing account details) */}
        {account && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-muted px-4 py-3 text-xs">
            <div>
              <span className="font-bold text-foreground">{account.name}</span>
              <span className="mx-2 text-muted-foreground">·</span>
              <span className="text-muted-foreground">{account.email}</span>
              <span className="mx-2 text-muted-foreground">·</span>
              <span className="text-muted-foreground">{account.mobile}</span>
            </div>
            {identityVerified(verification) && (
              <span className="inline-flex items-center gap-1 font-bold text-primary">
                <CheckCircle2 className="size-3.5" aria-hidden /> Identity Verified
              </span>
            )}
          </div>
        )}

        {/* Prototype Privacy & Security Disclaimer */}
        <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-primary/25 bg-secondary/60 p-3.5 text-xs text-secondary-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <div>
            <p className="font-bold">Prototype Privacy Protection</p>
            <p className="mt-0.5">
              Because this is a hackathon prototype without encrypted government-ID storage
              infrastructure, <strong>do not upload sensitive real IDs</strong>. Only file metadata
              is stored locally in your browser, or you can use the one-click{" "}
              <strong>Sample Document (Demo)</strong> buttons below.
            </p>
          </div>
        </div>

        {showRoleToggle && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <p className="text-xs font-semibold text-muted-foreground">Viewing requirements for:</p>
            <div className="inline-flex rounded-full border border-border/60 bg-muted p-1 text-xs font-semibold">
              <button
                type="button"
                aria-pressed={roleView === "work"}
                onClick={() => setRoleView("work")}
                className={segmentedOptionClass(
                  roleView === "work",
                  "card",
                  "rounded-full px-3.5 py-1.5",
                )}
              >
                Worker Verification
              </button>
              <button
                type="button"
                aria-pressed={roleView === "hire"}
                onClick={() => setRoleView("hire")}
                className={segmentedOptionClass(
                  roleView === "hire",
                  "card",
                  "rounded-full px-3.5 py-1.5",
                )}
              >
                Employer Verification
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Step 1: Basic Identity Verification (Shared by Workers & Employers) */}
      <section className="rounded-3xl border bg-card p-5 shadow-soft md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-primary">
              Basic Identity Verification ·{" "}
              {roleView === "hire" ? "Household Employer" : "Worker & Employer"}
            </p>
            <h3 className="mt-0.5 text-lg font-extrabold">1. Government-Issued Photo ID</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Used only to confirm your legal name matches your GAW account (
              {account?.name ?? "your profile"}).
              {roleView === "hire" &&
                " Ordinary household employers only need basic identity verification — no trade credentials required."}
            </p>
          </div>
          <VerifStatusPill status={identityStatus} />
        </div>

        {/* Next required action indicator */}
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-muted px-4 py-3 text-xs">
          <AlertCircle className="size-4 shrink-0 text-primary" aria-hidden />
          <span>
            <strong>Next step:</strong> {VERIF_NEXT[identityStatus]}
          </span>
        </div>

        {/* Rejection or Resubmission Reason Banner */}
        {identityDoc &&
          (identityDoc.status === "rejected" || identityDoc.status === "resubmission_required") &&
          identityDoc.reason && (
            <div
              role="alert"
              className={cn(
                "mt-4 rounded-2xl border p-4 text-xs leading-relaxed",
                identityDoc.status === "rejected"
                  ? "border-status-declined/35 bg-status-declined-bg text-status-declined"
                  : "border-gold/40 bg-gold-soft text-gold-foreground",
              )}
            >
              <p className="font-bold">
                {identityDoc.status === "rejected"
                  ? "Reason for rejection:"
                  : "Reason resubmission is required:"}
              </p>
              <p className="mt-1">{identityDoc.reason}</p>
            </div>
          )}

        {/* Existing submitted Identity Document */}
        {identityDoc && (
          <div className="mt-4 space-y-3 rounded-2xl border bg-muted/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-secondary text-primary">
                  <FileCheck2 className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-bold">{identityDoc.kind}</p>
                  <p className="text-xs text-muted-foreground">
                    {identityDoc.fileName} · {formatBytes(identityDoc.fileSize)}{" "}
                    {identityDoc.isSample && (
                      <span className="ml-1 rounded bg-gold-soft px-1.5 py-0.5 text-[10px] font-bold text-gold-foreground">
                        SAMPLE DEMO DOC
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  removeVerification("identity");
                  toast("Removed submitted ID — you can upload a replacement.");
                }}
              >
                <Trash2 className="size-3.5" /> Remove / Replace
              </Button>
            </div>

            {/* Demo Reviewer Simulation Controls (only when pending) */}
            {identityDoc.status === "pending" && (
              <div className="rounded-xl border border-dashed bg-card p-3">
                <p className="text-xs font-semibold text-muted-foreground">
                  Prototype Demo Controls — Simulate Trust & Safety review outcome:
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setVerificationStatus("identity", "verified");
                      toast.success("Demo review: Identity marked as Verified!");
                    }}
                  >
                    <CheckCircle2 className="size-3.5" /> Simulate: Approve (Verified)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setVerificationStatus("identity", "resubmission_required");
                      toast("Demo review: Resubmission requested");
                    }}
                  >
                    <RefreshCw className="size-3.5" /> Simulate: Request Resubmission
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setVerificationStatus("identity", "rejected");
                      toast("Demo review: Identity marked as Rejected");
                    }}
                  >
                    <XCircle className="size-3.5" /> Simulate: Reject
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Upload / Replace Form (shown when not submitted, rejected, resubmission_required, or staging a replacement) */}
        {(!identityDoc ||
          identityDoc.status === "rejected" ||
          identityDoc.status === "resubmission_required" ||
          stagedIdentity) && (
          <div className="mt-5 space-y-4 border-t pt-4">
            <div className="space-y-1.5">
              <label htmlFor="id-type-select" className="block text-sm font-semibold">
                Acceptable Government-Issued Photo ID
              </label>
              <select
                id="id-type-select"
                className="field"
                value={selectedIdType}
                onChange={(e) => setSelectedIdType(e.target.value)}
              >
                {ID_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed bg-muted/40 p-4 text-center transition-[background-color,border-color,box-shadow,transform] duration-180 ease-out hover:-translate-y-[1px] hover:border-primary hover:bg-hover-surface/65 hover:shadow-soft active:translate-y-0 active:scale-[0.99] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                  REDUCED_MOTION_RESET,
                )}
              >
                <Upload className="size-5 text-primary" aria-hidden />
                <span className="text-xs font-bold">Upload ID Photo or PDF</span>
                <span className="text-[11px] text-muted-foreground">
                  JPG, PNG, WEBP, or PDF · Max {MAX_FILE_MB} MB
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleIdentityFile}
                  className="sr-only"
                  aria-label="Upload government ID file"
                />
              </label>

              <button
                type="button"
                onClick={handleUseSampleIdentity}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border bg-gold-soft/60 p-4 text-center text-gold-foreground transition-[background-color,border-color,box-shadow,transform] duration-180 ease-out hover:-translate-y-[1px] hover:border-gold hover:bg-gold-soft hover:shadow-soft active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  REDUCED_MOTION_RESET,
                )}
              >
                <Sparkles className="size-5" aria-hidden />
                <span className="text-xs font-bold">Use Sample Document (Demo)</span>
                <span className="text-[11px] opacity-85">
                  Safe sample {selectedIdType.split(" ")[0]} for testing
                </span>
              </button>
            </div>

            {identityError && (
              <p role="alert" className="text-xs font-semibold text-destructive">
                {identityError}
              </p>
            )}

            {/* Staged Upload Preview */}
            {stagedIdentity && (
              <div className="rounded-2xl border bg-muted/50 p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {stagedIdentity.previewUrl ? (
                      <img
                        src={stagedIdentity.previewUrl}
                        alt="Uploaded ID preview"
                        className="size-14 rounded-xl border object-cover"
                      />
                    ) : (
                      <div className="grid size-14 place-items-center rounded-xl border bg-card text-[10px] font-extrabold text-primary">
                        SAMPLE ID
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-bold">Preview: {stagedIdentity.fileName}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {selectedIdType} · {formatBytes(stagedIdentity.fileSize)}{" "}
                        {stagedIdentity.isSample && "· Demo sample document"}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setStagedIdentity(null)}
                  >
                    Clear
                  </Button>
                </div>

                <Button type="button" className="mt-3 w-full" onClick={handleSubmitIdentity}>
                  {identityDoc?.status === "rejected" ||
                  identityDoc?.status === "resubmission_required"
                    ? "Resubmit ID for Verification Review"
                    : "Submit ID for Verification Review"}
                </Button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Step 2: Additional Worker Supporting Credentials (Shown in Worker View) */}
      {roleView === "work" && (
        <section className="rounded-3xl border bg-card p-5 shadow-soft md:p-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-primary">
              Optional Worker Supporting Credentials
            </p>
            <h3 className="mt-0.5 text-lg font-extrabold">
              2. Trade & Residency Documents (Optional)
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              You can save and use your worker profile while verification is pending or unsubmitted.
              Barangay Clearance is <strong>not mandatory by default</strong> and does not verify
              trade skill or guarantee safety.
            </p>
          </div>

          <div className="mt-5 space-y-4">
            {CREDENTIAL_TYPES.map((c) => {
              const doc = verification.credentials[c.key];
              const status: VerifStatus = doc?.status ?? "not_submitted";
              const staged = stagedCreds[c.key];
              const err = credErrors[c.key];

              return (
                <div key={c.key} className="rounded-2xl border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold">{c.label}</h4>
                      <p className="mt-0.5 text-xs text-muted-foreground">{c.help}</p>
                    </div>
                    <VerifStatusPill status={status} />
                  </div>

                  {doc ? (
                    <div className="mt-3 space-y-2.5 rounded-xl bg-muted/50 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span>
                          <strong>{doc.fileName}</strong> ({formatBytes(doc.fileSize)})
                          {doc.isSample && (
                            <span className="ml-1.5 rounded bg-gold-soft px-1.5 py-0.5 text-[10px] font-bold text-gold-foreground">
                              SAMPLE
                            </span>
                          )}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            removeVerification(c.key);
                            toast(`Removed ${c.label}`);
                          }}
                        >
                          <Trash2 className="size-3.5" /> Remove / Replace
                        </Button>
                      </div>

                      {doc.status === "pending" && (
                        <div className="flex flex-wrap items-center gap-2 border-t pt-2">
                          <span className="text-[11px] font-semibold text-muted-foreground">
                            Demo review:
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              setVerificationStatus(c.key, "verified");
                              toast.success(`${c.label.split("/")[0]?.trim()} marked as Verified`);
                            }}
                          >
                            Simulate: Approve
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setVerificationStatus(c.key, "rejected");
                              toast(`${c.label.split("/")[0]?.trim()} marked as Rejected`);
                            }}
                          >
                            Simulate: Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-3 space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <label
                          className={cn(
                            "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border bg-card px-3 text-xs font-semibold transition-[background-color,border-color,color,transform] duration-150 ease-out hover:border-hover-border hover:bg-hover-surface active:scale-[0.98] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                            REDUCED_MOTION_RESET,
                          )}
                        >
                          <Upload className="size-3.5 text-primary" aria-hidden />
                          Upload File
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,application/pdf"
                            onChange={(e) => handleCredFile(c.key, e)}
                            className="sr-only"
                          />
                        </label>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleUseSampleCred(c.key, c.label)}
                        >
                          <Sparkles className="size-3.5" /> Use Sample {c.key.toUpperCase()} Doc
                        </Button>
                      </div>

                      {err && (
                        <p role="alert" className="text-xs font-medium text-destructive">
                          {err}
                        </p>
                      )}

                      {staged && (
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-muted/40 p-2.5 text-xs">
                          <span>
                            Ready: <strong>{staged.fileName}</strong> (
                            {formatBytes(staged.fileSize)})
                          </span>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleSubmitCred(c.key, c.label)}
                            >
                              Submit Credential
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
