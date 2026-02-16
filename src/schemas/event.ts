import { z } from 'zod';

export const EventCommandSchema = z.object({
  code: z.number(),
  indent: z.number(),
  parameters: z.array(z.unknown()),
});

export const EventPageConditionSchema = z.object({
  actorId: z.number(),
  actorValid: z.boolean(),
  itemId: z.number(),
  itemValid: z.boolean(),
  selfSwitchCh: z.string(),
  selfSwitchValid: z.boolean(),
  switch1Id: z.number(),
  switch1Valid: z.boolean(),
  switch2Id: z.number(),
  switch2Valid: z.boolean(),
  variableId: z.number(),
  variableValid: z.boolean(),
  variableValue: z.number(),
});

export const EventPageImageSchema = z.object({
  characterIndex: z.number(),
  characterName: z.string(),
  direction: z.number(),
  pattern: z.number(),
  tileId: z.number(),
});

export const MoveRouteSchema = z.object({
  list: z.array(z.object({
    code: z.number(),
    parameters: z.array(z.unknown()).optional(),
  })),
  repeat: z.boolean(),
  skippable: z.boolean(),
  wait: z.boolean(),
});

export const EventPageSchema = z.object({
  conditions: EventPageConditionSchema,
  directionFix: z.boolean(),
  image: EventPageImageSchema,
  list: z.array(EventCommandSchema),
  moveFrequency: z.number(),
  moveRoute: MoveRouteSchema,
  moveSpeed: z.number(),
  moveType: z.number(),
  priorityType: z.number(),
  stepAnime: z.boolean(),
  through: z.boolean(),
  trigger: z.number(),
  walkAnime: z.boolean(),
});

export const EventSchema = z.object({
  id: z.number(),
  name: z.string(),
  note: z.string(),
  pages: z.array(EventPageSchema),
  x: z.number(),
  y: z.number(),
});

export type EventCommand = z.infer<typeof EventCommandSchema>;
export type EventPage = z.infer<typeof EventPageSchema>;
export type Event = z.infer<typeof EventSchema>;

// --- Human-readable command types → RPG Maker MZ command codes ---

export const COMMAND_CODES: Record<string, number> = {
  // Message
  show_text: 101,
  show_text_body: 401,
  show_choices: 102,
  when_choice: 402,
  when_cancel: 403,
  input_number: 103,
  select_item: 104,
  show_scrolling_text: 105,
  show_scrolling_text_body: 405,

  // Game Progression
  control_switches: 121,
  control_variables: 122,
  control_self_switch: 123,
  control_timer: 124,

  // Flow Control
  conditional_branch: 111,
  else: 411,
  loop: 112,
  break_loop: 113,
  exit_event: 115,
  common_event: 117,
  label: 118,
  jump_to_label: 119,
  comment: 108,
  comment_body: 408,

  // Party
  change_gold: 125,
  change_items: 126,
  change_weapons: 127,
  change_armors: 128,
  change_party_member: 129,

  // Actor
  change_hp: 311,
  change_mp: 312,
  change_tp: 326,
  change_state: 313,
  recover_all: 314,
  change_exp: 315,
  change_level: 316,
  change_parameter: 317,
  change_skill: 318,
  change_equipment: 319,
  change_name: 320,
  change_class: 321,
  change_nickname: 324,
  change_profile: 325,

  // Movement
  transfer_player: 201,
  set_vehicle_location: 202,
  set_event_location: 203,
  scroll_map: 204,
  set_movement_route: 205,
  get_on_off_vehicle: 206,

  // Character
  change_transparency: 211,
  show_animation: 212,
  show_balloon_icon: 213,
  erase_event: 214,
  change_player_followers: 216,
  gather_followers: 217,

  // Screen
  fadeout_screen: 221,
  fadein_screen: 222,
  tint_screen: 223,
  flash_screen: 224,
  shake_screen: 225,

  // Timing
  wait: 230,

  // Picture
  show_picture: 231,
  move_picture: 232,
  rotate_picture: 233,
  tint_picture: 234,
  erase_picture: 235,

  // Audio
  play_bgm: 241,
  fadeout_bgm: 242,
  save_bgm: 243,
  resume_bgm: 244,
  play_bgs: 245,
  fadeout_bgs: 246,
  play_me: 249,
  play_se: 250,
  stop_se: 251,

  // Scene Control
  battle_processing: 301,
  shop_processing: 302,
  name_input_processing: 303,
  open_menu: 351,
  open_save: 352,
  game_over: 353,
  return_to_title: 354,

  // System
  change_battle_bgm: 132,
  change_victory_me: 133,
  change_defeat_me: 139,
  change_vehicle_bgm: 140,

  // Map
  change_tileset: 282,
  change_battle_back: 283,
  change_parallax: 284,

  // Plugin
  plugin_command: 356,

  // End of list marker
  end: 0,
};

