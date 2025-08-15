import { createStep, createWorkflow } from "@mastra/core/workflows";
import {
  isValidUrl,
  detectSocialProvider,
  getLanguageISOCode,
  parseUnitsCategory,
  cleanHtml,
} from "../../utils";
import {
  workflowInputSchema,
  workflowOutputSchema,
  socialProviderCheckInputSchema,
  socialProviderCheckOutputSchema,
  processUrlInputSchema,
  processUrlOutputSchema,
  imageExtractionInputSchema,
  imageExtractionOutputSchema,
  cleanAndConvertInputSchema,
  cleanAndConvertOutputSchema,
  unitParsingInputSchema,
  unitParsingOutputSchema,
  recipeExtractionInputSchema,
  recipeExtractionOutputSchema,
  routerInputSchema,
  routerOutputSchema,
  endInputSchema,
  endOutputSchema,
} from "../../schemas";

// Step to check if URL is from a social media provider
const socialProviderCheckStep = createStep({
  id: "social-provider-check",
  description:
    "Checks if the URL is from a social media provider and routes accordingly",
  inputSchema: socialProviderCheckInputSchema,
  outputSchema: socialProviderCheckOutputSchema,
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
  inputSchema: processUrlInputSchema,
  outputSchema: processUrlOutputSchema,
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

// Step to intelligently parse units using AI
const unitParsingStep = createStep({
  id: "unit-parsing",
  description:
    "Uses AI to intelligently parse user units input and determine appropriate units for different measurement types",
  inputSchema: unitParsingInputSchema,
  outputSchema: unitParsingOutputSchema,
  execute: async ({ inputData, mastra }) => {
    if (!inputData) {
      throw new Error("Input data not found");
    }

    const {
      route,
      result,
      cleanedContent,
      imageUrl,
      isSocial,
      provider,
      isUrl,
      originalUrl,
      language,
      units,
    } = inputData;

    // Skip unit parsing for social providers and errors
    if (route === "social" || route === "error") {
      return {
        route,
        result,
        cleanedContent,
        imageUrl,
        isSocial,
        provider,
        isUrl,
        originalUrl,
        language,
        units,
      };
    }

    // Only parse units for normal route with content
    if (route === "normal" && cleanedContent) {
      try {
        // Get the unit parsing agent from the mastra instance
        const agent = mastra?.getAgent("unit-parser");
        if (!agent) {
          throw new Error("Unit parsing agent not found");
        }

        // Build the prompt for unit parsing
        let prompt = `Please analyze the user's units request: "${units || "not specified"}" and the following recipe content to determine the appropriate units for each measurement type.

Recipe content:
${cleanedContent}

Please return a JSON object with the following structure:
{
  "unitsLength": "cm|inch|mm|etc or null if not specified",
  "unitsLiquid": "ml|cup|liter|etc or null if not specified", 
  "unitsWeight": "grams|ounces|kg|etc or null if not specified",
  "unitsTemperature": "celsius|fahrenheit|kelvin or null if not specified"
}

Rules:
1. If the user specified units (e.g., "metric", "imperial", "grams celsius"), parse what they want
2. If they didn't specify certain unit types, analyze the recipe's original units and use those defaults
3. For general terms: "metric" = cm/ml/grams/celsius, "imperial" = inch/cup/ounces/fahrenheit
4. Return only the JSON object, no other text`;

        // Generate response from the agent
        const response = await agent.generate([
          { role: "user", content: prompt },
        ]);

        // Parse the JSON response
        let parsedUnits;
        try {
          parsedUnits = JSON.parse(response.text.trim());
        } catch (e) {
          // Fallback to algorithmic parsing if AI fails
          parsedUnits = {
            unitsLength: units ? parseUnitsCategory(units, "length") : null,
            unitsLiquid: units ? parseUnitsCategory(units, "liquid") : null,
            unitsWeight: units ? parseUnitsCategory(units, "weight") : null,
            unitsTemperature: units
              ? parseUnitsCategory(units, "temperature")
              : null,
          };
        }

        return {
          route,
          result: "units_parsed",
          cleanedContent,
          imageUrl,
          isSocial,
          provider,
          isUrl,
          originalUrl,
          language,
          units,
          unitsLength: parsedUnits.unitsLength,
          unitsLiquid: parsedUnits.unitsLiquid,
          unitsWeight: parsedUnits.unitsWeight,
          unitsTemperature: parsedUnits.unitsTemperature,
        };
      } catch (error) {
        // Don't fail the whole workflow if unit parsing fails, use algorithmic fallback
        const fallbackUnits = {
          unitsLength: units ? parseUnitsCategory(units, "length") : undefined,
          unitsLiquid: units ? parseUnitsCategory(units, "liquid") : undefined,
          unitsWeight: units ? parseUnitsCategory(units, "weight") : undefined,
          unitsTemperature: units
            ? parseUnitsCategory(units, "temperature")
            : undefined,
        };

        return {
          route,
          result: "units_parsed_fallback",
          cleanedContent,
          imageUrl,
          isSocial,
          provider,
          isUrl,
          originalUrl,
          language,
          units,
          unitsLength: fallbackUnits.unitsLength,
          unitsLiquid: fallbackUnits.unitsLiquid,
          unitsWeight: fallbackUnits.unitsWeight,
          unitsTemperature: fallbackUnits.unitsTemperature,
        };
      }
    }

    // Pass through if no content to analyze
    return {
      route,
      result,
      cleanedContent,
      imageUrl,
      isSocial,
      provider,
      isUrl,
      originalUrl,
      language,
      units,
    };
  },
});

// Step to extract recipe image from markdown content
const imageExtractionStep = createStep({
  id: "image-extraction",
  description:
    "Extracts the main recipe image URL from markdown content using AI",
  inputSchema: imageExtractionInputSchema,
  outputSchema: imageExtractionOutputSchema,
  execute: async ({ inputData, mastra }) => {
    if (!inputData) {
      throw new Error("Input data not found");
    }

    const {
      route,
      result,
      cleanedContent,
      imageUrl: inputImageUrl,
      isSocial,
      provider,
      isUrl,
      originalUrl,
      language,
      units,
      unitsLength,
      unitsLiquid,
      unitsWeight,
      unitsTemperature,
    } = inputData;

    // Skip image extraction for social providers and errors
    if (route === "social" || route === "error") {
      return {
        route,
        result,
        cleanedContent,
        imageUrl: inputImageUrl,
        isSocial,
        provider,
        isUrl,
        originalUrl,
        language,
        units,
        unitsLength,
        unitsLiquid,
        unitsWeight,
        unitsTemperature,
      };
    }

    // Only extract image for normal route with markdown content
    if (route === "normal" && cleanedContent) {
      try {
        // Get the image extraction agent from the mastra instance
        const agent = mastra?.getAgent("image-extractor");
        if (!agent) {
          throw new Error("Image extraction agent not found");
        }

        // Generate response from the agent
        const response = await agent.generate([
          {
            role: "user",
            content: `Please analyze the following markdown content and extract the main recipe image URL:

${cleanedContent}`,
          },
        ]);

        const extractedImageUrl = response.text.trim();
        const imageUrl =
          extractedImageUrl !== "no image found"
            ? extractedImageUrl
            : undefined;
        return {
          route,
          result: imageUrl ? "image_extracted" : "no_image_found",
          cleanedContent,
          imageUrl,
          isSocial,
          provider,
          isUrl,
          originalUrl,
          language,
          units,
          unitsLength,
          unitsLiquid,
          unitsWeight,
          unitsTemperature,
        };
      } catch (error) {
        // Don't fail the whole workflow if image extraction fails, just continue without image
        return {
          route,
          result,
          cleanedContent,
          imageUrl: undefined,
          isSocial,
          provider,
          isUrl,
          originalUrl,
          language,
          units,
          unitsLength,
          unitsLiquid,
          unitsWeight,
          unitsTemperature,
        };
      }
    }

    // Pass through if no markdown content
    return {
      route,
      result,
      cleanedContent,
      imageUrl: inputImageUrl,
      isSocial,
      provider,
      isUrl,
      originalUrl,
      language,
      units,
      unitsLength,
      unitsLiquid,
      unitsWeight,
      unitsTemperature,
    };
  },
});

// Step to clean HTML and convert to markdown
const cleanAndConvertStep = createStep({
  id: "clean-and-convert",
  description: "Cleans HTML content and converts it to markdown format",
  inputSchema: cleanAndConvertInputSchema,
  outputSchema: cleanAndConvertOutputSchema,
  execute: async ({ inputData }) => {
    if (!inputData) {
      throw new Error("Input data not found");
    }

    const {
      route,
      result,
      htmlContent,
      imageUrl,
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
        imageUrl,
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
          removeEmptyElements: false, // Keep this false to preserve img tags
          normalizeWhitespace: true,
          removeComments: true,
          convertToMarkdown: true,
        });

        return {
          route,
          result: "html_cleaned",
          cleanedContent,
          imageUrl,
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
          imageUrl,
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
      imageUrl,
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
  inputSchema: recipeExtractionInputSchema,
  outputSchema: recipeExtractionOutputSchema,
  execute: async ({ inputData, mastra }) => {
    if (!inputData) {
      throw new Error("Input data not found");
    }

    const {
      route,
      result,
      cleanedContent,
      imageUrl,
      isSocial,
      provider,
      isUrl,
      originalUrl,
      language,
      units,
      unitsLength,
      unitsLiquid,
      unitsWeight,
      unitsTemperature,
    } = inputData;

    // Skip recipe extraction for social providers and errors
    if (route === "social" || route === "error") {
      return {
        route,
        result,
        imageUrl,
        isRecipe: false,
        isSocial,
        provider,
        isUrl,
        originalUrl,
        language,
        languageCode: undefined,
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

        // Use the AI-parsed units from the previous step

        // Add units conversion instruction if specified
        if (units) {
          prompt += `\n\nIMPORTANT: Please convert all measurements and temperatures in the recipe according to these units: "${units}". Use accurate conversion factors (e.g., 1 cup flour ≈ 120g, 1 tablespoon ≈ 15ml, 350°F = 175°C, 200°C = 400°F). If the user didn't specify certain unit types, keep the recipe's original units for those measurements.`;
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

        // Convert language to ISO code
        const languageCode = language
          ? getLanguageISOCode(language)
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
          imageUrl,
          isRecipe,
          isSocial,
          provider,
          isUrl,
          originalUrl,
          recipeName,
          timeMinutes,
          servesPeople,
          makesItems,
          unitsLength,
          unitsLiquid,
          unitsWeight,
          language,
          languageCode,
          units,
          unitsTemperature,
        };
      } catch (error) {
        return {
          route: "error" as const,
          result: `Error extracting recipe: ${error instanceof Error ? error.message : "Unknown error"}`,
          imageUrl,
          isRecipe: false,
          isSocial,
          provider,
          isUrl,
          originalUrl,
          language,
          languageCode: undefined,
          units,
        };
      }
    }

    // Pass through if no cleaned content
    return {
      route,
      result,
      imageUrl,
      isRecipe: false,
      isSocial,
      provider,
      isUrl,
      originalUrl,
      language,
      languageCode: undefined,
      units,
    };
  },
});

// Simple router step that just determines which path to take
const routerStep = createStep({
  id: "router",
  description:
    "Determines which processing path to take based on social provider check",
  inputSchema: routerInputSchema,
  outputSchema: routerOutputSchema,
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
  inputSchema: endInputSchema,
  outputSchema: endOutputSchema,
  execute: async ({ inputData }) => {
    if (!inputData) {
      throw new Error("Input data not found");
    }

    // Just pass through all the data, removing the route field and restructuring units
    return {
      result: inputData.result,
      recipeData: inputData.recipeData,
      imageUrl: inputData.imageUrl,
      isUrl: inputData.isUrl,
      isRecipe: inputData.isRecipe,
      isSocial: inputData.isSocial,
      provider: inputData.provider,
      originalUrl: inputData.originalUrl,
      recipeName: inputData.recipeName,
      timeMinutes: inputData.timeMinutes,
      servesPeople: inputData.servesPeople,
      makesItems: inputData.makesItems,
      language: inputData.language,
      languageCode: inputData.languageCode,
      units: {
        length: inputData.unitsLength,
        liquid: inputData.unitsLiquid,
        weight: inputData.unitsWeight,
        temperature: inputData.unitsTemperature,
      },
    };
  },
});

// Create the URL processor workflow with social provider branching
const urlProcessorWorkflow = createWorkflow({
  id: "url-processor-workflow",
  inputSchema: workflowInputSchema,
  outputSchema: workflowOutputSchema,
})
  .then(socialProviderCheckStep)
  .then(routerStep)
  .then(processUrlStep)
  .then(cleanAndConvertStep)
  .then(unitParsingStep)
  .then(imageExtractionStep)
  .then(recipeExtractionStep)
  .then(endStep);

urlProcessorWorkflow.commit();

export { urlProcessorWorkflow };
