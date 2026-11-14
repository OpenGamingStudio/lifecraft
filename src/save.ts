import { WORLD_H, WORLD_W } from './constants';
import { B } from './world/blocks';
import { generateWorld, World, type TreeBox } from './world/world';

export const SAVE_KEY = 'lifecraft.save.v1'; // même clé : une sauvegarde V1 se lit, la suivante s'écrit en version 2

export interface SaveData {
  v: 1 | 2; // 1 : monde sans arbres ; 2 : arbres générés, objets et outils dans le sac
  seed: number;
  edits: number[]; // paires [index, bloc] différant du monde généré
  player: { x: number; y: number };
  hp: number;
  inv: unknown[];
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

const MAX_RAW = 5_000_000;

function isInt(n: unknown, min: number, max: number): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= min && n <= max;
}

function isNum(n: unknown, lim: number): n is number {
  return typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= lim;
}

/** Lecture sûre : taille bornée, types et bornes vérifiés, champs inconnus ignorés (jamais d'objet brut réutilisé). */
export function parseSave(raw: string | null): SaveData | null {
  if (!raw || raw.length > MAX_RAW) return null;
  try {
    const d = JSON.parse(raw);
    if (!d || typeof d !== 'object' || (d.v !== 1 && d.v !== 2) || !isInt(d.seed, -(2 ** 31), 2 ** 32)) return null;
    const p = d.player;
    if (!p || !isNum(p.x, WORLD_W + 8) || !isNum(p.y, WORLD_H + 8) || !isNum(d.hp, 1e4)) return null;
    if (!Array.isArray(d.edits) || d.edits.length > WORLD_W * WORLD_H * 2 || d.edits.length % 2 !== 0) return null;
    for (let k = 0; k < d.edits.length; k += 2) {
      if (!isInt(d.edits[k], 0, WORLD_W * WORLD_H - 1) || !isInt(d.edits[k + 1], 0, B.BENCH)) return null;
    }
    const inv = Array.isArray(d.inv) ? d.inv.slice(0, 64) : [];
    return {
      v: d.v,
      seed: d.seed,
      edits: d.edits,
      player: { x: p.x, y: p.y },
      hp: d.hp,
      inv,
      sel: isInt(d.sel, 0, 63) ? d.sel : 0,
      phase: isNum(d.phase, 1e6) ? d.phase : 0.05,
    };
  } catch {
    return null;
  }
}

export function loadWorld(data: SaveData): World {
  // sauvegarde V1 : le monde n'avait pas d'arbres. Un arbre qui toucherait une tuile déjà modifiée par le joueur est écarté.
  let keep: ((box: TreeBox) => boolean) | undefined;
  if (data.v === 1) {
    const touched = new Set<number>();
    for (let k = 0; k + 1 < data.edits.length; k += 2) touched.add(data.edits[k]);
    keep = (b) => {
      for (let y = b.y0 - 1; y <= b.y1 + 1; y++) for (let x = Math.max(0, b.x0 - 1); x <= Math.min(WORLD_W - 1, b.x1 + 1); x++) if (touched.has(y * WORLD_W + x)) return false;
      return true;
    };
  }
  const world = generateWorld(data.seed, WORLD_W, WORLD_H, keep);
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
