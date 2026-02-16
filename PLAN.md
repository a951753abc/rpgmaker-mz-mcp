# RPG Maker MZ MCP Server — 從頭開發計畫

## Context

現有 GitHub 上的 4 個 RPG Maker MZ MCP Server 都有嚴重穩定性問題（stdout 污染、無原子寫入、無測試、MCP SDK 過時、專案已棄置）。使用者實測 ShunsukeHayashi 版本後當機。我們將從頭建立一個穩定、可靠的 MCP Server，吸取現有專案的所有教訓。

---

## 專案結構

```
rpgmaker-mz-mcp/
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── index.ts                    # 進入點：建立 MCP Server、註冊工具、連接 stdio
│   ├── logger.ts                   # 安全 Logger（只用 stderr）
│   ├── core/
│   │   ├── file-handler.ts         # 檔案讀寫（真正的原子寫入 + 自動備份）
│   │   ├── project-manager.ts      # 專案載入/建立/驗證
│   │   ├── database-manager.ts     # 通用資料庫 CRUD（消除重複程式碼）
│   │   └── version-sync.ts         # System.json versionId 同步
│   ├── schemas/
│   │   ├── database.ts             # 資料庫實體的 Zod schema（Actor, Item, Weapon...）
│   │   ├── map.ts                  # 地圖相關 Zod schema
│   │   ├── event.ts                # 事件/指令 Zod schema
│   │   └── system.ts               # System.json Zod schema
│   ├── tools/
│   │   ├── project-tools.ts        # 專案管理工具
│   │   ├── database-tools.ts       # 資料庫 CRUD 工具（所有實體類型）
│   │   ├── map-tools.ts            # 地圖管理工具
│   │   ├── event-tools.ts          # 事件編輯工具
│   │   └── scenario-tools.ts       # AI 劇情生成工具（利用 Claude 自身能力）
│   └── templates/
│       └── defaults.ts             # RPG Maker MZ 預設資料模板
└── tests/
    ├── core/
    │   ├── file-handler.test.ts
    │   ├── database-manager.test.ts
    │   └── project-manager.test.ts
    └── tools/
        ├── database-tools.test.ts
        └── map-tools.test.ts
```

---

## 核心架構設計

### 1. 安全檔案層 (`core/file-handler.ts`)

**這是與現有專案最大的差異化 — 真正的檔案安全機制：**

- **原子寫入**：寫入 `.tmp` 暫存檔 → `fs.rename()` 覆蓋目標（rename 在同一檔案系統上是原子操作）
- **自動備份**：每次寫入前自動建立 `.bak` 備份檔
- **Zod 驗證讀取**：讀取 JSON 時使用 Zod schema 驗證，而非不安全的 `as T` 斷言
- **錯誤封裝**：所有檔案操作都包在 try/catch 中，回傳有意義的錯誤訊息

```
寫入流程：讀取原始 → 建立 .bak → 修改資料 → 寫入 .tmp → rename 為目標檔案 → 更新 versionId
```

### 2. 通用資料庫管理器 (`core/database-manager.ts`)

現有專案的最大問題之一是每個實體類型（Actor, Item, Weapon...）都複製貼上相同的 CRUD 程式碼。我們用泛型解決：

```typescript
class DatabaseManager<T> {
  constructor(filename: string, schema: ZodSchema<T>, defaults: () => T) {}
  async list(): Promise<T[]>
  async get(id: number): Promise<T>
  async create(data: Partial<T>): Promise<{ id: number; entity: T }>
  async update(id: number, data: Partial<T>): Promise<T>
  async delete(id: number): Promise<void>
  async search(query: string, fields: string[]): Promise<T[]>
}
```

一個類別處理所有 8 種資料庫實體，避免重複程式碼和不一致的 bug。

### 3. Logger (`logger.ts`)

```typescript
// 只使用 stderr，絕不碰 stdout
const log = {
  info: (...args) => console.error('[INFO]', ...args),
  warn: (...args) => console.error('[WARN]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
};
```

### 4. Version Sync (`core/version-sync.ts`)

每次修改任何 data/ 檔案後，自動更新 System.json 的 versionId，強制 RPG Maker MZ 編輯器重新載入資料。

---

## MCP 工具清單

### A. 專案管理 (4 tools)

| 工具名稱 | 說明 |
|----------|------|
| `create_project` | 建立全新 RPG Maker MZ 專案（正確的 .rmmzproject 副檔名） |
| `load_project` | 載入現有專案，驗證結構完整性 |
| `get_project_info` | 取得專案資訊（地圖數、角色數等統計） |
| `list_resources` | 列出專案中的圖片/音樂等素材資源 |

