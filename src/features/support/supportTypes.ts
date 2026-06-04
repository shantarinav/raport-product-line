import type { SUPPORT_CATEGORY_ORDER, SUPPORT_OVERDUE_BUCKETS, SUPPORT_PLAN_BUCKETS, SUPPORT_SLA_STATUSES } from "./supportConfig";

export type SupportCategory = (typeof SUPPORT_CATEGORY_ORDER)[number];
export type SupportSlaStatus = (typeof SUPPORT_SLA_STATUSES)[number];
export type SupportPlanBucket = (typeof SUPPORT_PLAN_BUCKETS)[number]["value"];
export type SupportOverdueBucket = (typeof SUPPORT_OVERDUE_BUCKETS)[number]["value"];

export type SupportRawRecord = {
  ticketNumber: string;
  topic: string;
  createdAtRaw: unknown;
  slaPlanRaw: unknown;
  slaFactRaw: unknown;
};

export type SupportTicket = {
  id: string;
  ticketNumber: string;
  topic: string;
  createdAt: Date | null;
  slaPlan: Date | null;
  slaFact: Date | null;
  category: SupportCategory;
  slaApplicable: boolean;
  slaStatus: SupportSlaStatus;
  resolutionHours: number | null;
  planHours: number | null;
  overdueHours: number;
  reserveHours: number;
  planBucket: SupportPlanBucket | null;
  overdueBucket: SupportOverdueBucket;
  sourceRow: number;
};

export type SupportImportResult = {
  rawRecords: SupportRawRecord[];
  tickets: SupportTicket[];
  file: {
    fileName: string;
    loadedAt: string;
  };
  quality: {
    missingRequiredColumns: string[];
    rows: number;
    invalidCreatedAt: number;
    invalidSlaPlan: number;
    invalidSlaFact: number;
  };
};

export type SupportFilters = {
  dateFrom: string;
  dateTo: string;
  controlPercent: number;
  slaStatus: "" | SupportSlaStatus;
  planBucket: "" | SupportPlanBucket;
  category: "" | SupportCategory;
  query: string;
};

export type SupportKpis = {
  totalTickets: number;
  applicableTickets: number;
  inSlaTickets: number;
  overdueTickets: number;
  dataProblems: number;
  slaRate: number;
  overdueRate: number;
};

export type SupportQuantiles = {
  q1: number | null;
  q2: number | null;
  q3: number | null;
  p90: number | null;
};

export type SupportDailyPoint = {
  dateKey: string;
  label: string;
  total: number;
  applicable: number;
  inSla: number;
  overdue: number;
  slaRate: number;
};

export type SupportTopicSlaStat = {
  category: SupportCategory;
  total: number;
  applicable: number;
  inSla: number;
  overdue: number;
  dataProblems: number;
  slaRate: number;
  violationRate: number;
  intensity: "низкая" | "средняя" | "высокая";
};

export type SupportPlanBucketStat = {
  bucket: SupportPlanBucket;
  total: number;
  applicable: number;
  overdue: number;
  overdueShare: number;
  violationRate: number;
  isHotspot: boolean;
};

export type SupportDataQualitySummary = {
  missingPlan: SupportTicket[];
  missingFact: SupportTicket[];
  extremeOverdue: SupportTicket[];
  closedAfterPeriod: SupportTicket[];
};
