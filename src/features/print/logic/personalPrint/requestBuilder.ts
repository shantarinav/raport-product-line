import type { PrintJob } from "../../types";
import { normalizeDocumentTitle } from "./normalizeDocumentTitle";
import type { PrintPersonalClassifierRequestItem } from "./types";

export function buildPrintPersonalClassifierRequestItems(jobs: PrintJob[]): PrintPersonalClassifierRequestItem[] {
  return jobs.map((job, index) => ({
    id: `print-job-${index}`,
    document_title: job.documentName,
    pages: job.totalPages,
    color: job.isColor,
    duplex: job.duplex === "DUPLEX",
    paper_size: job.paperBucket,
  }));
}

export function shouldClassifyPrintJobWithLlm(job: PrintJob): boolean {
  return job.riskScore > 0 || job.isColor || job.isBigJob || job.isMultiNoDuplex || normalizeDocumentTitle(job.documentName).length > 0;
}

export function selectPrintLlmCandidateRequestItems(jobs: PrintJob[]): PrintPersonalClassifierRequestItem[] {
  return buildPrintPersonalClassifierRequestItems(jobs).filter((_, index) => shouldClassifyPrintJobWithLlm(jobs[index]));
}
