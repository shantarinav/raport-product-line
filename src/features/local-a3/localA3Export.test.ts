import { describe, expect, it } from "vitest";
import {
  buildLocalA3ArchiveEnvelope,
  exportLocalA3JournalToJson,
  exportLocalA3ProtocolToJson,
  importLocalA3JournalFromJson,
  mergeLocalA3Archive,
} from "./localA3Export";
import type { LocalA3ArchiveEnvelope, LocalA3Protocol } from "./localA3Types";

function protocol(id: string, updatedAt: string): LocalA3Protocol {
  return {
    schemaVersion: 1,
    id,
    status: "open",
    dashboardType: "ssz",
    dashboardTitle: "ССЗ",
    period: { label: "06.2026" },
    source: {},
    deviation: { title: "Доля по технологии ниже цели" },
    form: {
      problem: "Проблема",
      cause: "Причина",
      solution: "Решение",
      owner: "Начальник цеха",
      expectedResult: "Рост доли",
      checkCriteria: "Доля выше цели",
    },
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt,
  };
}

describe("localA3Export", () => {
  it("builds a versioned archive without raw report rows", () => {
    const archive = buildLocalA3ArchiveEnvelope({ protocols: [protocol("p1", "2026-06-20T00:00:00.000Z")], events: [], snapshots: [] });

    expect(archive.kind).toBe("raport-local-a3-archive");
    expect(JSON.stringify(archive)).not.toContain("rows");
    expect(JSON.stringify(archive)).not.toContain("xlsx");
  });

  it("exports and imports one protocol JSON", () => {
    const json = exportLocalA3ProtocolToJson(protocol("single", "2026-06-20T00:00:00.000Z"));
    const result = importLocalA3JournalFromJson(json);

    expect(result.success).toBe(true);
    expect(result.archive?.protocols.map((item) => item.id)).toEqual(["single"]);
  });

  it("exports and imports a journal JSON archive", () => {
    const json = exportLocalA3JournalToJson({ protocols: [protocol("p1", "2026-06-20T00:00:00.000Z")], events: [], snapshots: [] });
    const result = importLocalA3JournalFromJson(json);

    expect(result.success).toBe(true);
    expect(result.archive?.protocols.map((item) => item.id)).toEqual(["p1"]);
  });

  it("returns understandable errors for invalid JSON import", () => {
    const result = importLocalA3JournalFromJson("{not-json");

    expect(result.success).toBe(false);
    expect(result.errors[0]?.message).toMatch(/JSON/i);
  });

  it("merges archives by protocol updatedAt and event id", () => {
    const existing: LocalA3ArchiveEnvelope = buildLocalA3ArchiveEnvelope({
      protocols: [protocol("p1", "2026-06-20T00:00:00.000Z")],
      events: [
        {
          schemaVersion: 1,
          id: "e1",
          protocolId: "p1",
          type: "created",
          createdAt: "2026-06-20T00:00:00.000Z",
          payload: { type: "created" },
        },
      ],
      snapshots: [],
    });
    const incoming: LocalA3ArchiveEnvelope = buildLocalA3ArchiveEnvelope({
      protocols: [protocol("p1", "2026-06-19T00:00:00.000Z"), protocol("p2", "2026-06-21T00:00:00.000Z")],
      events: [
        {
          schemaVersion: 1,
          id: "e1",
          protocolId: "p1",
          type: "created",
          createdAt: "2026-06-20T00:00:00.000Z",
          payload: { type: "created" },
        },
        {
          schemaVersion: 1,
          id: "e2",
          protocolId: "p2",
          type: "created",
          createdAt: "2026-06-21T00:00:00.000Z",
          payload: { type: "created" },
        },
      ],
      snapshots: [],
    });

    const result = mergeLocalA3Archive(existing, incoming);

    expect(result.added).toBe(1);
    expect(result.updated).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.archive.protocols.map((item) => item.id).sort()).toEqual(["p1", "p2"]);
    expect(result.archive.events.map((item) => item.id).sort()).toEqual(["e1", "e2"]);
  });
});
