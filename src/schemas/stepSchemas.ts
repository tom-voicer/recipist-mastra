import { z } from "zod";

// Social Provider Check Step Schemas
export const socialProviderCheckInputSchema = z.object({
  input: z
    .string()
    .describe("The string input to check if it is a URL from social provider"),
  language: z
    .string()
    .optional()
    .describe("Target language for recipe translation"),
  units: z
    .string()
    .optional()
    .describe("Target measurement and temperature units for ingredients and cooking"),
});

export const socialProviderCheckOutputSchema = z.object({
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
    .describe("Target measurement and temperature units for ingredients and cooking"),
});

// Process URL Step Schemas
export const processUrlInputSchema = z.object({
  route: z.enum(["social", "normal", "error"]).describe("The processing route"),
  result: z.string().describe("Previous result"),
  isSocial: z.boolean().describe("Whether the URL is from a social provider"),
  provider: z.string().optional().describe("The social media provider name"),
  isUrl: z.boolean().describe("Whether the input was a valid URL"),
  originalUrl: z.string().optional().describe("The original URL"),
  language: z.string().optional().describe("Target language"),
  units: z.string().optional().describe("Target measurement and temperature units"),
});

export const processUrlOutputSchema = z.object({
  route: z.enum(["social", "normal", "error"]).describe("The processing route"),
  result: z.string().describe("Success message or error"),
  htmlContent: z.string().optional().describe("The fetched HTML content"),
  isSocial: z.boolean().describe("Whether the URL is from a social provider"),
  provider: z.string().optional().describe("The social media provider name"),
  isUrl: z.boolean().describe("Whether the input was a valid URL"),
  originalUrl: z.string().optional().describe("The original URL"),
  language: z.string().optional(),
  units: z.string().optional(),
});

// Image Extraction Step Schemas
export const imageExtractionInputSchema = z.object({
  route: z.enum(["social", "normal", "error"]).describe("The processing route"),
  result: z.string().describe("Previous result"),
  cleanedContent: z
    .string()
    .optional()
    .describe("The markdown content to analyze"),
  imageUrl: z.string().optional().describe("The recipe image URL"),
  isSocial: z.boolean().describe("Whether the URL is from a social provider"),
  provider: z.string().optional().describe("The social media provider name"),
  isUrl: z.boolean().describe("Whether the input was a valid URL"),
  originalUrl: z.string().optional().describe("The original URL"),
  language: z.string().optional(),
  units: z.string().optional(),
  unitsLength: z.string().optional().describe("Primary length units"),
  unitsLiquid: z.string().optional().describe("Primary liquid units"),
  unitsWeight: z.string().optional().describe("Primary weight units"),
  unitsTemperature: z.string().optional().describe("Primary temperature units"),
});

export const imageExtractionOutputSchema = z.object({
  route: z.enum(["social", "normal", "error"]).describe("The processing route"),
  result: z.string().describe("Success message or error"),
  cleanedContent: z.string().optional().describe("The markdown content"),
  imageUrl: z.string().optional().describe("The extracted recipe image URL"),
  isSocial: z.boolean().describe("Whether the URL is from a social provider"),
  provider: z.string().optional().describe("The social media provider name"),
  isUrl: z.boolean().describe("Whether the input was a valid URL"),
  originalUrl: z.string().optional().describe("The original URL"),
  language: z.string().optional(),
  units: z.string().optional(),
  unitsLength: z.string().optional().describe("Primary length units"),
  unitsLiquid: z.string().optional().describe("Primary liquid units"),
  unitsWeight: z.string().optional().describe("Primary weight units"),
  unitsTemperature: z.string().optional().describe("Primary temperature units"),
});

// Clean and Convert Step Schemas
export const cleanAndConvertInputSchema = z.object({
  route: z.enum(["social", "normal", "error"]).describe("The processing route"),
  result: z.string().describe("Previous result"),
  htmlContent: z.string().optional().describe("The HTML content to clean"),
  imageUrl: z.string().optional().describe("The recipe image URL"),
  isSocial: z.boolean().describe("Whether the URL is from a social provider"),
  provider: z.string().optional().describe("The social media provider name"),
  isUrl: z.boolean().describe("Whether the input was a valid URL"),
  originalUrl: z.string().optional().describe("The original URL"),
  language: z.string().optional(),
  units: z.string().optional(),

});

export const cleanAndConvertOutputSchema = z.object({
  route: z.enum(["social", "normal", "error"]).describe("The processing route"),
  result: z.string().describe("Success message or error"),
  cleanedContent: z
    .string()
    .optional()
    .describe("The cleaned markdown content"),
  imageUrl: z.string().optional().describe("The recipe image URL"),
  isSocial: z.boolean().describe("Whether the URL is from a social provider"),
  provider: z.string().optional().describe("The social media provider name"),
  isUrl: z.boolean().describe("Whether the input was a valid URL"),
  originalUrl: z.string().optional().describe("The original URL"),
  language: z.string().optional(),
  units: z.string().optional(),

});

