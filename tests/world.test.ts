import { describe, expect, it } from 'vitest';
import { B } from '../src/world/blocks';
import { generateWorld } from '../src/world/world';
import { LightMap } from '../src/world/lighting';
import { advance, daylight } from '../src/world/daycycle';
import { hash2, valueNoise2 } from '../src/world/rng';

describe('génération', () => {
  it('est déterministe pour une même seed et diffère entre seeds', () => {
    const a = generateWorld(5, 128, 96);
    const b = generateWorld(5, 128, 96);
    const c = generateWorld(6, 128, 96);
    expect(a.tiles).toEqual(b.tiles);
    expect(a.tiles).not.toEqual(c.tiles);
  });
  it('contient les couches attendues et un socle indestructible', () => {
    const w = generateWorld(42, 256, 128);
    const count: Record<number, number> = {};
    for (const t of w.tiles) count[t] = (count[t] ?? 0) + 1;
    for (const id of [B.AIR, B.MOSS, B.HUMUS, B.STONE, B.COPPER, B.IRON, B.CRYSTAL, B.BEDROCK, B.LOG, B.LEAVES]) expect(count[id]).toBeGreaterThan(0);
    for (let x = 0; x < w.w; x++) {
      expect(w.get(x, w.surface[x])).toBe(B.MOSS);
      expect([B.AIR, B.LOG, B.LEAVES]).toContain(w.get(x, w.surface[x] - 1)); // l'air, ou le pied d'un arbre
      expect(w.get(x, w.h - 1)).toBe(B.BEDROCK);
    }
  });
  it('a des grottes sans vider le sous-sol', () => {
    for (const seed of [1, 42, 987]) {
      const w = generateWorld(seed, 256, 128);
      let air = 0;
      let total = 0;
      for (let x = 0; x < w.w; x++) for (let y = w.surface[x]; y < w.h; y++) (total++, w.get(x, y) === B.AIR && air++);
      expect(air / total).toBeGreaterThan(0.03);
      expect(air / total).toBeLessThan(0.4);
    }
  });
  it('le point d\'apparition est libre au-dessus du sol', () => {
    const w = generateWorld(9, 256, 128);
    const s = w.spawn();
    expect(w.isSolid(Math.floor(s.x), Math.floor(s.y - 1))).toBe(false);
    expect(w.isSolid(Math.floor(s.x), Math.floor(s.y + 0.1))).toBe(true);
  });
  it('les bruits restent dans [0,1)', () => {
    for (let i = 0; i < 200; i++) {
      const h = hash2(3, i, i * 7);
      const n = valueNoise2(3, i * 0.37, i * 0.11);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(1);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThanOrEqual(1);
    }
  });
});

describe('éclairage et jour/nuit', () => {
  it('la surface est éclairée, le sous-sol profond sombre, le cristal émet', () => {
    const w = generateWorld(42, 128, 96);
    const lm = new LightMap(w);
    lm.update();
    const x = 10;
    const s = w.surface[x];
    expect(lm.sky[(s - 1) * w.w + x]).toBe(15);
    expect(lm.sky[(s + 20) * w.w + x]).toBe(0);
    const i = w.tiles.indexOf(B.CRYSTAL);
    expect(lm.blk[i]).toBeGreaterThan(0);
  });
  it('poser un bloc au-dessus d\'une tuile l\'assombrit', () => {
    const w = generateWorld(42, 64, 64);
    w.set(5, w.surface[5] - 1, B.STONE);
    const lm = new LightMap(w);
    lm.update();
    expect(lm.sky[(w.surface[5] - 1) * w.w + 5]).toBeLessThan(15);
  });
  it('le cycle est périodique, de nuit sombre et de jour clair', () => {
    expect(daylight(0.25)).toBeCloseTo(1, 2);
    expect(daylight(0.75)).toBeCloseTo(0.12, 2);
    expect(advance(0.9, 0.2 * 300)).toBeCloseTo(0.1, 5);
  });
});
