export async function callOllamaChat({
  chatUrl,
  model,
  prompt,
  schema,
  timeoutMs,
  numPredict = 120,
  keepAlive,
  fetchImpl = fetch,
}) {
  const controller = new AbortController();
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error("Ollama request timed out"));
    }, timeoutMs);
  });

  try {
    const response = await Promise.race([
      fetchImpl(chatUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model,
          ...(keepAlive ? { keep_alive: keepAlive } : {}),
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
            num_predict: numPredict,
          },
        }),
        signal: controller.signal,
      }),
      timeoutPromise,
    ]);

    if (!response.ok) {
      throw new Error(`Ollama returned ${response.status}`);
    }

    const data = await Promise.race([response.json(), timeoutPromise]);
    const content = data?.message?.content ?? data?.response ?? data;
    return typeof content === "string" ? content : JSON.stringify(content);
  } finally {
    clearTimeout(timeoutId);
  }
}
