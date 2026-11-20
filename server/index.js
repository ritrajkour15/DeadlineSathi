import dotenv from "dotenv";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import analyzeRouter from "./routes/analyze.js";

// Find the project root so the server can load .env and serve the frontend.
const currentFilePath = fileURLToPath(import.meta.url);
const serverFolder = path.dirname(currentFilePath);
const projectRoot = path.resolve(serverFolder, "..");

// Load local server settings from the project root; secrets stay on the server.
dotenv.config({ path: path.join(projectRoot, ".env") });

const app = express();

// Do not advertise Express in the response headers.
app.disable("x-powered-by");

// Parse JSON requests, with a firm upper bound on the request body.
app.use(express.json({ limit: "1mb" }));

// Health check: confirms that the server is running.
app.get("/api/health", (_request, response) => {
  response.status(200).json({
    status: "ok",
    message: "DeadlineSathi server is running."
  });
});

// Stage 2 endpoint: validate extracted page text, but do not analyze it yet.
app.use("/api", analyzeRouter);

// Serve only the existing frontend files. Other project files stay inaccessible.
app.get(["/", "/index.html"], (_request, response) => {
  response.sendFile(path.join(projectRoot, "index.html"));
});

app.get("/style.css", (_request, response) => {
  response.sendFile(path.join(projectRoot, "style.css"));
});

app.get("/script.js", (_request, response) => {
  response.sendFile(path.join(projectRoot, "script.js"));
});

// Return safe parser errors without exposing request text or internal details.
app.use((error, _request, response, _next) => {
  if (error.type === "entity.too.large") {
    return response.status(413).json({
      error: "Request body is too large. The maximum JSON size is 1 MB."
    });
  }

  if (error.type === "entity.parse.failed") {
    return response.status(400).json({
      error: "Request body must contain valid JSON."
    });
  }

  if (error.type === "charset.unsupported" || error.type === "encoding.unsupported") {
    return response.status(415).json({
      error: "The request encoding is not supported."
    });
  }

  return response.status(500).json({
    error: "The request could not be processed."
  });
});

// Unknown paths return a simple 404 instead of exposing files from disk.
app.use((_request, response) => {
  response.status(404).json({ error: "Not found" });
});

const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || "127.0.0.1";

app.listen(port, host, () => {
  console.log(`DeadlineSathi is running at http://${host}:${port}`);
});
