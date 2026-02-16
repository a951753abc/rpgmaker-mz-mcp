#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { logger } from './logger.js';
import { registerProjectTools } from './tools/project-tools.js';
import { registerDatabaseTools } from './tools/database-tools.js';
import { registerMapTools } from './tools/map-tools.js';
import { registerEventTools } from './tools/event-tools.js';
import { registerScenarioTools } from './tools/scenario-tools.js';

async function main(): Promise<void> {
  logger.info('Starting RPG Maker MZ MCP Server...');

  const server = new McpServer({
    name: 'rpgmaker-mz',
    version: '1.0.0',
  });

  // Register all tool groups
  registerProjectTools(server);
  registerDatabaseTools(server);
  registerMapTools(server);
  registerEventTools(server);
  registerScenarioTools(server);

  logger.info('All tools registered');

  // Connect via stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info('MCP Server connected via stdio');

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...');
    await server.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
