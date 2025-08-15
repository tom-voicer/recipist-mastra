// API Route interface for type safety
export interface RecipeExtractorRequest {
  url: string; // Required: The URL to extract recipe from
  language?: string; // Optional: Target language (e.g., "Spanish", "French")
  weightUnit?: string; // Optional: Weight unit (e.g., "grams", "ounces", "kg")
  lengthUnit?: string; // Optional: Length unit (e.g., "cm", "inches")
  liquidUnit?: string; // Optional: Liquid unit (e.g., "ml", "cups", "liters")
  temperatureUnit?: string; // Optional: Temperature unit (e.g., "celsius", "fahrenheit")
}
