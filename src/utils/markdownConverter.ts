/**
 * Markdown Converter Service
 *
 * This module provides HTML to Markdown conversion functionality
 * using the Turndown library with custom configurations.
 */

import TurndownService from "turndown";

// Initialize the markdown converter with custom options for better output
const markdownConverter = new TurndownService({
  headingStyle: "atx", // Use # style headings
  hr: "---", // Horizontal rule style
  bulletListMarker: "-", // Use - for unordered lists
  codeBlockStyle: "fenced", // Use ``` for code blocks
  emDelimiter: "*", // Use * for emphasis
  strongDelimiter: "**", // Use ** for strong/bold
  linkStyle: "inlined", // Use inline links [text](url)
});

// Add custom rule to handle empty paragraphs
markdownConverter.addRule("removeEmptyParagraphs", {
  filter: function (node) {
    return (
      node.nodeName === "P" &&
      (!node.textContent || node.textContent.trim() === "")
    );
  },
  replacement: function () {
    return "";
  },
});

// Add custom rule to improve spacing around headings
markdownConverter.addRule("improveHeadingSpacing", {
  filter: ["h1", "h2", "h3", "h4", "h5", "h6"],
  replacement: function (content, node) {
    const level = Number(node.nodeName.charAt(1));
    const prefix = "#".repeat(level);
    // Add extra newline before headings for better readability
    return "\n\n" + prefix + " " + content + "\n\n";
  },
});

// Add custom rule to ensure images are properly converted to markdown
markdownConverter.addRule("forceImageConversion", {
  filter: function (node) {
    return node.nodeName === "IMG";
  },
  replacement: function (content, node) {
    const element = node as Element;
    const src = element.getAttribute("src");
    const alt = element.getAttribute("alt") || "";
    
    if (src) {
      return `\n![${alt}](${src})\n`;
    }
    return "";
  },
});

/**
 * Converts HTML string to Markdown format
 *
 * @param html - The HTML string to convert
 * @returns Markdown formatted string
 */
export function convertHtmlToMarkdown(html: string): string {
  return markdownConverter.turndown(html);
}

/**
 * Configures the markdown converter with custom options
 *
 * @param options - Turndown service options to override defaults
 */
export function configureMarkdownConverter(
  options: Partial<TurndownService.Options>
): void {
  Object.assign(markdownConverter.options, options);
}

/**
 * Adds a custom conversion rule to the markdown converter
 *
 * @param name - Name of the rule
 * @param rule - The rule configuration
 */
export function addMarkdownConversionRule(
  name: string,
  rule: TurndownService.Rule
): void {
  markdownConverter.addRule(name, rule);
}
