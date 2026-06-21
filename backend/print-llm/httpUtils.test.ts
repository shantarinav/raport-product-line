import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";

const { buildCorsHeaders, isAuthorized, isOriginAllowed, readJsonBody } = await import("./httpUtils.mjs");

function request(headers = {}, chunks = []) {
  const stream = Readable.from(chunks);
  stream.headers = headers;
  return stream;
}

const config = {
  allowedOrigins: ["https://bi.ekb.ru", "http://localhost:5173"],
  apiKey: "",
};

describe("httpUtils", () => {
  it("allows requests without origin for local tools and same-host calls", () => {
    expect(isOriginAllowed(undefined, config)).toBe(true);
  });

  it("allows configured origins and rejects others", () => {
    expect(isOriginAllowed("https://bi.ekb.ru", config)).toBe(true);
    expect(isOriginAllowed("https://evil.example", config)).toBe(false);
  });

  it("builds CORS headers for allowed origin", () => {
    const headers = buildCorsHeaders(request({ origin: "https://bi.ekb.ru" }), config);

    expect(headers["access-control-allow-origin"]).toBe("https://bi.ekb.ru");
    expect(headers["access-control-allow-headers"]).toContain("x-raport-backend-key");
    expect(headers.vary).toBe("Origin");
  });

  it("does not require API key when config key is empty", () => {
    expect(isAuthorized(request(), { ...config, apiKey: "" })).toBe(true);
  });

  it("requires API key when config key is set", () => {
    expect(isAuthorized(request({}, []), { ...config, apiKey: "secret" })).toBe(false);
    expect(isAuthorized(request({ "x-raport-backend-key": "secret" }, []), { ...config, apiKey: "secret" })).toBe(true);
    expect(isAuthorized(request({ "x-raport-backend-key": "wrong" }, []), { ...config, apiKey: "secret" })).toBe(false);
  });

  it("reads JSON body within limit", async () => {
    await expect(readJsonBody(request({}, ['{"items":[{"id":"1"}]}']), 1000)).resolves.toEqual({ items: [{ id: "1" }] });
  });

  it("rejects JSON body over limit", async () => {
    await expect(readJsonBody(request({}, ["123456"]), 3)).rejects.toThrow("Request body is too large");
  });
});
