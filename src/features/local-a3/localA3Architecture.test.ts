import { describe, expect, it } from "vitest";

const sourceModules = import.meta.glob("./**/*.{ts,tsx}", {
  eager: true,
  import: "default",
  query: "?raw",
}) as Record<string, string>;

function hasBareImport(source: string, packageName: string): boolean {
  const escaped = packageName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:import\\s+[^;]*?from\\s+["']${escaped}["']|import\\s*\\(\\s*["']${escaped}["']\\s*\\))`).test(source);
}

describe("local A3 dependency boundaries", () => {
  const files = Object.entries(sourceModules).map(([relativePath, source]) => ({
    relativePath: relativePath.replace(/^\.\//, ""),
    source,
  }));

  it("keeps Dexie imports inside the storage layer", () => {
    const offenders = files
      .filter((file) => hasBareImport(file.source, "dexie"))
      .map((file) => file.relativePath)
      .filter((filePath) => !filePath.startsWith("storage/"));

    expect(offenders).toEqual([]);
  });

  it("keeps Zod imports inside the domain layer", () => {
    const offenders = files
      .filter((file) => hasBareImport(file.source, "zod"))
      .map((file) => file.relativePath)
      .filter((filePath) => !filePath.startsWith("domain/"));

    expect(offenders).toEqual([]);
  });

  it("keeps fake-indexeddb in tests only", () => {
    const offenders = files
      .filter((file) => file.source.includes("fake-indexeddb"))
      .map((file) => file.relativePath)
      .filter((filePath) => !filePath.includes(".test."));

    expect(offenders).toEqual([]);
  });
});
