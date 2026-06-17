/**
 * Database Service - SQLite Operations
 *
 * Handles all database operations for the app.
 * Uses expo-sqlite for local storage.
 */

import * as SQLite from "expo-sqlite";
import { DATABASE_SCHEMA, QUERIES } from "./schema";

let db: SQLite.SQLiteDatabase | null = null;

/**
 * Initialize database
 */
export async function initDatabase(): Promise<void> {
  if (db) return;

  try {
    db = await SQLite.openDatabaseAsync("opentoon.db");

    // Create tables
    await db.execAsync(DATABASE_SCHEMA);

    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Failed to initialize database:", error);
    throw error;
  }
}

/**
 * Get database instance
 */
function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return db;
}

// ============================================================
// COMIC OPERATIONS
// ============================================================

export async function insertComic(
  id: string,
  title: string,
  type: string = "manga",
  language: string = "ja",
  targetLanguage: string = "en",
  coverImage?: string
): Promise<void> {
  const database = getDb();
  await database.runAsync(
    QUERIES.INSERT_COMIC,
    id,
    "local",
    title,
    type,
    language,
    targetLanguage,
    coverImage || ""
  );
}

export async function getComics(): Promise<any[]> {
  const database = getDb();
  return await database.getAllAsync(QUERIES.GET_COMICS);
}

export async function getComicById(id: string): Promise<any | null> {
  const database = getDb();
  return await database.getFirstAsync(QUERIES.GET_COMIC_BY_ID, id);
}

export async function deleteComic(id: string): Promise<void> {
  const database = getDb();
  await database.runAsync(QUERIES.DELETE_COMIC, id);
}

// ============================================================
// CHAPTER OPERATIONS
// ============================================================

export async function insertChapter(
  id: string,
  comicId: string,
  title: string,
  chapterNumber: string,
  url: string,
  status: string = "scanning"
): Promise<void> {
  const database = getDb();
  await database.runAsync(
    QUERIES.INSERT_CHAPTER,
    id,
    comicId,
    title,
    chapterNumber,
    url,
    status
  );
}

export async function getChapters(comicId: string): Promise<any[]> {
  const database = getDb();
  return await database.getAllAsync(QUERIES.GET_CHAPTERS, comicId);
}

export async function getChapterById(id: string): Promise<any | null> {
  const database = getDb();
  return await database.getFirstAsync(QUERIES.GET_CHAPTER_BY_ID, id);
}

export async function updateChapterStatus(
  id: string,
  status: string
): Promise<void> {
  const database = getDb();
  await database.runAsync(QUERIES.UPDATE_CHAPTER_STATUS, status, id);
}

export async function deleteChapter(id: string): Promise<void> {
  const database = getDb();
  await database.runAsync(QUERIES.DELETE_CHAPTER, id);
}

// ============================================================
// RAW PAGE OPERATIONS
// ============================================================

export async function insertRawPage(
  id: string,
  chapterId: string,
  pageNumber: number,
  imageUri: string,
  width: number = 0,
  height: number = 0,
  fileSize: number = 0
): Promise<void> {
  const database = getDb();
  await database.runAsync(
    QUERIES.INSERT_RAW_PAGE,
    id,
    chapterId,
    pageNumber,
    imageUri,
    width,
    height,
    fileSize
  );
}

export async function getRawPages(chapterId: string): Promise<any[]> {
  const database = getDb();
  return await database.getAllAsync(QUERIES.GET_RAW_PAGES, chapterId);
}

export async function deleteRawPages(chapterId: string): Promise<void> {
  const database = getDb();
  await database.runAsync(QUERIES.DELETE_RAW_PAGES, chapterId);
}

// ============================================================
// TRANSLATION UNIT OPERATIONS
// ============================================================

export async function insertTranslationUnit(
  id: string,
  chapterId: string,
  stitchedUri?: string,
  inpaintedUri?: string,
  status: string = "pending"
): Promise<void> {
  const database = getDb();
  await database.runAsync(
    QUERIES.INSERT_TRANSLATION_UNIT,
    id,
    chapterId,
    stitchedUri || "",
    inpaintedUri || "",
    status
  );
}

export async function getTranslationUnits(
  chapterId: string
): Promise<any[]> {
  const database = getDb();
  return await database.getAllAsync(QUERIES.GET_TRANSLATION_UNITS, chapterId);
}

// ============================================================
// TEXT BLOCK OPERATIONS
// ============================================================

export async function insertTextBlock(
  id: string,
  translationUnitId: string,
  sequence: number,
  x: number,
  y: number,
  width: number,
  height: number,
  rotationDeg: number = 0,
  fontColor: string = "#000000",
  rawText: string = "",
  translatedText: string = "",
  displayMode: string = "overlay",
  classId: number = 2,
  confidence: number = 0
): Promise<void> {
  const database = getDb();
  await database.runAsync(
    QUERIES.INSERT_TEXT_BLOCK,
    id,
    translationUnitId,
    sequence,
    x,
    y,
    width,
    height,
    rotationDeg,
    fontColor,
    rawText,
    translatedText,
    displayMode,
    classId,
    confidence
  );
}

export async function getTextBlocks(
  translationUnitId: string
): Promise<any[]> {
  const database = getDb();
  return await database.getAllAsync(
    QUERIES.GET_TEXT_BLOCKS,
    translationUnitId
  );
}

export async function getTextBlocksForChapter(
  chapterId: string
): Promise<any[]> {
  const database = getDb();
  return await database.getAllAsync(
    QUERIES.GET_TEXT_BLOCKS_FOR_CHAPTER,
    chapterId
  );
}

export async function updateTranslatedText(
  id: string,
  translatedText: string
): Promise<void> {
  const database = getDb();
  await database.runAsync(QUERIES.UPDATE_TRANSLATED_TEXT, translatedText, id);
}

// ============================================================
// SETTINGS OPERATIONS
// ============================================================

export async function getSettings(): Promise<any> {
  const database = getDb();
  return await database.getFirstAsync(QUERIES.GET_SETTINGS);
}

export async function saveSettings(settings: {
  scroll_mode?: string;
  swipe_direction?: string;
  text_font?: string;
  source_language?: string;
  target_language?: string;
  server_url?: string;
  display_mode?: string;
  auto_save?: number;
}): Promise<void> {
  const database = getDb();
  const current = await getSettings();

  await database.runAsync(
    QUERIES.UPsert_SETTINGS,
    settings.scroll_mode || current?.scroll_mode || "vertical",
    settings.swipe_direction || current?.swipe_direction || "left_to_right",
    settings.text_font || current?.text_font || "sans-serif",
    settings.source_language || current?.source_language || "ja",
    settings.target_language || current?.target_language || "en",
    settings.server_url || current?.server_url || "",
    settings.display_mode || current?.display_mode || "overlay",
    settings.auto_save ?? current?.auto_save ?? 1
  );
}

// ============================================================
// CHAPTER STATISTICS
// ============================================================

export async function getChapterStats(comicId: string): Promise<any[]> {
  const database = getDb();
  return await database.getAllAsync(QUERIES.GET_CHAPTER_STATS, comicId);
}
