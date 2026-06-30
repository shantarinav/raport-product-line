import { z } from "zod";

const optionalText = (maxLength) => z.string().trim().max(maxLength).optional();
const requiredText = (maxLength) => z.string().trim().min(1).max(maxLength);

export const A3_ASSIST_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["suggestions", "warnings"],
  properties: {
    suggestions: {
      type: "object",
      additionalProperties: false,
      required: ["problem", "causeHypotheses", "fiveWhys", "countermeasures", "expectedResult", "checkCriteria"],
      properties: {
        problem: { type: "string" },
        causeHypotheses: { type: "array", items: { type: "string" }, maxItems: 3 },
        fiveWhys: { type: "array", items: { type: "string" }, maxItems: 0 },
        countermeasures: { type: "array", items: { type: "string" }, maxItems: 3 },
        expectedResult: { type: "string" },
        checkCriteria: { type: "string" },
      },
    },
    warnings: { type: "array", items: { type: "string" }, maxItems: 5 },
  },
};

export const a3AssistRequestSchema = z
  .object({
    protocolId: optionalText(120),
    field: z.enum(["problem", "cause", "solution", "expectedResult", "checkCriteria"]).optional(),
    qualityIssue: optionalText(300),
    dashboardType: requiredText(40),
    dashboardTitle: requiredText(120),
    periodLabel: requiredText(120),
    deviationTitle: requiredText(240),
    metricName: requiredText(160),
    actualValue: z.union([z.string(), z.number()]).optional(),
    targetValue: z.union([z.string(), z.number()]).optional(),
    deviationScale: z.union([z.string(), z.number()]).optional(),
    affectedObjectType: optionalText(80),
    affectedObjectName: optionalText(240),
    sourceFileName: optionalText(240),
    evidenceSummary: optionalText(1200),
    problem: optionalText(4000),
    cause: optionalText(4000),
    solution: optionalText(4000),
    expectedResult: optionalText(4000),
    checkCriteria: optionalText(4000),
    mode: z.literal("draft_suggestions").default("draft_suggestions"),
  })
  .strict();

export const a3AssistResponseSchema = z
  .object({
    suggestions: z
      .object({
        problem: optionalText(800).default(""),
        causeHypotheses: z.array(requiredText(400)).max(3),
        fiveWhys: z.array(requiredText(400)).max(0),
        countermeasures: z.array(requiredText(500)).max(3),
        expectedResult: optionalText(800).default(""),
        checkCriteria: optionalText(800).default(""),
      })
      .strict(),
    warnings: z.array(requiredText(240)).max(5),
  })
  .strict();

function formatIssues(error) {
  return error.issues.map((issue) => ({
    path: issue.path.length ? issue.path.join(".") : "$",
    message: issue.message,
  }));
}

export function parseA3AssistRequest(input) {
  const result = a3AssistRequestSchema.safeParse(input);
  if (result.success) return { success: true, data: result.data, errors: [] };
  return { success: false, errors: formatIssues(result.error) };
}

export function parseA3AssistResponse(input) {
  const result = a3AssistResponseSchema.safeParse(input);
  if (result.success) return { success: true, data: result.data, errors: [] };
  return { success: false, errors: formatIssues(result.error) };
}
