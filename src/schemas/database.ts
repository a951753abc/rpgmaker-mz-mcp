import { z } from 'zod';

// --- Common sub-schemas ---

const TraitSchema = z.object({
  code: z.number(),
  dataId: z.number(),
  value: z.number(),
});

const EffectSchema = z.object({
  code: z.number(),
  dataId: z.number(),
  value1: z.number(),
  value2: z.number(),
});

const LearningSchema = z.object({
  level: z.number(),
  note: z.string(),
  skillId: z.number(),
});

// --- Entity Schemas ---

export const ActorSchema = z.object({
  id: z.number(),
  battlerName: z.string(),
  characterIndex: z.number(),
  characterName: z.string(),
  classId: z.number(),
  equips: z.array(z.number()),
  faceIndex: z.number(),
  faceName: z.string(),
  traits: z.array(TraitSchema),
  initialLevel: z.number(),
  maxLevel: z.number(),
  name: z.string(),
  nickname: z.string(),
  note: z.string(),
  profile: z.string(),
});

export const ClassSchema = z.object({
  id: z.number(),
  expParams: z.array(z.number()),
  traits: z.array(TraitSchema),
  learnings: z.array(LearningSchema),
  name: z.string(),
  note: z.string(),
  params: z.array(z.array(z.number())),
});

export const SkillSchema = z.object({
  id: z.number(),
  animationId: z.number(),
  damage: z.object({
    critical: z.boolean(),
    elementId: z.number(),
    formula: z.string(),
    type: z.number(),
    variance: z.number(),
  }),
  description: z.string(),
  effects: z.array(EffectSchema),
  hitType: z.number(),
  iconIndex: z.number(),
  message1: z.string(),
  message2: z.string(),
  mpCost: z.number(),
  name: z.string(),
  note: z.string(),
  occasion: z.number(),
  repeats: z.number(),
  requiredWtypeId1: z.number(),
  requiredWtypeId2: z.number(),
  scope: z.number(),
  speed: z.number(),
  stypeId: z.number(),
  successRate: z.number(),
  tpCost: z.number(),
  tpGain: z.number(),
});

export const ItemSchema = z.object({
  id: z.number(),
  animationId: z.number(),
  consumable: z.boolean(),
  damage: z.object({
    critical: z.boolean(),
    elementId: z.number(),
    formula: z.string(),
    type: z.number(),
    variance: z.number(),
  }),
  description: z.string(),
  effects: z.array(EffectSchema),
  hitType: z.number(),
  iconIndex: z.number(),
  itypeId: z.number(),
  name: z.string(),
  note: z.string(),
  occasion: z.number(),
  price: z.number(),
  repeats: z.number(),
  scope: z.number(),
  speed: z.number(),
  successRate: z.number(),
  tpGain: z.number(),
});

export const WeaponSchema = z.object({
  id: z.number(),
  animationId: z.number(),
  description: z.string(),
  etypeId: z.number(),
  traits: z.array(TraitSchema),
  iconIndex: z.number(),
  name: z.string(),
  note: z.string(),
  params: z.array(z.number()),
  price: z.number(),
  wtypeId: z.number(),
});

export const ArmorSchema = z.object({
  id: z.number(),
  atypeId: z.number(),
  description: z.string(),
  etypeId: z.number(),
  traits: z.array(TraitSchema),
  iconIndex: z.number(),
  name: z.string(),
  note: z.string(),
  params: z.array(z.number()),
  price: z.number(),
});

export const EnemySchema = z.object({
  id: z.number(),
  actions: z.array(z.object({
    conditionParam1: z.number(),
    conditionParam2: z.number(),
    conditionType: z.number(),
    rating: z.number(),
    skillId: z.number(),
  })),
  battlerHue: z.number(),
  battlerName: z.string(),
  dropItems: z.array(z.object({
    dataId: z.number(),
    denominator: z.number(),
    kind: z.number(),
  })),
  exp: z.number(),
  traits: z.array(TraitSchema),
  gold: z.number(),
  name: z.string(),
  note: z.string(),
  params: z.array(z.number()),
});

export const StateSchema = z.object({
  id: z.number(),
  autoRemovalTiming: z.number(),
  chanceByDamage: z.number(),
  iconIndex: z.number(),
  maxTurns: z.number(),
  message1: z.string(),
  message2: z.string(),
  message3: z.string(),
  message4: z.string(),
  minTurns: z.number(),
  motion: z.number(),
  name: z.string(),
  note: z.string(),
  overlay: z.number(),
  priority: z.number(),
  removeAtBattleEnd: z.boolean(),
  removeByDamage: z.boolean(),
  removeByRestriction: z.boolean(),
  removeByWalking: z.boolean(),
  restriction: z.number(),
  stepsToRemove: z.number(),
  traits: z.array(TraitSchema),
});

// --- Type exports ---

export type Actor = z.infer<typeof ActorSchema>;
export type Class = z.infer<typeof ClassSchema>;
export type Skill = z.infer<typeof SkillSchema>;
export type Item = z.infer<typeof ItemSchema>;
export type Weapon = z.infer<typeof WeaponSchema>;
export type Armor = z.infer<typeof ArmorSchema>;
export type Enemy = z.infer<typeof EnemySchema>;
export type State = z.infer<typeof StateSchema>;

// --- Entity type registry ---

export const ENTITY_TYPES = {
  actors: { filename: 'Actors.json', schema: ActorSchema, label: 'Actor' },
  classes: { filename: 'Classes.json', schema: ClassSchema, label: 'Class' },
  skills: { filename: 'Skills.json', schema: SkillSchema, label: 'Skill' },
  items: { filename: 'Items.json', schema: ItemSchema, label: 'Item' },
  weapons: { filename: 'Weapons.json', schema: WeaponSchema, label: 'Weapon' },
  armors: { filename: 'Armors.json', schema: ArmorSchema, label: 'Armor' },
  enemies: { filename: 'Enemies.json', schema: EnemySchema, label: 'Enemy' },
  states: { filename: 'States.json', schema: StateSchema, label: 'State' },
} as const;

export type EntityType = keyof typeof ENTITY_TYPES;
