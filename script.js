// Keep the footer year current.
const yearElement = document.querySelector("#current-year");

if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}

// Open and close the mobile navigation menu.
const menuButton = document.querySelector(".menu-toggle");
const navigationLinks = document.querySelector("#nav-links");

function closeMenu() {
  if (!menuButton || !navigationLinks) return;

  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "Open navigation menu");
  navigationLinks.classList.remove("is-open");
}

if (menuButton && navigationLinks) {
  menuButton.addEventListener("click", () => {
    const isOpen = menuButton.getAttribute("aria-expanded") === "true";

    menuButton.setAttribute("aria-expanded", String(!isOpen));
    menuButton.setAttribute("aria-label", isOpen ? "Open navigation menu" : "Close navigation menu");
    navigationLinks.classList.toggle("is-open", !isOpen);
  });

  navigationLinks.addEventListener("click", (event) => {
    if (event.target.closest("a")) closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });
}

// Let the user select a PDF. The original file stays in the browser; extracted
// page text is sent to the backend only after the user requests analysis.
const noticeForm = document.querySelector("#notice-form");
const noticeInput = document.querySelector("#notice-file");
const dropArea = document.querySelector("#drop-area");
const selectedFile = document.querySelector("#selected-file");
const selectedFileName = document.querySelector("#selected-file-name");
const fileStatus = document.querySelector("#file-status");
const analyzeButton = document.querySelector("#analyze-button");
const removeFileButton = document.querySelector("#remove-file");
const extractionPanel = document.querySelector("#extraction-panel");
const extractionStatus = document.querySelector("#extraction-status");
const extractionMessage = document.querySelector("#extraction-message");
const extractionPagesCount = document.querySelector("#extraction-pages-count");
const extractedPages = document.querySelector("#extracted-pages");
const loadingSpinner = document.querySelector("#loading-spinner");
const analysisPanel = document.querySelector("#analysis-panel");
const analysisStatus = document.querySelector("#analysis-status");
const analysisContent = document.querySelector("#analysis-content");
const analyzeButtonLabel = document.querySelector("#analyze-button-label");
let validPdfSelected = false;
let isExtracting = false;
let fileValidationId = 0;
let extractedPageData = [];

// Use the same pinned PDF.js release for the library and its worker.
const PDFJS_VERSION = "6.5.438";
const PDFJS_MODULE_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.mjs`;
const PDFJS_WORKER_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.mjs`;
let pdfjsPromise;

function loadPdfJs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import(PDFJS_MODULE_URL)
      .then((pdfjsLib) => {
        pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
        return pdfjsLib;
      })
      .catch((error) => {
        pdfjsPromise = null;
        throw error;
      });
  }

  return pdfjsPromise;
}

function setFileStatus(message, type = "") {
  if (!fileStatus) return;

  fileStatus.textContent = message;
  fileStatus.className = `file-status ${type}`.trim();
}

function isPdfFile(file) {
  const hasPdfExtension = file.name.toLowerCase().endsWith(".pdf");
  const hasPdfMimeType = !file.type || file.type === "application/pdf";
  return hasPdfExtension && hasPdfMimeType;
}

async function handleSelectedFile(file) {
  if (!file || !selectedFile || !selectedFileName || !analyzeButton) return;
  if (isExtracting) return;

  const currentValidationId = ++fileValidationId;

  validPdfSelected = false;
  analyzeButton.disabled = true;
  selectedFile.hidden = false;
  selectedFileName.textContent = file.name;
  clearExtractionPreview();

  if (!isPdfFile(file)) {
    setFileStatus("Please choose a PDF file.", "error");
    return;
  }

  setFileStatus("Checking PDF file…");

  try {
    // A PDF starts with this marker near the beginning of its contents.
    const header = new TextDecoder().decode(await file.slice(0, 1024).arrayBuffer());

    if (currentValidationId !== fileValidationId) return;

    if (!header.includes("%PDF-")) {
      setFileStatus("This file doesn’t appear to be a valid PDF. Please choose another file.", "error");
      return;
    }

    validPdfSelected = true;
    analyzeButton.disabled = false;
    setFileStatus("PDF ready. Select Analyze Notice to continue.", "success");
  } catch {
    if (currentValidationId !== fileValidationId) return;
    setFileStatus("The file could not be checked. Please try another PDF.", "error");
  }
}

