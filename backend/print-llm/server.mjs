import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import { readPrintLlmConfig } from "./config.mjs";
import { classifyMissingPrintPersonalItems, classifyPrintPersonalItems, lookupPrintPersonalClassifications } from "./classifier.mjs";
import { isAuthorized, isOriginAllowed, readJsonBody, sendJson } from "./httpUtils.mjs";
import { PrintLlmSqliteCache } from "./sqliteCache.mjs";
import { createTaskQueue } from "./taskQueue.mjs";

function defaultHandlers(queue) {
  return {
    lookup: (items, config) => lookupPrintPersonalClassifications(items, config, { queue }),
    classifyMissing: (items, config) => classifyMissingPrintPersonalItems(items, config, { queue }),
    classifyPersonal: (items, config) => classifyPrintPersonalItems(items, config, { queue }),
  };
}

function healthPayload(config, queue) {
  const payload = {
    ok: true,
    service: "print-llm",
    enabled: config.enabled,
    model: config.model,
    cacheEnabled: config.cacheEnabled,
    queue: queue.stats(),
  };

  if (!config.cacheEnabled) return payload;

  const cache = new PrintLlmSqliteCache(config.cacheDbPath, { busyTimeoutMs: config.sqliteBusyTimeoutMs });
  try {
    payload.cacheClassifications = cache.countClassifications();
  } catch {
    payload.cacheStatus = "error";
  } finally {
    cache.close();
  }
  return payload;
}

function requestItems(body) {
  return Array.isArray(body.items) ? body.items : [];
}

export function createPrintLlmServer(config = readPrintLlmConfig(), dependencies = {}) {
  const queue = dependencies.queue ?? createTaskQueue(config.concurrency);
  const handlers = { ...defaultHandlers(queue), ...dependencies.handlers };

  const server = createServer(async (request, response) => {
    const origin = request.headers.origin;
    if (!isOriginAllowed(origin, config)) {
      sendJson(response, 403, { error: "Origin is not allowed" }, request, config);
      return;
    }

    const pathname = new URL(request.url || "/", `http://${config.host}:${config.port}`).pathname;

    if (request.method === "OPTIONS") {
      sendJson(response, 204, {}, request, config);
      return;
    }

    if (request.method === "GET" && pathname === "/health") {
      sendJson(response, 200, healthPayload(config, queue), request, config);
      return;
    }

    if (request.method !== "POST") {
      sendJson(response, 404, { error: "Not found" }, request, config);
      return;
    }

    if (!isAuthorized(request, config)) {
      sendJson(response, 401, { error: "Unauthorized" }, request, config);
      return;
    }

    try {
      const body = await readJsonBody(request, config.requestBodyLimitBytes);
      const items = requestItems(body);

      if (pathname === "/api/print/classifications/lookup") {
        sendJson(response, 200, await handlers.lookup(items, config), request, config);
        return;
      }

      if (pathname === "/api/print/classifications/classify-missing") {
        sendJson(response, 200, await handlers.classifyMissing(items, config), request, config);
        return;
      }

      if (pathname === "/api/print/classify-personal") {
        sendJson(response, 200, await handlers.classifyPersonal(items, config), request, config);
        return;
      }

      sendJson(response, 404, { error: "Not found" }, request, config);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid request";
      sendJson(response, message === "Request body is too large" ? 413 : 400, { error: message }, request, config);
    }
  });

  server.requestTimeout = config.httpRequestTimeoutMs;
  server.headersTimeout = config.httpHeadersTimeoutMs;
  server.keepAliveTimeout = config.httpKeepAliveTimeoutMs;

  return server;
}

export function startPrintLlmServer(config = readPrintLlmConfig(), dependencies = {}) {
  const server = createPrintLlmServer(config, dependencies);
  server.listen(config.port, config.host, () => {
    console.log(`Print LLM classifier proxy listening on http://${config.host}:${config.port}`);
  });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startPrintLlmServer();
}
