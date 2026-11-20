import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { NOT_MENTIONED, groundAnalysis, groundCoverageFinding } from "./analyzeNotice.js";

function coverageItem(status, detail, quote, pageNumber = 1) {
  return {
    status,
    detail,
    evidence: quote ? [{ quote, pageNumber }] : []
  };
}

function pageMap(text, pageNumber = 1) {
  return new Map([[pageNumber, text.replace(/\s+/gu, " ").trim()]]);
}

test("a general UGC website URL does not count as the direct application portal", () => {
  const quote = "For more information, visit https://www.ugc.gov.in.";
  const result = groundCoverageFinding(
    coverageItem("present", "Application portal URL: https://www.ugc.gov.in", quote),
    "directApplicationPortalUrl",
    pageMap(quote)
  );

  assert.equal(result.status, "unclear");
  assert.match(result.fact.value, /unclear/iu);
  assert.equal(result.fact.evidence.length, 1);
});

test("an annual application statement is not an exact opening or closing date", () => {
  const quote = "Applications are invited once a year.";
  const source = pageMap(quote);

  for (const key of ["applicationOpeningDate", "applicationClosingDate"]) {
    const result = groundCoverageFinding(
      coverageItem("present", "Applications are invited once a year", quote),
      key,
      source
    );

    assert.equal(result.status, "unclear", `${key} should not be present without an exact date`);
    assert.match(result.fact.value, /unclear/iu);
  }
});

test("unsupported present evidence is downgraded to unclear", () => {
  const quote = "Applicants must submit their academic transcript.";
  const result = groundCoverageFinding(
    coverageItem("present", "Exact merit cutoff: 90%", quote),
    "exactMeritCutoff",
    pageMap(quote)
  );

  assert.equal(result.status, "unclear");
  assert.match(result.fact.value, /unclear/iu);
  assert.doesNotMatch(result.fact.value, /90%/u);
  assert.deepEqual(result.fact.evidence, []);
});

test("a specifically quoted application date can be classified as present", () => {
  const quote = "Applications open on 1 August 2025.";
  const result = groundCoverageFinding(
    coverageItem("present", "Application opening date: 1 August 2025", quote),
    "applicationOpeningDate",
    pageMap(quote)
  );

  assert.equal(result.status, "present");
  assert.equal(result.fact, null);
});

test("a direct application portal URL with application context can be present", () => {
  const quote = "Applicants submit the application through NSP at https://scholarships.gov.in.";
  const result = groundCoverageFinding(
    coverageItem("present", "Direct application portal URL: https://scholarships.gov.in", quote),
    "directApplicationPortalUrl",
    pageMap(quote)
  );

  assert.equal(result.status, "present");
  assert.equal(result.fact, null);
});

test("a merely discretionary document request is not a complete checklist", () => {
  const quote = "The institution may request supporting documents as needed.";
  const result = groundCoverageFinding(
    coverageItem("present", "Complete institution-specific document checklist: documents may be requested", quote),
    "institutionSpecificDocumentChecklist",
    pageMap(quote)
  );

  assert.equal(result.status, "unclear");
  assert.match(result.fact.value, /unclear/iu);
});

test("general merit-based selection is not an exact merit cutoff", () => {
  const quote = "Candidates are selected on the basis of merit.";
  const result = groundCoverageFinding(
    coverageItem("present", "Exact merit cutoff is based on merit", quote),
    "exactMeritCutoff",
    pageMap(quote)
  );

  assert.equal(result.status, "unclear");
  assert.match(result.fact.value, /unclear/iu);
});

test("absent coverage becomes a public missing-information fact without evidence", () => {
  const result = groundCoverageFinding(
    coverageItem("absent", NOT_MENTIONED, ""),
    "applicationClosingDate",
    pageMap("No application deadline is stated.")
  );

  assert.equal(result.status, "absent");
  assert.equal(result.fact.value, `Exact application closing date: ${NOT_MENTIONED}`);
  assert.deepEqual(result.fact.evidence, []);
});

