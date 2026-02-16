import { z } from 'zod';
import { EventSchema } from './event.js';

export const MapInfoSchema = z.object({
  id: z.number(),
  expanded: z.boolean(),
  name: z.string(),
  order: z.number(),
  parentId: z.number(),
  scrollX: z.number(),
  scrollY: z.number(),
});

export const MapEncounterSchema = z.object({
  regionSet: z.array(z.number()),
  troopId: z.number(),
  weight: z.number(),
});

export const AudioSchema = z.object({
  name: z.string(),
  pan: z.number(),
  pitch: z.number(),
  volume: z.number(),
});

export const MapSchema = z.object({
  autoplayBgm: z.boolean(),
  autoplayBgs: z.boolean(),
  battleback1Name: z.string(),
  battleback2Name: z.string(),
  bgm: AudioSchema,
  bgs: AudioSchema,
  disableDashing: z.boolean(),
  displayName: z.string(),
  encounterList: z.array(MapEncounterSchema),
  encounterStep: z.number(),
  height: z.number(),
  note: z.string(),
  parallaxLoopX: z.boolean(),
  parallaxLoopY: z.boolean(),
  parallaxName: z.string(),
  parallaxShow: z.boolean(),
  parallaxSx: z.number(),
  parallaxSy: z.number(),
  scrollType: z.number(),
  specifyBattleback: z.boolean(),
  tilesetId: z.number(),
  width: z.number(),
  data: z.array(z.number()),
  events: z.array(EventSchema.nullable()),
});

export type MapInfo = z.infer<typeof MapInfoSchema>;
export type MapData = z.infer<typeof MapSchema>;
export type Audio = z.infer<typeof AudioSchema>;
