/**
 * Translation Service
 *
 * Handles communication with the translation server.
 * Sends images + detected text blocks, receives translated text + inpainted images.
 */

import * as SecureStore from "expo-secure-store";
import * as FileSystem from "expo-file-system";

const STORAGE_KEYS = {
  SERVER_URL: "libretranslate_url",
  SOURCE_LANG: "source_language",
  TARGET_LANG: "target_language",
};

// Default language mapping for LibreTranslate
const LANG_MAP: Record<string, string> = {
  ja: "ja",
  ko: "ko",
  zh: "zh",
  en: "en",
  id: "id",
  ms: "ms",
};

export interface DetectedTextBlock {
  x: number;
  y: number;
  width: number;
  height: number;
  classId: number; // 1 = speech bubble, 2 = free text
  confidence: number;
}

export interface TranslatedBlock {
  x: number;
  y: number;
  width: number;
  height: number;
  rawText: string;
  translatedText: string;
  fontColor: string;
  displayMode: string;
  fontSize: number;
}

export interface TranslationRequest {
  imageData: string; // base64
  textBlocks: {
    x: number;
    y: number;
    width: number;
    height: number;
    classId: number;
  }[];
  sourceLanguage: string;
  targetLanguage: string;
}

export interface TranslationResponse {
  textBlocks: TranslatedBlock[];
  inpaintedImageUri: string;
  metadata: {
    processingTimeMs: number;
    modelVersion: string;
  };
}

/**
 * Get server URL from settings
 */
async function getServerUrl(): Promise<string> {
  const saved = await SecureStore.getItemAsync(STORAGE_KEYS.SERVER_URL);
  return saved || "http://192.168.1.100:5000";
}

/**
 * Get language settings
 */
async function getLanguageSettings(): Promise<{ source: string; target: string }> {
  const source = (await SecureStore.getItemAsync(STORAGE_KEYS.SOURCE_LANG)) || "ja";
  const target = (await SecureStore.getItemAsync(STORAGE_KEYS.TARGET_LANG)) || "en";
  return { source, target };
}

/**
 * Translate a single text string
 */
export async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  if (!text || text.trim().length === 0) return text;

  const serverUrl = await getServerUrl();
  const source = LANG_MAP[sourceLang] || sourceLang;
  const target = LANG_MAP[targetLang] || targetLang;

  try {
    const response = await fetch(`${serverUrl}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: text,
        source: source,
        target: target,
        format: "text",
      }),
    });

    if (!response.ok) {
      throw new Error(`Translation failed: ${response.status}`);
    }

    const data = await response.json();
    return data.translatedText || text;
  } catch (error) {
    console.error("Translation failed:", error);
    throw error;
  }
}

/**
 * Translate multiple texts in batch
 */
export async function translateBatch(
  texts: string[],
  sourceLang: string,
  targetLang: string
): Promise<string[]> {
  if (texts.length === 0) return [];

  const serverUrl = await getServerUrl();
  const source = LANG_MAP[sourceLang] || sourceLang;
  const target = LANG_MAP[targetLang] || targetLang;

  try {
    const response = await fetch(`${serverUrl}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: texts,
        source: source,
        target: target,
        format: "text",
      }),
    });

    if (!response.ok) {
      throw new Error(`Batch translation failed: ${response.status}`);
    }

    const data = await response.json();

    if (Array.isArray(data)) {
      return data.map((item: any) => item.translatedText || "");
    }
    return [data.translatedText || ""];
  } catch (error) {
    console.error("Batch translation failed:", error);
    // Fallback: translate one by one
    const results: string[] = [];
    for (const text of texts) {
      try {
        const translated = await translateText(text, sourceLang, targetLang);
        results.push(translated);
      } catch {
        results.push(text);
      }
    }
    return results;
  }
}

/**
 * Translate detected text blocks for an image
 */
export async function translateDetectedBlocks(
  boxes: DetectedTextBlock[],
  sourceLanguage: string,
  targetLanguage: string
): Promise<TranslatedBlock[]> {
  if (boxes.length === 0) return [];

  // Extract mock texts (in production, these come from OCR)
  const rawTexts = boxes.map(
    (box) => `[Text at ${Math.round(box.x)},${Math.round(box.y)}]`
  );

  // Batch translate
  const translatedTexts = await translateBatch(rawTexts, sourceLanguage, targetLanguage);

  // Combine with position data
  return boxes.map((box, index) => ({
    x: box.x,
    y: box.y,
    width: box.x2 ? box.x2 - box.x : box.width,
    height: box.y2 ? box.y2 - box.y : box.height,
    rawText: rawTexts[index],
    translatedText: translatedTexts[index] || rawTexts[index],
    fontColor: box.classId === 1 ? "#FFFFFF" : "#000000",
    displayMode: box.classId === 1 ? "bubble" : "overlay",
    fontSize: Math.round((box.y2 ? box.y2 - box.y : box.height) * 0.75),
  }));
}

/**
 * Check if LibreTranslate server is reachable
 */
export async function checkServerHealth(): Promise<boolean> {
  try {
    const serverUrl = await getServerUrl();
    const response = await fetch(`${serverUrl}/languages`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get available languages from LibreTranslate
 */
export async function getAvailableLanguages(): Promise<
  { code: string; name: string }[]
> {
  try {
    const serverUrl = await getServerUrl();
    const response = await fetch(`${serverUrl}/languages`);
    const data = await response.json();
    return data.map((lang: any) => ({
      code: lang.code,
      name: lang.name,
    }));
  } catch {
    return [];
  }
}
