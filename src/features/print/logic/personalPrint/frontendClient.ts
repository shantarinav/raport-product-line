import type { PrintJob } from "../../types";
import { normalizeDocumentTitle } from "./normalizeDocumentTitle";
import { buildPrintPersonalClassifierRequestItems, shouldClassifyPrintJobWithLlm } from "./requestBuilder";
import type { PrintPersonalClassifierResponse, PrintPersonalClassifierResponseItem } from "./types";

export type PrintLlmFrontendConfig = {
  enabled: boolean;
  url: string;
  batchSize?: number;
};

export type PrintLlmProgress = {
  processed: number;
  total: number;
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

export function readPrintLlmFrontendConfig(env: Record<string, unknown> = import.meta.env): PrintLlmFrontendConfig {
  return {
    enabled: env.VITE_PRINT_LLM_CLASSIFIER_ENABLED === "true",
    url: typeof env.VITE_PRINT_LLM_CLASSIFIER_URL === "string" ? env.VITE_PRINT_LLM_CLASSIFIER_URL : "/api/print/classify-personal",
    batchSize: Number(env.VITE_PRINT_LLM_BATCH_SIZE || 3),
  };
}

function printLlmPriority(job: PrintJob): number {
  return job.riskScore + (job.isExcessPrint ? 100 : 0) + (job.isBigJob ? 40 : 0) + (job.isColor ? 20 : 0) + (job.isMultiNoDuplex ? 10 : 0);
}

function buildUniqueCandidateGroups(jobs: PrintJob[]): PrintLlmCandidateGroup[] {
  const rowItems = buildPrintPersonalClassifierRequestItems(jobs);
  const groups = new Map<string, PrintLlmCandidateGroup>();

  jobs.forEach((job, index) => {
    if (!shouldClassifyPrintJobWithLlm(job)) return;

    const rowItem = rowItems[index];
    const normalizedTitle = normalizeDocumentTitle(rowItem.document_title);
    const key = normalizedTitle || rowItem.document_title.trim().toLowerCase() || rowItem.id;
    const priority = printLlmPriority(job);
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

  return Array.from(groups.values()).sort((left, right) => right.priority - left.priority);
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
  const candidateGroups = buildUniqueCandidateGroups(jobs);
  if (candidateGroups.length === 0) return { items: [] };

  const batchSize = Math.max(1, Number(config.batchSize || 3));
  const items: PrintPersonalClassifierResponseItem[] = [];
  const groupByRequestId = new Map(candidateGroups.map((group) => [group.requestItem.id, group]));
  onProgress?.({ processed: 0, total: candidateGroups.length, items: [] });

  for (let index = 0; index < candidateGroups.length; index += batchSize) {
    const batchGroups = candidateGroups.slice(index, index + batchSize);
    const response = await fetchImpl(config.url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items: batchGroups.map((group) => group.requestItem) }),
    });

    if (!response.ok) {
      throw new Error(`Print LLM classifier returned ${response.status}`);
    }

    const payload = (await response.json()) as PrintPersonalClassifierResponse;
    const batchItems = Array.isArray(payload.items) ? payload.items : [];
    batchItems.forEach((item) => {
      const group = groupByRequestId.get(item.id);
      if (group) items.push(...expandGroupClassification(item, group));
    });
    onProgress?.({ processed: Math.min(index + batchGroups.length, candidateGroups.length), total: candidateGroups.length, items: [...items] });
  }

  return { items };
}

export function responseItemsById(items: PrintPersonalClassifierResponseItem[]): Map<string, PrintPersonalClassifierResponseItem> {
  return new Map(items.map((item) => [item.id, item]));
}
