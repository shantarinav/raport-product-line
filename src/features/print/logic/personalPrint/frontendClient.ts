import type { PrintJob } from "../../types";
import { normalizeDocumentTitle } from "./normalizeDocumentTitle";
import { buildPrintPersonalClassifierRequestItems, shouldClassifyPrintJobWithLlm } from "./requestBuilder";
import type { PrintPersonalClassifierResponse, PrintPersonalClassifierResponseItem } from "./types";

export type PrintLlmFrontendConfig = {
  enabled: boolean;
  url: string;
  lookupUrl?: string;
  classifyMissingUrl?: string;
  batchSize?: number;
  maxCandidates?: number;
};

export type PrintLlmProgress = {
  processed: number;
  total: number;
  cacheHits: number;
  modelRequests: number;
  items: PrintPersonalClassifierResponseItem[];
};

type PrintLlmCandidateGroup = {
  requestItem: {
    id: string;
    document_title: string;
    pages: number;
    color: boolean;
    duplex: boolean;
    paper_size: string;
  };
  rowIds: string[];
  priority: number;
};

function derivePrintLlmEndpoint(url: string, endpoint: "lookup" | "classify-missing"): string {
  const replacement = endpoint === "lookup" ? "/api/print/classifications/lookup" : "/api/print/classifications/classify-missing";
  if (url.endsWith("/api/print/classify-personal")) return url.replace(/\/api\/print\/classify-personal$/, replacement);
  return `${url.replace(/\/$/, "")}/classifications/${endpoint}`;
}

export function readPrintLlmFrontendConfig(env: Record<string, unknown> = import.meta.env): PrintLlmFrontendConfig {
  const url = typeof env.VITE_PRINT_LLM_CLASSIFIER_URL === "string" ? env.VITE_PRINT_LLM_CLASSIFIER_URL : "/api/print/classify-personal";
  return {
    enabled: env.VITE_PRINT_LLM_CLASSIFIER_ENABLED === "true",
    url,
    lookupUrl: typeof env.VITE_PRINT_LLM_LOOKUP_URL === "string" ? env.VITE_PRINT_LLM_LOOKUP_URL : derivePrintLlmEndpoint(url, "lookup"),
    classifyMissingUrl: typeof env.VITE_PRINT_LLM_CLASSIFY_MISSING_URL === "string" ? env.VITE_PRINT_LLM_CLASSIFY_MISSING_URL : derivePrintLlmEndpoint(url, "classify-missing"),
    batchSize: Number(env.VITE_PRINT_LLM_BATCH_SIZE || 3),
    maxCandidates: Number(env.VITE_PRINT_LLM_MAX_CANDIDATES || 50),
  };
}

function isLocalPersonalTopicCandidate(job: PrintJob): boolean {
  return job.riskReasonCodes.includes("excess-personal") || job.excessCategories.includes("Личные тематики");
}

function printLlmTieBreakerPriority(job: PrintJob): number {
  return job.riskScore + (job.isExcessPrint ? 100 : 0) + (job.isBigJob ? 40 : 0) + (job.isColor ? 20 : 0) + (job.isMultiNoDuplex ? 10 : 0);
}

function shouldSendPrintJobToLlm(job: PrintJob): boolean {
  return job.riskScore >= 30 || job.isExcessPrint || job.totalPages >= 10 || (job.isColor && job.totalPages >= 2) || (job.isMultiNoDuplex && job.totalPages >= 3);
}

function buildUniqueCandidateGroups(jobs: PrintJob[]): PrintLlmCandidateGroup[] {
  const rowItems = buildPrintPersonalClassifierRequestItems(jobs);
  const groups = new Map<string, PrintLlmCandidateGroup>();

  jobs.forEach((job, index) => {
    if (!isLocalPersonalTopicCandidate(job) || !shouldClassifyPrintJobWithLlm(job) || !shouldSendPrintJobToLlm(job)) return;

    const rowItem = rowItems[index];
    const normalizedTitle = normalizeDocumentTitle(rowItem.document_title);
    const key = normalizedTitle || rowItem.document_title.trim().toLowerCase() || rowItem.id;
    const priority = printLlmTieBreakerPriority(job);
    const existingGroup = groups.get(key);

    if (existingGroup) {
      existingGroup.rowIds.push(rowItem.id);
      existingGroup.priority = Math.max(existingGroup.priority, priority);
      existingGroup.requestItem.pages = Math.max(existingGroup.requestItem.pages, rowItem.pages);
      existingGroup.requestItem.color = existingGroup.requestItem.color || rowItem.color;
      existingGroup.requestItem.duplex = existingGroup.requestItem.duplex || rowItem.duplex;
      return;
    }

    groups.set(key, {
      requestItem: {
        ...rowItem,
        id: `print-doc-${groups.size}`,
      },
      rowIds: [rowItem.id],
      priority,
    });
  });

  return Array.from(groups.values()).sort((left, right) => {
    const pagesDelta = right.requestItem.pages - left.requestItem.pages;
    if (pagesDelta !== 0) return pagesDelta;
    return right.priority - left.priority;
  });
}

