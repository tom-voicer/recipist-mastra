/**
 * HTML Cleaner Utility
 *
 * This utility provides a high-performance HTML cleaning function that:
 * - Removes all scripts, styles, and noscript elements
 * - Strips all HTML attributes from elements
 * - Removes comments and ALL empty elements
 * - Normalizes whitespace for clean text content
 * - Optionally converts HTML to Markdown format
 */

import { convertHtmlToMarkdown } from "./markdownConverter";

// Tags to completely remove (including their content)
const TAGS_TO_REMOVE = new Set(["script", "style", "noscript"]);

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

  // Create a temporary container to work with
  const container = document.createElement("div");
  container.innerHTML = html;

  // Step 1: Remove unwanted elements (scripts, styles, noscripts)
  TAGS_TO_REMOVE.forEach((tagName) => {
    const elements = container.getElementsByTagName(tagName);
    // Convert to array and remove in reverse to avoid live collection issues
    Array.from(elements)
      .reverse()
      .forEach((el) => el.remove());
  });

  // Step 2: Remove comments if requested
  if (removeComments) {
    removeCommentNodes(container);
  }

  // Step 3: Remove attributes from all elements if requested
  if (removeAttributes) {
    const allElements = container.getElementsByTagName("*");
    Array.from(allElements).forEach((element) => {
      // Remove all attributes
      Array.from(element.attributes).forEach((attr) => {
        element.removeAttribute(attr.name);
      });
    });
  }

  // Step 4: Normalize whitespace if requested
  if (normalizeWhitespace) {
    normalizeTextContent(container);
  }

  // Step 5: Remove empty elements if requested (must be done after whitespace normalization)
  if (removeEmptyElements) {
    removeEmptyNodes(container);
  }

  // Step 6: Convert to Markdown if requested
  if (convertToMarkdown) {
    return convertHtmlToMarkdown(container.innerHTML);
  }

  return container.innerHTML;
}

/**
 * Removes all comment nodes from an element and its descendants
 */
function removeCommentNodes(element: Element): void {
  const iterator = document.createNodeIterator(
    element,
    NodeFilter.SHOW_COMMENT
  );

  const comments: Comment[] = [];
  let node: Node | null;

  // Collect all comments first to avoid iterator invalidation
  while ((node = iterator.nextNode())) {
    comments.push(node as Comment);
  }

  // Remove all collected comments
  comments.forEach((comment) => comment.remove());
}

/**
 * Normalizes whitespace in all text nodes
 */
function normalizeTextContent(element: Element): void {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);

  const textNodes: Text[] = [];
  let node: Node | null;

  // Collect all text nodes
  while ((node = walker.nextNode())) {
    textNodes.push(node as Text);
  }

  textNodes.forEach((textNode) => {
    const text = textNode.textContent || "";

    // Replace multiple whitespaces with single space
    const normalizedText = text.replace(/\s+/g, " ");

    // Remove the text node if it's only whitespace
    if (normalizedText.trim() === "") {
      textNode.remove();
    } else {
      textNode.textContent = normalizedText;
    }
  });
}

/**
 * Removes ALL empty elements
 * Works from deepest elements to shallowest to avoid skipping
 */
function removeEmptyNodes(element: Element): void {
  // Get all elements and process from deepest to shallowest
  const allElements = Array.from(element.getElementsByTagName("*"));

  // Process in reverse order (deepest first)
  for (let i = allElements.length - 1; i >= 0; i--) {
    const el = allElements[i];

    // Skip if element was already removed
    if (!el.parentNode) continue;

    // Check if element is empty
    const hasNoChildren = el.children.length === 0;
    const hasNoText = !el.textContent || el.textContent.trim() === "";

    // Remove ALL empty elements
    if (hasNoChildren && hasNoText) {
      el.remove();
    }
  }
}

/**
 * Utility function to clean the current document's body HTML and optionally convert to Markdown
 */
export function cleanBodyHtml(options?: CleanHtmlOptions): string {
  return cleanHtml(document.body.innerHTML, options);
}
