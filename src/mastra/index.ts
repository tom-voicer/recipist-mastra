import { Mastra } from "@mastra/core/mastra";
import { PinoLogger } from "@mastra/loggers";
import { LibSQLStore } from "@mastra/libsql";
import { recipeExtractorWorkflow } from "./workflows/recipe-extractor-workflow";
import { recipeExtractionAgent, imageExtractionAgent } from "./agents";
import {
  healthCheckHandler,
  recipeExtractorHandler,
} from "../handlers/api-handlers";

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
  server: {
    port: 4111,
    timeout: 60000,
    cors: {
      origin: "*", // Allow all origins for development - restrict in production
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
      credentials: false,
    },
    middleware: [
      // Request logging middleware
      async (c, next) => {
        const start = Date.now();
        console.log(`→ ${c.req.method} ${c.req.path}`);
        await next();
        const end = Date.now();
        console.log(
          `← ${c.req.method} ${c.req.path} - ${c.res.status} (${end - start}ms)`
        );
      },
      // Error handling middleware
      async (c, next) => {
        try {
          await next();
        } catch (error) {
          console.error("API Error:", error);
          return c.json(
            {
              error: "Internal Server Error",
              message: error instanceof Error ? error.message : "Unknown error",
            },
            500
          );
        }
      },
    ],
    apiRoutes: [
      {
        path: "/api/recipe-extractor",
        method: "POST",
        handler: (c) => recipeExtractorHandler(c, mastra),
      },
      {
        path: "/api/health",
        method: "GET",
        handler: (c) => healthCheckHandler(c),
      },
    ],
  },
});
