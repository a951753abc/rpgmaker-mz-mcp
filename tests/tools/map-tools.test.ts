import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { FileHandler } from '../../src/core/file-handler.js';
import { ProjectManager } from '../../src/core/project-manager.js';
import { setCurrentProject } from '../../src/tools/project-tools.js';
import { defaultMap } from '../../src/templates/defaults.js';
import { defaultEventPage, endCommand } from '../../src/templates/defaults.js';
import { convertCommand } from '../../src/schemas/event.js';
import type { MapData } from '../../src/schemas/map.js';
import type { Event, EventCommand } from '../../src/schemas/event.js';

let tmpDir: string;

async function createTestProject(dir: string): Promise<ProjectManager> {
  const dataDir = path.join(dir, 'data');
  await fs.mkdir(dataDir, { recursive: true });
  await FileHandler.writeJson(path.join(dir, 'Game.rmmzproject'), {});
  await FileHandler.writeJson(path.join(dataDir, 'System.json'), { versionId: 0 });
  await FileHandler.writeJson(path.join(dataDir, 'MapInfos.json'), [
    null,
    { id: 1, expanded: false, name: 'Map001', order: 1, parentId: 0, scrollX: 0, scrollY: 0 },
  ]);
  await FileHandler.writeJson(path.join(dataDir, 'Map001.json'), defaultMap(17, 13, 1));

  // Required data files
  for (const file of ['Actors.json', 'Classes.json', 'CommonEvents.json', 'Enemies.json',
    'Items.json', 'Skills.json', 'States.json', 'Tilesets.json', 'Troops.json',
    'Weapons.json', 'Armors.json', 'Animations.json']) {
    await FileHandler.writeJson(path.join(dataDir, file), [null]);
  }

  const pm = await ProjectManager.load(dir);
  setCurrentProject(pm);
  return pm;
}

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'maptools-test-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('Map operations integration', () => {
  it('should read MapInfos correctly', async () => {
    await createTestProject(tmpDir);
    const infos = await FileHandler.readJsonRaw(
      path.join(tmpDir, 'data', 'MapInfos.json')
    ) as (unknown | null)[];

    expect(infos).toHaveLength(2);
    expect(infos[0]).toBeNull();
    expect(infos[1]).toBeTruthy();
  });

  it('should create a map with correct tile data size', async () => {
    const map = defaultMap(20, 15, 1);
    expect(map.data.length).toBe(20 * 15 * 6);
    expect(map.width).toBe(20);
    expect(map.height).toBe(15);
    expect(map.events).toEqual([null]);
  });
});

describe('Event command conversion', () => {
  it('should convert show_text command', () => {
    const cmds = convertCommand({
      type: 'show_text',
      face: 'Actor1',
      faceIndex: 2,
      text: 'Hello!\nHow are you?',
    });

    expect(cmds).toHaveLength(3);
    expect(cmds[0].code).toBe(101);
    expect(cmds[0].parameters).toEqual(['Actor1', 2, 0, 2]);
    expect(cmds[1].code).toBe(401);
    expect(cmds[1].parameters).toEqual(['Hello!']);
    expect(cmds[2].code).toBe(401);
    expect(cmds[2].parameters).toEqual(['How are you?']);
  });

  it('should convert transfer_player command', () => {
    const cmds = convertCommand({
      type: 'transfer_player',
      mapId: 3,
      x: 10,
      y: 5,
      direction: 2,
      fadeType: 1,
    });

    expect(cmds).toHaveLength(1);
    expect(cmds[0].code).toBe(201);
    expect(cmds[0].parameters).toEqual([0, 3, 10, 5, 2, 1]);
  });

  it('should convert control_switches command', () => {
    const cmds = convertCommand({
      type: 'control_switches',
      startId: 5,
      endId: 5,
      value: 0,
    });

    expect(cmds).toHaveLength(1);
    expect(cmds[0].code).toBe(121);
    expect(cmds[0].parameters).toEqual([5, 5, 0]);
  });

  it('should convert show_choices command', () => {
    const cmds = convertCommand({
      type: 'show_choices',
      choices: ['Yes', 'No'],
    });

    expect(cmds).toHaveLength(1);
    expect(cmds[0].code).toBe(102);
    expect(cmds[0].parameters[0]).toEqual(['Yes', 'No']);
  });

  it('should convert play_bgm command', () => {
    const cmds = convertCommand({
      type: 'play_bgm',
      name: 'Town1',
      volume: 80,
    });

    expect(cmds).toHaveLength(1);
    expect(cmds[0].code).toBe(241);
    expect(cmds[0].parameters[0]).toEqual({
      name: 'Town1',
      volume: 80,
      pitch: 100,
      pan: 0,
    });
  });

  it('should convert comment with multiple lines', () => {
    const cmds = convertCommand({
      type: 'comment',
      text: 'Line 1\nLine 2\nLine 3',
    });

    expect(cmds).toHaveLength(3);
    expect(cmds[0].code).toBe(108);
    expect(cmds[1].code).toBe(408);
    expect(cmds[2].code).toBe(408);
  });

  it('should throw on unknown command type', () => {
    expect(() => convertCommand({ type: 'invalid_command' })).toThrow('Unknown command type');
  });
});

describe('Event page defaults', () => {
  it('should create a valid default event page', () => {
    const page = defaultEventPage();
    expect(page.trigger).toBe(0);
    expect(page.list).toHaveLength(1);
    expect(page.list[0].code).toBe(0); // End command
    expect(page.conditions.switch1Valid).toBe(false);
  });

  it('should create a valid end command', () => {
    const end = endCommand();
    expect(end.code).toBe(0);
    expect(end.indent).toBe(0);
    expect(end.parameters).toEqual([]);
  });
});
