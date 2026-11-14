// One shared booking state machine for both sides of GAW (Hiring and Working).

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "awaiting_confirmation"
  | "completed"
  | "declined"
  | "cancelled";

export type BookingAction = "accept" | "decline" | "cancel" | "start" | "finish" | "confirm";

const TRANSITIONS: Record<BookingAction, { from: BookingStatus[]; to: BookingStatus }> = {
  accept: { from: ["pending"], to: "confirmed" },
  decline: { from: ["pending"], to: "declined" },
  cancel: { from: ["pending", "confirmed"], to: "cancelled" },
  start: { from: ["confirmed"], to: "in_progress" },
  finish: { from: ["in_progress"], to: "awaiting_confirmation" },
  confirm: { from: ["awaiting_confirmation"], to: "completed" },
};

/** Who is allowed to take each action. */
export const ACTION_ROLE: Record<BookingAction, "worker" | "employer"> = {
  accept: "worker",
  decline: "worker",
  start: "worker",
  finish: "worker",
  cancel: "employer",
  confirm: "employer",
};

export function nextStatus(status: BookingStatus, action: BookingAction): BookingStatus | null {
  const t = TRANSITIONS[action];
  return t.from.includes(status) ? t.to : null;
}

export function allowedActions(
  status: BookingStatus,
  role?: "worker" | "employer",
): BookingAction[] {
  return (Object.keys(TRANSITIONS) as BookingAction[]).filter(
    (a) => nextStatus(status, a) && (!role || ACTION_ROLE[a] === role),
  );
}

export function applyAction<T extends { id: string; status: BookingStatus }>(
  items: T[],
  id: string,
  action: BookingAction,
): T[] {
  return items.map((it) => {
    if (it.id !== id) return it;
    const to = nextStatus(it.status, action);
    return to ? { ...it, status: to } : it;
  });
}

export const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "Pending",
  confirmed: "Accepted",
  in_progress: "In progress",
  awaiting_confirmation: "Awaiting confirmation",
  completed: "Completed",
  declined: "Declined",
  cancelled: "Cancelled",
};

export type MyJobsTab =
  "applications" | "pending" | "upcoming" | "in_progress" | "completed" | "cancelled";

export const MY_JOBS_TABS: { key: MyJobsTab; label: string }[] = [
  { key: "applications", label: "Applications" },
  { key: "pending", label: "Pending Requests" },
  { key: "upcoming", label: "Upcoming" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

/** Which My Jobs tab a booking belongs to. */
export function tabForStatus(s: BookingStatus): Exclude<MyJobsTab, "applications"> {
  switch (s) {
    case "pending":
      return "pending";
    case "confirmed":
      return "upcoming";
    case "in_progress":
    case "awaiting_confirmation":
      return "in_progress";
    case "completed":
      return "completed";
    default:
      return "cancelled";
  }
}

export type ApplicationStatus = "submitted" | "withdrawn" | "hired";

export function canWithdraw(s: ApplicationStatus) {
  return s === "submitted";
}
