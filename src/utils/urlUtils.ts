// Function to check if a string is a valid URL
export function isValidUrl(input: string): boolean {
  try {
    new URL(input);
    return true;
  } catch {
    return false;
  }
}

// Function to detect social media providers from URL
export function detectSocialProvider(url: string): {
  isSocial: boolean;
  provider?: "tiktok" | "instagram" | "facebook" | "pinterest" | "x";
  displayName?: string;
} {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // Remove 'www.' prefix if present
    const cleanHostname = hostname.replace(/^www\./, "");

    // Check for each social provider
    if (cleanHostname.includes("tiktok.com")) {
      return { isSocial: true, provider: "tiktok", displayName: "TikTok" };
    }

    if (cleanHostname.includes("instagram.com")) {
      return {
        isSocial: true,
        provider: "instagram",
        displayName: "Instagram",
      };
    }

    if (
      cleanHostname.includes("facebook.com") ||
      cleanHostname.includes("fb.com")
    ) {
      return { isSocial: true, provider: "facebook", displayName: "Facebook" };
    }

    if (
      cleanHostname.includes("pinterest.com") ||
      cleanHostname.includes("pin.it")
    ) {
      return {
        isSocial: true,
        provider: "pinterest",
        displayName: "Pinterest",
      };
    }

    if (
      cleanHostname.includes("twitter.com") ||
      cleanHostname.includes("x.com") ||
      cleanHostname.includes("t.co")
    ) {
      return { isSocial: true, provider: "x", displayName: "X (Twitter)" };
    }

    return { isSocial: false };
  } catch {
    return { isSocial: false };
  }
}
