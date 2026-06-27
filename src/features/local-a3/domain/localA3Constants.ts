export const LOCAL_A3_SCHEMA_VERSION = 1;

export const LOCAL_A3_STATUSES = ["open", "in_progress", "waiting_review", "closed", "cancelled"] as const;
export const LOCAL_A3_DASHBOARD_TYPES = ["ssz", "tessa", "print", "support"] as const;
export const LOCAL_A3_EVENT_TYPES = [
  "created",
  "status_changed",
  "owner_changed",
  "due_date_changed",
  "form_updated",
  "comment_added",
  "closed",
  "reopened",
  "imported",
] as const;