/**
 * Convert human-readable command to RPG Maker MZ event commands.
 */
export function convertCommand(cmd: {
  type: string;
  [key: string]: unknown;
}): EventCommand[] {
  switch (cmd.type) {
    case 'show_text': {
      const face = (cmd.face as string) || '';
      const faceIndex = (cmd.faceIndex as number) || 0;
      const background = (cmd.background as number) || 0;
      const positionType = (cmd.positionType as number) || 2;
      const text = (cmd.text as string) || '';
      const lines = text.split('\n');
      return [
        { code: 101, indent: 0, parameters: [face, faceIndex, background, positionType] },
        ...lines.map((line) => ({
          code: 401, indent: 0, parameters: [line],
        })),
      ];
    }

    case 'show_choices': {
      const choices = (cmd.choices as string[]) || [];
      const cancelType = (cmd.cancelType as number) ?? -2;
      const defaultType = (cmd.defaultType as number) ?? 0;
      return [
        { code: 102, indent: 0, parameters: [choices, cancelType, defaultType, 2, 0] },
      ];
    }

    case 'transfer_player': {
      const mapId = (cmd.mapId as number) || 1;
      const x = (cmd.x as number) || 0;
      const y = (cmd.y as number) || 0;
      const direction = (cmd.direction as number) || 0;
      const fadeType = (cmd.fadeType as number) || 0;
      return [
        { code: 201, indent: 0, parameters: [0, mapId, x, y, direction, fadeType] },
      ];
    }

    case 'control_switches': {
      const startId = (cmd.startId as number) || 1;
      const endId = (cmd.endId as number) || startId;
      const value = (cmd.value as number) ?? 0; // 0=ON, 1=OFF
      return [
        { code: 121, indent: 0, parameters: [startId, endId, value] },
      ];
    }

    case 'control_variables': {
      const startId = (cmd.startId as number) || 1;
      const endId = (cmd.endId as number) || startId;
      const operationType = (cmd.operationType as number) || 0;
      const operand = (cmd.operand as number) || 0;
      const value = (cmd.value as number) || 0;
      return [
        { code: 122, indent: 0, parameters: [startId, endId, operationType, operand, value] },
      ];
    }

    case 'control_self_switch': {
      const key = (cmd.key as string) || 'A';
      const value = (cmd.value as number) ?? 0;
      return [
        { code: 123, indent: 0, parameters: [key, value] },
      ];
    }

    case 'conditional_branch': {
      const conditionType = (cmd.conditionType as number) || 0;
      const param1 = (cmd.param1 as number) || 0;
      const param2 = (cmd.param2 as number) || 0;
      return [
        { code: 111, indent: 0, parameters: [conditionType, param1, param2] },
      ];
    }

    case 'common_event': {
      const eventId = (cmd.eventId as number) || 1;
      return [
        { code: 117, indent: 0, parameters: [eventId] },
      ];
    }

    case 'change_gold': {
      const operation = (cmd.operation as number) || 0; // 0=increase, 1=decrease
      const operandType = (cmd.operandType as number) || 0;
      const value = (cmd.value as number) || 0;
      return [
        { code: 125, indent: 0, parameters: [operation, operandType, value] },
      ];
    }

    case 'change_items': {
      const itemId = (cmd.itemId as number) || 1;
      const operation = (cmd.operation as number) || 0;
      const operandType = (cmd.operandType as number) || 0;
      const value = (cmd.value as number) || 1;
      return [
        { code: 126, indent: 0, parameters: [itemId, operation, operandType, value] },
      ];
    }

    case 'play_bgm': {
      const name = (cmd.name as string) || '';
      const volume = (cmd.volume as number) ?? 90;
      const pitch = (cmd.pitch as number) ?? 100;
      const pan = (cmd.pan as number) ?? 0;
      return [
        { code: 241, indent: 0, parameters: [{ name, volume, pitch, pan }] },
      ];
    }

    case 'play_se': {
      const name = (cmd.name as string) || '';
      const volume = (cmd.volume as number) ?? 90;
      const pitch = (cmd.pitch as number) ?? 100;
      const pan = (cmd.pan as number) ?? 0;
      return [
        { code: 250, indent: 0, parameters: [{ name, volume, pitch, pan }] },
      ];
    }

    case 'wait': {
      const duration = (cmd.duration as number) || 60;
      return [
        { code: 230, indent: 0, parameters: [duration] },
      ];
    }

    case 'fadeout_screen':
      return [{ code: 221, indent: 0, parameters: [] }];

    case 'fadein_screen':
      return [{ code: 222, indent: 0, parameters: [] }];

    case 'erase_event':
      return [{ code: 214, indent: 0, parameters: [] }];

    case 'recover_all': {
      const actorId = (cmd.actorId as number) || 0; // 0 = entire party
      return [
        { code: 314, indent: 0, parameters: [0, actorId] },
      ];
    }

    case 'battle_processing': {
      const troopId = (cmd.troopId as number) || 1;
      const canEscape = (cmd.canEscape as boolean) ?? true;
      const canLose = (cmd.canLose as boolean) ?? false;
      return [
        { code: 301, indent: 0, parameters: [0, troopId, canEscape, canLose] },
      ];
    }

    case 'shop_processing': {
      const goods = (cmd.goods as [number, number][]) || [];
      const purchaseOnly = (cmd.purchaseOnly as boolean) ?? false;
      const result: EventCommand[] = [
        { code: 302, indent: 0, parameters: [goods[0]?.[0] ?? 0, goods[0]?.[1] ?? 1, 0, 0, purchaseOnly] },
      ];
      for (let i = 1; i < goods.length; i++) {
        result.push({ code: 605, indent: 0, parameters: [goods[i][0], goods[i][1], 0, 0] });
      }
      return result;
    }

    case 'change_hp': {
      const actorId = (cmd.actorId as number) || 1;
      const operation = (cmd.operation as number) || 0;
      const operandType = (cmd.operandType as number) || 0;
      const value = (cmd.value as number) || 0;
      const allowDeath = (cmd.allowDeath as boolean) ?? false;
      return [
        { code: 311, indent: 0, parameters: [0, actorId, operation, operandType, value, allowDeath] },
      ];
    }

    case 'change_exp': {
      const actorId = (cmd.actorId as number) || 0;
      const operation = (cmd.operation as number) || 0;
      const operandType = (cmd.operandType as number) || 0;
      const value = (cmd.value as number) || 0;
      const showLevelUp = (cmd.showLevelUp as boolean) ?? true;
      return [
        { code: 315, indent: 0, parameters: [0, actorId, operation, operandType, value, showLevelUp] },
      ];
    }

    case 'comment': {
      const text = (cmd.text as string) || '';
      const lines = text.split('\n');
      return [
        { code: 108, indent: 0, parameters: [lines[0] || ''] },
        ...lines.slice(1).map((line) => ({
          code: 408, indent: 0, parameters: [line],
        })),
      ];
    }

    case 'label': {
      const name = (cmd.name as string) || '';
      return [{ code: 118, indent: 0, parameters: [name] }];
    }

    case 'jump_to_label': {
      const name = (cmd.name as string) || '';
      return [{ code: 119, indent: 0, parameters: [name] }];
    }

    case 'loop':
      return [{ code: 112, indent: 0, parameters: [] }];

    case 'break_loop':
      return [{ code: 113, indent: 0, parameters: [] }];

    case 'exit_event':
      return [{ code: 115, indent: 0, parameters: [] }];

    case 'game_over':
      return [{ code: 353, indent: 0, parameters: [] }];

    case 'return_to_title':
      return [{ code: 354, indent: 0, parameters: [] }];

    case 'change_party_member': {
      const actorId = (cmd.actorId as number) || 1;
      const operation = (cmd.operation as number) || 0; // 0=add, 1=remove
      const initialize = (cmd.initialize as boolean) ?? true;
      return [
        { code: 129, indent: 0, parameters: [actorId, operation, initialize] },
      ];
    }

    case 'change_class': {
      const actorId = (cmd.actorId as number) || 1;
      const classId = (cmd.classId as number) || 1;
      const keepExp = (cmd.keepExp as boolean) ?? false;
      return [
        { code: 321, indent: 0, parameters: [actorId, classId, keepExp] },
      ];
    }

    case 'change_skill': {
      const actorId = (cmd.actorId as number) || 1;
      const operation = (cmd.operation as number) || 0; // 0=learn, 1=forget
      const skillId = (cmd.skillId as number) || 1;
      return [
        { code: 318, indent: 0, parameters: [0, actorId, operation, skillId] },
      ];
    }

    case 'change_level': {
      const actorId = (cmd.actorId as number) || 0;
      const operation = (cmd.operation as number) || 0; // 0=increase, 1=decrease
      const operandType = (cmd.operandType as number) || 0;
      const value = (cmd.value as number) || 1;
      const showLevelUp = (cmd.showLevelUp as boolean) ?? true;
      return [
        { code: 316, indent: 0, parameters: [0, actorId, operation, operandType, value, showLevelUp] },
      ];
    }

    case 'change_state': {
      const actorId = (cmd.actorId as number) || 0;
      const operation = (cmd.operation as number) || 0; // 0=add, 1=remove
      const stateId = (cmd.stateId as number) || 1;
      return [
        { code: 313, indent: 0, parameters: [0, actorId, operation, stateId] },
      ];
    }

    case 'change_name': {
      const actorId = (cmd.actorId as number) || 1;
      const name = (cmd.name as string) || '';
      return [
        { code: 320, indent: 0, parameters: [actorId, name] },
      ];
    }

    case 'change_weapons': {
      const weaponId = (cmd.weaponId as number) || 1;
      const operation = (cmd.operation as number) || 0;
      const operandType = (cmd.operandType as number) || 0;
      const value = (cmd.value as number) || 1;
      return [
        { code: 127, indent: 0, parameters: [weaponId, operation, operandType, value] },
      ];
    }

    case 'change_armors': {
      const armorId = (cmd.armorId as number) || 1;
      const operation = (cmd.operation as number) || 0;
      const operandType = (cmd.operandType as number) || 0;
      const value = (cmd.value as number) || 1;
      return [
        { code: 128, indent: 0, parameters: [armorId, operation, operandType, value] },
      ];
    }

    case 'show_balloon_icon': {
      const characterId = (cmd.characterId as number) ?? -1; // -1=player, 0=this event
      const balloonId = (cmd.balloonId as number) || 1; // 1=exclamation, 2=question, etc.
      const waitForCompletion = (cmd.waitForCompletion as boolean) ?? false;
      return [
        { code: 213, indent: 0, parameters: [characterId, balloonId, waitForCompletion] },
      ];
    }

    default:
      throw new Error(`Unknown command type: ${cmd.type}`);
  }
}
