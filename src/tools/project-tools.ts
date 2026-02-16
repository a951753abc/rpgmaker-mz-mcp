import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ProjectManager } from '../core/project-manager.js';
import { FileHandler } from '../core/file-handler.js';
import { defaultSystem, defaultMap, defaultActor, defaultClass, defaultSkill, defaultItem, defaultWeapon, defaultArmor, defaultEnemy, defaultState } from '../templates/defaults.js';
import { INDEX_HTML, GAME_CSS, PLUGINS_JS } from '../templates/engine-files.js';
import { logger } from '../logger.js';

let currentProject: ProjectManager | null = null;

export function getCurrentProject(): ProjectManager | null {
  return currentProject;
}

export function setCurrentProject(project: ProjectManager): void {
  currentProject = project;
}

export function requireProject(): ProjectManager {
  if (!currentProject) {
    throw new Error('No project loaded. Use load_project or create_project first.');
  }
  return currentProject;
}

/**
 * Find the RPG Maker MZ newdata directory containing engine template files.
 * Checks user-provided path first, then auto-detects common install locations.
 */
async function findNewdataDir(rpgmakerPath?: string): Promise<string | null> {
  const candidates: string[] = [];

  if (rpgmakerPath) {
    // User-provided path: try both as-is and with /newdata appended
    candidates.push(rpgmakerPath);
    candidates.push(path.join(rpgmakerPath, 'newdata'));
  }

  const home = os.homedir();
  if (process.platform === 'darwin') {
    candidates.push(
      path.join(home, 'Library/Application Support/Steam/steamapps/common/RPG Maker MZ/RPGMZ.app/Contents/Resources/newdata'),
    );
  } else if (process.platform === 'win32') {
    candidates.push(
      'C:\\Program Files\\Steam\\steamapps\\common\\RPG Maker MZ\\newdata',
      'C:\\Program Files (x86)\\Steam\\steamapps\\common\\RPG Maker MZ\\newdata',
      path.join(home, 'Steam/steamapps/common/RPG Maker MZ/newdata'),
    );
  }

  for (const dir of candidates) {
    try {
      await fs.access(path.join(dir, 'js', 'main.js'));
      return dir;
    } catch {
      // Not found, try next
    }
  }
  return null;
}

