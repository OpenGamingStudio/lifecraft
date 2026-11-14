import { B, blockDef } from './blocks';
import { fbm2, hash2 } from './rng';

export class World {
  readonly tiles: Uint8Array;
  readonly surface: Int16Array; // ordonnée de la surface par colonne
  constructor(readonly w: number, readonly h: number, readonly seed: number) {
    this.tiles = new Uint8Array(w * h);
    this.surface = new Int16Array(w);
  }
  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }
  get(x: number, y: number): number {
    if (x < 0 || x >= this.w || y >= this.h) return B.BEDROCK;
    if (y < 0) return B.AIR;
    return this.tiles[y * this.w + x];
  }
  set(x: number, y: number, id: number): void {
    if (this.inBounds(x, y)) this.tiles[y * this.w + x] = id;
  }
  isSolid(x: number, y: number): boolean {
    return blockDef(this.get(x, y)).solid;
  }
  spawn(): { x: number; y: number } {
    const x = Math.floor(this.w / 2);
    return { x: x + 0.5, y: this.surface[x] - 0.01 };
  }
}

/** Emprise d'un arbre : colonne x, sommet du tronc y0, jusqu'au sol. */
export interface TreeBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/**
 * Arbres déterministes sur les colonnes libres de la surface (graine seule). `keep` laisse l'appelant écarter un arbre
 * (une vieille sauvegarde où le joueur a déjà bâti ou creusé à cet endroit).
 */
export function growTrees(world: World, keep?: (box: TreeBox) => boolean): void {
  const { seed, w } = world;
  const mid = Math.floor(w / 2);
  let last = -99;
  for (let x = 4; x < w - 4; x++) {
    if (Math.abs(x - mid) <= 4 || x - last < 5 || hash2(seed, x, 901) >= 0.16) continue;
    const s = world.surface[x];
    // colonne libre : sol de mousse, voisins à hauteur proche, rien au-dessus
    if (world.tiles[s * w + x] !== B.MOSS || Math.abs(world.surface[x - 2] - s) > 3 || Math.abs(world.surface[x + 2] - s) > 3) continue;
    const height = 4 + Math.floor(hash2(seed, x, 902) * 3);
    const top = s - height;
    const box = { x0: x - 2, y0: top - 2, x1: x + 2, y1: s - 1 };
    if (top < 3 || (keep && !keep(box))) continue;
    last = x;
    for (let y = s - 1; y >= top; y--) world.tiles[y * w + x] = B.LOG;
    for (let dy = -2; dy <= 0; dy++) {
      const half = dy === 0 ? 1 : 2;
      for (let dx = -half; dx <= half; dx++) {
        const lx = x + dx;
        const ly = top + dy;
        const i = ly * w + lx;
        if (world.tiles[i] === B.AIR) world.tiles[i] = B.LEAVES;
      }
    }
  }
}

export function generateWorld(seed: number, w: number, h: number, keepTree?: (box: TreeBox) => boolean): World {
  const world = new World(w, h, seed);
  const base = h * 0.32;
  for (let x = 0; x < w; x++) {
    const s = Math.round(base + (fbm2(seed, x / 45, 0.5, 3) - 0.5) * 26 + (fbm2(seed + 7, x / 9, 3.5, 2) - 0.5) * 4);
    world.surface[x] = s;
    const dirt = 3 + Math.floor(hash2(seed, x, 77) * 3);
    for (let y = s; y < h; y++) {
      let id: number = B.STONE;
      if (y === s) id = B.MOSS;
      else if (y < s + dirt) id = B.HUMUS;
      else if (y >= h - 2) id = B.BEDROCK;
      else {
        const depth = y - s;
        // grottes : tunnels sinueux (bande étroite autour d'une isoligne) et poches
        const n = fbm2(seed + 31, x / 14, y / 11, 3);
        const m = fbm2(seed + 57, x / 22, y / 18, 2);
        if (depth > 7 && (Math.abs(n - 0.5) < 0.028 || m > 0.71)) id = B.AIR;
        else {
          const o = fbm2(seed + 91, x / 5, y / 5, 2);
          if (depth > 45 && o > 0.7 && hash2(seed, x, y) > 0.3) id = B.CRYSTAL;
          else if (depth > 22 && fbm2(seed + 113, x / 5, y / 5, 2) > 0.7) id = B.IRON;
          else if (depth > 6 && fbm2(seed + 137, x / 5, y / 5, 2) > 0.67) id = B.COPPER;
        }
      }
      world.tiles[y * w + x] = id;
    }
  }
  growTrees(world, keepTree);
  return world;
}
