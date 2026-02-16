import type { Actor, Armor, Class, Enemy, Item, Skill, State, Weapon } from '../schemas/database.js';
import type { EventPage, EventCommand } from '../schemas/event.js';
import type { Audio, MapData } from '../schemas/map.js';

// --- Default entity factories ---

export function defaultActor(id: number): Actor {
  return {
    id,
    battlerName: '',
    characterIndex: 0,
    characterName: '',
    classId: 1,
    equips: [0, 0, 0, 0, 0],
    faceIndex: 0,
    faceName: '',
    traits: [],
    initialLevel: 1,
    maxLevel: 99,
    name: '',
    nickname: '',
    note: '',
    profile: '',
  };
}

export function defaultClass(id: number): Class {
  return {
    id,
    expParams: [30, 20, 30, 30],
    traits: [],
    learnings: [],
    name: '',
    note: '',
    params: [
      // MHP, MMP, ATK, DEF, MAT, MDF, AGI, LUK — each array needs 100 entries (index 0-99)
      Array.from({ length: 100 }, (_, i) => 400 + i * 10),
      Array.from({ length: 100 }, (_, i) => 80 + i * 5),
      Array.from({ length: 100 }, (_, i) => 15 + i * 2),
      Array.from({ length: 100 }, (_, i) => 15 + i * 2),
      Array.from({ length: 100 }, (_, i) => 15 + i * 2),
      Array.from({ length: 100 }, (_, i) => 15 + i * 2),
      Array.from({ length: 100 }, (_, i) => 15 + i * 2),
      Array.from({ length: 100 }, (_, i) => 15 + i * 2),
    ],
  };
}

export function defaultSkill(id: number): Skill {
  return {
    id,
    animationId: -1,
    damage: { critical: false, elementId: -1, formula: '0', type: 0, variance: 20 },
    description: '',
    effects: [],
    hitType: 0,
    iconIndex: 0,
    message1: '',
    message2: '',
    mpCost: 0,
    name: '',
    note: '',
    occasion: 1,
    repeats: 1,
    requiredWtypeId1: 0,
    requiredWtypeId2: 0,
    scope: 0,
    speed: 0,
    stypeId: 1,
    successRate: 100,
    tpCost: 0,
    tpGain: 0,
    messageType: 1,
  };
}

export function defaultItem(id: number): Item {
  return {
    id,
    animationId: -1,
    consumable: true,
    damage: { critical: false, elementId: -1, formula: '0', type: 0, variance: 20 },
    description: '',
    effects: [],
    hitType: 0,
    iconIndex: 0,
    itypeId: 1,
    name: '',
    note: '',
    occasion: 0,
    price: 0,
    repeats: 1,
    scope: 0,
    speed: 0,
    successRate: 100,
    tpGain: 0,
  };
}

export function defaultWeapon(id: number): Weapon {
  return {
    id,
    animationId: -1,
    description: '',
    etypeId: 1,
    traits: [],
    iconIndex: 0,
    name: '',
    note: '',
    params: [0, 0, 0, 0, 0, 0, 0, 0],
    price: 0,
    wtypeId: 1,
  };
}

export function defaultArmor(id: number): Armor {
  return {
    id,
    atypeId: 1,
    description: '',
    etypeId: 2,
    traits: [],
    iconIndex: 0,
    name: '',
    note: '',
    params: [0, 0, 0, 0, 0, 0, 0, 0],
    price: 0,
  };
}

export function defaultEnemy(id: number): Enemy {
  return {
    id,
    actions: [{ conditionParam1: 0, conditionParam2: 0, conditionType: 0, rating: 5, skillId: 1 }],
    battlerHue: 0,
    battlerName: '',
    dropItems: [
      { dataId: 0, denominator: 1, kind: 0 },
      { dataId: 0, denominator: 1, kind: 0 },
      { dataId: 0, denominator: 1, kind: 0 },
    ],
    exp: 0,
    traits: [],
    gold: 0,
    name: '',
    note: '',
    params: [100, 0, 10, 10, 10, 10, 10, 10],
  };
}

