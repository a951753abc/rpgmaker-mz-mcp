import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { FileHandler } from '../../src/core/file-handler.js';
import { ProjectManager } from '../../src/core/project-manager.js';
import { DatabaseManager } from '../../src/core/database-manager.js';
import { defaultActor, defaultItem } from '../../src/templates/defaults.js';
import { setCurrentProject } from '../../src/tools/project-tools.js';

let tmpDir: string;

async function createTestProject(dir: string): Promise<ProjectManager> {
  const dataDir = path.join(dir, 'data');
  await fs.mkdir(dataDir, { recursive: true });
  await FileHandler.writeJson(path.join(dir, 'Game.rmmzproject'), {});
  await FileHandler.writeJson(path.join(dataDir, 'System.json'), { versionId: 0 });
  await FileHandler.writeJson(path.join(dataDir, 'Actors.json'), [
    null,
    { ...defaultActor(1), name: 'Hero' },
  ]);
  await FileHandler.writeJson(path.join(dataDir, 'Items.json'), [
    null,
    { ...defaultItem(1), name: 'Potion', description: 'Restores HP' },
  ]);

  // Create other required files
  const otherFiles = [
    'Classes.json', 'CommonEvents.json', 'Enemies.json',
    'MapInfos.json', 'Skills.json', 'States.json',
    'Tilesets.json', 'Troops.json', 'Weapons.json',
    'Armors.json', 'Animations.json',
  ];
  for (const file of otherFiles) {
    if (file === 'MapInfos.json') {
      await FileHandler.writeJson(path.join(dataDir, file), [null]);
    } else {
      await FileHandler.writeJson(path.join(dataDir, file), [null]);
    }
  }

  const pm = await ProjectManager.load(dir);
  setCurrentProject(pm);
  return pm;
}

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dbtools-test-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('DatabaseManager integration with real project', () => {
  it('should create and retrieve actors', async () => {
    const pm = await createTestProject(tmpDir);
    const manager = new DatabaseManager(
      pm.path,
      'Actors.json',
      defaultActor,
      pm.getVersionSync()
    );

    const result = await manager.create({ name: 'Warrior', classId: 2 });
    expect(result.id).toBe(2);
    expect(result.entity.name).toBe('Warrior');
    expect(result.entity.classId).toBe(2);
    expect(result.entity.initialLevel).toBe(1); // Default

    const all = await manager.list();
    expect(all).toHaveLength(2);
  });

  it('should search items by description', async () => {
    const pm = await createTestProject(tmpDir);
    const manager = new DatabaseManager<{ id: number; name: string; description: string }>(
      pm.path,
      'Items.json',
      defaultItem as unknown as (id: number) => { id: number; name: string; description: string },
      pm.getVersionSync()
    );

    const results = await manager.search('HP', ['name', 'description'] as (keyof { id: number; name: string })[]);
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Potion');
  });

  it('should bump version on every write operation', async () => {
    const pm = await createTestProject(tmpDir);
    const manager = new DatabaseManager(
      pm.path,
      'Actors.json',
      defaultActor,
      pm.getVersionSync()
    );

    const v0 = await pm.getVersionSync().current();
    await manager.create({ name: 'A' });
    const v1 = await pm.getVersionSync().current();
    await manager.update(1, { name: 'B' });
    const v2 = await pm.getVersionSync().current();

    expect(v1).toBeGreaterThan(v0);
    expect(v2).toBeGreaterThan(v1);
  });
});
