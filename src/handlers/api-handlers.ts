import { Context } from "hono";
import { RecipeExtractorRequest } from "../types/recipe-extractor-types";
import { constructUnitsString } from "../utils/unitsUtils";
import { authenticateRequest } from "../utils/authUtils";
import { Mastra } from "@mastra/core";

/**
 * Handler for the recipe extractor workflow
 * @param c - The context object
 * @returns The result of the workflow
 */
export async function recipeExtractorHandler(c: Context, mastra: Mastra) {
  try {
    // Extract and verify authentication token
    const authHeader = c.req.header("Authorization");
    const user = await authenticateRequest(authHeader);

    if (!user) {
      return c.json(
        { error: "Unauthorized: Invalid or missing authentication token" },
        401
      );
    }

    console.log(`Authenticated user: ${user.email} (ID: ${user.id})`);

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

    console.log("Running recipe-extractor-workflow with input:", workflowInput);

    // Execute the workflow
    const workflow = mastra.getWorkflow("recipeExtractorWorkflow");
    if (!workflow) {
      throw new Error("Recipe extractor workflow not found");
    }

    const run = await workflow.createRunAsync();
    const result = await run.start({
      inputData: workflowInput,
    });

    return c.json({
      success: true,
      data: result,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Recipe extraction error:", error);
    return c.json(
      {
        error: "Failed to extract recipe",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
}

/**
 * Handler for the health check endpoint
 * @param c - The context object
 * @returns The result of the health check
 */
export async function healthCheckHandler(c: Context) {
  return c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
}
