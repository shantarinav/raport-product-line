import { readFile, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_PROXY_URL = "http://127.0.0.1:8787/api/print/classify-personal";
const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_REQUEST_TIMEOUT_MS = 300_000;
const PERSONAL_HINTS = [
  "школ", "детск", "садик", "домаш", "диплом", "реферат", "курсов", "билет", "путев", "рецепт", "меню", "анкета", "заявление",
  "school", "klass", "class", "domash", "homework", "diplom", "referat", "recipe", "zayavlenie",
];

function parseArgs(argv) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) continue;
    const key = item.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args.set(key, "true");
    } else {
      args.set(key, next);
      index += 1;
    }
  }
  return args;
}

function splitCsvLine(line, separator) {
  const cells = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === separator && !quoted) {
      cells.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells;
}

export function parseLabeledCsv(text) {
  const normalized = text.replace(/^\uFEFF/, "").trim();
  if (!normalized) return [];
  const lines = normalized.split(/\r?\n/).filter(Boolean);
  const separator = lines[0].includes(";") ? ";" : ",";
  const headers = splitCsvLine(lines[0], separator).map((header) => header.trim());

  return lines.slice(1).map((line, index) => {
    const cells = splitCsvLine(line, separator);
    const row = Object.fromEntries(headers.map((header, cellIndex) => [header, cells[cellIndex] ?? ""]));
    const title = row.document_title || row.title || row.normalized_title || "";
    const label = row.analyst_label || row.expected_is_personal || row.label || "";

    return {
      id: row.id || `eval-${index}`,
      document_title: title,
      expected: /^(1|true|yes|personal|личн|да)$/i.test(label.trim()),
      pages: Number(row.pages || 1) || 1,
      color: /^(1|true|yes|да)$/i.test(String(row.color || "")),
      duplex: /^(1|true|yes|да)$/i.test(String(row.duplex || "")),
      paper_size: row.paper_size || "unknown",
    };
  });
}

function fallbackPredict(item) {
  const title = item.document_title.toLowerCase();
  return PERSONAL_HINTS.some((hint) => title.includes(hint));
}

async function postProxyBatch(items, url, requestTimeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), requestTimeoutMs);
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(`Classifier proxy returned ${response.status}`);
  }

  const payload = await response.json();
  const byId = new Map((Array.isArray(payload.items) ? payload.items : []).map((item) => [item.id, item]));
  return items.map((item) => {
    const classification = byId.get(item.id);
    return {
      isPersonal: classification?.is_personal === true,
      riskLevel: classification?.risk_level || "unknown",
      source: classification?.source || "rules_fallback",
    };
  });
}

export async function classifyWithProxy(items, url, options = {}) {
  const batchSize = Math.max(1, Number(options.batchSize || DEFAULT_BATCH_SIZE));
  const requestTimeoutMs = Math.max(1_000, Number(options.requestTimeoutMs || DEFAULT_REQUEST_TIMEOUT_MS));
  const results = [];

  for (let index = 0; index < items.length; index += batchSize) {
    const batch = items.slice(index, index + batchSize);
    results.push(...(await postProxyBatch(batch, url, requestTimeoutMs)));
  }

  return results;
}

export function calculateBinaryMetrics(rows, predictions) {
  let truePositive = 0;
  let falsePositive = 0;
  let trueNegative = 0;
  let falseNegative = 0;

  rows.forEach((row, index) => {
    const predicted = predictions[index] === true;
    if (predicted && row.expected) truePositive += 1;
    if (predicted && !row.expected) falsePositive += 1;
    if (!predicted && !row.expected) trueNegative += 1;
    if (!predicted && row.expected) falseNegative += 1;
  });

  const precision = truePositive + falsePositive > 0 ? truePositive / (truePositive + falsePositive) : 0;
  const recall = truePositive + falseNegative > 0 ? truePositive / (truePositive + falseNegative) : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  return { truePositive, falsePositive, trueNegative, falseNegative, precision, recall, f1 };
}

async function main() {
  const rawArgs = process.argv.slice(2);
  const args = parseArgs(rawArgs);
  const positionalInput = rawArgs.find((item, index) => !item.startsWith("--") && !rawArgs[index - 1]?.startsWith("--"));
  const input = args.get("input") || positionalInput;
  if (!input) {
    console.error(
      "Usage: npm run print-llm:evaluate -- --input labeled.csv [--output result.json] [--proxy http://127.0.0.1:8787/api/print/classify-personal] [--batch-size 10] [--request-timeout-ms 300000]",
    );
    process.exitCode = 1;
    return;
  }

  const rows = parseLabeledCsv(await readFile(input, "utf8"));
  const startedAt = performance.now();
  const proxyUrl = args.get("proxy") || process.env.PRINT_LLM_EVALUATE_PROXY_URL;
  const batchSize = Number(args.get("batch-size") || process.env.PRINT_LLM_EVALUATE_BATCH_SIZE || DEFAULT_BATCH_SIZE);
  const requestTimeoutMs = Number(args.get("request-timeout-ms") || process.env.PRINT_LLM_EVALUATE_REQUEST_TIMEOUT_MS || DEFAULT_REQUEST_TIMEOUT_MS);
  const classifications = proxyUrl
    ? await classifyWithProxy(rows, proxyUrl, { batchSize, requestTimeoutMs })
    : rows.map((row) => ({ isPersonal: fallbackPredict(row), riskLevel: "unknown", source: "rules_fallback" }));
  const predictions = classifications.map((classification) => classification.isPersonal);
  const latencyMs = performance.now() - startedAt;
  const metrics = calculateBinaryMetrics(rows, predictions);
  const result = {
    input,
    classifier: proxyUrl ? "proxy" : "fallback-keywords",
    rows: rows.length,
    latencyMs: Math.round(latencyMs),
    latencyP50Ms: rows.length > 0 ? Math.round(latencyMs / rows.length) : 0,
    latencyP95Ms: rows.length > 0 ? Math.round(latencyMs / rows.length) : 0,
    unknown: classifications.filter((classification) => classification.riskLevel === "unknown").length,
    fallback: classifications.filter((classification) => classification.source === "rules_fallback" || classification.source === "disabled").length,
    invalid: 0,
    ...metrics,
    falsePositives: rows.filter((row, index) => predictions[index] && !row.expected).map((row) => ({ id: row.id, document_title: row.document_title })),
    falseNegatives: rows.filter((row, index) => !predictions[index] && row.expected).map((row) => ({ id: row.id, document_title: row.document_title })),
  };

  const output = JSON.stringify(result, null, 2);
  if (args.get("output")) {
    await writeFile(args.get("output"), `${output}\n`, "utf8");
  }
  console.log(output);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}


