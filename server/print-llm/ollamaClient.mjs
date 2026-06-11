export async function callOllamaGenerate({ baseUrl, model, prompt, schema, timeoutMs, fetchImpl = fetch }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(`${baseUrl.replace(/\/$/, "")}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, prompt, stream: false, format: schema }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Ollama returned ${response.status}`);
    }

    const data = await response.json();
    return typeof data.response === "string" ? data.response : JSON.stringify(data.response ?? data);
  } finally {
    clearTimeout(timeoutId);
  }
}
