import path from 'node:path';
import { FileHandler } from './file-handler.js';
import { VersionSync } from './version-sync.js';
import { logger } from '../logger.js';

/** Required data files for a valid RPG Maker MZ project. */
const REQUIRED_DATA_FILES = [
  'Actors.json',
  'Classes.json',
  'CommonEvents.json',
  'Enemies.json',
  'Items.json',
  'MapInfos.json',
  'Skills.json',
  'States.json',
  'System.json',
  'Tilesets.json',
  'Troops.json',
  'Weapons.json',
  'Armors.json',
  'Animations.json',
];

/** Accepted project file names (RPG Maker MZ uses lowercase since ~v1.6). */
const PROJECT_FILES = ['game.rmmzproject', 'Game.rmmzproject'];

export interface ProjectInfo {
  name: string;
  path: string;
  dataFiles: string[];
  mapCount: number;
  actorCount: number;
  itemCount: number;
  versionId: number;
}

export class ProjectManager {
  private projectPath: string;
  private versionSync: VersionSync;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.versionSync = new VersionSync(projectPath);
  }

  get path(): string {
    return this.projectPath;
  }

  get dataPath(): string {
    return path.join(this.projectPath, 'data');
  }

  getVersionSync(): VersionSync {
    return this.versionSync;
  }

  /**
   * Validate that the directory is a valid RPG Maker MZ project.
   */
  async validate(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check project file (.rmmzproject) — accept both casings
    let foundProjectFile = false;
    for (const name of PROJECT_FILES) {
      if (await FileHandler.exists(path.join(this.projectPath, name))) {
        foundProjectFile = true;
        break;
      }
    }
    if (!foundProjectFile) {
      errors.push('Missing project file: game.rmmzproject');
    }

    // Check data directory
    const dataDir = this.dataPath;
    if (!(await FileHandler.exists(dataDir))) {
      errors.push('Missing data/ directory');
      return { valid: false, errors };
    }

    // Check required data files
    for (const file of REQUIRED_DATA_FILES) {
      const filePath = path.join(dataDir, file);
      if (!(await FileHandler.exists(filePath))) {
        errors.push(`Missing data file: ${file}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Load and return project info/stats.
   */
  async getInfo(): Promise<ProjectInfo> {
    const dataFiles = await FileHandler.listFiles(this.dataPath, '.json');

    // Count maps (Map001.json, Map002.json, etc.)
    const mapFiles = dataFiles.filter((f) => /^Map\d{3}\.json$/.test(f));

    // Count entities from database files
    const actorCount = await this.countEntities('Actors.json');
    const itemCount = await this.countEntities('Items.json');
    const versionId = await this.versionSync.current();

    return {
      name: path.basename(this.projectPath),
      path: this.projectPath,
      dataFiles,
      mapCount: mapFiles.length,
      actorCount,
      itemCount,
      versionId,
    };
  }

  /**
   * Count non-null entities in a database file.
   * RPG Maker MZ arrays have null at index 0.
   */
  private async countEntities(filename: string): Promise<number> {
    try {
      const filePath = path.join(this.dataPath, filename);
      const data = (await FileHandler.readJsonRaw(filePath)) as unknown[];
      return data.filter((e) => e !== null).length;
    } catch {
      return 0;
    }
  }

  /**
   * List resource files (images, audio, etc.)
   */
  async listResources(type?: string): Promise<Record<string, string[]>> {
    const resourceDirs = [
      'img/characters', 'img/faces', 'img/parallaxes', 'img/pictures',
      'img/sv_actors', 'img/sv_enemies', 'img/enemies', 'img/tilesets',
      'img/titles1', 'img/titles2', 'img/battlebacks1', 'img/battlebacks2',
      'img/animations', 'img/system',
      'audio/bgm', 'audio/bgs', 'audio/me', 'audio/se',
    ];

    const result: Record<string, string[]> = {};

    for (const dir of resourceDirs) {
      if (type && !dir.startsWith(type)) continue;
      const fullPath = path.join(this.projectPath, dir);
      const files = await FileHandler.listFiles(fullPath);
      if (files.length > 0) {
        result[dir] = files;
      }
    }

    return result;
  }

  /**
   * Load project from path. Validates structure.
   */
  static async load(projectPath: string): Promise<ProjectManager> {
    const manager = new ProjectManager(projectPath);
    const validation = await manager.validate();
    if (!validation.valid) {
      logger.warn(`Project validation warnings: ${validation.errors.join(', ')}`);
    }
    logger.info(`Project loaded: ${projectPath}`);
    return manager;
  }
}
