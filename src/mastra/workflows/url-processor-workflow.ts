import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { cleanHtml } from "../../utils/htmlCleaner";
import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";

// Create the recipe extraction agent
const recipeExtractionAgent = new Agent({
  name: "recipe-extractor",
  description:
    "Extracts recipe data from markdown content, filters out noise, converts language and units",
  instructions: `You are a recipe extraction specialist. Your task is to:
1. Analyze the provided markdown content for recipe information
2. If you find a recipe, extract ONLY the recipe data including: title, ingredients, instructions, cooking time, servings, etc.
3. Remove all website noise like advertisements, navigation, comments, related articles, etc.
4. Convert the recipe to the specified language if provided (translate all text including title, ingredients, and instructions)
5. Convert ingredient measurements to the specified units if provided (e.g., convert cups to grams, tablespoons to milliliters, etc.)
6. Format the recipe in a clean, structured markdown format
7. If no recipe is found in the content, respond with exactly: "this is not a recipe"

SERVING INFORMATION REQUIREMENTS:
- ALWAYS include serving information at the top of the recipe (after the title)
- Include "**Serves:** X people" where X is the number of people the recipe serves
- If the recipe makes individual items (like cupcakes, muffins, cookies, etc.), also include "**Makes:** X items" where X is the number of individual pieces
- If serving information is not available in the source, make a reasonable estimate based on ingredient quantities
- Examples:
  - "**Serves:** 4 people"
  - "**Makes:** 12 cupcakes"
  - "**Serves:** 6 people | **Makes:** 24 cookies"

IMPORTANT INSTRUCTIONS:
- If a target language is specified, translate ALL text in the recipe to that language
- If target units are specified, convert ALL measurements in ingredients to those units (use appropriate conversion factors)
- Maintain the original recipe structure and formatting
- Focus only on the actual recipe content and ignore everything else on the page
- Be accurate with unit conversions (e.g., 1 cup flour ≈ 120g, 1 tablespoon ≈ 15ml)
- ALWAYS include serving information even if you need to estimate it`,
  model: openai("gpt-4.1"),
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
    language: z
      .string()
      .optional()
      .describe("Target language for recipe translation"),
    units: z
      .string()
      .optional()
      .describe("Target measurement units for ingredients"),
  }),
  outputSchema: z.object({
    result: z.string().describe("Either the HTML content or error message"),
    isUrl: z.boolean().describe("Whether the input was a valid URL"),
    language: z
      .string()
      .optional()
      .describe("Target language for recipe translation"),
    units: z
      .string()
      .optional()
      .describe("Target measurement units for ingredients"),
  }),
  execute: async ({ inputData }) => {
    if (!inputData?.input) {
      throw new Error("Input data not found");
    }

    const { input, language, units } = inputData;

    // Check if the input is a valid URL
    if (!isValidUrl(input)) {
      return {
        result: "this is not a url",
        isUrl: false,
        language,
        units,
      };
    }

    try {
      // Fetch the HTML content from the URL
      const response = await fetch(input);

      if (!response.ok) {
        return {
          result: `Failed to fetch URL: ${response.status} ${response.statusText}`,
          isUrl: true,
          language,
          units,
        };
      }

      const htmlContent = await response.text();

      return {
        result: htmlContent,
        isUrl: true,
        language,
        units,
      };
    } catch (error) {
      return {
        result: `Error fetching URL: ${error instanceof Error ? error.message : "Unknown error"}`,
        isUrl: true,
        language,
        units,
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
    language: z
      .string()
      .optional()
      .describe("Target language for recipe translation"),
    units: z
      .string()
      .optional()
      .describe("Target measurement units for ingredients"),
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
    language: z
      .string()
      .optional()
      .describe("Target language for recipe translation"),
    units: z
      .string()
      .optional()
      .describe("Target measurement units for ingredients"),
  }),
  execute: async ({ inputData }) => {
    if (!inputData?.htmlContent || !inputData?.isUrl) {
      return {
        result: inputData?.htmlContent || "No content to process",
        isUrl: inputData?.isUrl || false,
        language: inputData?.language,
        units: inputData?.units,
      };
    }

    const { htmlContent, isUrl, language, units } = inputData;

    // Only process if it was a valid URL
    if (!isUrl) {
      return {
        result: htmlContent,
        isUrl: false,
        language,
        units,
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
        language,
        units,
      };
    } catch (error) {
      return {
        result: `Error cleaning HTML: ${error instanceof Error ? error.message : "Unknown error"}`,
        isUrl: true,
        language,
        units,
      };
    }
  },
});

