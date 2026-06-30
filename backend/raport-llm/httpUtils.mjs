import { timingSafeEqual } from "node:crypto";

const JSON_CONTENT_TYPE = "application/json; charset=utf-8";
const ALLOWED_METHODS = "GET, POST, OPTIONS";
const ALLOWED_HEADERS = "content-type, x-raport-backend-key";

function headerValue(request, name) {
  const value = request.headers?.[name.toLowerCase()] ?? request.headers?.[name];
  return Array.isArray(value) ? value[0] : value;
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function isOriginAllowed(origin, config) {
  if (!origin) return true;
  const allowedOrigins = Array.isArray(config.allowedOrigins) ? config.allowedOrigins : [];
  return allowedOrigins.includes("*") || allowedOrigins.includes(origin);
}

export function buildCorsHeaders(request, config) {
  const origin = headerValue(request, "origin");
  const headers = {
    "access-control-allow-methods": ALLOWED_METHODS,
    "access-control-allow-headers": ALLOWED_HEADERS,
    vary: "Origin",
  };

  if (origin && isOriginAllowed(origin, config)) {
    headers["access-control-allow-origin"] = config.allowedOrigins?.includes("*") ? "*" : origin;
  }

  return headers;
}

export function isAuthorized(request, config) {
  if (!config.apiKey) return true;
  const requestKey = headerValue(request, "x-raport-backend-key");
  return typeof requestKey === "string" && safeEqual(requestKey, config.apiKey);
}

export function sendJson(response, statusCode, payload, request, config) {
  const body = statusCode === 204 ? "" : JSON.stringify(payload);
  response.writeHead(statusCode, {
    "content-type": JSON_CONTENT_TYPE,
    ...buildCorsHeaders(request, config),
  });
  response.end(body);
}

export function readJsonBody(request, limitBytes) {
  return new Promise((resolve, reject) => {
    let body = "";
    let settled = false;

    function fail(error) {
      if (settled) return;
      settled = true;
      reject(error);
    }

    request.on("data", (chunk) => {
      if (settled) return;
      body += chunk;
      if (Buffer.byteLength(body, "utf8") > limitBytes) {
        fail(new Error("Request body is too large"));
      }
    });

    request.on("end", () => {
      if (settled) return;
      settled = true;
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });

    request.on("error", fail);
  });
}
