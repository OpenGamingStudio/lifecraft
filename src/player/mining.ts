import { REACH } from '../constants';
import { blockDef, isMineable } from '../world/blocks';
import type { World } from '../world/world';
import type { Body } from './physics';

export interface MiningState {
  tx: number;
  ty: number;
  progress: number; // 0..1
}

export function inReach(b: Body, tx: number, ty: number, reach = REACH): boolean {
  const dx = tx + 0.5 - b.x;
  const dy = ty + 0.5 - (b.y - b.h * 0.6);
  return dx * dx + dy * dy <= reach * reach;
}

/** Fait avancer le minage de la tuile visée. Renvoie le nouvel état et si le bloc est cassé. */
export function advanceMining(
  world: World,
  state: MiningState | null,
  tx: number,
  ty: number,
  dt: number,
): { state: MiningState | null; broken: boolean } {
  const id = world.get(tx, ty);
  if (!isMineable(id)) return { state: null, broken: false };
  const s = state && state.tx === tx && state.ty === ty ? state : { tx, ty, progress: 0 };
  s.progress += dt / blockDef(id).hardness;
  if (s.progress >= 1) return { state: null, broken: true };
  return { state: s, broken: false };
}

/** Une tuile accepte un bloc si elle est vide, à portée, touche un bloc plein et ne chevauche pas le joueur. */
export function canPlace(world: World, b: Body, tx: number, ty: number): boolean {
  if (!world.inBounds(tx, ty) || world.get(tx, ty) !== 0 || !inReach(b, tx, ty)) return false;
  const touching = world.isSolid(tx + 1, ty) || world.isSolid(tx - 1, ty) || world.isSolid(tx, ty + 1) || world.isSolid(tx, ty - 1);
  if (!touching) return false;
  const overlapX = tx < b.x + b.w / 2 && tx + 1 > b.x - b.w / 2;
  const overlapY = ty < b.y && ty + 1 > b.y - b.h;
  return !(overlapX && overlapY);
}
