/**
 * Utility Functions Export
 *
 * Central export point for all utility functions to simplify imports
 */

// HTML and Markdown utilities
export { cleanHtml } from "./htmlCleaner";

// URL utilities
export { isValidUrl, detectSocialProvider } from "./urlUtils";

// Language utilities
export { getLanguageISOCode } from "./languageUtils";

// Units utilities
export { parseUnitsCategory } from "./unitsUtils";

/**
 * Cleans a URL by removing all query parameters
 * @param url - The URL to clean
 * @returns The URL without query parameters
 */
export function cleanUrl(url: string): string {
  try {
    const urlObject = new URL(url);
    // Clear the search params (query string)
    urlObject.search = "";
    return urlObject.toString();
  } catch (error) {
    // If URL parsing fails, try a simple approach
    const queryIndex = url.indexOf("?");
    if (queryIndex !== -1) {
      return url.substring(0, queryIndex);
    }
    return url;
  }
}
