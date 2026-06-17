/**
 * Database Schema - SQLite/PowerSync
 *
 * Based on the original OpenToon app's database structure.
 * Handles offline-first data with local-first storage.
 */

export const DATABASE_SCHEMA = `
-- Comics table
CREATE TABLE IF NOT EXISTS comics (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  title TEXT NOT NULL,
  type TEXT DEFAULT 'manga',
  language TEXT DEFAULT 'ja',
  target_language TEXT DEFAULT 'en',
  cover_image TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Chapters table
CREATE TABLE IF NOT EXISTS chapters (
  id TEXT PRIMARY KEY,
  comic_id TEXT NOT NULL,
  title TEXT,
  chapter_number TEXT,
  url TEXT,
  status TEXT DEFAULT 'scanning',
  authorized_image_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (comic_id) REFERENCES comics(id) ON DELETE CASCADE
);

-- Raw Pages table (captured images)
CREATE TABLE IF NOT EXISTS raw_page (
  id TEXT PRIMARY KEY,
  chapter_id TEXT NOT NULL,
  page_number INTEGER NOT NULL,
  raw_image_uri TEXT NOT NULL,
  width INTEGER DEFAULT 0,
  height INTEGER DEFAULT 0,
  file_size INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
);

-- Translation Units table
CREATE TABLE IF NOT EXISTS translation_unit (
  id TEXT PRIMARY KEY,
  chapter_id TEXT NOT NULL,
  stitched_raw_image_uri TEXT,
  inpainted_image_uri TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
);

-- Translation Unit Pages (junction table)
CREATE TABLE IF NOT EXISTS translation_unit_pages (
  id TEXT PRIMARY KEY,
  translation_unit_id TEXT NOT NULL,
  raw_page_id TEXT NOT NULL,
  "order" INTEGER DEFAULT 0,
  FOREIGN KEY (translation_unit_id) REFERENCES translation_unit(id) ON DELETE CASCADE,
  FOREIGN KEY (raw_page_id) REFERENCES raw_page(id) ON DELETE CASCADE
);

-- Text Blocks table (detected/translated text regions)
CREATE TABLE IF NOT EXISTS text_blocks (
  id TEXT PRIMARY KEY,
  translation_unit_id TEXT NOT NULL,
  sequence INTEGER DEFAULT 0,
  x REAL NOT NULL,
  y REAL NOT NULL,
  width REAL NOT NULL,
  height REAL NOT NULL,
  rotation_deg REAL DEFAULT 0,
  font_color TEXT DEFAULT '#000000',
  raw_text TEXT,
  translated_text TEXT,
  display_mode TEXT DEFAULT 'overlay',
  class_id INTEGER DEFAULT 2,
  confidence REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (translation_unit_id) REFERENCES translation_unit(id) ON DELETE CASCADE
);

-- Chapter Page Tokens (coin economy)
CREATE TABLE IF NOT EXISTS chapter_page_tokens (
  id TEXT PRIMARY KEY,
  chapter_id TEXT NOT NULL,
  token TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
);

-- User Settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  scroll_mode TEXT DEFAULT 'vertical',
  swipe_direction TEXT DEFAULT 'left_to_right',
  text_font TEXT DEFAULT 'sans-serif',
  source_language TEXT DEFAULT 'ja',
  target_language TEXT DEFAULT 'en',
  server_url TEXT,
  display_mode TEXT DEFAULT 'overlay',
  auto_save INTEGER DEFAULT 1,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Reader Settings table
CREATE TABLE IF NOT EXISTS reader_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  brightness REAL DEFAULT 1.0,
  page_turn_animation TEXT DEFAULT 'slide',
  keep_screen_on INTEGER DEFAULT 1,
  show_page_numbers INTEGER DEFAULT 1,
  vertical_scroll_mode TEXT DEFAULT 'continuous',
  horizontal_scroll_mode TEXT DEFAULT 'paging',
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chapters_comic_id ON chapters(comic_id);
CREATE INDEX IF NOT EXISTS idx_raw_page_chapter_id ON raw_page(chapter_id);
CREATE INDEX IF NOT EXISTS idx_translation_unit_chapter_id ON translation_unit(chapter_id);
CREATE INDEX IF NOT EXISTS idx_text_blocks_translation_unit_id ON text_blocks(translation_unit_id);
CREATE INDEX IF NOT EXISTS idx_chapter_page_tokens_chapter_id ON chapter_page_tokens(chapter_id);
`;

/**
 * Database queries used throughout the app
 */
