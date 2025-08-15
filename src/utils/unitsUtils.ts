import { RecipeExtractorRequest } from "../types/recipe-extractor-types";

// Function to parse user's units request into specific categories
export function parseUnitsCategory(
  units: string,
  category: "length" | "liquid" | "weight" | "temperature"
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
    temperature: ["celsius", "c", "fahrenheit", "f", "kelvin", "k"],
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
  } else if (category === "temperature") {
    if (unitsLower.includes("metric")) return "celsius";
    if (unitsLower.includes("imperial")) return "fahrenheit";
  }

  return undefined;
}

// Helper function to construct units string from individual unit parameters
export function constructUnitsString(
  req: RecipeExtractorRequest
): string | undefined {
  const units: string[] = [];

  if (req.weightUnit) units.push(req.weightUnit);
  if (req.liquidUnit) units.push(req.liquidUnit);
  if (req.lengthUnit) units.push(req.lengthUnit);
  if (req.temperatureUnit) units.push(req.temperatureUnit);

  return units.length > 0 ? units.join(" ") : undefined;
}
