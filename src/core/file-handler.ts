import fs from 'node:fs/promises';
import path from 'node:path';
import { type ZodSchema } from 'zod';
import { logger } from '../logger.js';

/**
 * Safe file handler with atomic writes, automatic backups, and Zod validation.
 */
export class FileHandler {
  /**
   * Read and parse a JSON file with Zod validation.
   */
  static async readJson<T>(filePath: string, schema: ZodSchema<T>): Promise<T> {
    const raw = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    const result = schema.safeParse(parsed);
    if (!result.success) {
      throw new Error(
        `Validation failed for ${path.basename(filePath)}: ${result.error.message}`
      );
    }
    return result.data;
  }

  /**
   * Read a JSON file without validation (for passthrough data).
   */
  static async readJsonRaw(filePath: string): Promise<unknown> {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  }

  /**
   * Atomic write: write to .tmp file, then rename to target.
   * Creates .bak backup of existing file before overwriting.
   */
  static async writeJson(filePath: string, data: unknown): Promise<void> {
    const tmpPath = filePath + '.tmp';
    const bakPath = filePath + '.bak';

    // Create backup if original exists
    try {
      await fs.access(filePath);
      await fs.copyFile(filePath, bakPath);
      logger.debug(`Backup created: ${bakPath}`);
    } catch {
      // File doesn't exist yet, no backup needed
    }

    // Atomic write: write to tmp, then rename
    const json = JSON.stringify(data, null, 2) + '\n';
    await fs.writeFile(tmpPath, json, 'utf-8');
    await fs.rename(tmpPath, filePath);
    logger.debug(`Written: ${filePath}`);
  }

  /**
   * Check if a file exists.
   */
  static async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Ensure a directory exists, creating it recursively if needed.
   */
  static async ensureDir(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true });
  }

  /**
   * List files in a directory matching an optional pattern.
   */
  static async listFiles(dirPath: string, ext?: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      let files = entries
        .filter((e) => e.isFile())
        .map((e) => e.name);
      if (ext) {
        files = files.filter((f) => f.endsWith(ext));
      }
      return files.sort();
    } catch {
      return [];
    }
  }

  /**
   * List subdirectories.
   */
  static async listDirs(dirPath: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      return entries
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort();
    } catch {
      return [];
    }
  }

  /**
   * Delete a file.
   */
  static async deleteFile(filePath: string): Promise<void> {
    await fs.unlink(filePath);
  }

  /**
   * Copy a file.
   */
  static async copyFile(src: string, dest: string): Promise<void> {
    await fs.copyFile(src, dest);
  }
}
