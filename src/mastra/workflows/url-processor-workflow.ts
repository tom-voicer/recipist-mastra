import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { cleanHtml } from "../../utils/htmlCleaner";
import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";

// Create the recipe extraction agent
const recipeExtractionAgent = new Agent({
  name: "recipe-extractor",
  description:
    "Extracts recipe data from markdown content and filters out noise",
  instructions: `You are a recipe extraction specialist. Your task is to:
1. Analyze the provided markdown content for recipe information
2. If you find a recipe, extract ONLY the recipe data including: title, ingredients, instructions, cooking time, servings, etc.
3. Remove all website noise like advertisements, navigation, comments, related articles, etc.
4. Format the recipe in a clean, structured markdown format
5. If no recipe is found in the content, respond with exactly: "this is not a recipe"

Focus only on the actual recipe content and ignore everything else on the page.`,
  model: openai("gpt-4o-mini"),
});

// Function to check if a string is a valid URL
function isValidUrl(input: string): boolean {
  try {
    new URL(input);
    return true;
  } catch {
    return false;
  }
}

// Step to check URL and fetch HTML content if valid
const processUrlStep = createStep({
  id: "process-url",
  description:
    "Checks if input is a valid URL and fetches HTML content if it is",
  inputSchema: z.object({
    input: z.string().describe("The string input to check if it is a URL"),
  }),
  outputSchema: z.object({
    result: z.string().describe("Either the HTML content or error message"),
    isUrl: z.boolean().describe("Whether the input was a valid URL"),
  }),
  execute: async ({ inputData }) => {
    if (!inputData?.input) {
      throw new Error("Input data not found");
    }

    const { input } = inputData;

    // Check if the input is a valid URL
    if (!isValidUrl(input)) {
      return {
        result: "this is not a url",
        isUrl: false,
      };
    }

    try {
      // Fetch the HTML content from the URL
      const response = await fetch(input);

      if (!response.ok) {
        return {
          result: `Failed to fetch URL: ${response.status} ${response.statusText}`,
          isUrl: true,
        };
      }

      const htmlContent = await response.text();

      return {
        result: htmlContent,
        isUrl: true,
      };
    } catch (error) {
      return {
        result: `Error fetching URL: ${error instanceof Error ? error.message : "Unknown error"}`,
        isUrl: true,
      };
    }
  },
});

// Step to clean HTML and convert to markdown
const cleanAndConvertStep = createStep({
  id: "clean-and-convert",
  description: "Cleans HTML content and converts it to markdown format",
  inputSchema: z.object({
    htmlContent: z.string().describe("The HTML content to clean and convert"),
    isUrl: z.boolean().describe("Whether the original input was a valid URL"),
  }),
  outputSchema: z.object({
    result: z
      .string()
      .describe("Either the cleaned markdown content or error message"),
    cleanedContent: z
      .string()
      .optional()
      .describe("The cleaned and converted markdown content"),
    isUrl: z.boolean().describe("Whether the original input was a valid URL"),
  }),
  execute: async ({ inputData }) => {
    if (!inputData?.htmlContent || !inputData?.isUrl) {
      return {
        result: inputData?.htmlContent || "No content to process",
        isUrl: inputData?.isUrl || false,
      };
    }

    const { htmlContent, isUrl } = inputData;

    // Only process if it was a valid URL
    if (!isUrl) {
      return {
        result: htmlContent,
        isUrl: false,
      };
    }

    try {
      // Clean HTML and convert to markdown
      const cleanedContent = cleanHtml(htmlContent, {
        removeAttributes: true,
        removeEmptyElements: true,
        normalizeWhitespace: true,
        removeComments: true,
        convertToMarkdown: true,
      });

      return {
        result: cleanedContent,
        cleanedContent: cleanedContent,
        isUrl: true,
      };
    } catch (error) {
      return {
        result: `Error cleaning HTML: ${error instanceof Error ? error.message : "Unknown error"}`,
        isUrl: true,
      };
    }
  },
});

// Step to extract recipe data using AI/LLM
const recipeExtractionStep = createStep({
  id: "recipe-extraction",
  description:
    "Extracts recipe data from markdown content using AI, filtering out noise",
  inputSchema: z.object({
    result: z.string().describe("The markdown content to analyze for recipes"),
    cleanedContent: z
      .string()
      .optional()
      .describe("The cleaned and converted markdown content"),
    isUrl: z.boolean().describe("Whether the original input was a valid URL"),
  }),
  outputSchema: z.object({
    result: z
      .string()
      .describe("Either the extracted recipe data or 'this is not a recipe'"),
    recipeData: z
      .string()
      .optional()
      .describe("The extracted recipe data if found"),
    isUrl: z.boolean().describe("Whether the original input was a valid URL"),
    isRecipe: z.boolean().describe("Whether recipe data was found"),
  }),
  execute: async ({ inputData, mastra }) => {
    if (!inputData?.isUrl || !inputData?.cleanedContent) {
      return {
        result: inputData?.result || "No content to process",
        isUrl: inputData?.isUrl || false,
        isRecipe: false,
      };
    }

    const { cleanedContent } = inputData;

    try {
      // Get the recipe extraction agent from the mastra instance
      const agent = mastra?.getAgent("recipe-extractor");
      if (!agent) {
        throw new Error("Recipe extraction agent not found");
      }

      // Create prompt for the AI agent
      const prompt = `Please analyze the following markdown content and extract any recipe information. Remove all website noise and focus only on the recipe data:

${cleanedContent}`;

      // Generate response from the agent
      const response = await agent.generate([
        { role: "user", content: prompt },
      ]);

      const extractedContent = response.text.trim();
      const isRecipe = extractedContent !== "this is not a recipe";

      return {
        result: extractedContent,
        recipeData: isRecipe ? extractedContent : undefined,
        isUrl: true,
        isRecipe,
      };
    } catch (error) {
      return {
        result: `Error extracting recipe: ${error instanceof Error ? error.message : "Unknown error"}`,
        isUrl: true,
        isRecipe: false,
      };
    }
  },
});

// Create the URL processor workflow
const urlProcessorWorkflow = createWorkflow({
  id: "url-processor-workflow",
  inputSchema: z.object({
    input: z.string().describe("The string input to check if it is a URL"),
  }),
  outputSchema: z.object({
    result: z
      .string()
      .describe(
        "Either the extracted recipe data or 'this is not a recipe' or error message"
      ),
    recipeData: z
      .string()
      .optional()
      .describe("The extracted recipe data if found"),
    isUrl: z.boolean().describe("Whether the input was a valid URL"),
    isRecipe: z.boolean().describe("Whether recipe data was found"),
  }),
})
  .then(processUrlStep)
  .map(async ({ inputData }) => ({
    htmlContent: inputData.result,
    isUrl: inputData.isUrl,
  }))
  .then(cleanAndConvertStep)
  .map(async ({ inputData }) => ({
    result: inputData.result,
    cleanedContent: inputData.cleanedContent,
    isUrl: inputData.isUrl,
  }))
  .then(recipeExtractionStep);

urlProcessorWorkflow.commit();

export { urlProcessorWorkflow, recipeExtractionAgent };
