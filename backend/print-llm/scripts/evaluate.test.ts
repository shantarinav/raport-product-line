import { afterEach, describe, expect, it, vi } from "vitest";

const evaluateModule = await import("./evaluate.mjs");
const parseLabeledCsv = evaluateModule.parseLabeledCsv as (text: string) => Array<{ document_title: string; expected: boolean }>;
const calculateBinaryMetrics = evaluateModule.calculateBinaryMetrics as (
  rows: Array<{ expected: boolean }>,
  predictions: boolean[],
) => { truePositive: number; falsePositive: number; trueNegative: number; falseNegative: number; precision: number; recall: number; f1: number };
const classifyWithProxy = evaluateModule.classifyWithProxy as (
  rows: Array<{ id: string; document_title: string }>,
  url: string,
  options?: { batchSize?: number; requestTimeoutMs?: number },
) => Promise<Array<{ isPersonal: boolean; riskLevel: string; source: string }>>;

describe("print LLM evaluation helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("parses labeled csv rows", () => {
    const rows = parseLabeledCsv("id;document_title;analyst_label\n1;school.pdf;да\n2;invoice.pdf;нет\n");

    expect(rows).toEqual([
      expect.objectContaining({ document_title: "school.pdf", expected: true }),
      expect.objectContaining({ document_title: "invoice.pdf", expected: false }),
    ]);
  });

  it("calculates precision, recall and f1", () => {
    const metrics = calculateBinaryMetrics([{ expected: true }, { expected: false }, { expected: true }, { expected: false }], [true, true, false, false]);

    expect(metrics.truePositive).toBe(1);
    expect(metrics.falsePositive).toBe(1);
    expect(metrics.trueNegative).toBe(1);
    expect(metrics.falseNegative).toBe(1);
    expect(metrics.precision).toBe(0.5);
    expect(metrics.recall).toBe(0.5);
    expect(metrics.f1).toBe(0.5);
  });

  it("classifies rows through proxy in batches", async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      return {
        ok: true,
        json: async () => ({
          items: body.items.map((item: { id: string }) => ({
            id: item.id,
            is_personal: item.id === "2",
            risk_level: "low",
            source: "llm",
          })),
        }),
      } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    const rows = [
      { id: "1", document_title: "work" },
      { id: "2", document_title: "school" },
      { id: "3", document_title: "report" },
      { id: "4", document_title: "invoice" },
      { id: "5", document_title: "memo" },
    ];

    const result = await classifyWithProxy(rows, "http://127.0.0.1/proxy", { batchSize: 2, requestTimeoutMs: 1000 });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.map((item) => item.isPersonal)).toEqual([false, true, false, false, false]);
  });
});