export function defaultState(id: number): State {
  return {
    id,
    autoRemovalTiming: 0,
    chanceByDamage: 100,
    iconIndex: 0,
    maxTurns: 1,
    message1: '',
    message2: '',
    message3: '',
    message4: '',
    minTurns: 1,
    motion: 0,
    name: '',
    note: '',
    overlay: 0,
    priority: 50,
    removeAtBattleEnd: false,
    removeByDamage: false,
    removeByRestriction: false,
    removeByWalking: false,
    restriction: 0,
    stepsToRemove: 100,
    traits: [],
    releaseByDamage: false,
    messageType: 1,
  };
}

// Default factory registry
export const DEFAULT_FACTORIES: Record<string, (id: number) => unknown> = {
  actors: defaultActor,
  classes: defaultClass,
  skills: defaultSkill,
  items: defaultItem,
  weapons: defaultWeapon,
  armors: defaultArmor,
  enemies: defaultEnemy,
  states: defaultState,
};

// --- Default audio ---

export function defaultAudio(): Audio {
  return { name: '', pan: 0, pitch: 100, volume: 90 };
}

// --- Default event page ---

export function defaultEventPage(): EventPage {
  return {
    conditions: {
      actorId: 1,
      actorValid: false,
      itemId: 1,
      itemValid: false,
      selfSwitchCh: 'A',
      selfSwitchValid: false,
      switch1Id: 1,
      switch1Valid: false,
      switch2Id: 1,
      switch2Valid: false,
      variableId: 1,
      variableValid: false,
      variableValue: 0,
    },
    directionFix: false,
    image: {
      characterIndex: 0,
      characterName: '',
      direction: 2,
      pattern: 1,
      tileId: 0,
    },
    list: [{ code: 0, indent: 0, parameters: [] }],
    moveFrequency: 3,
    moveRoute: {
      list: [{ code: 0, parameters: [] }],
      repeat: true,
      skippable: false,
      wait: false,
    },
    moveSpeed: 3,
    moveType: 0,
    priorityType: 1,
    stepAnime: false,
    through: false,
    trigger: 0,
    walkAnime: true,
  };
}

// --- Default end command ---

export function endCommand(): EventCommand {
  return { code: 0, indent: 0, parameters: [] };
}

// --- Default map ---

export function defaultMap(width: number, height: number, tilesetId: number): MapData {
  const size = width * height;
  // 6 layers of tile data, all zeros
  const data = new Array(size * 6).fill(0);

  return {
    autoplayBgm: false,
    autoplayBgs: false,
    battleback1Name: '',
    battleback2Name: '',
    bgm: defaultAudio(),
    bgs: defaultAudio(),
    disableDashing: false,
    displayName: '',
    encounterList: [],
    encounterStep: 30,
    height,
    note: '',
    parallaxLoopX: false,
    parallaxLoopY: false,
    parallaxName: '',
    parallaxShow: true,
    parallaxSx: 0,
    parallaxSy: 0,
    scrollType: 0,
    specifyBattleback: false,
    tilesetId,
    width,
    data,
    events: [null], // index 0 is always null
  };
}

// --- Default System.json ---

