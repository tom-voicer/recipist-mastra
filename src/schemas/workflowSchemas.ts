import { z } from "zod";

// Main workflow input schema
export const workflowInputSchema = z.object({
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
      "Target measurement and temperature units for ingredients and cooking (e.g., 'metric', 'imperial', 'grams/liters celsius', 'cups fahrenheit')"
    ),
});

// Main workflow output schema
export const workflowOutputSchema = z.object({
  result: z
    .string()
    .describe(
      "Either the extracted recipe data or 'this is not a recipe' or social provider message or error message"
    ),
  recipeData: z
    .string()
    .optional()
    .describe("The extracted recipe data if found"),
  imageUrl: z.string().optional().describe("The recipe image URL"),
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
  languageCode: z
    .string()
    .optional()
    .describe("ISO 639-1 language code for the target language"),
  units: z
    .object({
      length: z.string().optional(),
      liquid: z.string().optional(),
      weight: z.string().optional(),
      temperature: z.string().optional(),
    })
    .optional()
    .describe("Structured units object with specific units for each measurement type"),
});