// Step to extract recipe data using AI/LLM
const recipeExtractionStep = createStep({
  id: "recipe-extraction",
  description:
    "Extracts recipe data from markdown content using AI, filtering out noise, converting language and units",
  inputSchema: z.object({
    result: z.string().describe("The markdown content to analyze for recipes"),
    cleanedContent: z
      .string()
      .optional()
      .describe("The cleaned and converted markdown content"),
    isUrl: z.boolean().describe("Whether the original input was a valid URL"),
    language: z
      .string()
      .optional()
      .describe("Target language for recipe translation"),
    units: z
      .string()
      .optional()
      .describe("Target measurement units for ingredients"),
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
    language: z
      .string()
      .optional()
      .describe("Target language used for recipe translation"),
    units: z
      .string()
      .optional()
      .describe("Target measurement units used for ingredients"),
  }),
  execute: async ({ inputData, mastra }) => {
    if (!inputData?.isUrl || !inputData?.cleanedContent) {
      return {
        result: inputData?.result || "No content to process",
        isUrl: inputData?.isUrl || false,
        isRecipe: false,
        language: inputData?.language,
        units: inputData?.units,
      };
    }

    const { cleanedContent, language, units } = inputData;

    try {
      // Get the recipe extraction agent from the mastra instance
      const agent = mastra?.getAgent("recipe-extractor");
      if (!agent) {
        throw new Error("Recipe extraction agent not found");
      }

      // Build the prompt with language and units instructions
      let prompt = `Please analyze the following markdown content and extract any recipe information. Remove all website noise and focus only on the recipe data:

${cleanedContent}`;

      // Add language conversion instruction if specified
      if (language) {
        prompt += `\n\nIMPORTANT: Please translate the entire recipe (title, ingredients, instructions, and all text) to ${language}.`;
      }

      // Add units conversion instruction if specified
      if (units) {
        prompt += `\n\nIMPORTANT: Please convert all ingredient measurements to ${units} units. Use accurate conversion factors (e.g., 1 cup flour ≈ 120g, 1 tablespoon ≈ 15ml).`;
      }

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
        language,
        units,
      };
    } catch (error) {
      return {
        result: `Error extracting recipe: ${error instanceof Error ? error.message : "Unknown error"}`,
        isUrl: true,
        isRecipe: false,
        language,
        units,
      };
    }
  },
});

// Create the URL processor workflow
const urlProcessorWorkflow = createWorkflow({
  id: "url-processor-workflow",
  inputSchema: z.object({
    input: z.string().describe("The string input to check if it is a URL"),
    language: z
      .string()
      .optional()
      .describe(
        "Target language for recipe translation (e.g., 'Spanish', 'French', 'German')"
      ),
    units: z
      .string()
      .optional()
      .describe(
        "Target measurement units for ingredients (e.g., 'metric', 'imperial', 'grams/liters')"
      ),
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
    language: z
      .string()
      .optional()
      .describe("Target language used for recipe translation"),
    units: z
      .string()
      .optional()
      .describe("Target measurement units used for ingredients"),
  }),
})
  .then(processUrlStep)
  .map(async ({ inputData }) => ({
    htmlContent: inputData.result,
    isUrl: inputData.isUrl,
    // Pass through language and units from previous step
    language: inputData.language,
    units: inputData.units,
  }))
  .then(cleanAndConvertStep)
  .map(async ({ inputData }) => ({
    result: inputData.result,
    cleanedContent: inputData.cleanedContent,
    isUrl: inputData.isUrl,
    // Pass through language and units to recipe extraction
    language: inputData.language,
    units: inputData.units,
  }))
  .then(recipeExtractionStep);

urlProcessorWorkflow.commit();

export { urlProcessorWorkflow, recipeExtractionAgent };
