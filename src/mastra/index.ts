import { Mastra } from "@mastra/core/mastra";
import { PinoLogger } from "@mastra/loggers";
import { LibSQLStore } from "@mastra/libsql";
import { recipeExtractorWorkflow } from "./workflows/recipe-extractor-workflow";
import { recipeExtractionAgent, imageExtractionAgent } from "./agents";

export const mastra = new Mastra({
  workflows: { recipeExtractorWorkflow },
  agents: {
    "recipe-extractor": recipeExtractionAgent,
    "image-extractor": imageExtractionAgent,
  },
  storage: new LibSQLStore({
    // stores telemetry, evals, ... into memory storage, if it needs to persist, change to file:../mastra.db
    url: ":memory:",
  }),
  logger: new PinoLogger({
    name: "Mastra",
    level: "info",
  }),
});
