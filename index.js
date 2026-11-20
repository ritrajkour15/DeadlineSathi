
import dotenv from "dotenv";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import analyzeRouter from "./server/routes/analyze.js";

const currentFilePath = fileURLToPath(import.meta.url);
const projectRoot = path.dirname(currentFilePath);

dotenv.config({ path: path.join(projectRoot, ".env") });

const app = express();

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_request, response) => {
  response.status(200).json({
    status: "ok",
    message: "DeadlineSathi server is running."
  });
});

app.use("/api", analyzeRouter);

app.get(["/", "/index.html"], (_request, response) => {
  response.sendFile(path.join(projectRoot, "index.html"));
});

app.get("/style.css", (_request, response) => {
  response.sendFile(path.join(projectRoot, "style.css"));
});

app.get("/script.js", (_request, response) => {
  response.sendFile(path.join(projectRoot, "script.js"));
});

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

  return response.status(500).json({
    error: "The request could not be processed."
  });
});

app.use((_request, response) => {
  response.status(404).json({ error: "Not found" });
});

export default app;
