import type { PrintJob } from "../../types";

export function pagesBucket(pages: number): "1" | "2-5" | "6-20" | "20+" {
  if (pages <= 1) return "1";
  if (pages <= 5) return "2-5";
  if (pages <= 20) return "6-20";
  return "20+";
}

export type PrintLlmCacheKeyInput = {
  schemaVersion: string | number;
  modelName: string;
  normalizedTitle: string;
  pages: number;
  color: boolean;
  duplex: boolean;
  paperSize: string;
};

export function canonicalPrintLlmCacheInput(input: PrintLlmCacheKeyInput): string {
  return JSON.stringify({
    schema_version: String(input.schemaVersion),
    model_name: input.modelName,
    normalized_title: input.normalizedTitle,
    pages_bucket: pagesBucket(input.pages),
    color: input.color,
    duplex: input.duplex,
    paper_size: input.paperSize,
  });
}

export function cacheInputFromPrintJob(job: PrintJob, normalizedTitle: string, modelName: string, schemaVersion: string | number): PrintLlmCacheKeyInput {
  return {
    schemaVersion,
    modelName,
    normalizedTitle,
    pages: job.totalPages,
    color: job.isColor,
    duplex: job.duplex === "DUPLEX",
    paperSize: job.paperBucket,
  };
}
