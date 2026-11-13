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

export function generateWorld(seed: number, w: number, h: number): World {
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
  return world;
}
