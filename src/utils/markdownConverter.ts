/**
 * Markdown Converter Service
 *
 * This module provides HTML to Markdown conversion functionality
 * using the node-html-markdown library with custom configurations.
 */

import { NodeHtmlMarkdown, NodeHtmlMarkdownOptions } from "node-html-markdown";

// Initialize the markdown converter with custom options for better output
const markdownConverter = new NodeHtmlMarkdown({
  bulletMarker: "-", // Use - for unordered lists
  codeBlockStyle: "fenced", // Use ``` for code blocks
  emDelimiter: "*", // Use * for emphasis
  strongDelimiter: "**", // Use ** for strong/bold
  strikeDelimiter: "~~", // Use ~~ for strikethrough
  maxConsecutiveNewlines: 3, // Limit consecutive newlines
  useInlineLinks: true, // Use inline links [text](url)
});

// Note: node-html-markdown has built-in handling for most cases we were customizing
// Custom translators can be added if needed, but the library's defaults are quite good

/**
 * Converts HTML string to Markdown format
 *
 * @param html - The HTML string to convert
 * @returns Markdown formatted string
 */
export function convertHtmlToMarkdown(html: string): string {
  return markdownConverter.translate(html);
}

/**
 * Creates a new markdown converter instance with custom options
 *
 * @param options - NodeHtmlMarkdown options to override defaults
 * @returns New NodeHtmlMarkdown instance
 */
export function createCustomMarkdownConverter(
  options: Partial<NodeHtmlMarkdownOptions>
): NodeHtmlMarkdown {
  const combinedOptions = {
    bulletMarker: "-",
    codeBlockStyle: "fenced" as const,
    emDelimiter: "*",
    strongDelimiter: "**",
    strikeDelimiter: "~~",
    maxConsecutiveNewlines: 3,
    useInlineLinks: true,
    ...options,
  };
  return new NodeHtmlMarkdown(combinedOptions);
}

/**
 * Converts HTML to Markdown using a custom converter instance
 *
 * @param html - The HTML string to convert
 * @param options - Custom options for this conversion
 * @returns Markdown formatted string
 */
export function convertHtmlToMarkdownWithOptions(
  html: string,
  options: Partial<NodeHtmlMarkdownOptions>
): string {
  const customConverter = createCustomMarkdownConverter(options);
  return customConverter.translate(html);
}

// Note: For advanced custom translators, create a new NodeHtmlMarkdown instance
// with custom translators passed to the constructor:
// const customConverter = new NodeHtmlMarkdown(options, customTranslators, customCodeBlockTranslators);
