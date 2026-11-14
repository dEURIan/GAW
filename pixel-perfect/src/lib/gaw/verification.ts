export type VerifStatus =
  "not_submitted" | "unverified" | "pending" | "verified" | "rejected" | "resubmission_required";

export const ID_TYPES = [
  "Philippine National ID (PhilSys)",
  "Passport",
  "Driver's License",
  "UMID",
  "Other government-issued photo ID",
] as const;

export const CREDENTIAL_TYPES = [
  {
    key: "barangay",
    label: "Barangay Clearance / proof of residency",
    help: "Optional. Shows where you live. It does not prove skill or guarantee safety.",
  },
  {
    key: "tesda",
    label: "TESDA National Certificate or skills certificate",
    help: "Optional. Helps residents see formal training for your trade.",
  },
  {
    key: "prc",
    label: "PRC license or professional credential",
    help: "Only needed if the law requires a license for the service you offer.",
  },
] as const;
export type CredentialKey = (typeof CREDENTIAL_TYPES)[number]["key"];

export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
export const MAX_FILE_MB = 5;

export const DEFAULT_REJECTION_REASON =
  "The submitted ID image did not match account details or could not be verified. Please upload a valid government-issued photo ID.";

export const DEFAULT_RESUBMISSION_REASON =
  "The uploaded ID photo was blurry or partially cut off. Please upload a clearer, full-frame photo of your ID.";

export function validateUpload(file: { type: string; size: number }): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) return "Use a JPG, PNG, WEBP or PDF file.";
  if (file.size > MAX_FILE_MB * 1024 * 1024)
    return `File is too large. Maximum is ${MAX_FILE_MB} MB.`;
  if (file.size === 0) return "This file looks empty. Try another one.";
  return null;
}

export const VERIF_LABEL: Record<VerifStatus, string> = {
  not_submitted: "Not submitted",
  unverified: "Unverified",
  pending: "Pending review",
  verified: "Verified",
  rejected: "Rejected",
  resubmission_required: "Resubmission required",
};

export const VERIF_NEXT: Record<VerifStatus, string> = {
  not_submitted: "Choose an ID type and upload a clear photo.",
  unverified: "Choose an ID type and upload a clear photo.",
  pending: "Nothing to do. We'll review it (simulated in this demo).",
  verified: "You're verified. A badge now shows on your profile.",
  rejected: "Upload a clearer photo of the same ID, or use a different ID.",
  resubmission_required:
    "Please upload a clearer, unobstructed photo of your ID to complete verification.",
};

export interface VerificationGuardState {
  allowed: boolean;
  status: VerifStatus;
  reason?: string | undefined;
  requiresSubmission: boolean;
  isPending: boolean;
  title: string;
  description: string;
}

/**
 * Centralized verification guard for protected marketplace actions
 * (submitting a job application as a Worker, or confirming a booking request as a Hirer).
 */
export function evaluateVerificationGuard(
  identity: { status: VerifStatus; reason?: string | undefined } | null | undefined,
): VerificationGuardState {
  const rawStatus: VerifStatus = identity?.status ?? "unverified";

  if (rawStatus === "verified") {
    return {
      allowed: true,
      status: "verified",
      requiresSubmission: false,
      isPending: false,
      title: "Identity Verified",
      description:
        "Your identity is verified. You can proceed with applying for jobs and hiring workers.",
    };
  }

  if (rawStatus === "pending") {
    return {
      allowed: false,
      status: "pending",
      requiresSubmission: false,
      isPending: true,
      title: "Verify Your Identity to Continue",
      description:
        "To keep GAW safe and trustworthy for everyone, identity verification is required before applying for jobs or hiring workers.",
    };
  }

  if (rawStatus === "rejected") {
    return {
      allowed: false,
      status: "rejected",
      reason: identity?.reason ?? DEFAULT_REJECTION_REASON,
      requiresSubmission: true,
      isPending: false,
      title: "Verify Your Identity to Continue",
      description:
        "To keep GAW safe and trustworthy for everyone, identity verification is required before applying for jobs or hiring workers.",
    };
  }

  if (rawStatus === "resubmission_required") {
    return {
      allowed: false,
      status: "resubmission_required",
      reason: identity?.reason ?? DEFAULT_RESUBMISSION_REASON,
      requiresSubmission: true,
      isPending: false,
      title: "Verify Your Identity to Continue",
      description:
        "To keep GAW safe and trustworthy for everyone, identity verification is required before applying for jobs or hiring workers.",
    };
  }

  return {
    allowed: false,
    status: rawStatus,
    requiresSubmission: true,
    isPending: false,
    title: "Verify Your Identity to Continue",
    description:
      "To keep GAW safe and trustworthy for everyone, identity verification is required before applying for jobs or hiring workers.",
  };
}

export function formatBytes(n: number) {
  return n < 1024 * 1024
    ? `${Math.max(1, Math.round(n / 1024))} KB`
    : `${(n / 1024 / 1024).toFixed(1)} MB`;
}
