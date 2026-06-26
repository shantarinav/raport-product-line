import { describe, expect, it, vi } from "vitest";

const { callOllamaChat } = await import("./ollamaClient.mjs");

describe("callOllamaChat", () => {
  it("calls Ollama chat API with strict JSON and disabled thinking", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: "{\"is_personal\":false}" } }),
    });

    const result = await callOllamaChat({
      chatUrl: "http://localhost:11434/api/chat",
      model: "qwen3:4b",
      prompt: "/no_think\nReturn JSON",
      schema: { type: "object" },
      timeoutMs: 1000,
      fetchImpl,
    });

    expect(result).toBe("{\"is_personal\":false}");
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:11434/api/chat",
      expect.objectContaining({
        method: "POST",
        body: expect.any(String),
      }),
    );
    const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(body).toMatchObject({
      model: "qwen3:4b",
      stream: false,
      think: false,
      format: { type: "object" },
    });
    expect(body.messages[0].content).toContain("Reasoning mode is disabled");
    expect(body.messages[1].content).toContain("/no_think");
  });

  it("rejects when Ollama does not answer before timeout", async () => {
    const fetchImpl = vi.fn(
      () =>
        new Promise(() => {
          // Simulate a stalled local model call.
        }),
    );

    await expect(
      callOllamaChat({
        chatUrl: "http://localhost:11434/api/chat",
        model: "qwen3:4b",
        prompt: "/no_think\nReturn JSON",
        schema: { type: "object" },
        timeoutMs: 10,
        fetchImpl,
      }),
    ).rejects.toThrow("Ollama request timed out");
  });
});
