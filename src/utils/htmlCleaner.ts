/**
 * HTML Cleaner Utility
 *
 * This utility provides a string-based HTML cleaning function that:
 * - Removes all scripts, styles, and noscript elements
 * - Strips all HTML attributes from elements (except src and alt on img tags)
 * - Removes comments and ALL empty elements
 * - Normalizes whitespace for clean text content
 * - Optionally converts HTML to Markdown format
 *
 * Note: This implementation uses regex and string manipulation,
 * not DOM operations, making it suitable for server-side use.
 */

import { convertHtmlToMarkdown } from "./markdownConverter";

// Tags to completely remove (including their content)
const TAGS_TO_REMOVE = ["script", "style", "noscript"];

export interface CleanHtmlOptions {
  /**
   * Whether to remove all attributes from elements
   * @default true
   */
  removeAttributes?: boolean;

  /**
   * Whether to remove empty elements
   * @default true
   */
  removeEmptyElements?: boolean;

  /**
   * Whether to normalize whitespace in text content
   * @default true
   */
  normalizeWhitespace?: boolean;

  /**
   * Whether to remove HTML comments
   * @default true
   */
  removeComments?: boolean;

  /**
   * Whether to convert the result to Markdown
   * @default false
   */
  convertToMarkdown?: boolean;
}

/**
 * Cleans HTML content by removing scripts, styles, attributes, and normalizing structure
 *
 * @param html - The HTML string to clean
 * @param options - Cleaning options
 * @returns Cleaned HTML string or Markdown string if convertToMarkdown is true
 */
export function cleanHtml(
  html: string,
  options: CleanHtmlOptions = {}
): string {
  const {
    removeAttributes = true,
    removeEmptyElements = true,
    normalizeWhitespace = true,
    removeComments = true,
    convertToMarkdown = false,
  } = options;

  let cleanedHtml = html;

  // Step 1: Remove unwanted elements (scripts, styles, noscripts)
  cleanedHtml = removeUnwantedTags(cleanedHtml);

  // Step 2: Remove comments if requested
  if (removeComments) {
    cleanedHtml = removeHtmlComments(cleanedHtml);
  }

  // Step 3: Remove attributes from all elements if requested
  if (removeAttributes) {
    cleanedHtml = removeAllAttributes(cleanedHtml);
  }

  // Step 4: Normalize whitespace if requested
  if (normalizeWhitespace) {
    cleanedHtml = normalizeWhitespace_(cleanedHtml);
  }

  // Step 5: Remove empty elements if requested (must be done after whitespace normalization)
  if (removeEmptyElements) {
    cleanedHtml = removeEmptyElements_(cleanedHtml);
  }

  // Step 6: Convert to Markdown if requested
  if (convertToMarkdown) {
    return convertHtmlToMarkdown(cleanedHtml);
  }

  return cleanedHtml;
}

/**
 * Removes unwanted tags and their content using regex
 */
function removeUnwantedTags(html: string): string {
  let result = html;

  // Remove each unwanted tag type
  TAGS_TO_REMOVE.forEach((tagName) => {
    // Regex to match opening and closing tags with any content in between
    // Uses non-greedy matching and handles nested tags
    const regex = new RegExp(`<${tagName}[^>]*>.*?<\/${tagName}>`, "gis");
    result = result.replace(regex, "");

    // Also remove self-closing versions
    const selfClosingRegex = new RegExp(`<${tagName}[^>]*\/>`, "gi");
    result = result.replace(selfClosingRegex, "");
  });

  return result;
}

/**
 * Removes HTML comments using regex
 */
function removeHtmlComments(html: string): string {
  // Remove HTML comments <!-- ... -->
  return html.replace(/<!--[\s\S]*?-->/g, "");
}

/**
 * Removes all attributes from HTML elements using regex, except src and alt attributes on img tags
 */
function removeAllAttributes(html: string): string {
  return html.replace(/<([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g, (match, tagName) => {
    // For img tags, preserve src and alt attributes
    if (tagName.toLowerCase() === "img") {
      const srcMatch = match.match(/src\s*=\s*["']([^"']*)["']/i);
      const altMatch = match.match(/alt\s*=\s*["']([^"']*)["']/i);
      
      let attributes = "";
      if (srcMatch) {
        attributes += ` src="${srcMatch[1]}"`;
      }
      if (altMatch) {
        attributes += ` alt="${altMatch[1]}"`;
      }
      
      if (attributes) {
        return `<${tagName}${attributes} />`;
      }
    }
    // For all other tags, remove all attributes
    return `<${tagName}>`;
  });
}

/**
 * Normalizes whitespace in HTML content
 */
function normalizeWhitespace_(html: string): string {
  return (
    html
      // Replace multiple consecutive whitespace characters with a single space
      .replace(/\s+/g, " ")
      // Remove whitespace around HTML tags
      .replace(/>\s+</g, "><")
      // Trim leading and trailing whitespace
      .trim()
  );
}

/**
 * Removes empty HTML elements using regex, but preserves self-closing elements like img
 * This function runs multiple passes to handle nested empty elements
 */
function removeEmptyElements_(html: string): string {
  let result = html;
  let previousLength;

  // Keep removing empty elements until no more can be removed
  do {
    previousLength = result.length;

    // Remove empty elements with no content (self-closing or with only whitespace)
    // This regex matches opening tag, optional whitespace, and closing tag
    // Exclude self-closing elements like img, br, hr, input, etc.
    result = result.replace(/<(?!img|br|hr|input|meta|link|area|base|col|embed|source|track|wbr)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>\s*<\/\1>/gi, "");

    // Remove elements that contain only whitespace or other empty elements
    // This is a simplified approach - for more complex cases, multiple passes help
    result = result.replace(/<(?!img|br|hr|input|meta|link|area|base|col|embed|source|track|wbr)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>\s*<\/\1>/gi, "");
  } while (result.length < previousLength); // Continue until no more changes

  return result;
}
