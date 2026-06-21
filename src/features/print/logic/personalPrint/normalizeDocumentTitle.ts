const TECHNICAL_SUFFIXES = new Set(["final", "copy", "копия", "version"]);
const VERSION_TOKEN_PATTERN = /^v\d+$/i;
const TECHNICAL_NUMBER_PATTERN = /^0+\d+$/;
const EXTENSION_PATTERN = /\.(pdf|doc|docx|rtf|xls|xlsx|xlsm|ppt|pptx|jpg|jpeg|png|tif|tiff|bmp|txt|csv)$/i;

export function normalizeDocumentTitle(value: unknown): string {
  const original = String(value ?? "").trim();
  if (!original) return "";

  const withoutExtension = original.replace(EXTENSION_PATTERN, "");
  const withCamelSpaces = withoutExtension
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2");

  const normalized = withCamelSpaces
    .toLowerCase()
    .replace(/[_\-.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalized
    .split(" ")
    .filter((token) => token && !TECHNICAL_SUFFIXES.has(token) && !VERSION_TOKEN_PATTERN.test(token) && !TECHNICAL_NUMBER_PATTERN.test(token))
    .join(" ");
}