export function defaultSystem(gameTitle: string): Record<string, unknown> {
  return {
    advanced: {
      gameId: Math.floor(Math.random() * 90000000) + 10000000,
      screenWidth: 816,
      screenHeight: 624,
      uiAreaWidth: 816,
      uiAreaHeight: 624,
      mainFontFilename: 'mplus-1m-regular.woff',
      numberFontFilename: 'mplus-2p-bold-sub.woff',
      fallbackFonts: 'Verdana, sans-serif',
      fontSize: 26,
      screenScale: 1,
      windowOpacity: 192,
      picturesUpperLimit: 100,
    },
    airship: { bgm: defaultAudio(), characterIndex: 0, characterName: '', startMapId: 0, startX: 0, startY: 0 },
    armorTypes: ['', 'General Armor', 'Magic Armor', 'Light Armor', 'Heavy Armor', 'Small Shield', 'Large Shield'],
    attackMotions: [
      { type: 0, weaponImageId: 0 },
      { type: 1, weaponImageId: 1 },
      { type: 1, weaponImageId: 2 },
      { type: 1, weaponImageId: 3 },
      { type: 1, weaponImageId: 4 },
      { type: 1, weaponImageId: 5 },
      { type: 1, weaponImageId: 6 },
      { type: 2, weaponImageId: 7 },
      { type: 2, weaponImageId: 8 },
      { type: 2, weaponImageId: 9 },
      { type: 0, weaponImageId: 10 },
      { type: 0, weaponImageId: 11 },
      { type: 0, weaponImageId: 12 },
    ],
    battleBgm: { name: 'Battle1', pan: 0, pitch: 100, volume: 90 },
    battleback1Name: '',
    battleback2Name: '',
    battlerHue: 0,
    battlerName: '',
    battleSystem: 0,
    boat: { bgm: defaultAudio(), characterIndex: 0, characterName: '', startMapId: 0, startX: 0, startY: 0 },
    currencyUnit: 'G',
    itemCategories: [true, true, true, true],
    defeatMe: { name: 'Defeat1', pan: 0, pitch: 100, volume: 90 },
    editMapId: 1,
    elements: ['', 'Physical', 'Fire', 'Ice', 'Thunder', 'Water', 'Earth', 'Wind', 'Light', 'Darkness'],
    equipTypes: ['', 'Weapon', 'Shield', 'Head', 'Body', 'Accessory'],
    gameTitle,
    gameoverMe: { name: 'Gameover1', pan: 0, pitch: 100, volume: 90 },
    locale: 'en_US',
    magicSkills: [1],
    menuCommands: [true, true, true, true, true, true],
    optAutosave: true,
    optDisplayTp: true,
    optDrawTitle: true,
    optExtraExp: false,
    optFloorDeath: false,
    optFollowers: true,
    optKeyItemsNumber: false,
    optMessageSkip: true,
    optSideView: true,
    optSlipDeath: false,
    optSplashScreen: false,
    optTransparent: false,
    partyMembers: [1],
    ship: { bgm: defaultAudio(), characterIndex: 0, characterName: '', startMapId: 0, startX: 0, startY: 0 },
    skillTypes: ['', 'Magic', 'Special'],
    sounds: [
      { name: 'Cursor2', pan: 0, pitch: 100, volume: 90 },
      { name: 'Decision1', pan: 0, pitch: 100, volume: 90 },
      { name: 'Cancel2', pan: 0, pitch: 100, volume: 90 },
      { name: 'Buzzer1', pan: 0, pitch: 100, volume: 90 },
      { name: 'Equip1', pan: 0, pitch: 100, volume: 90 },
      { name: 'Save', pan: 0, pitch: 100, volume: 90 },
      { name: 'Load', pan: 0, pitch: 100, volume: 90 },
      { name: 'Battle1', pan: 0, pitch: 100, volume: 90 },
      { name: 'Escape', pan: 0, pitch: 100, volume: 90 },
      { name: 'Enemy1', pan: 0, pitch: 100, volume: 90 },
      { name: 'Damage4', pan: 0, pitch: 100, volume: 90 },
      { name: 'Damage5', pan: 0, pitch: 100, volume: 90 },
      { name: 'Enemy2', pan: 0, pitch: 100, volume: 90 },
      { name: 'Magic1', pan: 0, pitch: 100, volume: 90 },
      { name: 'Magic2', pan: 0, pitch: 100, volume: 90 },
      { name: 'Item1', pan: 0, pitch: 100, volume: 90 },
      { name: 'Recovery', pan: 0, pitch: 100, volume: 90 },
      { name: 'Miss', pan: 0, pitch: 100, volume: 90 },
      { name: 'Evasion1', pan: 0, pitch: 100, volume: 90 },
      { name: 'Magic3', pan: 0, pitch: 100, volume: 90 },
      { name: 'Reflection', pan: 0, pitch: 100, volume: 90 },
      { name: 'Shop1', pan: 0, pitch: 100, volume: 90 },
      { name: 'Run', pan: 0, pitch: 100, volume: 90 },
      { name: 'Battle1', pan: 0, pitch: 100, volume: 90 },
    ],
    startMapId: 1,
    startX: 8,
    startY: 6,
    switches: Array.from({ length: 25 }, (_, i) => i === 0 ? '' : ''),
    terms: {
      basic: ['Level', 'Lv', 'HP', 'HP', 'MP', 'MP', 'TP', 'TP', 'EXP', 'EXP'],
      commands: [
        'Fight', 'Escape', 'Attack', 'Guard', 'Item', 'Skill',
        'Equip', 'Status', 'Formation', 'Save', 'Game End',
        'Options', 'Weapon', 'Armor', 'Key Item', 'Equip', 'Optimize', 'Clear',
        'New Game', 'Continue', null, 'To Title', 'Cancel', null, 'Buy', 'Sell',
      ],
      messages: {
        alwaysDash: 'Always Dash',
        commandRemember: 'Command Remember',
        touchUI: 'Touch UI',
        bgmVolume: 'BGM Volume',
        bgsVolume: 'BGS Volume',
        meVolume: 'ME Volume',
        seVolume: 'SE Volume',
        possession: 'Possession',
        expTotal: 'Current %1',
        expNext: 'To Next %1',
        saveMessage: 'Which file would you like to save to?',
        loadMessage: 'Which file would you like to load?',
        file: 'File',
        autosave: 'Autosave',
        partyName: "%1's Party",
        emerge: '%1 emerged!',
        preemptive: '%1 got the upper hand!',
        surprise: '%1 was surprised!',
        escapeStart: '%1 has started to escape!',
        escapeFailure: 'However, it was unable to escape!',
        victory: '%1 was victorious!',
        defeat: '%1 was defeated.',
        obtainExp: '%1 %2 received!',
        obtainGold: '%1\\G found!',
        obtainItem: '%1 found!',
        levelUp: '%1 is now %2 %3!',
        obtainSkill: '%1 learned!',
        useItem: '%1 uses %2!',
        criticalToEnemy: 'An excellent hit!!',
        criticalToActor: 'A painful blow!!',
        actorDamage: '%1 took %2 damage!',
        actorRecovery: '%1 recovered %2 %3!',
        actorGain: '%1 gained %2 %3!',
        actorLoss: '%1 lost %2 %3!',
        actorDrain: '%1 was drained of %2 %3!',
        actorNoDamage: '%1 took no damage!',
        actorNoHit: 'Miss! %1 took no damage!',
        enemyDamage: '%1 took %2 damage!',
        enemyRecovery: '%1 recovered %2 %3!',
        enemyGain: '%1 gained %2 %3!',
        enemyLoss: '%1 lost %2 %3!',
        enemyDrain: '%1 was drained of %2 %3!',
        enemyNoDamage: '%1 took no damage!',
        enemyNoHit: 'Miss! %1 took no damage!',
        evasion: '%1 evaded the attack!',
        magicEvasion: '%1 nullified the magic!',
        magicReflection: '%1 reflected the magic!',
        counterAttack: '%1 made a counterattack!',
        substitute: '%1 protected %2!',
        buffAdd: "%1's %2 went up!",
        debuffAdd: "%1's %2 went down!",
        buffRemove: "%1's %2 returned to normal!",
        actionFailure: 'There was no effect on %1!',
      },
      params: ['Max HP', 'Max MP', 'Attack', 'Defense', 'M.Attack', 'M.Defense', 'Agility', 'Luck', 'Hit', 'Evasion'],
    },
    testBattlers: [
      { actorId: 1, equips: [0, 0, 0, 0, 0], level: 1 },
    ],
    testTroopId: 4,
    title1Name: '',
    title2Name: '',
    titleBgm: { name: 'Theme6', pan: 0, pitch: 100, volume: 90 },
    titleCommandWindow: { background: 0, offsetX: 0, offsetY: 0 },
    variables: Array.from({ length: 25 }, (_, i) => i === 0 ? '' : ''),
    versionId: 0,
    victoryMe: { name: 'Victory1', pan: 0, pitch: 100, volume: 90 },
    weaponTypes: ['', 'Dagger', 'Sword', 'Flail', 'Axe', 'Whip', 'Staff', 'Bow', 'Crossbow', 'Gun', 'Claw', 'Glove', 'Spear'],
    windowTone: [0, 0, 0, 0],
    editor: { messageWidth1: 60, messageWidth2: 47, jsonFormatLevel: 1 },
    faceSize: 144,
    iconSize: 32,
    tileSize: 48,
  };
}