test("coverage status present takes precedence over a duplicate regular missing item", () => {
  const quote = "Applicants submit the application through NSP at https://scholarships.gov.in.";
  const notMentioned = { value: NOT_MENTIONED, evidence: [] };
  const coverage = Object.fromEntries([
    "applicationOpeningDate",
    "applicationClosingDate",
    "directApplicationPortalUrl",
    "institutionSpecificDocumentChecklist",
    "exactMeritCutoff"
  ].map((key) => [key, { status: "absent", detail: NOT_MENTIONED, evidence: [] }]));
  coverage.directApplicationPortalUrl = {
    status: "present",
    detail: "Direct application portal URL: https://scholarships.gov.in",
    evidence: [{ quote, pageNumber: 1 }]
  };

  const publicAnalysis = groundAnalysis({
    noticeTitle: notMentioned,
    issuingAuthority: notMentioned,
    summary: notMentioned,
    eligibilityCriteria: [notMentioned],
    requiredDocuments: [notMentioned],
    importantDates: [notMentioned],
    applicationSteps: [notMentioned],
    officialLinks: [notMentioned],
    missingOrUnclearInformation: [{
      value: `Direct application portal URL: ${NOT_MENTIONED}`,
      evidence: []
    }],
    missingInformationCoverageReview: coverage
  }, [{ pageNumber: 1, text: quote }]);

  assert.equal(publicAnalysis.missingOrUnclearInformation.length, 4);
  assert.equal(publicAnalysis.missingOrUnclearInformation.some((item) => /portal url/iu.test(item.value)), false);
});

test("renewal and forfeiture instructions are prompted and retained in applicationSteps", async () => {
  const serviceSource = await readFile(new URL("./analyzeNotice.js", import.meta.url), "utf8");
  assert.match(serviceSource, /Put every renewal condition in applicationSteps as a separate step/u);
  assert.match(serviceSource, /National e-Scholarship Portal/u);
  assert.match(serviceSource, /inspect page 6 specifically/u);
  assert.match(serviceSource, /successful completion of the first\/previous academic year/u);
  assert.match(serviceSource, /good conduct, prescribed attendance/u);
  assert.match(serviceSource, /failure to get promoted and its forfeiture consequence/u);
  assert.match(serviceSource, /changing course and its forfeiture consequence/u);
  assert.match(serviceSource, /changing institution and its forfeiture consequence/u);

  const renewalQuotes = [
    "The student must successfully complete the first year.",
    "The student must maintain good conduct and prescribed attendance.",
    "Renewal must be submitted through the National e-Scholarship Portal.",
    "Failure to get promoted will result in forfeiture.",
    "Changing the course or institution will result in forfeiture."
  ];
  const sourceText = renewalQuotes.join(" ");
  const fact = (value, quote) => ({
    value,
    evidence: [{ quote, pageNumber: 6 }]
  });
  const notMentioned = { value: NOT_MENTIONED, evidence: [] };
  const coverage = Object.fromEntries([
    "applicationOpeningDate",
    "applicationClosingDate",
    "directApplicationPortalUrl",
    "institutionSpecificDocumentChecklist",
    "exactMeritCutoff"
  ].map((key) => [key, { status: "absent", detail: NOT_MENTIONED, evidence: [] }]));
  const analysis = {
    noticeTitle: notMentioned,
    issuingAuthority: notMentioned,
    summary: notMentioned,
    eligibilityCriteria: [notMentioned],
    requiredDocuments: [notMentioned],
    importantDates: [notMentioned],
    applicationSteps: renewalQuotes.map((quote, index) => fact(`Renewal — ${quote}`, quote)),
    officialLinks: [notMentioned],
    missingOrUnclearInformation: [],
    missingInformationCoverageReview: coverage
  };

  const publicAnalysis = groundAnalysis(analysis, [{ pageNumber: 6, text: sourceText }]);
  assert.equal(publicAnalysis.applicationSteps.length, renewalQuotes.length);
  assert.ok(publicAnalysis.applicationSteps.some((step) => /forfeiture/u.test(step.value)));
  assert.equal("missingInformationCoverageReview" in publicAnalysis, false);
});
