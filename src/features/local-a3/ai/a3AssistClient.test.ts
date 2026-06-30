import { describe, expect, it, vi } from "vitest";
import { requestA3AssistSuggestions } from "./a3AssistClient";
import type { LocalA3Protocol } from "../localA3Types";

function protocol(overrides: Partial<LocalA3Protocol> = {}): LocalA3Protocol {
  return {
    schemaVersion: 1,
    id: "a3-1",
    status: "open",
    dashboardType: "ssz",
    dashboardTitle: "ССЗ",
    period: { label: "01.06.2026 - 09.06.2026" },
    source: { fileName: "ssz.xlsx" },
    deviation: {
      title: "Доля работ по технологии ниже цели",
      metricLabel: "Доля работ по технологии",
      fact: "7,2%",
      target: "70%",
      scale: "отклонение: 62,8 п.п.",
      context: "Цех: 400 — 4 623 н-ч без технологии.",
    },
    form: {
      problem: "Доля ниже цели.",
      cause: "",
      solution: "",
      owner: "Иванов",
      dueDate: "2026-07-04",
      expectedResult: "",
      checkCriteria: "",
    },
    createdAt: "2026-06-25T10:00:00.000Z",
    updatedAt: "2026-06-25T10:00:00.000Z",
    ...overrides,
  };
}

function response(status: number, payload: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response;
}

describe("A3 Assist frontend client", () => {
  it("sends only limited A3 fields to the service", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response(200, { ok: true, suggestions: { problem: "Проблема" }, warnings: [] }));
    const abortController = new AbortController();

    await requestA3AssistSuggestions(
      protocol(),
      {
        serviceUrl: "http://server:8787",
        apiKey: "secret",
        field: "cause",
        qualityIssue: "Причина повторяет проблему.",
        signal: abortController.signal,
      },
      fetchImpl,
    );

    const body = JSON.parse(String(fetchImpl.mock.calls[0][1]?.body));
    expect(fetchImpl).toHaveBeenCalledWith("http://server:8787/api/a3/assist", expect.objectContaining({
      method: "POST",
      headers: { "content-type": "application/json", "x-raport-backend-key": "secret" },
      signal: abortController.signal,
    }));
    expect(body).toMatchObject({
      protocolId: "a3-1",
      field: "cause",
      qualityIssue: "Причина повторяет проблему.",
      dashboardType: "ssz",
      deviationTitle: "Доля работ по технологии ниже цели",
      evidenceSummary: "Цех: 400 — 4 623 н-ч без технологии.",
    });
    expect(JSON.stringify(body)).not.toContain("events");
    expect(JSON.stringify(body)).not.toContain("rawRows");
  });

  it("returns safe fallback when service is unavailable", async () => {
    const result = await requestA3AssistSuggestions(protocol(), { serviceUrl: "http://server:8787", apiKey: "" }, vi.fn().mockRejectedValue(new Error("offline")));

    expect(result).toEqual({ ok: false, suggestions: null, error: "ИИ-помощник временно недоступен" });
  });
});
