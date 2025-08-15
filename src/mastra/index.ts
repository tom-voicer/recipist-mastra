import { Mastra } from "@mastra/core/mastra";
import { PinoLogger } from "@mastra/loggers";
import { LibSQLStore } from "@mastra/libsql";
import { recipeExtractorWorkflow } from "./workflows/recipe-extractor-workflow";
import { recipeExtractionAgent, imageExtractionAgent } from "./agents";

// API Route interface for type safety
interface RecipeExtractorRequest {
  url: string; // Required: The URL to extract recipe from
  language?: string; // Optional: Target language (e.g., "Spanish", "French")
  weightUnit?: string; // Optional: Weight unit (e.g., "grams", "ounces", "kg")
  lengthUnit?: string; // Optional: Length unit (e.g., "cm", "inches")
  liquidUnit?: string; // Optional: Liquid unit (e.g., "ml", "cups", "liters")
  temperatureUnit?: string; // Optional: Temperature unit (e.g., "celsius", "fahrenheit")
}

// Helper function to construct units string from individual unit parameters
function constructUnitsString(req: RecipeExtractorRequest): string | undefined {
  const units: string[] = [];

  if (req.weightUnit) units.push(req.weightUnit);
  if (req.liquidUnit) units.push(req.liquidUnit);
  if (req.lengthUnit) units.push(req.lengthUnit);
  if (req.temperatureUnit) units.push(req.temperatureUnit);

  return units.length > 0 ? units.join(" ") : undefined;
}

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
        handler: async (c) => {
          try {
            const body = (await c.req.json()) as RecipeExtractorRequest;

            // Validate required fields
            if (!body.url) {
              return c.json({ error: "Missing required field: url" }, 400);
            }

            // Construct workflow input
            const workflowInput = {
              input: body.url,
              language: body.language,
              units: constructUnitsString(body),
            };

            console.log(
              "Running recipe-extractor-workflow with input:",
              workflowInput
            );

            // Execute the workflow
            const workflow = mastra.getWorkflow("recipeExtractorWorkflow");
            if (!workflow) {
              throw new Error("Recipe extractor workflow not found");
            }

            const run = await workflow.createRun();
            const result = await run.start({
              inputData: workflowInput,
            });

            return c.json({
              success: true,
              data: result,
            });
          } catch (error) {
            console.error("Recipe extraction error:", error);
            return c.json(
              {
                error: "Failed to extract recipe",
                message:
                  error instanceof Error ? error.message : "Unknown error",
              },
              500
            );
          }
        },
      },
      {
        path: "/api/health",
        method: "GET",
        handler: async (c) => {
          return c.json({
            status: "healthy",
            timestamp: new Date().toISOString(),
            version: "1.0.0",
          });
        },
      },
    ],
  },
});
