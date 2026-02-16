import path from 'node:path';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FileHandler } from '../core/file-handler.js';
import { requireProject } from './project-tools.js';
import { defaultMap, defaultAudio } from '../templates/defaults.js';
import type { MapInfo, MapData } from '../schemas/map.js';
import { logger } from '../logger.js';

async function readMapInfos(dataPath: string): Promise<(MapInfo | null)[]> {
  return (await FileHandler.readJsonRaw(path.join(dataPath, 'MapInfos.json'))) as (MapInfo | null)[];
}

async function writeMapInfos(dataPath: string, infos: (MapInfo | null)[]): Promise<void> {
  await FileHandler.writeJson(path.join(dataPath, 'MapInfos.json'), infos);
}

function mapFilename(id: number): string {
  return `Map${String(id).padStart(3, '0')}.json`;
}

export function registerMapTools(server: McpServer): void {
  // --- list_maps ---
  server.tool(
    'list_maps',
    'List all maps in the project with their hierarchy.',
    {},
    async () => {
      try {
        const project = requireProject();
        const infos = await readMapInfos(project.dataPath);

        const maps = infos.filter((m): m is MapInfo => m !== null);
        if (maps.length === 0) {
          return { content: [{ type: 'text' as const, text: 'No maps found.' }] };
        }

        // Build hierarchy display
        const lines = maps
          .sort((a, b) => a.order - b.order)
          .map((m) => {
            const indent = m.parentId > 0 ? '  ' : '';
            return `${indent}[${m.id}] ${m.name} (parent: ${m.parentId})`;
          });

        return {
          content: [{
            type: 'text' as const,
            text: `Maps (${maps.length}):\n${lines.join('\n')}`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    }
  );

  // --- create_map ---
  server.tool(
    'create_map',
    'Create a new map.',
    {
      name: z.string().describe('Map name'),
      width: z.number().int().min(1).max(256).default(17).describe('Map width in tiles'),
      height: z.number().int().min(1).max(256).default(13).describe('Map height in tiles'),
      tilesetId: z.number().int().min(1).default(1).describe('Tileset ID to use'),
      parentId: z.number().int().min(0).default(0).describe('Parent map ID (0 for root)'),
      bgmName: z.string().optional().describe('Background music name'),
    },
    async ({ name, width, height, tilesetId, parentId, bgmName }) => {
      try {
        const project = requireProject();
        const infos = await readMapInfos(project.dataPath);

        // Find next available ID
        const newId = infos.length;
        const order = infos.filter((m) => m !== null).length + 1;

        // Create map data
        const mapData = defaultMap(width, height, tilesetId);
        if (bgmName) {
          mapData.autoplayBgm = true;
          mapData.bgm = { ...defaultAudio(), name: bgmName };
        }

        // Create map info
        const mapInfo: MapInfo = {
          id: newId,
          expanded: false,
          name,
          order,
          parentId,
          scrollX: 0,
          scrollY: 0,
        };

        // Write map file
        const mapPath = path.join(project.dataPath, mapFilename(newId));
        await FileHandler.writeJson(mapPath, mapData);

        // Update MapInfos
        infos.push(mapInfo);
        await writeMapInfos(project.dataPath, infos);

        // Bump versionId
        await project.getVersionSync().bump();

        logger.info(`Map created: [${newId}] ${name}`);

        return {
          content: [{
            type: 'text' as const,
            text: `Map created!\n\nID: ${newId}\nName: ${name}\nSize: ${width}x${height}\nTileset: ${tilesetId}\nParent: ${parentId}`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    }
  );

  // --- get_map ---
  server.tool(
    'get_map',
    'Get detailed information about a specific map, including its events.',
    {
      mapId: z.number().int().positive().describe('Map ID'),
    },
    async ({ mapId }) => {
      try {
        const project = requireProject();
        const infos = await readMapInfos(project.dataPath);

        // Find map info
        const info = infos[mapId];
        if (!info) {
          return {
            content: [{ type: 'text' as const, text: `Map ID ${mapId} not found.` }],
            isError: true,
          };
        }

        // Read map data
        const mapPath = path.join(project.dataPath, mapFilename(mapId));
        const mapData = (await FileHandler.readJsonRaw(mapPath)) as MapData;

        // Summarize events
        const events = mapData.events.filter((e) => e !== null);
        const eventSummary = events.map((e) => `  [${e!.id}] ${e!.name} at (${e!.x}, ${e!.y})`);

        const text = [
          `Map: ${info.name} (ID: ${mapId})`,
          `Size: ${mapData.width}x${mapData.height}`,
          `Tileset: ${mapData.tilesetId}`,
          `BGM: ${mapData.autoplayBgm ? mapData.bgm.name : '(none)'}`,
          `BGS: ${mapData.autoplayBgs ? mapData.bgs.name : '(none)'}`,
          `Display Name: ${mapData.displayName || '(none)'}`,
          `Note: ${mapData.note || '(none)'}`,
          `\nEvents (${events.length}):`,
          events.length > 0 ? eventSummary.join('\n') : '  (none)',
        ];

        return { content: [{ type: 'text' as const, text: text.join('\n') }] };
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    }
  );

  // --- update_map ---
  server.tool(
    'update_map',
    'Update map properties (name, display name, BGM, note, etc.).',
    {
      mapId: z.number().int().positive().describe('Map ID'),
      name: z.string().optional().describe('New map name (in MapInfos)'),
      displayName: z.string().optional().describe('Display name shown in-game'),
      tilesetId: z.number().int().optional().describe('New tileset ID'),
      bgmName: z.string().optional().describe('BGM name (empty string to disable)'),
      bgsName: z.string().optional().describe('BGS name (empty string to disable)'),
      note: z.string().optional().describe('Map note'),
      disableDashing: z.boolean().optional().describe('Disable dashing on this map'),
    },
    async ({ mapId, name, displayName, tilesetId, bgmName, bgsName, note, disableDashing }) => {
      try {
        const project = requireProject();
        const mapPath = path.join(project.dataPath, mapFilename(mapId));
        const mapData = (await FileHandler.readJsonRaw(mapPath)) as MapData;

        // Update map data properties
        if (displayName !== undefined) mapData.displayName = displayName;
        if (tilesetId !== undefined) mapData.tilesetId = tilesetId;
        if (note !== undefined) mapData.note = note;
        if (disableDashing !== undefined) mapData.disableDashing = disableDashing;

        if (bgmName !== undefined) {
          if (bgmName === '') {
            mapData.autoplayBgm = false;
          } else {
            mapData.autoplayBgm = true;
            mapData.bgm = { ...defaultAudio(), name: bgmName };
          }
        }

        if (bgsName !== undefined) {
          if (bgsName === '') {
            mapData.autoplayBgs = false;
          } else {
            mapData.autoplayBgs = true;
            mapData.bgs = { ...defaultAudio(), name: bgsName };
          }
        }

        await FileHandler.writeJson(mapPath, mapData);

        // Update map info name
        if (name !== undefined) {
          const infos = await readMapInfos(project.dataPath);
          if (infos[mapId]) {
            infos[mapId]!.name = name;
            await writeMapInfos(project.dataPath, infos);
          }
        }

        await project.getVersionSync().bump();

        return {
          content: [{
            type: 'text' as const,
            text: `Map ${mapId} updated.`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    }
  );

  // --- delete_map ---
  server.tool(
    'delete_map',
    'Delete a map. Cannot delete Map 1 (system default).',
    {
      mapId: z.number().int().positive().describe('Map ID to delete'),
    },
    async ({ mapId }) => {
      try {
        if (mapId === 1) {
          return {
            content: [{ type: 'text' as const, text: 'Cannot delete Map 1 (system default).' }],
            isError: true,
          };
        }

        const project = requireProject();
        const infos = await readMapInfos(project.dataPath);

        if (!infos[mapId]) {
          return {
            content: [{ type: 'text' as const, text: `Map ID ${mapId} not found.` }],
            isError: true,
          };
        }

        const mapName = infos[mapId]!.name;

        // Remove map file
        const mapPath = path.join(project.dataPath, mapFilename(mapId));
        if (await FileHandler.exists(mapPath)) {
          await FileHandler.deleteFile(mapPath);
        }

        // Set map info to null
        infos[mapId] = null;
        await writeMapInfos(project.dataPath, infos);

        await project.getVersionSync().bump();

        logger.info(`Map deleted: [${mapId}] ${mapName}`);

        return {
          content: [{
            type: 'text' as const,
            text: `Map ${mapId} (${mapName}) deleted.`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    }
  );
}