function expandGroupClassification(item: PrintPersonalClassifierResponseItem, group: PrintLlmCandidateGroup): PrintPersonalClassifierResponseItem[] {
  return group.rowIds.map((rowId) => ({ ...item, id: rowId }));
}

export async function classifyPrintJobsWithProxy(
  jobs: PrintJob[],
  config: PrintLlmFrontendConfig,
  fetchImpl = fetch,
  onProgress?: (progress: PrintLlmProgress) => void,
): Promise<PrintPersonalClassifierResponse> {
  if (!config.enabled) return { items: [] };
  const candidateGroups = buildUniqueCandidateGroups(jobs).slice(0, Math.max(1, Number(config.maxCandidates || 50)));
  if (candidateGroups.length === 0) return { items: [] };

  const batchSize = Math.max(1, Number(config.batchSize || 3));
  const items: PrintPersonalClassifierResponseItem[] = [];
  const groupByRequestId = new Map(candidateGroups.map((group) => [group.requestItem.id, group]));
  const lookupUrl = config.lookupUrl || derivePrintLlmEndpoint(config.url, "lookup");
  const classifyMissingUrl = config.classifyMissingUrl || derivePrintLlmEndpoint(config.url, "classify-missing");
  let cacheHits = 0;
  let modelRequests = 0;
  onProgress?.({ processed: 0, total: candidateGroups.length, cacheHits, modelRequests, items: [] });

  const missingIds = new Set<string>();

  for (let index = 0; index < candidateGroups.length; index += batchSize) {
    const batchGroups = candidateGroups.slice(index, index + batchSize);
    const lookupResponse = await fetchImpl(lookupUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items: batchGroups.map((group) => group.requestItem) }),
    });

    if (!lookupResponse.ok) {
      throw new Error(`Print LLM classifier lookup returned ${lookupResponse.status}`);
    }

    const lookupPayload = (await lookupResponse.json()) as PrintPersonalClassifierResponse & { missing?: Array<{ id: string }> };
    const lookupItems = Array.isArray(lookupPayload.items) ? lookupPayload.items : [];
    cacheHits += lookupItems.length;
    lookupItems.forEach((item) => {
      const group = groupByRequestId.get(item.id);
      if (group) items.push(...expandGroupClassification(item, group));
    });

    (Array.isArray(lookupPayload.missing) ? lookupPayload.missing : []).forEach((item) => missingIds.add(item.id));
    onProgress?.({ processed: cacheHits + modelRequests, total: candidateGroups.length, cacheHits, modelRequests, items: [...items] });
  }

  const missingGroups = candidateGroups.filter((group) => missingIds.has(group.requestItem.id));
  for (let index = 0; index < missingGroups.length; index += batchSize) {
    const batchGroups = missingGroups.slice(index, index + batchSize);
    const response = await fetchImpl(classifyMissingUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items: batchGroups.map((group) => group.requestItem) }),
    });

    if (!response.ok) {
      throw new Error(`Print LLM classifier returned ${response.status}`);
    }

    const payload = (await response.json()) as PrintPersonalClassifierResponse;
    const batchItems = Array.isArray(payload.items) ? payload.items : [];
    cacheHits += batchItems.filter((item) => item.cache_hit === true).length;
    modelRequests += batchItems.filter((item) => item.cache_hit !== true).length;
    batchItems.forEach((item) => {
      const group = groupByRequestId.get(item.id);
      if (group) items.push(...expandGroupClassification(item, group));
    });
    onProgress?.({ processed: Math.min(cacheHits + modelRequests, candidateGroups.length), total: candidateGroups.length, cacheHits, modelRequests, items: [...items] });
  }

  return { items };
}

export function responseItemsById(items: PrintPersonalClassifierResponseItem[]): Map<string, PrintPersonalClassifierResponseItem> {
  return new Map(items.map((item) => [item.id, item]));
}

