import { createServer } from "node:http";
import { readPrintLlmConfig } from "./config.mjs";
import { classifyMissingPrintPersonalItems, classifyPrintPersonalItems, lookupPrintPersonalClassifications } from "./classifier.mjs";

const config = readPrintLlmConfig();

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
  });
  response.end(JSON.stringify(payload));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) reject(new Error("Request body is too large"));
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

const server = createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    sendJson(response, 204, {});
    return;
  }

  if (request.method !== "POST") {
    sendJson(response, 404, { error: "Not found" });
    return;
  }

  try {
    const body = JSON.parse(await readBody(request));
    const items = Array.isArray(body.items) ? body.items : [];
    const pathname = new URL(request.url || "/", "http://127.0.0.1").pathname;

    if (pathname === "/api/print/classifications/lookup") {
      sendJson(response, 200, await lookupPrintPersonalClassifications(items, config));
      return;
    }

    if (pathname === "/api/print/classifications/classify-missing") {
      sendJson(response, 200, await classifyMissingPrintPersonalItems(items, config));
      return;
    }

    if (pathname === "/api/print/classify-personal") {
      sendJson(response, 200, await classifyPrintPersonalItems(items, config));
      return;
    }

    sendJson(response, 404, { error: "Not found" });
  } catch (error) {
    sendJson(response, 400, { error: error instanceof Error ? error.message : "Invalid request" });
  }
});

server.listen(config.port, "127.0.0.1", () => {
  console.log(`Print LLM classifier proxy listening on http://127.0.0.1:${config.port}`);
});
