# DeadlineSathi

### From Notice to Action. Never Miss What Matters.

DeadlineSathi is an AI-powered scholarship and admission notice assistant designed to help Indian students understand complex official notices and turn them into simple, actionable guidance.

Instead of struggling with lengthy PDFs and formal language, students can upload a notice and receive an organized breakdown of important information.

## The Problem

Students often struggle to understand lengthy scholarship and admission notifications. Important information about eligibility, required documents, application deadlines, and procedures can be difficult to identify.

As a result, students may miss opportunities simply because they cannot easily understand or track the information provided in official notices.

## The Solution

DeadlineSathi simplifies this process by allowing students to upload a PDF notice and receive AI-generated, structured guidance in plain language.

It helps students understand what they need, what they are eligible for, and what actions they should take next.

## Key Features

- **PDF Upload:** Upload scholarship and admission notices in PDF format.
- **AI-Powered Analysis:** Convert complex notice content into easy-to-understand explanations.
- **Eligibility Information:** Identify eligibility requirements from the notice.
- **Document Checklist:** Extract important documents and certificates mentioned in the notice.
- **Important Dates:** Highlight application dates and other important deadlines when specified.
- **Action Steps:** Organize application procedures into actionable steps.
- **Evidence and Page References:** Show supporting information with references to the original notice pages.
- **Missing Information Detection:** Highlight information that is missing, unclear, or not specified in the notice.

## How It Works

1. Open DeadlineSathi.
2. Upload a scholarship or admission notice in PDF format.
3. The application extracts text from the PDF.
4. The extracted content is sent to the backend for AI analysis.
5. The AI organizes the information into structured sections.
6. Review the summary, eligibility, documents, dates, action steps, and missing information.

## Technology Stack

**Frontend**
- HTML5
- CSS3
- JavaScript
- PDF.js

**Backend**
- Node.js
- Express.js

**AI Integration**
- OpenAI API
- Structured Outputs

**Development Tools**
- Visual Studio Code
- Git
- GitHub

## Getting Started

### Prerequisites

- Node.js version 22 or higher
- npm
- An OpenAI API key

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/ritrajkour15/DeadlineSathi.git
```

**2. Navigate to the project directory**

```bash
cd DeadlineSathi
```

**3. Install dependencies**

```bash
npm install
```

**4. Configure environment variables**

Create your local `.env` file by copying the example:

For Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Add your OpenAI API key and model configuration to `.env`:

```env
PORT=3000
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=your_openai_model
```

Replace the placeholder values with your own configuration.

**Important:** Never share or upload your `.env` file or API key to GitHub.

**5. Start the application**

```bash
npm start
```

For development with automatic server restarting:

```bash
npm run dev
```

**6. Open the application**

Visit:

http://127.0.0.1:3000

### Health Check

The backend health endpoint is available at:

```text
http://127.0.0.1:3000/api/health
```

## Project Structure

```text
DeadlineSathi/
│
├── index.html
├── style.css
├── script.js
├── package.json
├── package-lock.json
├── .env.example
├── .gitignore
│
└── server/
    ├── index.js
    ├── routes/
    │   └── analyze.js
    ├── schemas/
    │   └── analysisSchema.js
    └── services/
        ├── analyzeNotice.js
        └── analyzeNotice.test.js
```

## Current Limitations

- The application currently extracts text from PDFs; scanned or image-only PDFs may not be supported.
- Analysis depends on the availability of the configured AI service.
- AI-generated information should always be checked against the original official notice.
- Missing or unclear information is identified where possible; DeadlineSathi does not replace official institutional guidance.

## Future Scope

- **Eligibility Checker:** Help students compare their profiles with scholarship requirements.
- **Deadline Radar:** Track important application deadlines.
- **Ask the Notice:** Allow students to ask questions about uploaded notices.
- **More Document Support:** Expand support for different types of official documents.
- **Personalized Guidance:** Provide more tailored application guidance.

## Project Information

**Project Name:** DeadlineSathi

**Category:** AI-Powered EdTech

**Tagline:** From Notice to Action. Never Miss What Matters.

**GitHub Repository:** https://github.com/ritrajkour15/DeadlineSathi

---

*DeadlineSathi aims to make important educational opportunities easier to understand and act upon.*