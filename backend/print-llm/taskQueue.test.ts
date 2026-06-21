import { describe, expect, it } from "vitest";

const { createTaskQueue } = await import("./taskQueue.mjs");

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("createTaskQueue", () => {
  it("limits concurrently running tasks", async () => {
    const queue = createTaskQueue(2);
    let active = 0;
    let maxActive = 0;

    const tasks = Array.from({ length: 5 }, (_, index) =>
      queue.run(async () => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await delay(10);
        active -= 1;
        return index;
      }),
    );

    await expect(Promise.all(tasks)).resolves.toEqual([0, 1, 2, 3, 4]);
    expect(maxActive).toBe(2);
    expect(queue.stats()).toEqual({ concurrency: 2, active: 0, pending: 0 });
  });

  it("propagates task errors and continues processing", async () => {
    const queue = createTaskQueue(1);
    const failing = queue.run(async () => {
      throw new Error("boom");
    });
    const succeeding = queue.run(async () => "ok");

    await expect(failing).rejects.toThrow("boom");
    await expect(succeeding).resolves.toBe("ok");
    expect(queue.stats()).toEqual({ concurrency: 1, active: 0, pending: 0 });
  });

  it("uses concurrency 1 for invalid values", async () => {
    const queue = createTaskQueue(0);

    expect(queue.stats().concurrency).toBe(1);
  });
});
