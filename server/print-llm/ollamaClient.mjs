export async function callOllamaChat({ chatUrl, model, prompt, schema, timeoutMs, fetchImpl = fetch }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(chatUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are a local JSON classifier. Reasoning mode is disabled. Do not think step by step. Return only valid JSON matching the provided schema.",
          },
          { role: "user", content: prompt },
        ],
        stream: false,
        think: false,
        format: schema,
        options: {
          temperature: 0,
          num_predict: 220,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Ollama returned ${response.status}`);
    }

    const data = await response.json();
    const content = data?.message?.content ?? data?.response ?? data;
    return typeof content === "string" ? content : JSON.stringify(content);
  } finally {
    clearTimeout(timeoutId);
  }
}
