import { WORLD_H, WORLD_W } from './constants';
import { generateWorld, World } from './world/world';

export const SAVE_KEY = 'lifecraft.save.v1';

export interface SaveData {
  v: 1;
  seed: number;
  edits: number[]; // paires [index, bloc] différant du monde généré
  player: { x: number; y: number };
  hp: number;
  inv: ([number, number] | null)[];
  sel: number;
  phase: number;
}

export function diffEdits(world: World): number[] {
  const fresh = generateWorld(world.seed, world.w, world.h);
  const edits: number[] = [];
  for (let i = 0; i < world.tiles.length; i++) if (world.tiles[i] !== fresh.tiles[i]) edits.push(i, world.tiles[i]);
  return edits;
}

export function applyEdits(world: World, edits: number[]): void {
  for (let k = 0; k + 1 < edits.length; k += 2) {
    const i = edits[k];
    if (i >= 0 && i < world.tiles.length) world.tiles[i] = edits[k + 1];
  }
}

export function parseSave(raw: string | null): SaveData | null {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw);
    if (!d || d.v !== 1 || !Number.isFinite(d.seed) || !Array.isArray(d.edits) || !d.player) return null;
    if (!Number.isFinite(d.player.x) || !Number.isFinite(d.player.y) || !Number.isFinite(d.hp)) return null;
    return d as SaveData;
  } catch {
    return null;
  }
}

export function loadWorld(data: SaveData): World {
  const world = generateWorld(data.seed, WORLD_W, WORLD_H);
  applyEdits(world, data.edits);
  return world;
}

export function readSave(): SaveData | null {
  try {
    return parseSave(localStorage.getItem(SAVE_KEY));
  } catch {
    return null;
  }
}

export function writeSave(data: SaveData): boolean {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* stockage indisponible */
  }
}
