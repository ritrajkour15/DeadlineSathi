// Each fact has a short value and quotes from the notice that support it.
const evidenceSchema = {
  type: "object",
  properties: {
    quote: { type: "string" },
    pageNumber: { type: "integer", minimum: 1 }
  },
  required: ["quote", "pageNumber"],
  additionalProperties: false
};

const factSchema = {
  type: "object",
  properties: {
    value: { type: "string" },
    evidence: {
      type: "array",
      items: evidenceSchema
    }
  },
  required: ["value", "evidence"],
  additionalProperties: false
};

const factListSchema = {
  type: "array",
  items: factSchema
};

// Internal checklist used by the backend to make the missing-information
// review explicit. It is removed before the public API response is returned.
const coverageReviewItemSchema = {
  type: "object",
  properties: {
    status: { type: "string", enum: ["present", "absent", "unclear"] },
    detail: { type: "string" },
    evidence: {
      type: "array",
      items: evidenceSchema
    }
  },
  required: ["status", "detail", "evidence"],
  additionalProperties: false
};

const missingInformationCoverageSchema = {
  type: "object",
  properties: {
    applicationOpeningDate: coverageReviewItemSchema,
    applicationClosingDate: coverageReviewItemSchema,
    directApplicationPortalUrl: coverageReviewItemSchema,
    institutionSpecificDocumentChecklist: coverageReviewItemSchema,
    exactMeritCutoff: coverageReviewItemSchema
  },
  required: [
    "applicationOpeningDate",
    "applicationClosingDate",
    "directApplicationPortalUrl",
    "institutionSpecificDocumentChecklist",
    "exactMeritCutoff"
  ],
  additionalProperties: false
};

export const analysisSchema = {
  type: "object",
  properties: {
    noticeTitle: factSchema,
    issuingAuthority: factSchema,
    summary: factSchema,
    eligibilityCriteria: factListSchema,
    requiredDocuments: factListSchema,
    importantDates: factListSchema,
    applicationSteps: factListSchema,
    officialLinks: factListSchema,
    missingOrUnclearInformation: factListSchema,
    missingInformationCoverageReview: missingInformationCoverageSchema
  },
  required: [
    "noticeTitle",
    "issuingAuthority",
    "summary",
    "eligibilityCriteria",
    "requiredDocuments",
    "importantDates",
    "applicationSteps",
    "officialLinks",
    "missingOrUnclearInformation",
    "missingInformationCoverageReview"
  ],
  additionalProperties: false
};
