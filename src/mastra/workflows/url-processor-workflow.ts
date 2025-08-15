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
6. Format the recipe in a clean, structured markdown format with structured metadata
7. If no recipe is found in the content, respond with exactly: "this is not a recipe"

OUTPUT FORMAT REQUIREMENTS:
You MUST start your response with a structured metadata section using this exact format:

---RECIPE_METADATA---
NAME: [Recipe Name]
TIME_MINUTES: [Total time in minutes as a number]
SERVES_PEOPLE: [Number of people served as a number]
MAKES_ITEMS: [Number of individual items made, or "N/A" if not applicable]
LANGUAGE: [Target language requested by user, or "N/A" if not specified]
UNITS_LENGTH: [Target length units requested by user, or "N/A" if not specified]
UNITS_LIQUID: [Target liquid units requested by user, or "N/A" if not specified]
UNITS_WEIGHT: [Target weight units requested by user, or "N/A" if not specified]
---END_METADATA---

Then follow with the full recipe in markdown format including:
- ALWAYS include serving information at the top of the recipe (after the title)
- Include "**Serves:** X people" where X is the number of people the recipe serves
- If the recipe makes individual items (like cupcakes, muffins, cookies, etc.), also include "**Makes:** X items" where X is the number of individual pieces
- If serving information is not available in the source, make a reasonable estimate based on ingredient quantities

METADATA EXTRACTION RULES:
- NAME: Extract the exact recipe title/name
- TIME_MINUTES: Total time including prep + cooking time in minutes (estimate if not specified)
- SERVES_PEOPLE: Number of people the recipe serves (estimate if not specified)
- MAKES_ITEMS: Number of individual items produced, or "N/A" if recipe doesn't make countable items
- LANGUAGE: The target language requested by the user for translation, or "N/A" if no specific language was requested
- UNITS_LENGTH: Target length units requested by the user (extract from units parameter), or "N/A" if not specified
- UNITS_LIQUID: Target liquid units requested by the user (extract from units parameter), or "N/A" if not specified  
- UNITS_WEIGHT: Target weight units requested by the user (extract from units parameter), or "N/A" if not specified

