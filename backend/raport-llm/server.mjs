import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import { readRaportLlmConfig } from "./config.mjs";
import { assistA3Protocol } from "./domains/a3/assist.mjs";
import {
  classifyMissingPrintPersonalItems,
  classifyPrintPersonalItems,
  lookupPrintPersonalClassifications,
} from "./domains/print/classifier.mjs";
import { isAuthorized, isOriginAllowed, readJsonBody, sendJson } from "./httpUtils.mjs";
import { createTaskQueue } from "./taskQueue.mjs";

function defaultHandlers(queue) {
  return {
    lookup: (items, config) => lookupPrintPersonalClassifications(items, config, { queue }),
    classifyMissing: (items, config) => classifyMissingPrintPersonalItems(items, config, { queue }),
    classifyPersonal: (items, config) => classifyPrintPersonalItems(items, config, { queue }),
    assistA3: (body, config) => assistA3Protocol(body, config, { queue }),
  };
}

function healthPayload(config, queue) {
  return {
    ok: true,
    service: "raport-llm",
    enabled: config.enabled,
    model: config.model,
    a3Model: config.a3Model || config.model,
    domains: ["print", "a3"],
    cacheEnabled: config.cacheEnabled,
    queue: queue.stats(),
  };
}

function requestItems(body) {
  return Array.isArray(body.items) ? body.items : [];
}

export function createRaportLlmServer(config = readRaportLlmConfig(), dependencies = {}) {
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
      if (!isAuthorized(request, config)) {
        sendJson(response, 401, { error: "Unauthorized" }, request, config);
        return;
      }
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

      if (pathname === "/api/print/classifications/lookup" || pathname === "/api/v1/print/classifications/lookup") {
        sendJson(response, 200, await handlers.lookup(items, config), request, config);
        return;
      }

      if (
        pathname === "/api/print/classifications/classify-missing" ||
        pathname === "/api/v1/print/classifications/classify-missing"
      ) {
        sendJson(response, 200, await handlers.classifyMissing(items, config), request, config);
        return;
      }

      if (pathname === "/api/print/classify-personal" || pathname === "/api/v1/print/classify-personal") {
        sendJson(response, 200, await handlers.classifyPersonal(items, config), request, config);
        return;
      }

      if (pathname === "/api/a3/assist" || pathname === "/api/v1/a3/assist") {
        sendJson(response, 200, await handlers.assistA3(body, config), request, config);
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

export function startRaportLlmServer(config = readRaportLlmConfig(), dependencies = {}) {
  const server = createRaportLlmServer(config, dependencies);
  server.listen(config.port, config.host, () => {
    console.log(`Raport LLM service listening on http://${config.host}:${config.port}`);
  });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startRaportLlmServer();
}
