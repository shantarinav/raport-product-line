import type { PrintJob } from "../../types";
import { selectPrintLlmCandidateRequestItems } from "./requestBuilder";
import type { PrintPersonalClassifierResponse, PrintPersonalClassifierResponseItem } from "./types";

export type PrintLlmFrontendConfig = {
  enabled: boolean;
  url: string;
};

export function readPrintLlmFrontendConfig(env: Record<string, unknown> = import.meta.env): PrintLlmFrontendConfig {
  return {
    enabled: env.VITE_PRINT_LLM_CLASSIFIER_ENABLED === "true",
    url: typeof env.VITE_PRINT_LLM_CLASSIFIER_URL === "string" ? env.VITE_PRINT_LLM_CLASSIFIER_URL : "/api/print/classify-personal",
  };
}

export async function classifyPrintJobsWithProxy(jobs: PrintJob[], config: PrintLlmFrontendConfig, fetchImpl = fetch): Promise<PrintPersonalClassifierResponse> {
  if (!config.enabled) return { items: [] };
  const candidateItems = selectPrintLlmCandidateRequestItems(jobs);
  if (candidateItems.length === 0) return { items: [] };

  const response = await fetchImpl(config.url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ items: candidateItems }),
  });

  if (!response.ok) {
    throw new Error(`Print LLM classifier returned ${response.status}`);
  }

  const payload = (await response.json()) as PrintPersonalClassifierResponse;
  return { items: Array.isArray(payload.items) ? payload.items : [] };
}

export function responseItemsById(items: PrintPersonalClassifierResponseItem[]): Map<string, PrintPersonalClassifierResponseItem> {
  return new Map(items.map((item) => [item.id, item]));
}
