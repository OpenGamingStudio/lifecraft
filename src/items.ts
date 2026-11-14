import { B, blockDef, type ToolKind } from './world/blocks';
import { hash2 } from './world/rng';

/** Objets : identifiants à la suite des blocs (le même rang dans l'atlas), jamais posés dans le monde. */
export const I = {
  FIBRE: 12,
  LATTE: 13,
  ECORCE: 14,
  CORDELETTE: 15,
  MANCHE: 16,
  PIC_LATTE: 17,
  PIC_PIERRE: 18,
  COGNEE_LATTE: 19,
  COGNEE_PIERRE: 20,
  BECHE_LATTE: 21,
  BECHE_PIERRE: 22,
} as const;
export const FIRST_ITEM = I.FIBRE;
export const LAST_ITEM = I.BECHE_PIERRE;

export const SPEED_LATTE = 2;
export const SPEED_PIERRE = 3.5;
export const DURA_LATTE = 40;
export const DURA_PIERRE = 90;
export const BENCH_REACH = 3; // portée du Banc d'artisan, en blocs

export interface ItemDef {
  id: number;
  name: string;
  tool?: { kind: ToolKind; speed: number; dura: number };
  color: string; // aplat principal de l'icône
  accent: string;
}

const tool = (kind: ToolKind, mat: 'latte' | 'pierre') => ({
  kind,
  speed: mat === 'latte' ? SPEED_LATTE : SPEED_PIERRE,
  dura: mat === 'latte' ? DURA_LATTE : DURA_PIERRE,
});

export const ITEMS: ItemDef[] = [
  { id: I.FIBRE, name: 'Fibre', color: '#8ee07a', accent: '#3f8f3a' },
  { id: I.LATTE, name: 'Latte', color: '#d9a868', accent: '#9a6a34' },
  { id: I.ECORCE, name: 'Écorce', color: '#8a5a34', accent: '#5a3820' },
  { id: I.CORDELETTE, name: 'Cordelette', color: '#f0e2a8', accent: '#b89a4a' },
  { id: I.MANCHE, name: 'Manche', color: '#b87a42', accent: '#7a4a24' },
  { id: I.PIC_LATTE, name: 'Pic de latte', tool: tool('pic', 'latte'), color: '#d9a868', accent: '#9a6a34' },
  { id: I.PIC_PIERRE, name: 'Pic de pierre', tool: tool('pic', 'pierre'), color: '#9aa0ac', accent: '#5a6070' },
  { id: I.COGNEE_LATTE, name: 'Cognée de latte', tool: tool('cognee', 'latte'), color: '#d9a868', accent: '#9a6a34' },
  { id: I.COGNEE_PIERRE, name: 'Cognée de pierre', tool: tool('cognee', 'pierre'), color: '#9aa0ac', accent: '#5a6070' },
  { id: I.BECHE_LATTE, name: 'Bêche de latte', tool: tool('beche', 'latte'), color: '#d9a868', accent: '#9a6a34' },
  { id: I.BECHE_PIERRE, name: 'Bêche de pierre', tool: tool('beche', 'pierre'), color: '#9aa0ac', accent: '#5a6070' },
];

export const isItem = (id: number) => Number.isInteger(id) && id >= FIRST_ITEM && id <= LAST_ITEM;
export const itemDef = (id: number): ItemDef | null => (isItem(id) ? ITEMS[id - FIRST_ITEM] : null);
export const toolOf = (id: number) => itemDef(id)?.tool ?? null;
/** Ce qu'une case peut contenir : un bloc posable ou un objet. */
export const isStorable = (id: number, isPlaceable: (id: number) => boolean) => isPlaceable(id) || isItem(id);
export const maxStack = (id: number, stackMax: number) => (toolOf(id) ? 1 : stackMax);

/** Nom d'un bloc ou d'un objet. */
export const nameOf = (id: number) => itemDef(id)?.name ?? blockDef(id).name;

/** Ce que donne un bloc cassé : le Feuillage rend 1 Fibre, un bloc sur deux, selon la graine et la position. */
export function dropFor(seed: number, tx: number, ty: number, id: number): number {
  if (id === B.LEAVES) return hash2(seed, tx, ty + 5003) < 0.5 ? I.FIBRE : 0;
  return blockDef(id).drop;
}

/** Vitesse de minage : seul l'outil de la bonne famille accélère. */
export function miningSpeed(heldId: number | undefined, blockId: number): number {
  const t = heldId === undefined ? null : toolOf(heldId);
  return t && t.kind === blockDef(blockId).tool ? t.speed : 1;
}

export interface Recipe {
  id: string;
  name: string;
  needs: [number, number][];
  gives: [number, number][];
  bench: boolean; // le Banc d'artisan doit être à portée
}

export const RECIPES: Recipe[] = [
  { id: 'fendre', name: 'Fendre', needs: [[B.LOG, 1]], gives: [[I.LATTE, 3], [I.ECORCE, 1]], bench: false },
  { id: 'cordelette', name: 'Cordelette', needs: [[I.FIBRE, 3]], gives: [[I.CORDELETTE, 1]], bench: false },
  { id: 'manche', name: 'Manche', needs: [[I.LATTE, 1], [I.ECORCE, 1]], gives: [[I.MANCHE, 2]], bench: false },
  { id: 'banc', name: "Banc d'artisan", needs: [[I.LATTE, 3], [B.STONE, 2], [I.CORDELETTE, 1]], gives: [[B.BENCH, 1]], bench: false },
  { id: 'pic-latte', name: 'Pic de latte', needs: [[I.LATTE, 2], [I.MANCHE, 1], [I.CORDELETTE, 1]], gives: [[I.PIC_LATTE, 1]], bench: true },
  { id: 'pic-pierre', name: 'Pic de pierre', needs: [[B.STONE, 2], [I.MANCHE, 1], [I.CORDELETTE, 1]], gives: [[I.PIC_PIERRE, 1]], bench: true },
  { id: 'cognee-latte', name: 'Cognée de latte', needs: [[I.LATTE, 3], [I.MANCHE, 1]], gives: [[I.COGNEE_LATTE, 1]], bench: true },
  { id: 'cognee-pierre', name: 'Cognée de pierre', needs: [[B.STONE, 3], [I.MANCHE, 1]], gives: [[I.COGNEE_PIERRE, 1]], bench: true },
  { id: 'beche-latte', name: 'Bêche de latte', needs: [[I.LATTE, 2], [I.MANCHE, 1]], gives: [[I.BECHE_LATTE, 1]], bench: true },
  { id: 'beche-pierre', name: 'Bêche de pierre', needs: [[B.STONE, 2], [I.MANCHE, 1]], gives: [[I.BECHE_PIERRE, 1]], bench: true },
];

export function benchNear(world: { get(x: number, y: number): number }, px: number, py: number, reach = BENCH_REACH): boolean {
  const cx = Math.floor(px);
  const cy = Math.floor(py - 0.5);
  for (let y = cy - reach; y <= cy + reach; y++)
    for (let x = cx - reach; x <= cx + reach; x++) if (world.get(x, y) === B.BENCH) return true;
  return false;
}
