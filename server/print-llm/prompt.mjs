export function buildPrintLlmPrompt(input) {
  return `/no_think

You are a local classifier for a corporate print analytics dashboard.
Reasoning mode is disabled. Do not think step by step. Do not output analysis, markdown, comments, or explanations.

Task:
Classify whether a printed document title is probably personal/non-work-related.

Input contains only a normalized document title and neutral print metadata.
Do not assume guilt. This is only a risk signal for analyst review.

Classify as personal if the title likely relates to:
- school, children, homework, exams, diploma, essay, реферат, школа, класс, домашка;
- recipes, food for home use;
- travel, tickets, hotels, visas, personal trips;
- household, ремонт, квартира, дача;
- personal finance, loans, bills, taxes, ипотека;
- medical documents, справка, анализы, лечение;
- personal legal documents, заявления, доверенности, договоры outside obvious work context;
- entertainment, photos, postcards, invitations.

Education, school, diploma, homework, children, kindergarten, and similar topics are personal unless the title clearly states corporate training, internal course, work instruction, project documentation, or an operational report.
If primary_category is education, children, finance, travel, household, medical, media, legal, or other_personal and there is no clear work context, set is_personal to true.
Do not classify a title as work only because it was printed from Microsoft Word, Excel, Outlook, browser, or PDF viewer.

Classify as work if the title clearly looks like business documentation:
- invoice, contract, report, акт, счет, служебная записка, проектная документация;
- corporate templates;
- technical documentation;
- operational reports.

Use unknown if the title is too short or ambiguous:
- scan001
- document
- копия
- img
- pdf
- name only
- isolated number

Return only valid JSON matching the schema.
The reason_short field must be written in Russian.
Do not include personal data in the reason.
Do not repeat the full filename in the reason.

Input:
normalized_title: "${input.normalizedTitle}"
pages: ${input.pages}
color: ${input.color}
duplex: ${input.duplex}
paper_size: "${input.paperSize}"`;
}

export const PRINT_LLM_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["is_personal", "primary_category", "confidence_raw", "needs_review", "reason_short", "signals"],
  properties: {
    is_personal: { type: "boolean" },
    primary_category: {
      type: "string",
      enum: ["work", "education", "children", "finance", "travel", "household", "medical", "media", "legal", "other_personal", "unknown"],
    },
    confidence_raw: { type: "number", minimum: 0, maximum: 1 },
    needs_review: { type: "boolean" },
    reason_short: { type: "string", maxLength: 180 },
    signals: {
      type: "array",
      items: {
        type: "string",
        enum: [
          "education",
          "children_or_school",
          "recipe_or_food",
          "household",
          "personal_finance",
          "travel_or_tickets",
          "medical",
          "legal_personal",
          "entertainment",
          "ambiguous_name",
          "too_short",
          "technical_scan_name",
          "work_like",
          "unknown",
        ],
      },
      maxItems: 5,
    },
  },
};
