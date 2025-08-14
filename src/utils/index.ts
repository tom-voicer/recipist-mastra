/**
 * Utility Functions Export
 *
 * Central export point for all utility functions to simplify imports
 */

// HTML Cleaning utilities
export { cleanHtml, cleanBodyHtml, type CleanHtmlOptions } from "./htmlCleaner";

// Markdown conversion utilities
export {
  convertHtmlToMarkdown,
  configureMarkdownConverter,
  addMarkdownConversionRule,
} from "./markdownConverter";

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
