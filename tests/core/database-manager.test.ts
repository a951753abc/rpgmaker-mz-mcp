import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { DatabaseManager } from '../../src/core/database-manager.js';
import { VersionSync } from '../../src/core/version-sync.js';
import { FileHandler } from '../../src/core/file-handler.js';

interface TestEntity {
  id: number;
  name: string;
  value: number;
}

function defaultTestEntity(id: number): TestEntity {
  return { id, name: '', value: 0 };
}

let tmpDir: string;
let dbManager: DatabaseManager<TestEntity>;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'db-test-'));
  const dataDir = path.join(tmpDir, 'data');
  await fs.mkdir(dataDir, { recursive: true });

  // Create System.json for VersionSync
  await FileHandler.writeJson(path.join(dataDir, 'System.json'), { versionId: 0 });

  // Create initial database file: [null, entity1]
  const initialData = [null, { id: 1, name: 'First', value: 10 }];
  await FileHandler.writeJson(path.join(dataDir, 'TestEntities.json'), initialData);

  const versionSync = new VersionSync(tmpDir);
  dbManager = new DatabaseManager<TestEntity>(
    tmpDir,
    'TestEntities.json',
    defaultTestEntity,
    versionSync
  );
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('DatabaseManager.list', () => {
  it('should list all non-null entities', async () => {
    const entities = await dbManager.list();
    expect(entities).toHaveLength(1);
    expect(entities[0].name).toBe('First');
  });
});

describe('DatabaseManager.get', () => {
  it('should get entity by ID', async () => {
    const entity = await dbManager.get(1);
    expect(entity.name).toBe('First');
    expect(entity.value).toBe(10);
  });

  it('should throw for non-existing ID', async () => {
    await expect(dbManager.get(99)).rejects.toThrow('not found');
  });
});

describe('DatabaseManager.create', () => {
  it('should create entity with next ID', async () => {
    const result = await dbManager.create({ name: 'Second', value: 20 });
    expect(result.id).toBe(2);
    expect(result.entity.name).toBe('Second');
    expect(result.entity.value).toBe(20);

    // Verify it was persisted
    const entities = await dbManager.list();
    expect(entities).toHaveLength(2);
  });

  it('should merge with defaults', async () => {
    const result = await dbManager.create({ name: 'Minimal' });
    expect(result.entity.value).toBe(0); // Default
    expect(result.entity.name).toBe('Minimal');
  });

  it('should bump versionId', async () => {
    await dbManager.create({ name: 'Test' });
    const system = await FileHandler.readJsonRaw(
      path.join(tmpDir, 'data', 'System.json')
    ) as { versionId: number };
    expect(system.versionId).toBeGreaterThan(0);
  });
});

describe('DatabaseManager.update', () => {
  it('should update only provided fields', async () => {
    const updated = await dbManager.update(1, { name: 'Updated' });
    expect(updated.name).toBe('Updated');
    expect(updated.value).toBe(10); // Unchanged
    expect(updated.id).toBe(1); // ID preserved
  });

  it('should throw for non-existing ID', async () => {
    await expect(dbManager.update(99, { name: 'X' })).rejects.toThrow('not found');
  });
});

describe('DatabaseManager.delete', () => {
  it('should delete entity by setting to null', async () => {
    await dbManager.create({ name: 'ToDelete' });
    await dbManager.delete(2);

    const entities = await dbManager.list();
    expect(entities).toHaveLength(1);
    expect(entities[0].id).toBe(1);
  });

  it('should protect first entity when protectFirst is true', async () => {
    await expect(dbManager.delete(1, true)).rejects.toThrow('Cannot delete');
  });

  it('should allow deleting first entity when protectFirst is false', async () => {
    await dbManager.delete(1, false);
    const entities = await dbManager.list();
    expect(entities).toHaveLength(0);
  });
});

describe('DatabaseManager.search', () => {
  it('should search by name', async () => {
    await dbManager.create({ name: 'Hero Sword', value: 50 });
    await dbManager.create({ name: 'Magic Staff', value: 30 });

    const results = await dbManager.search('hero', ['name']);
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Hero Sword');
  });

  it('should be case-insensitive', async () => {
    const results = await dbManager.search('FIRST', ['name']);
    expect(results).toHaveLength(1);
  });

  it('should return empty for no matches', async () => {
    const results = await dbManager.search('nonexistent', ['name']);
    expect(results).toHaveLength(0);
  });
});
