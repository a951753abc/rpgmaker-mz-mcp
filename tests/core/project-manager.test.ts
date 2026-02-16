import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { ProjectManager } from '../../src/core/project-manager.js';
import { FileHandler } from '../../src/core/file-handler.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pm-test-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

async function createMinimalProject(dir: string): Promise<void> {
  const dataDir = path.join(dir, 'data');
  await fs.mkdir(dataDir, { recursive: true });

  // Create project file
  await FileHandler.writeJson(path.join(dir, 'Game.rmmzproject'), {});

  // Create required data files
  const requiredFiles = [
    'Actors.json', 'Classes.json', 'CommonEvents.json', 'Enemies.json',
    'Items.json', 'MapInfos.json', 'Skills.json', 'States.json',
    'System.json', 'Tilesets.json', 'Troops.json', 'Weapons.json',
    'Armors.json', 'Animations.json',
  ];

  for (const file of requiredFiles) {
    if (file === 'System.json') {
      await FileHandler.writeJson(path.join(dataDir, file), {
        versionId: 0,
        gameTitle: 'Test',
      });
    } else if (file === 'MapInfos.json') {
      await FileHandler.writeJson(path.join(dataDir, file), [
        null,
        { id: 1, expanded: false, name: 'Map001', order: 1, parentId: 0, scrollX: 0, scrollY: 0 },
      ]);
    } else if (file === 'Actors.json') {
      await FileHandler.writeJson(path.join(dataDir, file), [
        null,
        { id: 1, name: 'Hero' },
      ]);
    } else if (file === 'Items.json') {
      await FileHandler.writeJson(path.join(dataDir, file), [
        null,
        { id: 1, name: 'Potion' },
        { id: 2, name: 'Ether' },
      ]);
    } else {
      await FileHandler.writeJson(path.join(dataDir, file), [null]);
    }
  }

  // Create a map file
  await FileHandler.writeJson(path.join(dataDir, 'Map001.json'), {
    width: 17, height: 13, events: [null],
  });
}

describe('ProjectManager.validate', () => {
  it('should validate a correct project', async () => {
    await createMinimalProject(tmpDir);
    const pm = new ProjectManager(tmpDir);
    const result = await pm.validate();
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should report missing project file', async () => {
    const dataDir = path.join(tmpDir, 'data');
    await fs.mkdir(dataDir, { recursive: true });
    await FileHandler.writeJson(path.join(dataDir, 'System.json'), {});

    const pm = new ProjectManager(tmpDir);
    const result = await pm.validate();
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Game.rmmzproject'))).toBe(true);
  });

  it('should report missing data directory', async () => {
    await FileHandler.writeJson(path.join(tmpDir, 'Game.rmmzproject'), {});

    const pm = new ProjectManager(tmpDir);
    const result = await pm.validate();
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('data/'))).toBe(true);
  });
});

describe('ProjectManager.getInfo', () => {
  it('should return correct project stats', async () => {
    await createMinimalProject(tmpDir);
    const pm = new ProjectManager(tmpDir);
    const info = await pm.getInfo();

    expect(info.name).toBe(path.basename(tmpDir));
    expect(info.mapCount).toBe(1);
    expect(info.actorCount).toBe(1);
    expect(info.itemCount).toBe(2);
    expect(info.versionId).toBe(0);
  });
});

describe('ProjectManager.load', () => {
  it('should load and return a ProjectManager', async () => {
    await createMinimalProject(tmpDir);
    const pm = await ProjectManager.load(tmpDir);
    expect(pm.path).toBe(tmpDir);
  });
});