export function registerProjectTools(server: McpServer): void {
  // --- load_project ---
  server.tool(
    'load_project',
    'Load an existing RPG Maker MZ project. Must be called before using other tools.',
    { projectPath: z.string().describe('Absolute path to the RPG Maker MZ project directory') },
    async ({ projectPath }) => {
      try {
        const manager = await ProjectManager.load(projectPath);
        const validation = await manager.validate();
        currentProject = manager;

        if (!validation.valid) {
          return {
            content: [{
              type: 'text' as const,
              text: `Project loaded with warnings:\n${validation.errors.map((e) => `- ${e}`).join('\n')}\n\nPath: ${projectPath}`,
            }],
          };
        }

        const info = await manager.getInfo();
        return {
          content: [{
            type: 'text' as const,
            text: `Project loaded successfully!\n\nName: ${info.name}\nPath: ${info.path}\nMaps: ${info.mapCount}\nActors: ${info.actorCount}\nItems: ${info.itemCount}\nVersion ID: ${info.versionId}`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Failed to load project: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    }
  );

  // --- create_project ---
  server.tool(
    'create_project',
    'Create a new RPG Maker MZ project with default data files.',
    {
      projectPath: z.string().describe('Absolute path where the project will be created'),
      gameTitle: z.string().describe('Title of the game'),
      rpgmakerPath: z.string().optional().describe('RPG Maker MZ installation path (auto-detected if omitted)'),
    },
    async ({ projectPath, gameTitle, rpgmakerPath }) => {
      try {
        // Check if directory already exists with content
        if (await FileHandler.exists(path.join(projectPath, 'Game.rmmzproject'))) {
          return {
            content: [{
              type: 'text' as const,
              text: `A project already exists at: ${projectPath}`,
            }],
            isError: true,
          };
        }

        // Create directory structure
        const dirs = [
          'data', 'css', 'fonts', 'icon',
          'img/animations', 'img/battlebacks1', 'img/battlebacks2',
          'img/characters', 'img/enemies', 'img/faces', 'img/parallaxes',
          'img/pictures', 'img/sv_actors', 'img/sv_enemies', 'img/system',
          'img/tilesets', 'img/titles1', 'img/titles2',
          'audio/bgm', 'audio/bgs', 'audio/me', 'audio/se',
          'js/plugins', 'js/libs', 'movies', 'effects',
        ];
        for (const dir of dirs) {
          await FileHandler.ensureDir(path.join(projectPath, dir));
        }

        // Create .rmmzproject file (empty JSON object)
        await FileHandler.writeJson(path.join(projectPath, 'Game.rmmzproject'), {});

        // Create System.json
        const system = defaultSystem(gameTitle);
        await FileHandler.writeJson(path.join(projectPath, 'data', 'System.json'), system);

        // Create database files with default first entries
        const dbFiles: [string, (id: number) => unknown][] = [
          ['Actors.json', defaultActor],
          ['Classes.json', defaultClass],
          ['Skills.json', defaultSkill],
          ['Items.json', defaultItem],
          ['Weapons.json', defaultWeapon],
          ['Armors.json', defaultArmor],
          ['Enemies.json', defaultEnemy],
          ['States.json', defaultState],
        ];

        for (const [filename, factory] of dbFiles) {
          const data = [null, factory(1)];
          await FileHandler.writeJson(path.join(projectPath, 'data', filename), data);
        }

        // Create empty array files
        const emptyArrayFiles = [
          'CommonEvents.json', 'Troops.json', 'Animations.json', 'Tilesets.json',
        ];
        for (const filename of emptyArrayFiles) {
          // Tilesets needs at least one entry for maps to work
          if (filename === 'Tilesets.json') {
            await FileHandler.writeJson(path.join(projectPath, 'data', filename), [
              null,
              {
                id: 1,
                flags: Array(8192).fill(0),
                mode: 1,
                name: 'World_A1',
                note: '',
                tilesetNames: ['World_A1', 'World_A2', '', '', '', 'World_B', 'World_C', '', ''],
              },
            ]);
          } else {
            await FileHandler.writeJson(path.join(projectPath, 'data', filename), [null]);
          }
        }

        // Create default Map001 and MapInfos
        const map = defaultMap(17, 13, 1);
        await FileHandler.writeJson(path.join(projectPath, 'data', 'Map001.json'), map);
        await FileHandler.writeJson(path.join(projectPath, 'data', 'MapInfos.json'), [
          null,
          { id: 1, expanded: false, name: 'Map001', order: 1, parentId: 0, scrollX: 0, scrollY: 0 },
        ]);

        // Write embedded template files
        await fs.writeFile(path.join(projectPath, 'index.html'), INDEX_HTML, 'utf-8');
        await fs.writeFile(path.join(projectPath, 'css', 'game.css'), GAME_CSS, 'utf-8');
        await fs.writeFile(path.join(projectPath, 'js', 'plugins.js'), PLUGINS_JS, 'utf-8');

        // Copy engine files from RPG Maker MZ installation
        const engineWarnings: string[] = [];
        const newdataDir = await findNewdataDir(rpgmakerPath);

        if (newdataDir) {
          const engineFiles = [
            'js/main.js',
            'js/rmmz_core.js',
            'js/rmmz_managers.js',
            'js/rmmz_objects.js',
            'js/rmmz_scenes.js',
            'js/rmmz_sprites.js',
            'js/rmmz_windows.js',
            'js/libs/pixi.js',
            'js/libs/pako.min.js',
            'js/libs/localforage.min.js',
            'js/libs/effekseer.min.js',
            'js/libs/effekseer.wasm',
            'js/libs/vorbisdecoder.js',
            'fonts/mplus-1m-regular.woff',
            'fonts/mplus-2p-bold-sub.woff',
          ];

          let copiedCount = 0;
          for (const relPath of engineFiles) {
            const src = path.join(newdataDir, relPath);
            const dest = path.join(projectPath, relPath);
            try {
              await fs.copyFile(src, dest);
              copiedCount++;
            } catch {
              engineWarnings.push(`Could not copy ${relPath}`);
            }
          }
          logger.info(`Copied ${copiedCount}/${engineFiles.length} engine files from ${newdataDir}`);
        } else {
          engineWarnings.push(
            'RPG Maker MZ installation not found. Engine files (js/main.js, js/rmmz_*.js, js/libs/*, fonts/*) were not copied.',
            'To fix: open the project in RPG Maker MZ, or re-run create_project with rpgmakerPath pointing to your installation.',
          );
        }

        // Load the created project
        const manager = await ProjectManager.load(projectPath);
        currentProject = manager;

        logger.info(`Project created: ${projectPath}`);

        let resultText = `Project created successfully!\n\nTitle: ${gameTitle}\nPath: ${projectPath}\n\nCreated files:\n- Game.rmmzproject\n- index.html, css/game.css, js/plugins.js\n- data/System.json\n- data/Actors.json (1 default actor)\n- data/Classes.json (1 default class)\n- data/Skills.json, Items.json, Weapons.json, Armors.json, Enemies.json, States.json\n- data/Map001.json (17x13 default map)\n- data/MapInfos.json\n- data/CommonEvents.json, Troops.json, Animations.json, Tilesets.json`;

        if (newdataDir && engineWarnings.length === 0) {
          resultText += `\n- Engine files copied from: ${newdataDir}`;
        }
        if (engineWarnings.length > 0) {
          resultText += `\n\nWarnings:\n${engineWarnings.map((w) => `- ${w}`).join('\n')}`;
        }

        resultText += '\n\nThe project is now loaded and ready to use.';

        return {
          content: [{
            type: 'text' as const,
            text: resultText,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Failed to create project: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    }
  );

  // --- get_project_info ---
  server.tool(
    'get_project_info',
    'Get information about the currently loaded RPG Maker MZ project.',
    {},
    async () => {
      try {
        const project = requireProject();
        const info = await project.getInfo();
        const validation = await project.validate();

        let text = `Project: ${info.name}\nPath: ${info.path}\nVersion ID: ${info.versionId}\n\nStatistics:\n- Maps: ${info.mapCount}\n- Actors: ${info.actorCount}\n- Items: ${info.itemCount}\n\nData files: ${info.dataFiles.join(', ')}`;

        if (!validation.valid) {
          text += `\n\nValidation warnings:\n${validation.errors.map((e) => `- ${e}`).join('\n')}`;
        }

        return { content: [{ type: 'text' as const, text }] };
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

  // --- list_resources ---
  server.tool(
    'list_resources',
    'List resource files (images, audio) in the project.',
    {
      type: z.string().optional().describe('Filter by type: "img" or "audio"'),
    },
    async ({ type }) => {
      try {
        const project = requireProject();
        const resources = await project.listResources(type);

        if (Object.keys(resources).length === 0) {
          return { content: [{ type: 'text' as const, text: 'No resource files found.' }] };
        }

        const lines: string[] = [];
        for (const [dir, files] of Object.entries(resources)) {
          lines.push(`\n${dir}/`);
          for (const file of files) {
            lines.push(`  ${file}`);
          }
        }

        return { content: [{ type: 'text' as const, text: `Project resources:${lines.join('\n')}` }] };
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