### B. 資料庫管理 (6 tools × 8 實體 = 透過參數化統一)

使用 `entity_type` 參數統一處理，而非每個實體建一個工具：

| 工具名稱 | 說明 |
|----------|------|
| `list_entities` | 列出指定類型的所有實體（actors/items/weapons/armors/skills/enemies/states/classes） |
| `get_entity` | 取得指定 ID 的實體詳情 |
| `create_entity` | 建立新實體（含完整 Zod 驗證） |
| `update_entity` | 更新現有實體 |
| `delete_entity` | 刪除實體（保護系統預設實體） |
| `search_entities` | 以關鍵字搜尋實體 |

### C. 地圖管理 (5 tools)

| 工具名稱 | 說明 |
|----------|------|
| `list_maps` | 列出所有地圖及其層級關係 |
| `create_map` | 建立新地圖（含大小、地圖集、BGM 設定） |
| `get_map` | 取得地圖詳情（含事件列表） |
| `update_map` | 更新地圖屬性 |
| `delete_map` | 刪除地圖 |

### D. 事件編輯 (5 tools)

| 工具名稱 | 說明 |
|----------|------|
| `list_events` | 列出指定地圖上的所有事件 |
| `create_event` | 在地圖上建立新事件 |
| `update_event` | 更新事件屬性 |
| `add_event_commands` | 新增事件指令（對話、選擇、傳送、開關等） |
| `delete_event` | 刪除事件 |

事件指令使用人類可讀格式，內部轉換為 RPG Maker MZ 的 command code：
```
使用者輸入: { type: "show_text", face: "Actor1", text: "你好！" }
內部轉換: { code: 101, parameters: ["Actor1", 0, 0, 0] }, { code: 401, parameters: ["你好！"] }
```

### E. AI 劇情生成 (3 tools)

**不依賴外部 API** — 利用 Claude 自身能力，工具回傳結構化提示讓 Claude 生成內容：

| 工具名稱 | 說明 |
|----------|------|
| `generate_scenario` | 根據主題/類型生成遊戲劇情大綱，回傳結構化的角色、地圖、事件建議 |
| `generate_dialogue` | 根據場景描述生成 NPC 對話，直接輸出可用的事件指令格式 |
| `generate_quest` | 生成任務設計（目標、獎勵、事件流程） |

這些工具的運作方式：讀取現有專案資料 → 組合成上下文提示 → 回傳結構化建議讓 Claude 可以直接呼叫其他工具來實現。

---

## 技術選擇

| 項目 | 選擇 | 理由 |
|------|------|------|
| Runtime | Node.js 18+ | MCP SDK 官方支援 |
| 語言 | TypeScript (strict mode) | 型別安全 |
| MCP SDK | `@modelcontextprotocol/sdk` ^1.26.0 | 最新穩定版 |
| Schema 驗證 | `zod` ^3.25 | MCP SDK 原生整合 |
| 原子寫入 | 自行實作 (write .tmp → rename) | 不引入額外依賴 |
| 測試框架 | `vitest` | 快速、TypeScript 原生支援 |
| Transport | stdio | Claude Code 標準方式 |

**依賴極簡原則**：只有 2 個 runtime 依賴（`@modelcontextprotocol/sdk`、`zod`）。

---

## 實作順序與進度追蹤

### Phase 1 — 核心基礎（最重要，必須先穩定）
- [ ] 1. `logger.ts` — stderr-only logger
- [ ] 2. `core/file-handler.ts` — 原子寫入 + 備份 + Zod 驗證讀取
- [ ] 3. `core/version-sync.ts` — versionId 同步
- [ ] 4. `core/project-manager.ts` — 專案載入/驗證
- [ ] 5. `tests/core/` — 核心層單元測試
- [ ] 6. `index.ts` — MCP Server 骨架 + stdio transport + graceful shutdown

### Phase 2 — 資料庫工具
- [ ] 7. `schemas/database.ts` — 所有實體的 Zod schema
- [ ] 8. `templates/defaults.ts` — 預設資料模板
- [ ] 9. `core/database-manager.ts` — 泛型 CRUD
- [ ] 10. `tools/database-tools.ts` — 註冊 6 個資料庫工具
- [ ] 11. `tools/project-tools.ts` — 註冊 4 個專案工具
- [ ] 12. `tests/tools/database-tools.test.ts`

### Phase 3 — 地圖與事件
- [ ] 13. `schemas/map.ts` + `schemas/event.ts` — 地圖/事件 schema
- [ ] 14. `tools/map-tools.ts` — 註冊 5 個地圖工具
- [ ] 15. `tools/event-tools.ts` — 註冊 5 個事件工具（含指令碼轉換）
- [ ] 16. `tests/tools/map-tools.test.ts`

