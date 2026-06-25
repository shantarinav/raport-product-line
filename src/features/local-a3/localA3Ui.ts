import type { LocalA3DashboardType, LocalA3Status } from "./localA3Types";

export const LOCAL_A3_STATUS_LABEL: Record<LocalA3Status, string> = {
  open: "Открыт",
  in_progress: "В работе",
  waiting_review: "Ожидает проверки",
  closed: "Закрыт",
  cancelled: "Отменен",
};

export const LOCAL_A3_STATUS_FILTER_LABEL: Record<LocalA3Status | "all", string> = {
  all: "Все",
  ...LOCAL_A3_STATUS_LABEL,
};

export const LOCAL_A3_STATUS_BADGE_VARIANT: Record<LocalA3Status, "default" | "secondary" | "success" | "warning" | "danger"> = {
  open: "secondary",
  in_progress: "default",
  waiting_review: "warning",
  closed: "success",
  cancelled: "danger",
};

export const LOCAL_A3_DASHBOARD_LABEL: Record<LocalA3DashboardType, string> = {
  ssz: "ССЗ",
  tessa: "Tessa",
  print: "Печать",
  support: "Техподдержка",
};
