import { describe, expect, it } from "vitest";
import type { SszRecord } from "../import/types";
import { groupSszRecords, ratioNoTechnology, summarizeSszRecords } from "./metrics";

const records: SszRecord[] = [
  {
    id: "a",
    sourceName: "a.xls",
    number: "1",
    date: "2026-04-01T08:00:00",
    department: "131 Цех",
    master: "Мастер A",
    status: "Завершен",
    technologyTime: 80,
    noTechnologyTime: 20,
    operations: [],
  },
  {
    id: "b",
    sourceName: "a.xls",
    number: "2",
    date: "2026-04-02T08:00:00",
    department: "150 Цех",
    master: "Мастер B",
    status: "В подготовке",
    technologyTime: 50,
    noTechnologyTime: 50,
    operations: [],
  },
];

describe("metrics", () => {
  it("calculates no-technology ratio", () => {
    expect(ratioNoTechnology(80, 20)).toBe(0.2);
    expect(ratioNoTechnology(0, 0)).toBeNull();
  });

  it("summarizes SSZ records", () => {
    const summary = summarizeSszRecords(records);

    expect(summary.sszCount).toBe(2);
    expect(summary.problemSszCount).toBe(2);
    expect(summary.technologyTime).toBe(130);
    expect(summary.noTechnologyTime).toBe(70);
    expect(summary.noTechnologyRatio).toBe(0.35);
  });

  it("groups and sorts records by highest ratio", () => {
    const groups = groupSszRecords(records, "department");

    expect(groups[0].key).toBe("150 Цех");
    expect(groups[0].summary.noTechnologyRatio).toBe(0.5);
  });

});