IMPORTANT INSTRUCTIONS:
- If a target language is specified, translate ALL text in the recipe to that language
- If target units are specified, convert ALL measurements in ingredients to those units (use appropriate conversion factors)
- Maintain the original recipe structure and formatting
- Focus only on the actual recipe content and ignore everything else on the page
- Be accurate with unit conversions (e.g., 1 cup flour ≈ 120g, 1 tablespoon ≈ 15ml)
- ALWAYS include serving information even if you need to estimate it
- ALWAYS provide the structured metadata section first`,
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

// Function to detect social media providers from URL
function detectSocialProvider(url: string): {
  isSocial: boolean;
  provider?: "tiktok" | "instagram" | "facebook" | "pinterest" | "x";
  displayName?: string;
} {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // Remove 'www.' prefix if present
    const cleanHostname = hostname.replace(/^www\./, "");

    // Check for each social provider
    if (cleanHostname.includes("tiktok.com")) {
      return { isSocial: true, provider: "tiktok", displayName: "TikTok" };
    }

    if (cleanHostname.includes("instagram.com")) {
      return {
        isSocial: true,
        provider: "instagram",
        displayName: "Instagram",
      };
    }

    if (
      cleanHostname.includes("facebook.com") ||
      cleanHostname.includes("fb.com")
    ) {
      return { isSocial: true, provider: "facebook", displayName: "Facebook" };
    }

    if (
      cleanHostname.includes("pinterest.com") ||
      cleanHostname.includes("pin.it")
    ) {
      return {
        isSocial: true,
        provider: "pinterest",
        displayName: "Pinterest",
      };
    }

    if (
      cleanHostname.includes("twitter.com") ||
      cleanHostname.includes("x.com") ||
      cleanHostname.includes("t.co")
    ) {
      return { isSocial: true, provider: "x", displayName: "X (Twitter)" };
    }

    return { isSocial: false };
  } catch {
    return { isSocial: false };
  }
}

// Function to parse user's units request into specific categories
function parseUnitsCategory(
  units: string,
  category: "length" | "liquid" | "weight"
): string | undefined {
  const unitsLower = units.toLowerCase();

  // Define common unit patterns for each category
  const unitPatterns = {
    length: [
      "cm",
      "centimeter",
      "inch",
      "inches",
      "mm",
      "millimeter",
      "meter",
      "metres",
      "feet",
      "ft",
    ],
    liquid: [
      "ml",
      "milliliter",
      "liter",
      "litre",
      "cup",
      "cups",
      "tablespoon",
      "tbsp",
      "teaspoon",
      "tsp",
      "fluid ounce",
      "fl oz",
      "pint",
      "quart",
      "gallon",
    ],
    weight: [
      "gram",
      "grams",
      "g",
      "kilogram",
      "kg",
      "ounce",
      "oz",
      "pound",
      "pounds",
      "lb",
      "lbs",
    ],
  };

  // Check if the units string contains any units from the requested category
  for (const unit of unitPatterns[category]) {
    if (unitsLower.includes(unit)) {
      return unit;
    }
  }

  // If specific category units not found, return general preference based on common patterns
  if (category === "length") {
    if (unitsLower.includes("metric")) return "cm";
    if (unitsLower.includes("imperial")) return "inch";
  } else if (category === "liquid") {
    if (unitsLower.includes("metric")) return "ml";
    if (unitsLower.includes("imperial")) return "cup";
  } else if (category === "weight") {
    if (unitsLower.includes("metric")) return "grams";
    if (unitsLower.includes("imperial")) return "ounces";
  }

  return undefined;
}

// Step to check if URL is from a social media provider
const socialProviderCheckStep = createStep({
  id: "social-provider-check",
  description:
    "Checks if the URL is from a social media provider and routes accordingly",
  inputSchema: z.object({
    input: z
      .string()
      .describe(
        "The string input to check if it is a URL from social provider"
      ),
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
    result: z.string().describe("Either routing instruction or error message"),
    isSocial: z.boolean().describe("Whether the URL is from a social provider"),
    provider: z
      .enum(["tiktok", "instagram", "facebook", "pinterest", "x"])
      .optional()
      .describe("The social media provider"),
    displayName: z
      .string()
      .optional()
      .describe("The display name of the social provider"),
    isUrl: z.boolean().describe("Whether the input was a valid URL"),
    originalUrl: z
      .string()
      .optional()
      .describe("The original URL that was processed"),
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
        isSocial: false,
        isUrl: false,
        originalUrl: undefined,
        language,
        units,
      };
    }

    // Check if URL is from a social provider
    const socialCheck = detectSocialProvider(input);

    if (socialCheck.isSocial) {
      return {
        result: "route_to_social",
        isSocial: true,
        provider: socialCheck.provider,
        displayName: socialCheck.displayName,
        isUrl: true,
        originalUrl: input,
        language,
        units,
      };
    }

    // Not a social provider, continue with normal flow
    return {
      result: "route_to_normal",
      isSocial: false,
      isUrl: true,
      originalUrl: input,
      language,
      units,
    };
  },
});

// Step to check URL and fetch HTML content if valid
const processUrlStep = createStep({
  id: "process-url",
  description: "Fetches HTML content from the URL",
  inputSchema: z.object({
    route: z
      .enum(["social", "normal", "error"])
      .describe("The processing route"),
    result: z.string().describe("Previous result"),
    isSocial: z.boolean().describe("Whether the URL is from a social provider"),
    provider: z.string().optional().describe("The social media provider name"),
    isUrl: z.boolean().describe("Whether the input was a valid URL"),
    originalUrl: z.string().optional().describe("The original URL"),
    language: z.string().optional().describe("Target language"),
    units: z.string().optional().describe("Target units"),
  }),
  outputSchema: z.object({
    route: z
      .enum(["social", "normal", "error"])
      .describe("The processing route"),
    result: z.string().describe("Success message or error"),
    htmlContent: z.string().optional().describe("The fetched HTML content"),
    isSocial: z.boolean().describe("Whether the URL is from a social provider"),
    provider: z.string().optional().describe("The social media provider name"),
    isUrl: z.boolean().describe("Whether the input was a valid URL"),
    originalUrl: z.string().optional().describe("The original URL"),
    language: z.string().optional(),
    units: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    if (!inputData) {
      throw new Error("Input data not found");
    }

    const {
      route,
      result,
      isSocial,
      provider,
      isUrl,
      originalUrl,
      language,
      units,
    } = inputData;

    // Skip HTML fetching for social providers and errors
    if (route === "social" || route === "error") {
      return {
        route,
        result,
        isSocial,
        provider,
        isUrl,
        originalUrl,
        language,
        units,
      };
    }

    // Only fetch HTML for normal route
    if (route === "normal" && originalUrl) {
      try {
        const response = await fetch(originalUrl);
        if (!response.ok) {
          return {
            route: "error" as const,
            result: `Failed to fetch URL: ${response.status} ${response.statusText}`,
            isSocial,
            provider,
            isUrl,
            originalUrl,
            language,
            units,
          };
        }

        const htmlContent = await response.text();
        return {
          route,
          result: "html_fetched",
          htmlContent,
          isSocial,
          provider,
          isUrl,
          originalUrl,
          language,
          units,
        };
      } catch (error) {
        return {
          route: "error" as const,
          result: `Error fetching URL: ${error instanceof Error ? error.message : "Unknown error"}`,
          isSocial,
          provider,
          isUrl,
          originalUrl,
          language,
          units,
        };
      }
    }

    // Fallback
    return {
      route: "error" as const,
      result: "Invalid state for HTML fetching",
      isSocial,
      provider,
      isUrl,
      originalUrl,
      language,
      units,
    };
  },
});

// Step to clean HTML and convert to markdown
const cleanAndConvertStep = createStep({
  id: "clean-and-convert",
  description: "Cleans HTML content and converts it to markdown format",
  inputSchema: z.object({
    route: z
      .enum(["social", "normal", "error"])
      .describe("The processing route"),
    result: z.string().describe("Previous result"),
    htmlContent: z.string().optional().describe("The HTML content to clean"),
    isSocial: z.boolean().describe("Whether the URL is from a social provider"),
    provider: z.string().optional().describe("The social media provider name"),
    isUrl: z.boolean().describe("Whether the input was a valid URL"),
    originalUrl: z.string().optional().describe("The original URL"),
    language: z.string().optional(),
    units: z.string().optional(),
  }),
  outputSchema: z.object({
    route: z
      .enum(["social", "normal", "error"])
      .describe("The processing route"),
    result: z.string().describe("Success message or error"),
    cleanedContent: z
      .string()
      .optional()
      .describe("The cleaned markdown content"),
    isSocial: z.boolean().describe("Whether the URL is from a social provider"),
    provider: z.string().optional().describe("The social media provider name"),
    isUrl: z.boolean().describe("Whether the input was a valid URL"),
    originalUrl: z.string().optional().describe("The original URL"),
    language: z.string().optional(),
    units: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    if (!inputData) {
      throw new Error("Input data not found");
    }

    const {
      route,
      result,
      htmlContent,
      isSocial,
      provider,
      isUrl,
      originalUrl,
      language,
      units,
    } = inputData;

    // Skip cleaning for social providers and errors
    if (route === "social" || route === "error") {
      return {
        route,
        result,
        isSocial,
        provider,
        isUrl,
        originalUrl,
        language,
        units,
      };
    }

    // Only clean HTML for normal route with HTML content
    if (route === "normal" && htmlContent) {
      try {
        const cleanedContent = cleanHtml(htmlContent, {
          removeAttributes: true,
          removeEmptyElements: true,
          normalizeWhitespace: true,
          removeComments: true,
          convertToMarkdown: true,
        });

        return {
          route,
          result: "html_cleaned",
          cleanedContent,
          isSocial,
          provider,
          isUrl,
          originalUrl,
          language,
          units,
        };
      } catch (error) {
        return {
          route: "error" as const,
          result: `Error cleaning HTML: ${error instanceof Error ? error.message : "Unknown error"}`,
          isSocial,
          provider,
          isUrl,
          originalUrl,
          language,
          units,
        };
      }
    }

    // Pass through if no HTML content
    return {
      route,
      result,
      isSocial,
      provider,
      isUrl,
      originalUrl,
      language,
      units,
    };
  },
});

// Step to extract recipe data using AI/LLM
const recipeExtractionStep = createStep({
  id: "recipe-extraction",
  description:
    "Extracts recipe data from markdown content using AI, filtering out noise, converting language and units",
  inputSchema: z.object({
    route: z
      .enum(["social", "normal", "error"])
      .describe("The processing route"),
    result: z.string().describe("Previous result"),
    cleanedContent: z
      .string()
      .optional()
      .describe("The markdown content to analyze"),
    isSocial: z.boolean().describe("Whether the URL is from a social provider"),
    provider: z.string().optional().describe("The social media provider name"),
    isUrl: z.boolean().describe("Whether the input was a valid URL"),
    originalUrl: z.string().optional().describe("The original URL"),
    language: z.string().optional(),
    units: z.string().optional(),
  }),
  outputSchema: z.object({
    route: z
      .enum(["social", "normal", "error"])
      .describe("The processing route"),
    result: z
      .string()
      .describe("Either the extracted recipe or 'this is not a recipe'"),
    recipeData: z
      .string()
      .optional()
      .describe("The extracted recipe data if found"),
    isRecipe: z.boolean().describe("Whether recipe data was found"),
    isSocial: z.boolean().describe("Whether the URL is from a social provider"),
    provider: z.string().optional().describe("The social media provider name"),
    isUrl: z.boolean().describe("Whether the input was a valid URL"),
    originalUrl: z.string().optional().describe("The original URL"),
    recipeName: z.string().optional().describe("The name/title of the recipe"),
    timeMinutes: z.number().optional().describe("Total time in minutes"),
    servesPeople: z.number().optional().describe("Number of people served"),
    makesItems: z.string().optional().describe("Number of items made"),
    recipeLanguage: z
      .string()
      .optional()
      .describe("The language used in the recipe"),
    unitsLength: z.string().optional().describe("Primary length units"),
    unitsLiquid: z.string().optional().describe("Primary liquid units"),
    unitsWeight: z.string().optional().describe("Primary weight units"),
    language: z.string().optional(),
    units: z.string().optional(),
  }),
  execute: async ({ inputData, mastra }) => {
    if (!inputData) {
      throw new Error("Input data not found");
    }

    const {
      route,
      result,
      cleanedContent,
      isSocial,
      provider,
      isUrl,
      originalUrl,
      language,
      units,
    } = inputData;

    // Skip recipe extraction for social providers and errors
    if (route === "social" || route === "error") {
      return {
        route,
        result,
        isRecipe: false,
        isSocial,
        provider,
        isUrl,
        originalUrl,
        language,
        units,
      };
    }

    // Only extract recipe for normal route with cleaned content
    if (route === "normal" && cleanedContent) {
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

        // Parse structured metadata if this is a recipe
        let recipeName: string | undefined;
        let timeMinutes: number | undefined;
        let servesPeople: number | undefined;
        let makesItems: string | undefined;
        let cleanedRecipeData = extractedContent;

        // Set user-requested parameters
        const recipeLanguage = language || undefined;
        const unitsLength = units
          ? parseUnitsCategory(units, "length")
          : undefined;
        const unitsLiquid = units
          ? parseUnitsCategory(units, "liquid")
          : undefined;
        const unitsWeight = units
          ? parseUnitsCategory(units, "weight")
          : undefined;

        if (isRecipe) {
          const metadataMatch = extractedContent.match(
            /---RECIPE_METADATA---([\s\S]*?)---END_METADATA---/
          );
          if (metadataMatch) {
            const metadataSection = metadataMatch[1];

            // Extract individual metadata fields (only recipe-specific data)
            const nameMatch = metadataSection.match(/NAME:\s*(.+)/);
            const timeMatch = metadataSection.match(/TIME_MINUTES:\s*(\d+)/);
            const servesMatch = metadataSection.match(/SERVES_PEOPLE:\s*(\d+)/);
            const makesMatch = metadataSection.match(/MAKES_ITEMS:\s*(.+)/);

            recipeName = nameMatch ? nameMatch[1].trim() : undefined;
            timeMinutes = timeMatch ? parseInt(timeMatch[1]) : undefined;
            servesPeople = servesMatch ? parseInt(servesMatch[1]) : undefined;
            makesItems = makesMatch ? makesMatch[1].trim() : undefined;

            // Remove metadata section from the recipe data
            cleanedRecipeData = extractedContent
              .replace(/---RECIPE_METADATA---[\s\S]*?---END_METADATA---\s*/, "")
              .trim();
          }
        }

        return {
          route,
          result: extractedContent,
          recipeData: isRecipe ? cleanedRecipeData : undefined,
          isRecipe,
          isSocial,
          provider,
          isUrl,
          originalUrl,
          recipeName,
          timeMinutes,
          servesPeople,
          makesItems,
          recipeLanguage,
          unitsLength,
          unitsLiquid,
          unitsWeight,
          language,
          units,
        };
      } catch (error) {
        return {
          route: "error" as const,
          result: `Error extracting recipe: ${error instanceof Error ? error.message : "Unknown error"}`,
          isRecipe: false,
          isSocial,
          provider,
          isUrl,
          originalUrl,
          language,
          units,
        };
      }
    }

    // Pass through if no cleaned content
    return {
      route,
      result,
      isRecipe: false,
      isSocial,
      provider,
      isUrl,
      originalUrl,
      language,
      units,
    };
  },
});

// Simple router step that just determines which path to take
const routerStep = createStep({
  id: "router",
  description:
    "Determines which processing path to take based on social provider check",
  inputSchema: z.object({
    result: z.string().describe("The routing instruction"),
    isSocial: z.boolean().describe("Whether the URL is from a social provider"),
    provider: z
      .enum(["tiktok", "instagram", "facebook", "pinterest", "x"])
      .optional()
      .describe("The social media provider"),
    displayName: z
      .string()
      .optional()
      .describe("The display name of the social provider"),
    isUrl: z.boolean().describe("Whether the input was a valid URL"),
    originalUrl: z
      .string()
      .optional()
      .describe("The original URL that was processed"),
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
    route: z
      .enum(["social", "normal", "error"])
      .describe("The processing route to take"),
    result: z.string().describe("Result message or routing decision"),
    isSocial: z.boolean().describe("Whether the URL is from a social provider"),
    provider: z.string().optional().describe("The social media provider name"),
    isUrl: z.boolean().describe("Whether the input was a valid URL"),
    originalUrl: z.string().optional().describe("The original URL"),
    language: z.string().optional().describe("Target language"),
    units: z.string().optional().describe("Target units"),
  }),
  execute: async ({ inputData }) => {
    if (!inputData) {
      throw new Error("Input data not found");
    }

    const {
      result,
      isSocial,
      provider,
      displayName,
      isUrl,
      originalUrl,
      language,
      units,
    } = inputData;

    // Handle social provider routing - go directly to end
    if (result === "route_to_social" && isSocial && provider && displayName) {
      return {
        route: "social" as const,
        result: `this url is from ${displayName}`,
        isSocial: true,
        provider: displayName,
        isUrl: true,
        originalUrl,
        language,
        units,
      };
    }

    // Handle invalid URL case
    if (result === "this is not a url") {
      return {
        route: "error" as const,
        result: "this is not a url",
        isSocial: false,
        isUrl: false,
        originalUrl,
        language,
        units,
      };
    }

    // Handle normal URL processing flow
    if (result === "route_to_normal" && isUrl && originalUrl) {
      return {
        route: "normal" as const,
        result: "continue_processing",
        isSocial: false,
        isUrl: true,
        originalUrl,
        language,
        units,
      };
    }

    // Fallback case
    return {
      route: "error" as const,
      result: "Unknown routing error",
      isSocial: false,
      isUrl: false,
      originalUrl,
      language,
      units,
    };
  },
});

// End step for formatting final output
const endStep = createStep({
  id: "end",
  description: "Final step that formats the output",
  inputSchema: z.object({
    route: z
      .enum(["social", "normal", "error"])
      .describe("The processing route"),
    result: z.string().describe("The final result"),
    recipeData: z.string().optional().describe("The recipe data if any"),
    isRecipe: z.boolean().describe("Whether recipe was found"),
    isSocial: z.boolean().describe("Whether from social provider"),
    provider: z.string().optional().describe("Social provider name"),
    isUrl: z.boolean().describe("Whether input was URL"),
    originalUrl: z.string().optional().describe("Original URL"),
    recipeName: z.string().optional(),
    timeMinutes: z.number().optional(),
    servesPeople: z.number().optional(),
    makesItems: z.string().optional(),
    recipeLanguage: z.string().optional(),
    unitsLength: z.string().optional(),
    unitsLiquid: z.string().optional(),
    unitsWeight: z.string().optional(),
    language: z.string().optional(),
    units: z.string().optional(),
  }),
  outputSchema: z.object({
    result: z.string().describe("Final formatted result"),
    recipeData: z.string().optional().describe("The recipe data if found"),
    isUrl: z.boolean().describe("Whether the input was a valid URL"),
    isRecipe: z.boolean().describe("Whether recipe data was found"),
    isSocial: z
      .boolean()
      .optional()
      .describe("Whether the URL is from a social provider"),
    provider: z.string().optional().describe("The social media provider name"),
    originalUrl: z
      .string()
      .optional()
      .describe("The original URL that was processed"),
    recipeName: z.string().optional().describe("The name/title of the recipe"),
    timeMinutes: z
      .number()
      .optional()
      .describe("Total time in minutes to make the recipe"),
    servesPeople: z
      .number()
      .optional()
      .describe("Number of people the recipe serves"),
    makesItems: z
      .string()
      .optional()
      .describe("Number of individual items made, or 'N/A' if not applicable"),
    recipeLanguage: z
      .string()
      .optional()
      .describe("The language used in the recipe"),
    unitsLength: z
      .string()
      .optional()
      .describe("Primary length units found in the recipe"),
    unitsLiquid: z
      .string()
      .optional()
      .describe("Primary liquid units found in the recipe"),
    unitsWeight: z
      .string()
      .optional()
      .describe("Primary weight units found in the recipe"),
    language: z
      .string()
      .optional()
      .describe("Target language used for recipe translation"),
    units: z
      .string()
      .optional()
      .describe("Target measurement units used for ingredients"),
  }),
  execute: async ({ inputData }) => {
    if (!inputData) {
      throw new Error("Input data not found");
    }

    // Just pass through all the data, removing the route field
    return {
      result: inputData.result,
      recipeData: inputData.recipeData,
      isUrl: inputData.isUrl,
      isRecipe: inputData.isRecipe,
      isSocial: inputData.isSocial,
      provider: inputData.provider,
      originalUrl: inputData.originalUrl,
      recipeName: inputData.recipeName,
      timeMinutes: inputData.timeMinutes,
      servesPeople: inputData.servesPeople,
      makesItems: inputData.makesItems,
      recipeLanguage: inputData.recipeLanguage,
      unitsLength: inputData.unitsLength,
      unitsLiquid: inputData.unitsLiquid,
      unitsWeight: inputData.unitsWeight,
      language: inputData.language,
      units: inputData.units,
    };
  },
});

// Create the URL processor workflow with social provider branching
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
        "Either the extracted recipe data or 'this is not a recipe' or social provider message or error message"
      ),
    recipeData: z
      .string()
      .optional()
      .describe("The extracted recipe data if found"),
    isUrl: z.boolean().describe("Whether the input was a valid URL"),
    isRecipe: z.boolean().describe("Whether recipe data was found"),
    isSocial: z
      .boolean()
      .optional()
      .describe("Whether the URL is from a social provider"),
    provider: z.string().optional().describe("The social media provider name"),
    originalUrl: z
      .string()
      .optional()
      .describe("The original URL that was processed"),
    recipeName: z.string().optional().describe("The name/title of the recipe"),
    timeMinutes: z
      .number()
      .optional()
      .describe("Total time in minutes to make the recipe"),
    servesPeople: z
      .number()
      .optional()
      .describe("Number of people the recipe serves"),
    makesItems: z
      .string()
      .optional()
      .describe("Number of individual items made, or 'N/A' if not applicable"),
    recipeLanguage: z
      .string()
      .optional()
      .describe("The language used in the recipe"),
    unitsLength: z
      .string()
      .optional()
      .describe("Primary length units found in the recipe"),
    unitsLiquid: z
      .string()
      .optional()
      .describe("Primary liquid units found in the recipe"),
    unitsWeight: z
      .string()
      .optional()
      .describe("Primary weight units found in the recipe"),
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
  .then(socialProviderCheckStep)
  .then(routerStep)
  .then(processUrlStep)
  .then(cleanAndConvertStep)
  .then(recipeExtractionStep)
  .then(endStep);

urlProcessorWorkflow.commit();

export { urlProcessorWorkflow, recipeExtractionAgent };
