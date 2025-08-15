// Function to convert language names to ISO 639-1 codes
export function getLanguageISOCode(language: string): string | undefined {
  if (!language) return undefined;

  const languageLower = language.toLowerCase().trim();

  // Common language mappings to ISO 639-1 codes
  const languageMap: Record<string, string> = {
    // Major languages
    english: "en",
    spanish: "es",
    french: "fr",
    german: "de",
    italian: "it",
    portuguese: "pt",
    russian: "ru",
    chinese: "zh",
    japanese: "ja",
    korean: "ko",
    arabic: "ar",
    hindi: "hi",
    dutch: "nl",
    swedish: "sv",
    norwegian: "no",
    danish: "da",
    finnish: "fi",
    polish: "pl",
    czech: "cs",
    hungarian: "hu",
    greek: "el",
    hebrew: "he",
    thai: "th",
    vietnamese: "vi",
    turkish: "tr",
    indonesian: "id",
    malay: "ms",
    filipino: "tl",
    ukrainian: "uk",
    romanian: "ro",
    bulgarian: "bg",
    croatian: "hr",
    serbian: "sr",
    slovak: "sk",
    slovenian: "sl",
    lithuanian: "lt",
    latvian: "lv",
    estonian: "et",
    catalan: "ca",
    basque: "eu",
    galician: "gl",
    irish: "ga",
    welsh: "cy",
    scottish: "gd",
    icelandic: "is",
    maltese: "mt",
    luxembourgish: "lb",
    albanian: "sq",
    macedonian: "mk",
    belarusian: "be",
    georgian: "ka",
    armenian: "hy",
    azerbaijani: "az",
    kazakh: "kk",
    uzbek: "uz",
    kyrgyz: "ky",
    tajik: "tg",
    turkmen: "tk",
    mongolian: "mn",
    tibetan: "bo",
    burmese: "my",
    khmer: "km",
    lao: "lo",
    bengali: "bn",
    urdu: "ur",
    punjabi: "pa",
    gujarati: "gu",
    marathi: "mr",
    tamil: "ta",
    telugu: "te",
    kannada: "kn",
    malayalam: "ml",
    sinhalese: "si",
    nepali: "ne",
    persian: "fa",
    farsi: "fa",
    dari: "prs",
    pashto: "ps",
    kurdish: "ku",
    swahili: "sw",
    yoruba: "yo",
    igbo: "ig",
    hausa: "ha",
    amharic: "am",
    oromo: "om",
    somali: "so",
    zulu: "zu",
    xhosa: "xh",
    afrikaans: "af",
    // Alternative names
    mandarin: "zh",
    cantonese: "yue",
    "simplified chinese": "zh",
    "traditional chinese": "zh",
    "mexican spanish": "es",
    "latin american spanish": "es",
    castilian: "es",
    "brazilian portuguese": "pt",
    "european portuguese": "pt",
    "american english": "en",
    "british english": "en",
    "australian english": "en",
    "canadian english": "en",
    "canadian french": "fr",
    "quebec french": "fr",
    "swiss german": "de",
    "austrian german": "de",
  };

  // Direct lookup
  if (languageMap[languageLower]) {
    return languageMap[languageLower];
  }

  // Try partial matches for compound language names
  for (const [name, code] of Object.entries(languageMap)) {
    if (languageLower.includes(name) || name.includes(languageLower)) {
      return code;
    }
  }

  // If it's already an ISO code, return it
  if (languageLower.length === 2 && /^[a-z]{2}$/.test(languageLower)) {
    return languageLower;
  }

  return undefined;
}
