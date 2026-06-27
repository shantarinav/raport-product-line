import type { z } from "zod";
import {
  LOCAL_A3_DASHBOARD_TYPES,
  LOCAL_A3_EVENT_TYPES,
  LOCAL_A3_SCHEMA_VERSION,
  LOCAL_A3_STATUSES,
} from "./localA3Constants";
import type {
  LocalA3ImportError,
  LocalA3ParseResult,
  localA3ArchiveEnvelopeSchema,
  localA3CommentSchema,
  localA3DashboardTypeSchema,
  localA3DeviationSchema,
  localA3EventPayloadSchema,
  localA3EventTypeSchema,
  localA3EventV1Schema,
  localA3FormSchema,
  localA3PeriodSchema,
  localA3ProtocolSnapshotV1Schema,
  localA3ProtocolV1Schema,
  localA3SourceSchema,
  localA3StatusSchema,
} from "./localA3Schemas";

export {
  LOCAL_A3_DASHBOARD_TYPES,
  LOCAL_A3_EVENT_TYPES,
  LOCAL_A3_SCHEMA_VERSION,
  LOCAL_A3_STATUSES,
};

export type LocalA3Status = z.infer<typeof localA3StatusSchema>;
export type LocalA3DashboardType = z.infer<typeof localA3DashboardTypeSchema>;
export type LocalA3EventType = z.infer<typeof localA3EventTypeSchema>;

export type LocalA3Period = z.infer<typeof localA3PeriodSchema>;
export type LocalA3Source = z.infer<typeof localA3SourceSchema>;
export type LocalA3Deviation = z.infer<typeof localA3DeviationSchema>;
export type LocalA3Form = z.infer<typeof localA3FormSchema>;
export type LocalA3Protocol = z.infer<typeof localA3ProtocolV1Schema>;
export type LocalA3Comment = z.infer<typeof localA3CommentSchema>;
export type LocalA3EventPayload = z.infer<typeof localA3EventPayloadSchema>;
export type LocalA3Event = z.infer<typeof localA3EventV1Schema>;
export type LocalA3ProtocolSnapshot = z.infer<typeof localA3ProtocolSnapshotV1Schema>;
export type LocalA3ArchiveEnvelope = z.infer<typeof localA3ArchiveEnvelopeSchema>;

export type { LocalA3ImportError, LocalA3ParseResult };

export type LocalA3ImportResult = {
  added: number;
  updated: number;
  skipped: number;
  errors: LocalA3ImportError[];
};

export type LocalA3MergeResult = LocalA3ImportResult & {
  archive: LocalA3ArchiveEnvelope;
};