export const QUERIES = {
  // Comic operations
  INSERT_COMIC: `INSERT INTO comics (id, user_id, title, type, language, target_language, cover_image) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  GET_COMICS: `SELECT * FROM comics ORDER BY updated_at DESC`,
  GET_COMIC_BY_ID: `SELECT * FROM comics WHERE id = ?`,
  UPDATE_COMIC: `UPDATE comics SET title = ?, updated_at = datetime('now') WHERE id = ?`,
  DELETE_COMIC: `DELETE FROM comics WHERE id = ?`,

  // Chapter operations
  INSERT_CHAPTER: `INSERT INTO chapters (id, comic_id, title, chapter_number, url, status) VALUES (?, ?, ?, ?, ?, ?)`,
  GET_CHAPTERS: `SELECT * FROM chapters WHERE comic_id = ? ORDER BY chapter_number ASC`,
  GET_CHAPTER_BY_ID: `SELECT * FROM chapters WHERE id = ?`,
  UPDATE_CHAPTER_STATUS: `UPDATE chapters SET status = ?, updated_at = datetime('now') WHERE id = ?`,
  DELETE_CHAPTER: `DELETE FROM chapters WHERE id = ?`,

  // Raw Page operations
  INSERT_RAW_PAGE: `INSERT INTO raw_page (id, chapter_id, page_number, raw_image_uri, width, height, file_size) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  GET_RAW_PAGES: `SELECT * FROM raw_page WHERE chapter_id = ? ORDER BY page_number ASC`,
  GET_RAW_PAGE_BY_ID: `SELECT * FROM raw_page WHERE id = ?`,
  DELETE_RAW_PAGES: `DELETE FROM raw_page WHERE chapter_id = ?`,

  // Translation Unit operations
  INSERT_TRANSLATION_UNIT: `INSERT INTO translation_unit (id, chapter_id, stitched_raw_image_uri, inpainted_image_uri, status) VALUES (?, ?, ?, ?, ?)`,
  GET_TRANSLATION_UNITS: `SELECT * FROM translation_unit WHERE chapter_id = ?`,
  UPDATE_TRANSLATION_UNIT_STATUS: `UPDATE translation_unit SET status = ?, updated_at = datetime('now') WHERE id = ?`,

  // Translation Unit Pages operations
  INSERT_TRANSLATION_UNIT_PAGE: `INSERT INTO translation_unit_pages (id, translation_unit_id, raw_page_id, "order") VALUES (?, ?, ?, ?)`,
  GET_TRANSLATION_UNIT_PAGES: `SELECT * FROM translation_unit_pages WHERE translation_unit_id = ? ORDER BY "order" ASC`,

  // Text Block operations
  INSERT_TEXT_BLOCK: `INSERT INTO text_blocks (id, translation_unit_id, sequence, x, y, width, height, rotation_deg, font_color, raw_text, translated_text, display_mode, class_id, confidence) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  GET_TEXT_BLOCKS: `SELECT * FROM text_blocks WHERE translation_unit_id = ? ORDER BY sequence ASC`,
  GET_TEXT_BLOCKS_FOR_CHAPTER: `
    SELECT tb.* FROM text_blocks tb
    INNER JOIN translation_unit tu ON tb.translation_unit_id = tu.id
    WHERE tu.chapter_id = ?
    ORDER BY tb.sequence ASC
  `,
  UPDATE_TRANSLATED_TEXT: `UPDATE text_blocks SET translated_text = ?, updated_at = datetime('now') WHERE id = ?`,
  UPDATE_DISPLAY_MODE: `UPDATE text_blocks SET display_mode = ?, updated_at = datetime('now') WHERE id = ?`,
  DELETE_TEXT_BLOCKS: `DELETE FROM text_blocks WHERE translation_unit_id = ?`,

  // Chapter Page Token operations
  INSERT_PAGE_TOKEN: `INSERT INTO chapter_page_tokens (id, chapter_id, token) VALUES (?, ?, ?)`,
  GET_PAGE_TOKENS: `SELECT * FROM chapter_page_tokens WHERE chapter_id = ? ORDER BY created_at ASC`,
  GET_UNUSED_PAGE_TOKENS: `SELECT * FROM chapter_page_tokens WHERE chapter_id = ? AND used_at IS NULL LIMIT 1`,
  MARK_TOKEN_USED: `UPDATE chapter_page_tokens SET used_at = datetime('now') WHERE id = ?`,

  // User Settings operations
  UPSERT_SETTINGS: `INSERT OR REPLACE INTO user_settings (id, scroll_mode, swipe_direction, text_font, source_language, target_language, server_url, display_mode, auto_save) VALUES ('default', ?, ?, ?, ?, ?, ?, ?, ?)`,
  GET_SETTINGS: `SELECT * FROM user_settings WHERE id = 'default'`,

  // Reader Settings operations
  UPSERT_READER_SETTINGS: `INSERT OR REPLACE INTO reader_settings (id, brightness, page_turn_animation, keep_screen_on, show_page_numbers, vertical_scroll_mode, horizontal_scroll_mode) VALUES ('default', ?, ?, ?, ?, ?, ?)`,
  GET_READER_SETTINGS: `SELECT * FROM reader_settings WHERE id = 'default'`,

  // Statistics
  GET_CHAPTER_STATS: `
    SELECT
      c.id,
      c.title,
      c.chapter_number,
      c.status,
      COUNT(DISTINCT rp.id) as page_count,
      COUNT(DISTINCT tu.id) as translation_unit_count,
      COUNT(DISTINCT tb.id) as text_block_count,
      SUM(CASE WHEN tb.translated_text IS NOT NULL THEN 1 ELSE 0 END) as translated_count
    FROM chapters c
    LEFT JOIN raw_page rp ON rp.chapter_id = c.id
    LEFT JOIN translation_unit tu ON tu.chapter_id = c.id
    LEFT JOIN text_blocks tb ON tb.translation_unit_id = tu.id
    WHERE c.comic_id = ?
    GROUP BY c.id
    ORDER BY c.chapter_number ASC
  `,

  // Cleanup
  DELETE_CHAPTER_CASCADE: `
    DELETE FROM text_blocks WHERE translation_unit_id IN (SELECT id FROM translation_unit WHERE chapter_id = ?);
    DELETE FROM translation_unit_pages WHERE translation_unit_id IN (SELECT id FROM translation_unit WHERE chapter_id = ?);
    DELETE FROM translation_unit WHERE chapter_id = ?;
    DELETE FROM chapter_page_tokens WHERE chapter_id = ?;
    DELETE FROM raw_page WHERE chapter_id = ?;
    DELETE FROM chapters WHERE id = ?
  `,
};
