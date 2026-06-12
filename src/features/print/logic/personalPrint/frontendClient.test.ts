import { describe, expect, it, vi } from "vitest";
import type { PrintJob } from "../../types";
import { classifyPrintJobsWithProxy, readPrintLlmFrontendConfig } from "./frontendClient";

function job(index: number, overrides: Partial<PrintJob> = {}): PrintJob {
  return {
    date: null,
    dateKey: "",
    user: "user",
    pages: 1,
    copies: 1,
    totalPages: 1,
    printer: "printer",
    documentName: `document-${index}.pdf`,
    computer: "computer",
    driver: "driver",
    duplex: "NOT DUPLEX",
    color: "GRAYSCALE",
    paperBucket: "\u0434\u043e A4 \u0432\u043a\u043b\u044e\u0447\u0438\u0442\u0435\u043b\u044c\u043d\u043e",
    docType: "PDF",
    isBigJob: false,
    isMultiNoDuplex: false,
    isColor: false,
    isPdfPrinter: false,
    isExcessPrint: true,
    excessCategories: ["Личные тематики"],
    excessMatches: [],
    riskScore: 30,
    riskReasons: [],
    riskReasonCodes: ["excess-personal"],
    raw: {},
    ...overrides,
  };
}

describe("print LLM frontend client", () => {
  it("reads enabled flag, URL and batch size from env", () => {
    expect(
      readPrintLlmFrontendConfig({
        VITE_PRINT_LLM_CLASSIFIER_ENABLED: "true",
        VITE_PRINT_LLM_CLASSIFIER_URL: "http://127.0.0.1:8787/api/print/classify-personal",
        VITE_PRINT_LLM_BATCH_SIZE: "3",
      }),
    ).toEqual({
      enabled: true,
      url: "http://127.0.0.1:8787/api/print/classify-personal",
      lookupUrl: "http://127.0.0.1:8787/api/print/classifications/lookup",
      classifyMissingUrl: "http://127.0.0.1:8787/api/print/classifications/classify-missing",
      batchSize: 3,
      maxCandidates: 50,
    });
  });

  it("uses a small default batch size for responsive local LLM updates", () => {
    expect(readPrintLlmFrontendConfig({ VITE_PRINT_LLM_CLASSIFIER_ENABLED: "true" }).batchSize).toBe(3);
  });

  it("sends candidate jobs to proxy in batches", async () => {
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      const isLookup = String(_url).includes("lookup");
      return {
        ok: true,
        json: async () => isLookup ? { items: [], missing: body.items } : ({
          items: body.items.map((item: { id: string }) => ({
            id: item.id,
            normalized_title: item.id,
            source: "llm",
            is_personal: false,
            primary_category: "work",
            risk_level: "low",
            confidence_raw: 0.9,
            needs_review: false,
            reason_short: "Р Р°Р±РѕС‡РёР№ РґРѕРєСѓРјРµРЅС‚",
            signals: ["work_like"],
          })),
        }),
      } as Response;
    });

    const result = await classifyPrintJobsWithProxy([job(1), job(2), job(3), job(4), job(5)], { enabled: true, url: "/proxy", batchSize: 2 }, fetchImpl);

    expect(fetchImpl).toHaveBeenCalledTimes(6);
    expect(result.items).toHaveLength(5);
  });

  it("classifies duplicate document titles once and expands result to matching rows", async () => {
    const sentIds: string[] = [];
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      const isLookup = String(_url).includes("lookup");
      if (!isLookup) sentIds.push(...body.items.map((item: { id: string }) => item.id));
      return {
        ok: true,
        json: async () => isLookup ? { items: [], missing: body.items } : ({
          items: body.items.map((item: { id: string }) => ({
            id: item.id,
            normalized_title: item.id,
            source: "llm",
            is_personal: true,
            primary_category: "education",
            risk_level: "high",
            confidence_raw: 0.9,
            needs_review: true,
            reason_short: "РџРѕС…РѕР¶Рµ РЅР° СѓС‡РµР±РЅС‹Р№ РјР°С‚РµСЂРёР°Р»",
            signals: ["education"],
          })),
        }),
      } as Response;
    });

    const result = await classifyPrintJobsWithProxy(
      [
        job(1, { documentName: "school_homework.pdf", riskScore: 90 }),
        job(2, { documentName: "school homework.pdf", riskScore: 50 }),
        job(3, { documentName: "invoice.pdf", riskScore: 10, isExcessPrint: false, excessCategories: [], riskReasonCodes: [] }),
      ],
      { enabled: true, url: "/proxy", batchSize: 1 },
      fetchImpl,
    );

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sentIds).toHaveLength(1);
    expect(result.items.map((item) => item.id)).toEqual(["print-job-0", "print-job-1"]);
  });

  it("reports progressive accumulated row-level results after every batch", async () => {
    const onProgress = vi.fn();
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      const isLookup = String(_url).includes("lookup");
      return {
        ok: true,
        json: async () => isLookup ? { items: [], missing: body.items } : ({
          items: body.items.map((item: { id: string }) => ({
            id: item.id,
            normalized_title: item.id,
            source: "llm",
            is_personal: false,
            primary_category: "work",
            risk_level: "low",
            confidence_raw: 0.9,
            needs_review: false,
            reason_short: "Р Р°Р±РѕС‡РёР№ РґРѕРєСѓРјРµРЅС‚",
            signals: ["work_like"],
          })),
        }),
      } as Response;
    });

    await classifyPrintJobsWithProxy(
      [
        job(1, { documentName: "a.pdf" }),
        job(2, { documentName: "a.pdf" }),
        job(3, { documentName: "b.pdf" }),
      ],
      { enabled: true, url: "/proxy", batchSize: 1 },
      fetchImpl,
      onProgress,
    );

    expect(onProgress).toHaveBeenCalledTimes(5);
    expect(onProgress).toHaveBeenNthCalledWith(1, expect.objectContaining({ processed: 0, total: 2, items: [] }));
    expect(onProgress).toHaveBeenNthCalledWith(2, expect.objectContaining({ processed: 0, total: 2, items: [] }));
    expect(onProgress).toHaveBeenNthCalledWith(3, expect.objectContaining({ processed: 0, total: 2, items: [] }));
    expect(onProgress).toHaveBeenNthCalledWith(4, expect.objectContaining({ processed: 1, total: 2, items: expect.arrayContaining([expect.objectContaining({ id: "print-job-0" }), expect.objectContaining({ id: "print-job-1" })]) }));
    expect(onProgress).toHaveBeenNthCalledWith(5, expect.objectContaining({ processed: 2, total: 2, items: expect.arrayContaining([expect.objectContaining({ id: "print-job-0" }), expect.objectContaining({ id: "print-job-1" }), expect.objectContaining({ id: "print-job-2" })]) }));
  });

  it("uses lookup results without calling classify-missing when all documents are cached", async () => {
    const fetchImpl = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(String(url)).toContain("lookup");
      return {
        ok: true,
        json: async () => ({
          items: body.items.map((item: { id: string }) => ({
            id: item.id,
            normalized_title: item.id,
            source: "llm",
            is_personal: true,
            primary_category: "education",
            risk_level: "high",
            confidence_raw: 0.9,
            needs_review: true,
            reason_short: "?????? ?? ??????? ????????",
            signals: ["education"],
          })),
          missing: [],
        }),
      } as Response;
    });

    const result = await classifyPrintJobsWithProxy([job(1), job(2)], { enabled: true, url: "/proxy", batchSize: 1 }, fetchImpl);

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result.items).toHaveLength(2);
    expect(result.items.every((item) => item.source === "llm")).toBe(true);
  });


  it("splits lookup requests into batches to avoid large request bodies", async () => {
    const fetchImpl = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(String(url)).toContain("lookup");
      expect(body.items.length).toBeLessThanOrEqual(2);
      return {
        ok: true,
        json: async () => ({
          items: body.items.map((item: { id: string }) => ({
            id: item.id,
            normalized_title: item.id,
            source: "llm",
            is_personal: false,
            primary_category: "work",
            risk_level: "low",
            confidence_raw: 0.9,
            needs_review: false,
            reason_short: "work document",
            signals: ["work_like"],
          })),
          missing: [],
        }),
      } as Response;
    });

    const result = await classifyPrintJobsWithProxy([job(1), job(2), job(3), job(4), job(5)], { enabled: true, url: "/proxy", batchSize: 2 }, fetchImpl);

    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(result.items).toHaveLength(5);
  });


  it("does not call the proxy for low-risk documents", async () => {
    const fetchImpl = vi.fn();

    const result = await classifyPrintJobsWithProxy(
      [job(1, { documentName: "ordinary-work-note.pdf", riskScore: 0, isExcessPrint: false, excessCategories: [], riskReasonCodes: [] })],
      { enabled: true, url: "/proxy", batchSize: 2 },
      fetchImpl,
    );

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result.items).toEqual([]);
  });

  it("limits LLM candidates to the highest-page-count unique personal-topic documents", async () => {
    const sentTitles: string[] = [];
    const fetchImpl = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      sentTitles.push(...body.items.map((item: { document_title: string }) => item.document_title));
      expect(String(url)).toContain("lookup");
      return {
        ok: true,
        json: async () => ({
          items: body.items.map((item: { id: string }) => ({
            id: item.id,
            normalized_title: item.id,
            source: "llm",
            is_personal: false,
            primary_category: "work",
            risk_level: "low",
            confidence_raw: 0.9,
            needs_review: false,
            reason_short: "??????? ????????",
            signals: ["work_like"],
          })),
          missing: [],
        }),
      } as Response;
    });

    await classifyPrintJobsWithProxy(
      [
        job(1, { documentName: "low.pdf", riskScore: 30, totalPages: 30 }),
        job(2, { documentName: "top.pdf", riskScore: 80, totalPages: 80 }),
        job(3, { documentName: "middle.pdf", riskScore: 50, totalPages: 50 }),
      ],
      { enabled: true, url: "/proxy", batchSize: 10, maxCandidates: 2 },
      fetchImpl,
    );

    expect(sentTitles).toEqual(["top.pdf", "middle.pdf"]);
  });

  it("prioritizes local personal-topic matches before generic high-risk documents", async () => {
    const sentTitles: string[] = [];
    const fetchImpl = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      sentTitles.push(...body.items.map((item: { document_title: string }) => item.document_title));
      expect(String(url)).toContain("lookup");
      return {
        ok: true,
        json: async () => ({
          items: body.items.map((item: { id: string }) => ({
            id: item.id,
            normalized_title: item.id,
            source: "llm",
            is_personal: false,
            primary_category: "work",
            risk_level: "low",
            confidence_raw: 0.9,
            needs_review: false,
            reason_short: "Рабочий документ",
            signals: ["work_like"],
          })),
          missing: [],
        }),
      } as Response;
    });

    await classifyPrintJobsWithProxy(
      [
        job(1, {
          documentName: "large-work.pdf",
          riskScore: 100,
          totalPages: 500,
          isBigJob: true,
          isExcessPrint: true,
          isColor: true,
          isMultiNoDuplex: true,
          excessCategories: [],
          riskReasonCodes: [],
        }),
        job(2, { documentName: "диплом.pdf", riskScore: 85, totalPages: 19, isExcessPrint: true, excessCategories: ["Личные тематики"], riskReasonCodes: ["excess-personal"] }),
      ],
      { enabled: true, url: "/proxy", batchSize: 10, maxCandidates: 1 },
      fetchImpl,
    );

    expect(sentTitles).toEqual(["диплом.pdf"]);
  });

  it("sends only local personal-topic candidates sorted by page count", async () => {
    const sentTitles: string[] = [];
    const fetchImpl = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      sentTitles.push(...body.items.map((item: { document_title: string }) => item.document_title));
      expect(String(url)).toContain("lookup");
      return {
        ok: true,
        json: async () => ({
          items: body.items.map((item: { id: string }) => ({
            id: item.id,
            normalized_title: item.id,
            source: "llm",
            is_personal: false,
            primary_category: "work",
            risk_level: "low",
            confidence_raw: 0.9,
            needs_review: false,
            reason_short: "Рабочий документ",
            signals: ["work_like"],
          })),
          missing: [],
        }),
      } as Response;
    });

    await classifyPrintJobsWithProxy(
      [
        job(1, {
          documentName: "large-work.pdf",
          riskScore: 100,
          totalPages: 500,
          isBigJob: true,
          isExcessPrint: true,
          isColor: true,
          isMultiNoDuplex: true,
          excessCategories: [],
          riskReasonCodes: [],
        }),
        job(2, { documentName: "контрольная.pdf", riskScore: 65, totalPages: 9, isExcessPrint: true, excessCategories: ["Личные тематики"], riskReasonCodes: ["excess-personal"] }),
        job(3, { documentName: "диплом.pdf", riskScore: 85, totalPages: 19, isExcessPrint: true, excessCategories: ["Личные тематики"], riskReasonCodes: ["excess-personal"] }),
        job(4, { documentName: "меню.pdf", riskScore: 30, totalPages: 2, isExcessPrint: true, excessCategories: ["Личные тематики"], riskReasonCodes: ["excess-personal"] }),
      ],
      { enabled: true, url: "/proxy", batchSize: 10, maxCandidates: 2 },
      fetchImpl,
    );

    expect(sentTitles).toEqual(["диплом.pdf", "контрольная.pdf"]);
  });

  it("uses page count as the primary order for local personal-topic candidates", async () => {
    const sentTitles: string[] = [];
    const fetchImpl = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      sentTitles.push(...body.items.map((item: { document_title: string }) => item.document_title));
      expect(String(url)).toContain("lookup");
      return {
        ok: true,
        json: async () => ({
          items: body.items.map((item: { id: string }) => ({
            id: item.id,
            normalized_title: item.id,
            source: "llm",
            is_personal: false,
            primary_category: "work",
            risk_level: "low",
            confidence_raw: 0.9,
            needs_review: false,
            reason_short: "Рабочий документ",
            signals: ["work_like"],
          })),
          missing: [],
        }),
      } as Response;
    });

    await classifyPrintJobsWithProxy(
      [
        job(1, { documentName: "поздравление.pdf", riskScore: 90, totalPages: 1, isColor: true, isExcessPrint: true, excessCategories: ["Личные тематики"], riskReasonCodes: ["excess-personal"] }),
        job(2, { documentName: "диплом.pdf", riskScore: 30, totalPages: 19, isExcessPrint: true, excessCategories: ["Личные тематики"], riskReasonCodes: ["excess-personal"] }),
        job(3, { documentName: "меню.pdf", riskScore: 30, totalPages: 2, isExcessPrint: true, excessCategories: ["Личные тематики"], riskReasonCodes: ["excess-personal"] }),
      ],
      { enabled: true, url: "/proxy", batchSize: 10, maxCandidates: 1 },
      fetchImpl,
    );

    expect(sentTitles).toEqual(["диплом.pdf"]);
  });

});