function resetSelectedFile() {
  if (!noticeInput || !selectedFile || !analyzeButton) return;
  if (isExtracting) return;

  fileValidationId += 1;
  noticeInput.value = "";
  selectedFile.hidden = true;
  validPdfSelected = false;
  analyzeButton.disabled = true;
  setFileStatus("");
  clearExtractionPreview();
}

function clearExtractionPreview() {
  extractedPageData = [];
  clearAnalysisResult();
  if (!extractionPanel || !extractionMessage || !extractedPages || !extractionPagesCount) return;

  extractionPanel.hidden = true;
  extractionMessage.textContent = "";
  extractionPagesCount.textContent = "";
  extractedPages.replaceChildren();
  extractionStatus?.classList.remove("is-error", "is-success");
  if (loadingSpinner) loadingSpinner.hidden = true;
}

function clearAnalysisResult() {
  if (!analysisPanel || !analysisStatus || !analysisContent) return;

  analysisPanel.hidden = true;
  analysisStatus.textContent = "";
  analysisStatus.className = "analysis-status";
  analysisContent.replaceChildren();
}

function setExtractionStatus(message, type = "", isLoading = false) {
  if (!extractionPanel || !extractionMessage) return;

  extractionPanel.hidden = false;
  extractionMessage.textContent = message;
  extractionStatus?.classList.toggle("is-error", type === "error");
  extractionStatus?.classList.toggle("is-success", type === "success");
  if (loadingSpinner) loadingSpinner.hidden = !isLoading;
}

function showPageText(pageNumber, pageText) {
  if (!extractedPages) return;

  const pageSection = document.createElement("section");
  pageSection.className = "extracted-page";

  const pageHeading = document.createElement("h4");
  pageHeading.textContent = `Page ${pageNumber}`;

  const pageParagraph = document.createElement("p");
  if (pageText) {
    pageParagraph.textContent = pageText;
  } else {
    pageParagraph.textContent = "No selectable text found on this page.";
    pageParagraph.classList.add("is-empty");
  }

  pageSection.append(pageHeading, pageParagraph);
  extractedPages.append(pageSection);
}

async function extractPdfText(file) {
  let loadingTask;
  let pdfDocument;

  if (!extractionPagesCount || !extractedPages) return;

  extractedPages.replaceChildren();
  extractionPagesCount.textContent = "";
  setExtractionStatus("Loading PDF tools…", "", true);

  try {
    const pdfjsLib = await loadPdfJs();
    const fileData = new Uint8Array(await file.arrayBuffer());

    // PDF data is passed directly to PDF.js in this browser; no upload request is made.
    loadingTask = pdfjsLib.getDocument({ data: fileData });
    pdfDocument = await loadingTask.promise;

    if (pdfDocument.numPages === 0) {
      setExtractionStatus("This PDF has no pages to extract.", "error");
      return;
    }

    extractionPagesCount.textContent = `${pdfDocument.numPages} ${pdfDocument.numPages === 1 ? "page" : "pages"}`;
    let pagesWithText = 0;
    const pages = [];

    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
      setExtractionStatus(`Extracting text from page ${pageNumber} of ${pdfDocument.numPages}…`, "", true);

      const page = await pdfDocument.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .filter((item) => typeof item.str === "string")
        .map((item) => `${item.str}${item.hasEOL ? "\n" : " "}`)
        .join("")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/[ \t]{2,}/g, " ")
        .trim();

      if (pageText) pagesWithText += 1;
      pages.push({ pageNumber, text: pageText });
      showPageText(pageNumber, pageText);
      page.cleanup();
    }

    if (pagesWithText === 0) {
      setExtractionStatus("No selectable text was found. This PDF may be scanned or image-based; OCR is not included, so its text cannot be extracted.", "error");
      return pages;
    } else {
      setExtractionStatus(`Text extracted from ${pagesWithText} of ${pdfDocument.numPages} pages.`, "success");
      return pages;
    }
  } catch (error) {
    const isPasswordError = error?.name === "PasswordException" || /password/i.test(error?.message || "");

    if (isPasswordError) {
      setExtractionStatus("This PDF is password-protected. Remove its password or choose an unlocked copy, then try again.", "error");
    } else if (error?.name === "InvalidPDFException") {
      setExtractionStatus("PDF.js could not read this document. The file may be damaged or use an unsupported PDF feature.", "error");
    } else {
      setExtractionStatus("Text extraction failed. Check your internet connection for the PDF.js library, then try another PDF.", "error");
    }
    return null;
  } finally {
    try {
      if (loadingTask) await loadingTask.destroy();
    } catch {
      // Cleanup errors should not replace the useful extraction result.
    }
  }
}

function makeTextElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  element.textContent = text;
  return element;
}

function renderEvidence(evidence) {
  const list = document.createElement("ul");
  list.className = "analysis-evidence";

  evidence.forEach((item) => {
    const entry = document.createElement("li");
    const quote = document.createElement("blockquote");
    quote.textContent = `“${item.quote}”`;
    const page = makeTextElement("span", "analysis-page-reference", `Page ${item.pageNumber}`);
    entry.append(quote, page);
    list.append(entry);
  });

  return list;
}

function renderFact(title, fact) {
  const card = document.createElement("article");
  card.className = "analysis-fact";
  card.append(makeTextElement("h4", "", title));
  card.append(makeTextElement("p", "analysis-value", fact.value));

  if (fact.evidence.length > 0) {
    card.append(renderEvidence(fact.evidence));
  }

  return card;
}

function renderFactSection(title, facts, emptyMessage = "No information was returned for this section.") {
  const section = document.createElement("section");
  section.className = "analysis-result-section";
  section.append(makeTextElement("h3", "analysis-section-title", title));

  if (facts.length === 0) {
    section.append(makeTextElement("p", "analysis-value", emptyMessage));
    return section;
  }

  const list = document.createElement("div");
  list.className = "analysis-fact-list";
  facts.forEach((fact, index) => {
    list.append(renderFact(facts.length === 1 ? title : `${title} ${index + 1}`, fact));
  });
  section.append(list);
  return section;
}

function displayAnalysis(analysis, disclaimer) {
  if (!analysisPanel || !analysisContent || !analysisStatus) return;

  analysisContent.replaceChildren();
  analysisStatus.textContent = "Analysis complete. Review the evidence and confirm details in the original notice.";
  analysisStatus.className = "analysis-status is-success";

  const singleFacts = [
    ["Notice title", analysis.noticeTitle],
    ["Issuing authority", analysis.issuingAuthority],
    ["Simple explanation", analysis.summary]
  ];
  singleFacts.forEach(([title, fact]) => {
    if (fact && typeof fact.value === "string" && Array.isArray(fact.evidence)) {
      analysisContent.append(renderFactSection(title, [fact]));
    }
  });

  const listSections = [
    ["Eligibility criteria", analysis.eligibilityCriteria],
    ["Required documents", analysis.requiredDocuments],
    ["Important dates and deadlines", analysis.importantDates],
    ["Application steps", analysis.applicationSteps],
    ["Official links mentioned", analysis.officialLinks],
    ["Missing or unclear information", analysis.missingOrUnclearInformation]
  ];

  listSections.forEach(([title, facts]) => {
    const validFacts = Array.isArray(facts)
      ? facts.filter((fact) => fact && typeof fact.value === "string" && Array.isArray(fact.evidence))
      : [];
    const emptyMessage = title === "Missing or unclear information"
      ? "No missing or unclear information was identified by the analysis."
      : undefined;
    analysisContent.append(renderFactSection(title, validFacts, emptyMessage));
  });

  const disclaimerBox = document.createElement("aside");
  disclaimerBox.className = "analysis-disclaimer";
  disclaimerBox.append(makeTextElement("strong", "", "Please note"));
  disclaimerBox.append(makeTextElement("p", "", disclaimer));
  analysisContent.append(disclaimerBox);
  analysisPanel.hidden = false;
  analysisPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function setAnalysisLoading(message) {
  if (!analysisPanel || !analysisStatus || !analysisContent) return;
  analysisPanel.hidden = false;
  analysisStatus.className = "analysis-status is-loading";
  analysisStatus.textContent = message;
  analysisContent.replaceChildren();
}

function showAnalysisError(message) {
  if (!analysisPanel || !analysisStatus || !analysisContent) return;
  analysisPanel.hidden = false;
  analysisStatus.className = "analysis-status is-error";
  analysisStatus.textContent = message;
  analysisContent.replaceChildren();
  analysisPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function requestAnalysis(pages) {
  let response;

  try {
    response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pages })
    });
  } catch {
    throw new Error("Could not connect to the DeadlineSathi server. Check that it is running, then try again.");
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("The server returned an unreadable response. Please try again.");
  }

  if (!response.ok) {
    throw new Error(typeof result.error === "string"
      ? result.error
      : "The notice could not be analyzed. Please try again.");
  }

  if (!result.analysis || typeof result.disclaimer !== "string") {
    throw new Error("The server response was incomplete. Please try again.");
  }

  return result;
}

