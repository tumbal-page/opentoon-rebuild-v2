/**
 * Chapter Storage Utility
 *
 * Handles saving and loading chapters with their images and translations.
 * Uses local file system for image storage.
 */

import * as FileSystem from "expo-file-system";
import {
  initDatabase,
  insertComic,
  insertChapter,
  insertRawPage,
  insertTranslationUnit,
  insertTextBlock,
  getChapters,
  getRawPages,
  getTextBlocksForChapter,
  deleteChapter as dbDeleteChapter,
} from "../database/database";

const CHAPTERS_DIR = `${FileSystem.documentDirectory}chapters/`;

export interface ChapterData {
  id: string;
  title: string;
  url: string;
  comicTitle: string;
  pageCount: number;
  createdAt: string;
  updatedAt: string;
  status: "scanning" | "translating" | "completed";
  sourceLanguage: string;
  targetLanguage: string;
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Initialize storage
 */
export async function initStorage(): Promise<void> {
  await initDatabase();

  // Ensure chapters directory exists
  const dirInfo = await FileSystem.getInfoAsync(CHAPTERS_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(CHAPTERS_DIR, { intermediates: true });
  }
}

/**
 * Create a new chapter
 */
export async function createChapter(
  title: string,
  url: string,
  sourceLanguage: string = "ja",
  targetLanguage: string = "en"
): Promise<string> {
  const chapterId = generateId();
  const comicId = generateId();

  // Create comic entry
  await insertComic(comicId, title, "manga", sourceLanguage, targetLanguage);

  // Create chapter entry
  await insertChapter(chapterId, comicId, title, "1", url, "scanning");

  // Create chapter directory
  const chapterDir = `${CHAPTERS_DIR}${chapterId}/`;
  await FileSystem.makeDirectoryAsync(chapterDir, { intermediates: true });
  await FileSystem.makeDirectoryAsync(`${chapterDir}images/`, {
    intermediates: true,
  });

  return chapterId;
}

/**
 * Save page image to chapter
 */
export async function savePageImage(
  chapterId: string,
  pageIndex: number,
  imageUri: string
): Promise<string> {
  const imagesDir = `${CHAPTERS_DIR}${chapterId}/images/`;

  // Copy image to chapter directory
  const fileName = `page_${String(pageIndex).padStart(3, "0")}.jpg`;
  const destUri = `${imagesDir}${fileName}`;

  await FileSystem.copyAsync({ from: imageUri, to: destUri });

  // Get file info
  const fileInfo = await FileSystem.getInfoAsync(destUri);

  // Save to database
  const pageId = generateId();
  await insertRawPage(
    pageId,
    chapterId,
    pageIndex,
    destUri,
    0, // width (will be set later)
    0, // height (will be set later)
    fileInfo.size || 0
  );

  return destUri;
}

/**
 * Save detection results for a page
 */
export async function saveDetectionResults(
  chapterId: string,
  pageIndex: number,
  detectedBoxes: any[]
): Promise<void> {
  const chapterDir = `${CHAPTERS_DIR}${chapterId}/`;
  const fileName = `detection_${String(pageIndex).padStart(3, "0")}.json`;

  await FileSystem.writeAsStringAsync(
    `${chapterDir}${fileName}`,
    JSON.stringify(detectedBoxes, null, 2)
  );
}

/**
 * Save translation results for a page
 */
export async function saveTranslationResults(
  chapterId: string,
  pageIndex: number,
  translatedBlocks: any[]
): Promise<void> {
  const chapterDir = `${CHAPTERS_DIR}${chapterId}/`;
  const fileName = `translation_${String(pageIndex).padStart(3, "0")}.json`;

  await FileSystem.writeAsStringAsync(
    `${chapterDir}${fileName}`,
    JSON.stringify(translatedBlocks, null, 2)
  );

  // Save text blocks to database
  for (const block of translatedBlocks) {
    const blockId = generateId();
    const unitId = generateId();

    await insertTextBlock(
      blockId,
      unitId,
      0,
      block.x,
      block.y,
      block.width,
      block.height,
      block.rotationDeg || 0,
      block.fontColor || "#000000",
      block.rawText || "",
      block.translatedText || "",
      block.displayMode || "overlay",
      block.classId || 2,
      block.confidence || 0
    );
  }
}

/**
 * Load all chapters
 */
export async function loadChapters(): Promise<ChapterData[]> {
  try {
    const comics = await import("../database/database").then(m => m.getComics());
    const allChapters: ChapterData[] = [];

    for (const comic of comics) {
      const chapters = await getChapters(comic.id);
      for (const chapter of chapters) {
        allChapters.push({
          id: chapter.id,
          title: chapter.title,
          url: chapter.url,
          comicTitle: comic.title,
          pageCount: 0, // Will be loaded separately
          createdAt: chapter.created_at,
          updatedAt: chapter.updated_at,
          status: chapter.status,
          sourceLanguage: comic.language,
          targetLanguage: comic.target_language,
        });
      }
    }

    return allChapters.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error("Failed to load chapters:", error);
    return [];
  }
}

/**
 * Load pages for a chapter
 */
export async function loadChapterPages(
  chapterId: string
): Promise<{ imageUri: string; pageIndex: number }[]> {
  const pages = await getRawPages(chapterId);
  return pages.map((p) => ({
    imageUri: p.raw_image_uri,
    pageIndex: p.page_number,
  }));
}

/**
 * Delete a chapter and its files
 */
export async function deleteChapterFiles(chapterId: string): Promise<void> {
  // Delete from database
  await dbDeleteChapter(chapterId);

  // Delete files
  const chapterDir = `${CHAPTERS_DIR}${chapterId}/`;
  const dirInfo = await FileSystem.getInfoAsync(chapterDir);
  if (dirInfo.exists) {
    await FileSystem.deleteAsync(chapterDir, { idempotent: true });
  }
}

/**
 * Get chapter statistics
 */
export async function getChapterStats(chapterId: string): Promise<{
  totalPages: number;
  translatedPages: number;
  totalTextBlocks: number;
  translatedTextBlocks: number;
} | null> {
  try {
    const pages = await getRawPages(chapterId);
    const textBlocks = await getTextBlocksForChapter(chapterId);

    return {
      totalPages: pages.length,
      translatedPages: 0, // Will be calculated from translations
      totalTextBlocks: textBlocks.length,
      translatedTextBlocks: textBlocks.filter(
        (b: any) => b.translated_text
      ).length,
    };
  } catch {
    return null;
  }
}
