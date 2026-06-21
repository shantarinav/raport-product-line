import type { PrintJob } from "../../types";
import { normalizeDocumentTitle } from "./normalizeDocumentTitle";
import { buildPrintPersonalClassifierRequestItems } from "./requestBuilder";
import type { PrintPersonalClassifierResponseItem, PrintPersonalClassification } from "./types";

export type PrintLlmStatus = "disabled" | "idle" | "loading" | "ready" | "fallback";

function rulesFallbackClassification(job: PrintJob): PrintPersonalClassification {
  const normalizedTitle = normalizeDocumentTitle(job.documentName);
  const isPersonalByRules = job.excessCategories.includes("Личные тематики");
  return {
    normalized_title: normalizedTitle,
    source: "rules_fallback",
    is_personal: isPersonalByRules,
    primary_category: isPersonalByRules ? "other_personal" : "unknown",
    risk_level: isPersonalByRules ? "medium" : "unknown",
    confidence_raw: isPersonalByRules ? 0.55 : 0,
    needs_review: isPersonalByRules,
    reason_short: isPersonalByRules ? "Сработало словарное правило личной тематики" : "LLM-классификация не выполнялась",
    signals: isPersonalByRules ? ["unknown"] : ["unknown"],
  };
}

export function enrichPrintJobsWithClassifications(jobs: PrintJob[], llmItems: PrintPersonalClassifierResponseItem[] = []): PrintJob[] {
  const responseById = new Map(llmItems.map((item) => [item.id, item]));
  const requestItems = buildPrintPersonalClassifierRequestItems(jobs);

  return jobs.map((job, index) => {
    const llmItem = responseById.get(requestItems[index]?.id ?? "");
    const fallbackClassification = rulesFallbackClassification(job);
    const classification: PrintPersonalClassification = llmItem
      ? {
          normalized_title: llmItem.normalized_title,
          source: llmItem.source,
          is_personal: llmItem.is_personal,
          primary_category: llmItem.primary_category,
          risk_level: llmItem.risk_level,
          confidence_raw: llmItem.confidence_raw,
          needs_review: llmItem.needs_review,
          reason_short: llmItem.reason_short,
          signals: llmItem.signals,
        }
      : fallbackClassification;

    const effectiveClassification =
      classification.source !== "llm" && fallbackClassification.is_personal && !classification.is_personal ? fallbackClassification : classification;

    return {
      ...job,
      normalizedDocumentTitle: effectiveClassification.normalized_title,
      personalPrintClassification: effectiveClassification,
    };
  });
}