// Unit Parsing Step Schemas
export const unitParsingInputSchema = z.object({
  route: z.enum(["social", "normal", "error"]).describe("The processing route"),
  result: z.string().describe("Previous result"),
  cleanedContent: z
    .string()
    .optional()
    .describe("The markdown content to analyze for default units"),
  imageUrl: z.string().optional().describe("The recipe image URL"),
  isSocial: z.boolean().describe("Whether the URL is from a social provider"),
  provider: z.string().optional().describe("The social media provider name"),
  isUrl: z.boolean().describe("Whether the input was a valid URL"),
  originalUrl: z.string().optional().describe("The original URL"),
  language: z.string().optional(),
  units: z.string().optional(),
});

export const unitParsingOutputSchema = z.object({
  route: z.enum(["social", "normal", "error"]).describe("The processing route"),
  result: z.string().describe("Success message or error"),
  cleanedContent: z.string().optional().describe("The markdown content"),
  imageUrl: z.string().optional().describe("The recipe image URL"),
  isSocial: z.boolean().describe("Whether the URL is from a social provider"),
  provider: z.string().optional().describe("The social media provider name"),
  isUrl: z.boolean().describe("Whether the input was a valid URL"),
  originalUrl: z.string().optional().describe("The original URL"),
  language: z.string().optional(),
  units: z.string().optional(),
  unitsLength: z.string().optional().describe("Primary length units"),
  unitsLiquid: z.string().optional().describe("Primary liquid units"),
  unitsWeight: z.string().optional().describe("Primary weight units"),
  unitsTemperature: z.string().optional().describe("Primary temperature units"),
});

// Recipe Extraction Step Schemas
export const recipeExtractionInputSchema = z.object({
  route: z.enum(["social", "normal", "error"]).describe("The processing route"),
  result: z.string().describe("Previous result"),
  cleanedContent: z
    .string()
    .optional()
    .describe("The markdown content to analyze"),
  imageUrl: z.string().optional().describe("The recipe image URL"),
  isSocial: z.boolean().describe("Whether the URL is from a social provider"),
  provider: z.string().optional().describe("The social media provider name"),
  isUrl: z.boolean().describe("Whether the input was a valid URL"),
  originalUrl: z.string().optional().describe("The original URL"),
  language: z.string().optional(),
  units: z.string().optional(),
  unitsLength: z.string().optional().describe("Primary length units"),
  unitsLiquid: z.string().optional().describe("Primary liquid units"),
  unitsWeight: z.string().optional().describe("Primary weight units"),
  unitsTemperature: z.string().optional().describe("Primary temperature units"),
});

export const recipeExtractionOutputSchema = z.object({
  route: z.enum(["social", "normal", "error"]).describe("The processing route"),
  result: z
    .string()
    .describe("Either the extracted recipe or 'this is not a recipe'"),
  recipeData: z
    .string()
    .optional()
    .describe("The extracted recipe data if found"),
  imageUrl: z.string().optional().describe("The recipe image URL"),
  isRecipe: z.boolean().describe("Whether recipe data was found"),
  isSocial: z.boolean().describe("Whether the URL is from a social provider"),
  provider: z.string().optional().describe("The social media provider name"),
  isUrl: z.boolean().describe("Whether the input was a valid URL"),
  originalUrl: z.string().optional().describe("The original URL"),
  recipeName: z.string().optional().describe("The name/title of the recipe"),
  timeMinutes: z.number().optional().describe("Total time in minutes"),
  servesPeople: z.number().optional().describe("Number of people served"),
  makesItems: z.string().optional().describe("Number of items made"),
  unitsLength: z.string().optional().describe("Primary length units"),
  unitsLiquid: z.string().optional().describe("Primary liquid units"),
  unitsWeight: z.string().optional().describe("Primary weight units"),
  language: z.string().optional(),
  languageCode: z.string().optional().describe("ISO 639-1 language code"),
  units: z.string().optional(),

  unitsTemperature: z.string().optional().describe("Primary temperature units"),
});

// Router Step Schemas
export const routerInputSchema = z.object({
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

});

export const routerOutputSchema = z.object({
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

});

// End Step Schemas
export const endInputSchema = z.object({
  route: z.enum(["social", "normal", "error"]).describe("The processing route"),
  result: z.string().describe("The final result"),
  recipeData: z.string().optional().describe("The recipe data if any"),
  imageUrl: z.string().optional().describe("The recipe image URL"),
  isRecipe: z.boolean().describe("Whether recipe was found"),
  isSocial: z.boolean().describe("Whether from social provider"),
  provider: z.string().optional().describe("Social provider name"),
  isUrl: z.boolean().describe("Whether input was URL"),
  originalUrl: z.string().optional().describe("Original URL"),
  recipeName: z.string().optional(),
  timeMinutes: z.number().optional(),
  servesPeople: z.number().optional(),
  makesItems: z.string().optional(),
  unitsLength: z.string().optional(),
  unitsLiquid: z.string().optional(),
  unitsWeight: z.string().optional(),
  language: z.string().optional(),
  languageCode: z.string().optional(),
  units: z.string().optional(),

  unitsTemperature: z.string().optional(),
});

export const endOutputSchema = z.object({
  result: z.string().describe("Final formatted result"),
  recipeData: z.string().optional().describe("The recipe data if found"),
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
