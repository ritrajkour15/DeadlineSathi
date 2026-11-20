import express from "express";
import { randomUUID } from "node:crypto";
import { analyzeNotice, AnalysisServiceError } from "../services/analyzeNotice.js";

const router = express.Router();

const MAX_PAGE_COUNT = 100;
// Keep a buffer for prompt and response tokens. Oversize input is rejected, never truncated.
const MAX_TOTAL_TEXT_CHARACTERS = 80_000;
const MAX_PAGE_TEXT_CHARACTERS = 100_000;

router.post("/analyze", async (request, response) => {
  const requestStartedAt = Date.now();
  const diagnosticRequestId = randomUUID();

  // A close before `finish` means the client disconnected before receiving a
  // complete response. Log only timing and an opaque request ID.
  response.on("close", () => {
    if (!response.writableFinished) {
      console.warn(JSON.stringify({
        event: "analyze_client_disconnected",
        requestId: diagnosticRequestId,
        requestDurationMs: Date.now() - requestStartedAt
      }));
    }
  });

  if (!request.is("application/json")) {
    return response.status(415).json({
      error: "Content-Type must be application/json."
    });
  }

  const body = request.body;

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return response.status(400).json({
      error: "Request body must be a JSON object containing a pages array."
    });
  }

  if (!Array.isArray(body.pages) || body.pages.length === 0) {
    return response.status(400).json({
      error: "The pages field must be a non-empty array."
    });
  }

  if (body.pages.length > MAX_PAGE_COUNT) {
    return response.status(413).json({
      error: `A maximum of ${MAX_PAGE_COUNT} pages is allowed per request.`
    });
  }

  const seenPageNumbers = new Set();
  let totalTextCharacters = 0;

  for (let index = 0; index < body.pages.length; index += 1) {
    const page = body.pages[index];

    if (!page || typeof page !== "object" || Array.isArray(page)) {
      return response.status(400).json({
        error: `Page entry ${index + 1} must be an object.`
      });
    }

    if (!Number.isSafeInteger(page.pageNumber) || page.pageNumber < 1) {
      return response.status(400).json({
        error: `Page entry ${index + 1} must have a positive integer pageNumber.`
      });
    }

    if (seenPageNumbers.has(page.pageNumber)) {
      return response.status(400).json({
        error: `Page number ${page.pageNumber} appears more than once.`
      });
    }

    seenPageNumbers.add(page.pageNumber);

    if (typeof page.text !== "string" || page.text.trim().length === 0) {
      return response.status(400).json({
        error: `Page ${page.pageNumber} must contain non-empty text.`
      });
    }

    if (page.text.length > MAX_PAGE_TEXT_CHARACTERS) {
      return response.status(413).json({
        error: `Text for page ${page.pageNumber} exceeds the per-page size limit.`
      });
    }

    totalTextCharacters += page.text.length;
  }

  if (totalTextCharacters > MAX_TOTAL_TEXT_CHARACTERS) {
    return response.status(413).json({
      error: "This notice is too long for one analysis request. It was not sent to the AI service or truncated; please use a shorter notice."
    });
  }

  try {
    const result = await analyzeNotice(body.pages);
    return response.status(200).json({ status: "ok", ...result });
  } catch (error) {
    const safeDiagnostics = error instanceof AnalysisServiceError ? error.diagnostics : {};
    const errorClass = typeof safeDiagnostics.errorClass === "string"
      ? safeDiagnostics.errorClass
      : (typeof error?.constructor?.name === "string" && /^[a-zA-Z0-9_]{1,80}$/u.test(error.constructor.name)
        ? error.constructor.name
        : "UnknownError");
    const errorCode = typeof safeDiagnostics.errorCode === "string"
      ? safeDiagnostics.errorCode
      : (typeof error?.code === "string" && /^[a-zA-Z0-9_.-]{1,80}$/u.test(error.code) ? error.code : null);
    const providerStatus = safeDiagnostics.providerStatus
      ?? (Number.isInteger(error?.status) && error.status >= 100 && error.status <= 599 ? error.status : null);
    const clientStatus = error instanceof AnalysisServiceError ? error.status : 502;
    const responseStatus = safeDiagnostics.responseStatus ?? null;
    const incompleteReason = safeDiagnostics.incompleteReason ?? null;
    const outputTokens = safeDiagnostics.outputTokens ?? null;
    const totalTokens = safeDiagnostics.totalTokens ?? null;

    // Do not log error.message, stack, headers, API credentials, or request data.
   console.error(JSON.stringify({
   event: "analyze_request_failed",
   requestId: diagnosticRequestId,
   errorClass,
   providerHttpStatus: providerStatus,
   responseHttpStatus: clientStatus,
   errorCode,
   responseStatus,
   incompleteReason,
   outputTokens,
   totalTokens,
   requestDurationMs: Date.now() - requestStartedAt
   }));

    if (error instanceof AnalysisServiceError) {
      return response.status(error.status).json({ error: error.publicMessage });
    }

    // Never send provider details, stack traces, API keys, or notice text to clients.
    return response.status(502).json({
      error: "The analysis service could not complete this request. Please try again later."
    });
  }
});

export default router;
