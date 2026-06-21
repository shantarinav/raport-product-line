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
- corporate memos, корпоративная памятка, профосмотр, professional medical check notices;
- technical documentation;
- operational reports.

Consistency rules for the JSON answer:
- If reason_short says the document is corporate, professional, technical, work-related, service, procurement, standard, protocol, project, or safety documentation, then is_personal MUST be false.
- If is_personal is false, primary_category MUST be "work" or "unknown".
- If is_personal is true, reason_short MUST explain the personal topic, not a work topic.
- Do not classify a document as personal only because it is printed in color, without duplex, or has many pages.
- Do not use medical for technical words such as bearing, корпус, подшипник, деталь, узел.
- Work examples: служебная записка, согласование закупки, протокол, стандарт, нестандарт, ОТК, охрана труда, перечень опасностей, корпус подшипника, чертеж, спецификация.
- Work examples: корпоративная памятка, профосмотр, памятка для профосмотра.
- Personal examples: меню для пожилого родственника, домашнее задание, диплом outside corporate training, школьные материалы, билеты for private travel.

Use unknown if the title is too short or ambiguous:
- scan001
- document
- копия
- img
- pdf
- name only
- isolated number

Return only valid JSON matching the schema.
The reason_short field must be written in Russian for every result, including work and unknown.
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
