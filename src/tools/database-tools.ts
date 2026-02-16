import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DatabaseManager } from '../core/database-manager.js';
import { ENTITY_TYPES, type EntityType } from '../schemas/database.js';
import { DEFAULT_FACTORIES } from '../templates/defaults.js';
import { requireProject } from './project-tools.js';

const entityTypeEnum = z.enum([
  'actors', 'classes', 'skills', 'items',
  'weapons', 'armors', 'enemies', 'states',
]);

function getManager(entityType: EntityType): DatabaseManager<{ id: number; name: string }> {
  const project = requireProject();
  const config = ENTITY_TYPES[entityType];
  const factory = DEFAULT_FACTORIES[entityType] as (id: number) => { id: number; name: string };
  return new DatabaseManager(
    project.path,
    config.filename,
    factory,
    project.getVersionSync()
  );
}

export function registerDatabaseTools(server: McpServer): void {
  // --- list_entities ---
  server.tool(
    'list_entities',
    'List all entities of a given type (actors, items, weapons, etc.)',
    {
      entityType: entityTypeEnum.describe('Entity type to list'),
    },
    async ({ entityType }) => {
      try {
        const manager = getManager(entityType);
        const entities = await manager.list();
        const label = ENTITY_TYPES[entityType].label;

        if (entities.length === 0) {
          return { content: [{ type: 'text' as const, text: `No ${label}s found.` }] };
        }

        const lines = entities.map((e) => `[${e.id}] ${e.name || '(unnamed)'}`);
        return {
          content: [{
            type: 'text' as const,
            text: `${label}s (${entities.length}):\n${lines.join('\n')}`,
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

  // --- get_entity ---
  server.tool(
    'get_entity',
    'Get detailed information about a specific entity by ID.',
    {
      entityType: entityTypeEnum.describe('Entity type'),
      id: z.number().int().positive().describe('Entity ID'),
    },
    async ({ entityType, id }) => {
      try {
        const manager = getManager(entityType);
        const entity = await manager.get(id);
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify(entity, null, 2),
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

  // --- create_entity ---
  server.tool(
    'create_entity',
    'Create a new entity. Provide the entity data as a JSON object. Required: name. Other fields use defaults if omitted.',
    {
      entityType: entityTypeEnum.describe('Entity type to create'),
      data: z.record(z.unknown()).describe('Entity data (JSON object). Must include "name".'),
    },
    async ({ entityType, data }) => {
      try {
        if (!data.name || typeof data.name !== 'string') {
          return {
            content: [{ type: 'text' as const, text: 'Error: "name" is required.' }],
            isError: true,
          };
        }
        const manager = getManager(entityType);
        const result = await manager.create(data as Partial<{ id: number; name: string }>);
        const label = ENTITY_TYPES[entityType].label;
        return {
          content: [{
            type: 'text' as const,
            text: `${label} created!\n\nID: ${result.id}\n${JSON.stringify(result.entity, null, 2)}`,
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

  // --- update_entity ---
  server.tool(
    'update_entity',
    'Update an existing entity. Only provided fields will be changed.',
    {
      entityType: entityTypeEnum.describe('Entity type'),
      id: z.number().int().positive().describe('Entity ID to update'),
      data: z.record(z.unknown()).describe('Fields to update (JSON object)'),
    },
    async ({ entityType, id, data }) => {
      try {
        const manager = getManager(entityType);
        const updated = await manager.update(id, data as Partial<{ id: number; name: string }>);
        const label = ENTITY_TYPES[entityType].label;
        return {
          content: [{
            type: 'text' as const,
            text: `${label} ID ${id} updated!\n${JSON.stringify(updated, null, 2)}`,
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

  // --- delete_entity ---
  server.tool(
    'delete_entity',
    'Delete an entity by ID. Cannot delete system default entities (ID 1) for actors/classes/states.',
    {
      entityType: entityTypeEnum.describe('Entity type'),
      id: z.number().int().positive().describe('Entity ID to delete'),
    },
    async ({ entityType, id }) => {
      try {
        const protectedTypes: EntityType[] = ['actors', 'classes', 'states'];
        const protectFirst = protectedTypes.includes(entityType);
        const manager = getManager(entityType);
        await manager.delete(id, protectFirst);
        const label = ENTITY_TYPES[entityType].label;
        return {
          content: [{
            type: 'text' as const,
            text: `${label} ID ${id} deleted.`,
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

  // --- search_entities ---
  server.tool(
    'search_entities',
    'Search entities by keyword across name and description fields.',
    {
      entityType: entityTypeEnum.describe('Entity type to search'),
      query: z.string().describe('Search keyword'),
    },
    async ({ entityType, query }) => {
      try {
        const manager = getManager(entityType);
        const searchFields: (string)[] = ['name', 'note'];
        // Add description field for types that have it
        if (['skills', 'items', 'weapons', 'armors'].includes(entityType)) {
          searchFields.push('description');
        }
        // Add profile for actors
        if (entityType === 'actors') {
          searchFields.push('profile', 'nickname');
        }

        const results = await manager.search(
          query,
          searchFields as (keyof { id: number; name: string })[]
        );
        const label = ENTITY_TYPES[entityType].label;

        if (results.length === 0) {
          return {
            content: [{
              type: 'text' as const,
              text: `No ${label}s matching "${query}".`,
            }],
          };
        }

        const lines = results.map((e) => `[${e.id}] ${e.name || '(unnamed)'}`);
        return {
          content: [{
            type: 'text' as const,
            text: `Search results for "${query}" in ${label}s (${results.length}):\n${lines.join('\n')}`,
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
