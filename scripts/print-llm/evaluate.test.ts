import { describe, expect, it } from "vitest";

const evaluateModule = await import("./evaluate.mjs");
const parseLabeledCsv = evaluateModule.parseLabeledCsv as (text: string) => Array<{ document_title: string; expected: boolean }>;
const calculateBinaryMetrics = evaluateModule.calculateBinaryMetrics as (
  rows: Array<{ expected: boolean }>,
  predictions: boolean[],
) => { truePositive: number; falsePositive: number; trueNegative: number; falseNegative: number; precision: number; recall: number; f1: number };

describe("print LLM evaluation helpers", () => {
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
});
