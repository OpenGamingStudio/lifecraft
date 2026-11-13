import { blockDef } from './blocks';
import type { World } from './world';

/** Lumière du ciel et lumière des blocs émissifs, propagées tuile par tuile (0..15). */
export class LightMap {
  readonly sky: Uint8Array;
  readonly blk: Uint8Array;
  dirty = true;
  constructor(readonly world: World) {
    this.sky = new Uint8Array(world.w * world.h);
    this.blk = new Uint8Array(world.w * world.h);
  }

  update(): void {
    if (!this.dirty) return;
    this.dirty = false;
    this.compute();
  }

  compute(): void {
    const { w, h, tiles } = this.world;
    this.sky.fill(0);
    this.blk.fill(0);
    const q: number[] = [];
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        const i = y * w + x;
        if (blockDef(tiles[i]).solid) break;
        this.sky[i] = 15;
        q.push(i);
      }
    }
    this.spread(this.sky, q);
    const q2: number[] = [];
    for (let i = 0; i < tiles.length; i++) {
      const l = blockDef(tiles[i]).light;
      if (l > 0) {
        this.blk[i] = l;
        q2.push(i);
      }
    }
    this.spread(this.blk, q2);
  }

  private spread(light: Uint8Array, q: number[]): void {
    const { w, h, tiles } = this.world;
    for (let head = 0; head < q.length; head++) {
      const i = q[head];
      const l = light[i];
      if (l <= 1) continue;
      const x = i % w;
      const y = (i - x) / w;
      for (let d = 0; d < 4; d++) {
        const nx = x + (d === 0 ? 1 : d === 1 ? -1 : 0);
        const ny = y + (d === 2 ? 1 : d === 3 ? -1 : 0);
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const ni = ny * w + nx;
        const nl = l - (blockDef(tiles[ni]).solid ? 2 : 1);
        if (nl > light[ni]) {
          light[ni] = nl;
          q.push(ni);
        }
      }
    }
  }

  /** Luminosité 0..1 d'une tuile selon l'éclairage du jour (0..1). */
  brightness(x: number, y: number, daylight: number): number {
    if (!this.world.inBounds(x, y)) return y < 0 ? daylight : 0;
    const i = y * this.world.w + x;
    return Math.max((this.sky[i] / 15) * daylight, this.blk[i] / 15);
  }
}
