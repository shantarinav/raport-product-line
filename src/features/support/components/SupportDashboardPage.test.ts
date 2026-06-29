import { describe, expect, it } from "vitest";
import { normalizeControlPercent } from "./SupportDashboardPage";

describe("SupportDashboardPage", () => {
  it("does not allow control target above 90 percent", () => {
    expect(normalizeControlPercent(95)).toBe(90);
    expect(normalizeControlPercent(120)).toBe(90);
  });

  it("rounds and keeps control target inside allowed range", () => {
    expect(normalizeControlPercent(84.6)).toBe(85);
    expect(normalizeControlPercent(-10)).toBe(0);
  });
});
