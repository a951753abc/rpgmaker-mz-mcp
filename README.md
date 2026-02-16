# 🎮 RPG Maker MZ MCP Server

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js)](https://nodejs.org)
[![MCP SDK](https://img.shields.io/badge/MCP%20SDK-1.26.0-orange)](https://modelcontextprotocol.io)
[![Tests](https://img.shields.io/badge/Tests-42%20passed-brightgreen)]()

A **stable, well-tested** [Model Context Protocol](https://modelcontextprotocol.io) server that lets AI assistants like Claude create and edit [RPG Maker MZ](https://www.rpgmakerweb.com/products/rpg-maker-mz) projects through natural language.

> **Why another one?** Existing RPG Maker MZ MCP servers on GitHub suffer from critical issues — stdout pollution breaking the MCP protocol, wrong file extensions, no atomic writes, no tests, and outdated SDKs. This project was built from scratch to fix all of them.

---

## ✨ Features

| Feature | This Project | Others |
|---------|:---:|:---:|
| Atomic file writes (`.tmp` → `rename`) | ✅ | ❌ |
| Auto `.bak` backup before every write | ✅ | ❌ |
| Zod schema validation on reads | ✅ | ❌ |
| stderr-only logging (no stdout pollution) | ✅ | ❌ |
| Correct `.rmmzproject` extension | ✅ | ❌ |
| Generic `DatabaseManager<T>` (no copy-paste) | ✅ | ❌ |
| Unit & integration tests (42 tests) | ✅ | ❌ |
| MCP SDK v1.26+ | ✅ | ❌ |
| Event editing with human-readable commands | ✅ | Partial |
| AI scenario generation tools | ✅ | ❌ |

---

## 🛠 Available Tools (23 total)

### Project Management (4)
| Tool | Description |
|------|-------------|
| `load_project` | Load an existing RPG Maker MZ project |
| `create_project` | Create a new project with all default data files |
| `get_project_info` | Get project stats (maps, actors, items, etc.) |
| `list_resources` | List images and audio files in the project |

### Database CRUD (6 tools × 8 entity types)
Unified tools that work with **actors, classes, skills, items, weapons, armors, enemies, and states**:

| Tool | Description |
|------|-------------|
| `list_entities` | List all entities of a given type |
| `get_entity` | Get entity details by ID |
| `create_entity` | Create a new entity with Zod validation |
| `update_entity` | Partial update of an existing entity |
| `delete_entity` | Delete an entity (protects system defaults) |
| `search_entities` | Search by keyword across name/description |

### Map Management (5)
| Tool | Description |
|------|-------------|
| `list_maps` | List all maps with hierarchy |
| `create_map` | Create a new map with size, tileset, BGM |
| `get_map` | Get map details including events |
| `update_map` | Update map properties |
| `delete_map` | Delete a map |

### Event Editing (5)
| Tool | Description |
|------|-------------|
| `list_events` | List events on a map |
| `create_event` | Create a new event at a position |
| `update_event` | Update event properties |
| `add_event_commands` | Add commands using human-readable format |
| `delete_event` | Delete an event |

**40+ supported command types** including `show_text`, `show_choices`, `transfer_player`, `control_switches`, `play_bgm`, `battle_processing`, `shop_processing`, and more.

### AI Scenario Generation (3)
| Tool | Description |
|------|-------------|
| `generate_scenario` | Generate a game scenario outline from a theme |
| `generate_dialogue` | Generate NPC dialogue as event commands |
| `generate_quest` | Design a quest with objectives and rewards |

These tools leverage the AI's own capabilities — no external API calls needed.

---

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/a951753abc/rpgmaker-mz-mcp.git
cd rpgmaker-mz-mcp

# Install dependencies
npm install

# Build
npm run build

# Verify (42 tests should pass)
npm test
```

---

## ⚙️ Configuration

### Claude Code (CLI)

Create a `.mcp.json` file in your project directory:

```json
{
  "mcpServers": {
    "rpgmaker-mz": {
      "command": "node",
      "args": ["/path/to/rpgmaker-mz-mcp/dist/index.js"]
    }
  }
}
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "rpgmaker-mz": {
      "command": "node",
      "args": ["/path/to/rpgmaker-mz-mcp/dist/index.js"]
    }
  }
}
```

---

## 💬 Usage Examples

Once the MCP server is connected, talk to Claude naturally:

```
You: Load my RPG Maker MZ project at /Users/me/Games/MyRPG

You: Create a warrior character named "Roland" with high attack

You: Create a 20x15 village map called "Oakwood Village" with Town1 BGM

You: Add an NPC shopkeeper on map 2 at position (8, 6)

You: Add dialogue to the shopkeeper: "Welcome! Take a look at my wares."

You: Generate a quest about rescuing a kidnapped princess

You: Create a healing potion item that restores 200 HP
```

---

## 🏗 Architecture

```
src/
├── index.ts                    # MCP Server entry point (stdio transport)
├── logger.ts                   # stderr-only logger
├── core/
│   ├── file-handler.ts         # Atomic writes + backups + Zod validation
│   ├── project-manager.ts      # Project loading / validation
│   ├── database-manager.ts     # Generic CRUD for all entity types
│   └── version-sync.ts         # System.json versionId auto-sync
├── schemas/
│   ├── database.ts             # Zod schemas for 8 entity types
│   ├── map.ts                  # Map & audio schemas
│   ├── event.ts                # Event & command schemas + converter
│   └── system.ts               # System.json schema
├── tools/
│   ├── project-tools.ts        # 4 project management tools
│   ├── database-tools.ts       # 6 database CRUD tools
│   ├── map-tools.ts            # 5 map management tools
│   ├── event-tools.ts          # 5 event editing tools
│   └── scenario-tools.ts       # 3 AI scenario tools
└── templates/
    └── defaults.ts             # RPG Maker MZ default data templates
```

### Key Design Decisions

- **Atomic writes**: Write to `.tmp` → `fs.rename()` to target. Rename is atomic on the same filesystem, preventing data corruption from partial writes.
- **Auto backup**: Every write creates a `.bak` file before overwriting, enabling easy recovery.
- **Zod validation**: All JSON reads are validated through Zod schemas instead of unsafe `as T` type assertions.
- **Generic DatabaseManager\<T\>**: One class handles CRUD for all 8 entity types, eliminating code duplication.
- **stderr-only logging**: MCP uses stdout for JSON-RPC. Any `console.log` would corrupt the protocol. We use `console.error` exclusively.
- **Version sync**: Every data file modification bumps `System.json` `versionId`, forcing RPG Maker MZ editor to reload.

---

## 🧪 Development

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Build
npm run build

# Dev mode (auto-rebuild on changes)
npm run dev
```

### Runtime Dependencies (minimal)

| Package | Purpose |
|---------|---------|
| `@modelcontextprotocol/sdk` | MCP protocol implementation |
| `zod` | Schema validation |

That's it. Just 2 runtime dependencies.

---

## 📄 License

This project is licensed under the [GNU General Public License v3.0](LICENSE).

You are free to use, modify, and distribute this software, provided that derivative works are also distributed under the same license.
