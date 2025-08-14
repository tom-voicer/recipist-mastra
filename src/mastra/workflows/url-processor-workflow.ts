import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";

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

// Create the URL processor workflow
const urlProcessorWorkflow = createWorkflow({
  id: "url-processor-workflow",
  inputSchema: z.object({
    input: z.string().describe("The string input to check if it is a URL"),
  }),
  outputSchema: z.object({
    result: z.string().describe("Either the HTML content or error message"),
    isUrl: z.boolean().describe("Whether the input was a valid URL"),
  }),
}).then(processUrlStep);

urlProcessorWorkflow.commit();

export { urlProcessorWorkflow };