if (noticeInput) {
  noticeInput.addEventListener("change", () => {
    handleSelectedFile(noticeInput.files[0]);
  });
}

if (removeFileButton) {
  removeFileButton.addEventListener("click", resetSelectedFile);
}

if (dropArea) {
  ["dragenter", "dragover"].forEach((eventName) => {
    dropArea.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropArea.classList.add("is-dragging");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropArea.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropArea.classList.remove("is-dragging");
    });
  });

  dropArea.addEventListener("drop", (event) => {
    if (isExtracting) return;
    const file = event.dataTransfer.files[0];
    handleSelectedFile(file);
  });
}

if (noticeForm) {
  noticeForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (isExtracting) return;

    if (!validPdfSelected || !noticeInput?.files[0]) {
      setFileStatus("Choose a valid PDF before continuing.", "error");
      return;
    }

    isExtracting = true;
    analyzeButton.disabled = true;
    analyzeButton.setAttribute("aria-busy", "true");
    if (analyzeButtonLabel) analyzeButtonLabel.textContent = "Preparing notice…";
    if (noticeInput) noticeInput.disabled = true;
    if (removeFileButton) removeFileButton.disabled = true;
    clearAnalysisResult();

    let analysisSucceeded = false;
    try {
      if (extractedPageData.length === 0) {
        setFileStatus("Extracting text locally in your browser…");
        const pages = await extractPdfText(noticeInput.files[0]);
        if (!pages) {
          setFileStatus("Text extraction failed. You can retry or choose another PDF.", "error");
          return;
        }
        extractedPageData = pages;
      }

      const pagesWithText = extractedPageData.filter((page) => page.text.trim().length > 0);
      if (pagesWithText.length === 0) {
        setFileStatus("No selectable text was found. Scanned PDFs need OCR, which is not available.", "error");
        return;
      }

      if (analyzeButtonLabel) analyzeButtonLabel.textContent = "Analyzing notice…";
      setFileStatus("Sending extracted text to DeadlineSathi for analysis…");
      setAnalysisLoading("Analyzing the notice. This may take a little while…");
      const result = await requestAnalysis(pagesWithText);
      displayAnalysis(result.analysis, result.disclaimer);
      analysisSucceeded = true;
    } catch (error) {
      showAnalysisError(error instanceof Error
        ? error.message
        : "The notice could not be analyzed. Please try again.");
    } finally {
      isExtracting = false;
      analyzeButton.removeAttribute("aria-busy");
      if (analyzeButtonLabel) analyzeButtonLabel.textContent = "Analyze Notice";
      if (noticeInput) noticeInput.disabled = false;
      if (removeFileButton) removeFileButton.disabled = false;
      analyzeButton.disabled = !validPdfSelected;
      if (analysisSucceeded) {
        setFileStatus("Analysis complete. Your extracted text is ready for review.", "success");
      } else if (extractedPageData.some((page) => page.text.trim())) {
        setFileStatus("PDF ready. Select Analyze Notice to retry.", "error");
      }
    }
  });
}