### Phase 4 — AI 劇情生成 + 專案建立
- [ ] 17. `tools/scenario-tools.ts` — 3 個 AI 輔助工具
- [ ] 18. `tools/project-tools.ts` 補完 — create_project 完整實作

---

## 驗證方式

1. **單元測試**：`npm test` 執行 vitest
   - file-handler：驗證原子寫入、備份建立、損壞恢復
   - database-manager：驗證 CRUD、ID 生成、刪除保護
   - project-manager：驗證專案結構驗證

2. **整合測試**：用測試用 RPG Maker MZ 專案結構
   - 建立假專案目錄
   - 執行所有工具操作
   - 驗證生成的 JSON 符合 RPG Maker MZ 格式

3. **手動測試**：
   - 在 Claude Code 中設定 MCP server
   - 用自然語言測試：「幫我建一個勇者角色」「建立一張村莊地圖」
   - 用 RPG Maker MZ 開啟生成/修改的專案，確認可正常載入

---

## 與現有專案的差異總結

| 問題 | 現有專案 | 我們的方案 |
|------|---------|-----------|
| stdout 污染 | ShunsukeHayashi 用 console.log | 只用 stderr |
| 副檔名錯誤 | .rpgproject | 正確的 .rmmzproject |
| 原子寫入 | 無或假的 | write .tmp → rename |
| 檔案備份 | 僅 devmagary 有單一 .bak | 每次寫入前自動 .bak |
| 讀取驗證 | 全部用 as T 斷言 | Zod schema 驗證 |
| MCP SDK | v0.5.0 ~ v1.0.0 | v1.26.0 (最新) |
| 測試 | 3/4 完全沒測試 | vitest 單元+整合測試 |
| 程式碼重複 | 每個實體複製貼上 CRUD | 泛型 DatabaseManager |
| 錯誤處理 | 不一致或缺失 | 統一 isError 回傳 |
| 事件編輯 | devmagary 不支援 | 完整支援 + 人類可讀格式 |

---

## RPG Maker MZ 資料格式參考

### 事件指令碼對照表（常用）

| Code | 指令 | 參數說明 |
|------|------|---------|
| 101 | Show Text | [faceName, faceIndex, background, positionType] |
| 401 | Text Data | [text] (101 的延續行) |
| 102 | Show Choices | [choices[], cancelType, defaultType, positionType, background] |
| 103 | Input Number | [variableId, maxDigits] |
| 104 | Select Item | [variableId, itemType] |
| 105 | Show Scrolling Text | [speed, noFast] |
| 108 | Comment | [comment] |
| 111 | Conditional Branch | [type, ...params] |
| 112 | Else | [] |
| 113 | End Conditional | [] |
| 117 | Common Event | [commonEventId] |
| 121 | Control Switches | [startId, endId, value] |
| 122 | Control Variables | [startId, endId, operationType, operand, ...] |
| 125 | Change Gold | [operation, operandType, operand] |
| 126 | Change Items | [itemId, operation, operandType, operand] |
| 127 | Change Weapons | [weaponId, operation, operandType, operand, includeEquip] |
| 128 | Change Armors | [armorId, operation, operandType, operand, includeEquip] |
| 129 | Change Party Member | [actorId, operation] |
| 201 | Transfer Player | [method, mapId, x, y, direction, fadeType] |
| 205 | Set Movement Route | [characterId, route] |
| 211 | Change Transparency | [value] |
| 221 | Fadeout Screen | [] |
| 222 | Fadein Screen | [] |
| 230 | Wait | [duration] |
| 241 | Play BGM | [audio] |
| 245 | Play BGS | [audio] |
| 249 | Play ME | [audio] |
| 250 | Play SE | [audio] |
| 301 | Battle Processing | [type, troopId/variableId, canEscape, canLose] |
| 302 | Shop Processing | [goods] |
| 303 | Name Input Processing | [actorId, maxChar] |
| 351 | Open Menu Screen | [] |
| 352 | Open Save Screen | [] |
| 353 | Game Over | [] |
| 354 | Return to Title Screen | [] |
| 355 | Script | [script] |
| 356 | Plugin Command | [pluginName, commandName, ...args] |
| 0   | End of List | [] (每個指令列表的結尾) |

### 資料庫 JSON 陣列規則
- 所有資料庫檔案 (Actors.json, Items.json 等) 都是 JSON 陣列
- index 0 永遠是 `null`
- 實體 ID = 陣列 index
- 刪除實體時設為 `null`，不移除元素（保持 ID 穩定）

### 地圖 tile data 存取公式
```
index = (z * height + y) * width + x
z=0: 地面層, z=1: 下層, z=2: 上層, z=3: 影子層
```
