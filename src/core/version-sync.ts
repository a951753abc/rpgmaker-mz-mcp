import path from 'node:path';
import { FileHandler } from './file-handler.js';
import { logger } from '../logger.js';

/**
 * Manages System.json versionId to force RPG Maker MZ editor to reload data.
 * Every time a data file is modified, versionId must be incremented.
 */
export class VersionSync {
  private systemPath: string;

  constructor(projectPath: string) {
    this.systemPath = path.join(projectPath, 'data', 'System.json');
  }

  /**
   * Increment versionId in System.json.
   * RPG Maker MZ uses this to detect external changes.
   */
  async bump(): Promise<number> {
    const system = (await FileHandler.readJsonRaw(this.systemPath)) as Record<string, unknown>;
    const current = typeof system.versionId === 'number' ? system.versionId : 0;
    const next = current + 1;
    system.versionId = next;
    await FileHandler.writeJson(this.systemPath, system);
    logger.info(`versionId bumped: ${current} → ${next}`);
    return next;
  }

  /**
   * Get current versionId without modifying.
   */
  async current(): Promise<number> {
    const system = (await FileHandler.readJsonRaw(this.systemPath)) as Record<string, unknown>;
    return typeof system.versionId === 'number' ? system.versionId : 0;
  }
}
