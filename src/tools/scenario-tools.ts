import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { requireProject } from './project-tools.js';
import { DatabaseManager } from '../core/database-manager.js';
import { ENTITY_TYPES } from '../schemas/database.js';
import { DEFAULT_FACTORIES } from '../templates/defaults.js';

/**
 * AI Scenario tools — these don't call external APIs.
 * They read project data and return structured context so Claude
 * can generate content and call other tools to implement it.
 */

async function getProjectContext(): Promise<string> {
  const project = requireProject();
  const info = await project.getInfo();

  // Get actors list
  const actorManager = new DatabaseManager(
    project.path,
    ENTITY_TYPES.actors.filename,
    DEFAULT_FACTORIES.actors as (id: number) => { id: number; name: string },
    project.getVersionSync()
  );
  const actors = await actorManager.list();

  // Get items list
  const itemManager = new DatabaseManager(
    project.path,
    ENTITY_TYPES.items.filename,
    DEFAULT_FACTORIES.items as (id: number) => { id: number; name: string },
    project.getVersionSync()
  );
  const items = await itemManager.list();

  const context = [
    `Project: ${info.name}`,
    `Maps: ${info.mapCount}`,
    `Actors: ${actors.map((a) => `[${a.id}] ${a.name}`).join(', ') || '(none)'}`,
    `Items: ${items.map((i) => `[${i.id}] ${i.name}`).join(', ') || '(none)'}`,
  ];

  return context.join('\n');
}

export function registerScenarioTools(server: McpServer): void {
  // --- generate_scenario ---
  server.tool(
    'generate_scenario',
    'Generate a game scenario outline based on theme and genre. Returns structured suggestions that can be implemented using other tools (create_entity, create_map, create_event, etc.).',
    {
      theme: z.string().describe('Game theme or premise (e.g., "medieval fantasy adventure")'),
      genre: z.string().default('RPG').describe('Game genre'),
      scope: z.enum(['small', 'medium', 'large']).default('medium')
        .describe('Scope: small (3-5 maps, 2-3 characters), medium (8-12 maps, 5-8 characters), large (15+ maps, 10+ characters)'),
    },
    async ({ theme, genre, scope }) => {
      try {
        const projectContext = await getProjectContext();

        const scopeGuide = {
          small: { maps: '3-5', characters: '2-3', quests: '1-2' },
          medium: { maps: '8-12', characters: '5-8', quests: '3-5' },
          large: { maps: '15+', characters: '10+', quests: '6+' },
        };
        const guide = scopeGuide[scope];

        return {
          content: [{
            type: 'text' as const,
            text: `=== Scenario Generation Context ===

Current Project State:
${projectContext}

Request:
- Theme: ${theme}
- Genre: ${genre}
- Scope: ${scope} (${guide.maps} maps, ${guide.characters} characters, ${guide.quests} quests)

Please generate a structured game scenario with the following sections:

1. **Story Outline**: Main plot summary (3-5 sentences)
2. **Characters**: List of characters with name, class, role, and brief description
3. **Maps**: List of maps with name, size, tileset suggestion, and purpose
4. **Key Events**: Important story events and how they connect
5. **Game Flow**: Order of progression through maps/events

After generating the scenario, you can use these tools to implement it:
- create_entity (entityType: "actors") to create characters
- create_map to create maps
- create_event + add_event_commands to set up story events
- create_entity (entityType: "items/weapons/armors") for equipment and items

Format each suggestion so it can be directly used as tool parameters.`,
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

  // --- generate_dialogue ---
  server.tool(
    'generate_dialogue',
    'Generate NPC dialogue for a scene. Returns event commands that can be directly used with add_event_commands.',
    {
      scene: z.string().describe('Scene description (e.g., "NPC in weapon shop greets the hero")'),
      npcName: z.string().describe('NPC name'),
      faceName: z.string().default('').describe('Face image filename (e.g., "Actor1")'),
      faceIndex: z.number().int().default(0).describe('Face image index'),
      mood: z.enum(['friendly', 'serious', 'mysterious', 'hostile', 'sad', 'excited']).default('friendly'),
      lineCount: z.number().int().min(1).max(10).default(3).describe('Number of dialogue lines'),
    },
    async ({ scene, npcName, faceName, faceIndex, mood, lineCount }) => {
      try {
        const projectContext = await getProjectContext();

        return {
          content: [{
            type: 'text' as const,
            text: `=== Dialogue Generation Context ===

Current Project State:
${projectContext}

Request:
- NPC: ${npcName}
- Scene: ${scene}
- Mood: ${mood}
- Lines: ${lineCount}
- Face: ${faceName || '(none)'}${faceName ? ` index ${faceIndex}` : ''}

Please generate ${lineCount} lines of dialogue for ${npcName} in this scene.
The tone should be ${mood}.

Format each line as a command object for add_event_commands:
{
  "type": "show_text",
  "face": "${faceName}",
  "faceIndex": ${faceIndex},
  "text": "<dialogue line here>"
}

After generating, use add_event_commands to add them to the appropriate event.
You can also include other commands like:
- show_choices for branching dialogue
- control_switches to track conversation state
- change_items to give items during dialogue
- play_se for sound effects`,
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

  // --- generate_quest ---
  server.tool(
    'generate_quest',
    'Generate a quest design with objectives, rewards, and event flow.',
    {
      questType: z.enum(['fetch', 'kill', 'escort', 'explore', 'puzzle', 'story']).describe('Quest type'),
      description: z.string().describe('Quest description or theme'),
      difficulty: z.enum(['easy', 'normal', 'hard']).default('normal'),
      rewardType: z.enum(['gold', 'item', 'equipment', 'experience', 'mixed']).default('mixed'),
    },
    async ({ questType, description, difficulty, rewardType }) => {
      try {
        const projectContext = await getProjectContext();

        const difficultyGuide = {
          easy: { enemies: '1-2 weak', reward: 'small' },
          normal: { enemies: '3-5 moderate', reward: 'moderate' },
          hard: { enemies: '5+ strong', reward: 'large' },
        };
        const guide = difficultyGuide[difficulty];

        return {
          content: [{
            type: 'text' as const,
            text: `=== Quest Generation Context ===

Current Project State:
${projectContext}

Request:
- Type: ${questType}
- Description: ${description}
- Difficulty: ${difficulty} (${guide.enemies} enemies, ${guide.reward} rewards)
- Reward Type: ${rewardType}

Please design a quest with:

1. **Quest Name**: A memorable title
2. **Objectives**: Step-by-step goals the player must complete
3. **NPCs Involved**: Who gives the quest, who helps, etc.
4. **Switches/Variables Needed**: Track quest progress using:
   - Switch IDs for quest states (accepted, completed)
   - Variable IDs for counters (items collected, enemies defeated)
5. **Events**: Detailed event setups for each quest stage
6. **Rewards**: What the player receives on completion

Implementation plan using available tools:
- create_entity for any new items/enemies needed
- create_event for quest NPCs
- add_event_commands with conditional_branch + control_switches for quest logic
- add_event_commands with change_items/change_gold for rewards`,
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
