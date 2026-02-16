import path from 'node:path';
import { FileHandler } from './file-handler.js';
import { VersionSync } from './version-sync.js';
import { logger } from '../logger.js';

/**
 * Generic database manager for RPG Maker MZ entity arrays.
 * RPG Maker MZ stores database entities as JSON arrays where index 0 is always null.
 */
export class DatabaseManager<T extends { id: number; name: string }> {
  private filePath: string;
  private versionSync: VersionSync;
  private defaultFactory: (id: number) => T;

  constructor(
    projectPath: string,
    filename: string,
    defaultFactory: (id: number) => T,
    versionSync: VersionSync
  ) {
    this.filePath = path.join(projectPath, 'data', filename);
    this.versionSync = versionSync;
    this.defaultFactory = defaultFactory;
  }

  /**
   * Read the raw database array.
   */
  private async readArray(): Promise<(T | null)[]> {
    return (await FileHandler.readJsonRaw(this.filePath)) as (T | null)[];
  }

  /**
   * Write the database array and bump versionId.
   */
  private async writeArray(data: (T | null)[]): Promise<void> {
    await FileHandler.writeJson(this.filePath, data);
    await this.versionSync.bump();
  }

  /**
   * List all non-null entities.
   */
  async list(): Promise<T[]> {
    const arr = await this.readArray();
    return arr.filter((e): e is T => e !== null);
  }

  /**
   * Get entity by ID.
   */
  async get(id: number): Promise<T> {
    const arr = await this.readArray();
    if (id < 1 || id >= arr.length || arr[id] === null) {
      throw new Error(`Entity with ID ${id} not found`);
    }
    return arr[id] as T;
  }

  /**
   * Create a new entity. Returns the assigned ID and entity.
   */
  async create(data: Partial<T>): Promise<{ id: number; entity: T }> {
    const arr = await this.readArray();
    const id = arr.length; // Next available index
    const entity = { ...this.defaultFactory(id), ...data, id } as T;
    arr.push(entity);
    await this.writeArray(arr);
    logger.info(`Created entity ID ${id}: ${entity.name}`);
    return { id, entity };
  }

  /**
   * Update an existing entity with partial data.
   */
  async update(id: number, data: Partial<T>): Promise<T> {
    const arr = await this.readArray();
    if (id < 1 || id >= arr.length || arr[id] === null) {
      throw new Error(`Entity with ID ${id} not found`);
    }
    const existing = arr[id] as T;
    const updated = { ...existing, ...data, id } as T; // Preserve ID
    arr[id] = updated;
    await this.writeArray(arr);
    logger.info(`Updated entity ID ${id}: ${updated.name}`);
    return updated;
  }

  /**
   * Delete an entity by setting its slot to null.
   * Protects system entities (ID 1 for certain types).
   */
  async delete(id: number, protectFirst: boolean = false): Promise<void> {
    if (protectFirst && id === 1) {
      throw new Error('Cannot delete system default entity (ID 1)');
    }
    const arr = await this.readArray();
    if (id < 1 || id >= arr.length || arr[id] === null) {
      throw new Error(`Entity with ID ${id} not found`);
    }
    const name = (arr[id] as T).name;
    arr[id] = null;
    await this.writeArray(arr);
    logger.info(`Deleted entity ID ${id}: ${name}`);
  }

  /**
   * Search entities by keyword across specified fields.
   */
  async search(query: string, fields: (keyof T)[]): Promise<T[]> {
    const entities = await this.list();
    const lowerQuery = query.toLowerCase();
    return entities.filter((entity) =>
      fields.some((field) => {
        const value = entity[field];
        if (typeof value === 'string') {
          return value.toLowerCase().includes(lowerQuery);
        }
        return false;
      })
    );
  }
}
