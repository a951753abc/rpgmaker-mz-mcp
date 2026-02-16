import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { z } from 'zod';
import { FileHandler } from '../../src/core/file-handler.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fh-test-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('FileHandler.writeJson + readJsonRaw', () => {
  it('should write and read JSON correctly', async () => {
    const filePath = path.join(tmpDir, 'test.json');
    const data = { hello: 'world', num: 42 };

    await FileHandler.writeJson(filePath, data);
    const result = await FileHandler.readJsonRaw(filePath);

    expect(result).toEqual(data);
  });

  it('should create .bak backup before overwriting', async () => {
    const filePath = path.join(tmpDir, 'test.json');
    const bakPath = filePath + '.bak';

    await FileHandler.writeJson(filePath, { version: 1 });
    await FileHandler.writeJson(filePath, { version: 2 });

    const current = await FileHandler.readJsonRaw(filePath);
    const backup = await FileHandler.readJsonRaw(bakPath);

    expect(current).toEqual({ version: 2 });
    expect(backup).toEqual({ version: 1 });
  });

  it('should not leave .tmp file after successful write', async () => {
    const filePath = path.join(tmpDir, 'test.json');
    await FileHandler.writeJson(filePath, { ok: true });

    const tmpExists = await FileHandler.exists(filePath + '.tmp');
    expect(tmpExists).toBe(false);
  });
});

describe('FileHandler.readJson with Zod validation', () => {
  const TestSchema = z.object({
    name: z.string(),
    value: z.number(),
  });

  it('should validate and return correct data', async () => {
    const filePath = path.join(tmpDir, 'valid.json');
    await FileHandler.writeJson(filePath, { name: 'test', value: 123 });

    const result = await FileHandler.readJson(filePath, TestSchema);
    expect(result).toEqual({ name: 'test', value: 123 });
  });

  it('should throw on invalid data', async () => {
    const filePath = path.join(tmpDir, 'invalid.json');
    await FileHandler.writeJson(filePath, { name: 'test', value: 'not a number' });

    await expect(FileHandler.readJson(filePath, TestSchema)).rejects.toThrow('Validation failed');
  });
});

describe('FileHandler.exists', () => {
  it('should return true for existing file', async () => {
    const filePath = path.join(tmpDir, 'exists.json');
    await FileHandler.writeJson(filePath, {});
    expect(await FileHandler.exists(filePath)).toBe(true);
  });

  it('should return false for non-existing file', async () => {
    expect(await FileHandler.exists(path.join(tmpDir, 'nope.json'))).toBe(false);
  });
});

describe('FileHandler.listFiles', () => {
  it('should list files with extension filter', async () => {
    await FileHandler.writeJson(path.join(tmpDir, 'a.json'), {});
    await FileHandler.writeJson(path.join(tmpDir, 'b.json'), {});
    await fs.writeFile(path.join(tmpDir, 'c.txt'), 'hello');

    const jsonFiles = await FileHandler.listFiles(tmpDir, '.json');
    expect(jsonFiles).toEqual(['a.json', 'b.json']);

    const allFiles = await FileHandler.listFiles(tmpDir);
    expect(allFiles).toHaveLength(3);
  });
});

describe('FileHandler.ensureDir', () => {
  it('should create nested directories', async () => {
    const deepDir = path.join(tmpDir, 'a', 'b', 'c');
    await FileHandler.ensureDir(deepDir);
    expect(await FileHandler.exists(deepDir)).toBe(true);
  });
});
