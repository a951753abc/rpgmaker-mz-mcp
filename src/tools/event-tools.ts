import path from 'node:path';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FileHandler } from '../core/file-handler.js';
import { requireProject } from './project-tools.js';
import { convertCommand, type Event, type EventCommand } from '../schemas/event.js';
import { defaultEventPage, endCommand } from '../templates/defaults.js';
import type { MapData } from '../schemas/map.js';
import { logger } from '../logger.js';

function mapFilename(id: number): string {
  return `Map${String(id).padStart(3, '0')}.json`;
}

async function readMap(dataPath: string, mapId: number): Promise<MapData> {
  const mapPath = path.join(dataPath, mapFilename(mapId));
  return (await FileHandler.readJsonRaw(mapPath)) as MapData;
}

async function writeMap(dataPath: string, mapId: number, mapData: MapData): Promise<void> {
  const mapPath = path.join(dataPath, mapFilename(mapId));
  await FileHandler.writeJson(mapPath, mapData);
}

export function registerEventTools(server: McpServer): void {
  // --- list_events ---
  server.tool(
    'list_events',
    'List all events on a specific map.',
    {
      mapId: z.number().int().positive().describe('Map ID'),
    },
    async ({ mapId }) => {
      try {
        const project = requireProject();
        const mapData = await readMap(project.dataPath, mapId);

        const events = mapData.events.filter((e): e is Event => e !== null);
        if (events.length === 0) {
          return { content: [{ type: 'text' as const, text: `No events on map ${mapId}.` }] };
        }

        const lines = events.map((e) => {
          const pageCount = e.pages.length;
          return `[${e.id}] "${e.name}" at (${e.x}, ${e.y}) — ${pageCount} page(s)`;
        });

        return {
          content: [{
            type: 'text' as const,
            text: `Events on map ${mapId} (${events.length}):\n${lines.join('\n')}`,
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

  // --- create_event ---
  server.tool(
    'create_event',
    'Create a new event on a map at the specified position.',
    {
      mapId: z.number().int().positive().describe('Map ID'),
      name: z.string().describe('Event name'),
      x: z.number().int().min(0).describe('X position on map'),
      y: z.number().int().min(0).describe('Y position on map'),
      note: z.string().default('').describe('Event note'),
      characterName: z.string().optional().describe('Character sprite name'),
      characterIndex: z.number().int().optional().describe('Character sprite index'),
      trigger: z.number().int().min(0).max(4).default(0)
        .describe('Trigger: 0=Action Button, 1=Player Touch, 2=Event Touch, 3=Autorun, 4=Parallel'),
    },
    async ({ mapId, name, x, y, note, characterName, characterIndex, trigger }) => {
      try {
        const project = requireProject();
        const mapData = await readMap(project.dataPath, mapId);

        // Find next event ID
        let newId = 1;
        for (let i = 1; i < mapData.events.length; i++) {
          if (mapData.events[i] !== null) newId = i + 1;
        }
        // Also check if we can reuse a null slot
        let slot = -1;
        for (let i = 1; i < mapData.events.length; i++) {
          if (mapData.events[i] === null) {
            slot = i;
            break;
          }
        }

        if (slot === -1) {
          slot = mapData.events.length;
          newId = slot;
        } else {
          newId = slot;
        }

        // Create default page
        const page = defaultEventPage();
        page.trigger = trigger;
        if (characterName) {
          page.image.characterName = characterName;
          page.image.characterIndex = characterIndex ?? 0;
        }

        const event: Event = {
          id: newId,
          name,
          note: note || '',
          pages: [page],
          x,
          y,
        };

        // Place event in array
        while (mapData.events.length <= slot) {
          mapData.events.push(null);
        }
        mapData.events[slot] = event;

        await writeMap(project.dataPath, mapId, mapData);
        await project.getVersionSync().bump();

        logger.info(`Event created: [${newId}] "${name}" on map ${mapId} at (${x}, ${y})`);

        return {
          content: [{
            type: 'text' as const,
            text: `Event created!\n\nID: ${newId}\nName: ${name}\nMap: ${mapId}\nPosition: (${x}, ${y})\nTrigger: ${trigger}`,
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

  // --- update_event ---
  server.tool(
    'update_event',
    'Update event properties (name, position, note, character sprite).',
    {
      mapId: z.number().int().positive().describe('Map ID'),
      eventId: z.number().int().positive().describe('Event ID'),
      name: z.string().optional().describe('New event name'),
      x: z.number().int().optional().describe('New X position'),
      y: z.number().int().optional().describe('New Y position'),
      note: z.string().optional().describe('New event note'),
      characterName: z.string().optional().describe('Character sprite name (applies to page 1)'),
      characterIndex: z.number().int().optional().describe('Character sprite index (applies to page 1)'),
    },
    async ({ mapId, eventId, name, x, y, note, characterName, characterIndex }) => {
      try {
        const project = requireProject();
        const mapData = await readMap(project.dataPath, mapId);

        if (eventId >= mapData.events.length || !mapData.events[eventId]) {
          return {
            content: [{ type: 'text' as const, text: `Event ${eventId} not found on map ${mapId}.` }],
            isError: true,
          };
        }

        const event = mapData.events[eventId] as Event;
        if (name !== undefined) event.name = name;
        if (x !== undefined) event.x = x;
        if (y !== undefined) event.y = y;
        if (note !== undefined) event.note = note;

        if (characterName !== undefined && event.pages.length > 0) {
          event.pages[0].image.characterName = characterName;
          if (characterIndex !== undefined) {
            event.pages[0].image.characterIndex = characterIndex;
          }
        }

        await writeMap(project.dataPath, mapId, mapData);
        await project.getVersionSync().bump();

        return {
          content: [{
            type: 'text' as const,
            text: `Event ${eventId} on map ${mapId} updated.`,
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

  // --- add_event_commands ---
  server.tool(
    'add_event_commands',
    `Add commands to an event page. Commands use human-readable format that gets converted to RPG Maker MZ codes.

Supported command types:
- show_text: { type: "show_text", face: "Actor1", faceIndex: 0, text: "Hello!" }
- show_choices: { type: "show_choices", choices: ["Yes", "No"] }
- transfer_player: { type: "transfer_player", mapId: 1, x: 5, y: 5 }
- control_switches: { type: "control_switches", startId: 1, value: 0 }  (0=ON, 1=OFF)
- control_variables: { type: "control_variables", startId: 1, operationType: 0, operand: 0, value: 100 }
- control_self_switch: { type: "control_self_switch", key: "A", value: 0 }
- conditional_branch: { type: "conditional_branch", conditionType: 0, param1: 1, param2: 0 }
- common_event: { type: "common_event", eventId: 1 }
- change_gold: { type: "change_gold", operation: 0, value: 100 }
- change_items: { type: "change_items", itemId: 1, operation: 0, value: 1 }
- play_bgm: { type: "play_bgm", name: "Town1", volume: 90 }
- play_se: { type: "play_se", name: "Decision1" }
- wait: { type: "wait", duration: 60 }
- fadeout_screen, fadein_screen, erase_event, game_over, return_to_title
- comment: { type: "comment", text: "This is a comment" }
- label/jump_to_label: { type: "label", name: "start" }
- And many more (change_hp, change_exp, battle_processing, shop_processing, etc.)`,
    {
      mapId: z.number().int().positive().describe('Map ID'),
      eventId: z.number().int().positive().describe('Event ID'),
      pageIndex: z.number().int().min(0).default(0).describe('Page index (0-based)'),
      commands: z.array(z.record(z.unknown())).describe('Array of command objects with "type" field'),
      append: z.boolean().default(true).describe('If true, append to existing commands. If false, replace all commands.'),
    },
    async ({ mapId, eventId, pageIndex, commands, append }) => {
      try {
        const project = requireProject();
        const mapData = await readMap(project.dataPath, mapId);

        if (eventId >= mapData.events.length || !mapData.events[eventId]) {
          return {
            content: [{ type: 'text' as const, text: `Event ${eventId} not found on map ${mapId}.` }],
            isError: true,
          };
        }

        const event = mapData.events[eventId] as Event;
        if (pageIndex >= event.pages.length) {
          return {
            content: [{ type: 'text' as const, text: `Page ${pageIndex} not found. Event has ${event.pages.length} page(s).` }],
            isError: true,
          };
        }

        // Convert human-readable commands to RPG Maker MZ format
        const convertedCommands: EventCommand[] = [];
        for (const cmd of commands) {
          if (!cmd.type || typeof cmd.type !== 'string') {
            return {
              content: [{ type: 'text' as const, text: 'Each command must have a "type" field.' }],
              isError: true,
            };
          }
          const converted = convertCommand(cmd as { type: string; [key: string]: unknown });
          convertedCommands.push(...converted);
        }

        const page = event.pages[pageIndex];
        if (append) {
          // Remove the end command (code 0), append new commands, then add end back
          const existing = page.list.filter((c) => c.code !== 0);
          page.list = [...existing, ...convertedCommands, endCommand()];
        } else {
          page.list = [...convertedCommands, endCommand()];
        }

        await writeMap(project.dataPath, mapId, mapData);
        await project.getVersionSync().bump();

        logger.info(`Added ${convertedCommands.length} command(s) to event ${eventId} page ${pageIndex} on map ${mapId}`);

        return {
          content: [{
            type: 'text' as const,
            text: `Added ${convertedCommands.length} command(s) to event ${eventId}, page ${pageIndex} on map ${mapId}.`,
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

  // --- delete_event ---
  server.tool(
    'delete_event',
    'Delete an event from a map.',
    {
      mapId: z.number().int().positive().describe('Map ID'),
      eventId: z.number().int().positive().describe('Event ID to delete'),
    },
    async ({ mapId, eventId }) => {
      try {
        const project = requireProject();
        const mapData = await readMap(project.dataPath, mapId);

        if (eventId >= mapData.events.length || !mapData.events[eventId]) {
          return {
            content: [{ type: 'text' as const, text: `Event ${eventId} not found on map ${mapId}.` }],
            isError: true,
          };
        }

        const eventName = (mapData.events[eventId] as Event).name;
        mapData.events[eventId] = null;

        await writeMap(project.dataPath, mapId, mapData);
        await project.getVersionSync().bump();

        logger.info(`Event deleted: [${eventId}] "${eventName}" from map ${mapId}`);

        return {
          content: [{
            type: 'text' as const,
            text: `Event ${eventId} ("${eventName}") deleted from map ${mapId}.`,
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
