import { BLOCKS, B } from '../world/blocks';
import { hash2 } from '../world/rng';

export const TEX = 16;
export const VARIANTS = 4;
export const WALL_ID = 8; // fond de grotte (hors liste des blocs)

const px = (c: [number, number, number], k: number) =>
  `rgb(${Math.max(0, Math.min(255, c[0] * k)) | 0},${Math.max(0, Math.min(255, c[1] * k)) | 0},${Math.max(0, Math.min(255, c[2] * k)) | 0})`;

/** Atlas de textures générées en code : une ligne par bloc, VARIANTS colonnes. */
export function buildAtlas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = TEX * VARIANTS;
  c.height = TEX * (WALL_ID + 1);
  const g = c.getContext('2d')!;
  for (let id = 1; id <= WALL_ID; id++) {
    for (let v = 0; v < VARIANTS; v++) paint(g, id, v);
  }
  return c;
}

function paint(g: CanvasRenderingContext2D, id: number, v: number): void {
  const ox = v * TEX;
  const oy = id * TEX;
  const def = id === WALL_ID ? { base: [54, 50, 62], speck: [44, 40, 52] } : BLOCKS[id];
  const base = def.base as [number, number, number];
  const speck = def.speck as [number, number, number];
  const seed = id * 13 + v * 7;
  for (let y = 0; y < TEX; y++) {
    for (let x = 0; x < TEX; x++) {
      const n = hash2(seed, x, y);
      g.fillStyle = px(base, 0.88 + n * 0.24);
      g.fillRect(ox + x, oy + y, 1, 1);
    }
  }
  // taches de couleur
  const blobs = id === B.STONE || id === WALL_ID || id === B.HUMUS || id === B.MOSS || id === B.BEDROCK ? 14 : 9;
  for (let i = 0; i < blobs; i++) {
    const x = Math.floor(hash2(seed, i, 100) * 14) + 1;
    const y = Math.floor(hash2(seed, i, 200) * 14) + 1;
    g.fillStyle = px(speck, 0.85 + hash2(seed, i, 300) * 0.3);
    const big = id >= B.COPPER && id <= B.CRYSTAL;
    g.fillRect(ox + x, oy + y, big ? 2 : 1, big ? 2 : 1);
  }
  if (id === B.CRYSTAL) {
    g.fillStyle = 'rgb(210,255,250)';
    g.fillRect(ox + 4 + (v % 2), oy + 3, 1, 4);
    g.fillRect(ox + 10, oy + 8 + (v % 3), 1, 3);
  }
  if (id === B.MOSS) {
    for (let x = 0; x < TEX; x++) {
      const d = 2 + Math.floor(hash2(seed, x, 5) * 3);
      g.fillStyle = px([74, 140, 70], 0.85 + hash2(seed, x, 6) * 0.3);
      g.fillRect(ox + x, oy, 1, d);
      if (hash2(seed, x, 8) > 0.7) g.fillRect(ox + x, oy + d, 1, 1);
    }
  }
  // arêtes légères pour lire la grille
  g.fillStyle = 'rgba(0,0,0,0.12)';
  g.fillRect(ox, oy + TEX - 1, TEX, 1);
  g.fillRect(ox + TEX - 1, oy, 1, TEX);
}

/** Fissures de minage, 5 niveaux (une bande par niveau). */
export function buildCracks(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = TEX * 5;
  c.height = TEX;
  const g = c.getContext('2d')!;
  g.fillStyle = 'rgba(10,8,14,0.75)';
  for (let s = 0; s < 5; s++) {
    for (let i = 0; i <= s * 3 + 2; i++) {
      const x = Math.floor(hash2(55, i, s) * 14) + 1;
      const y = Math.floor(hash2(56, i, s) * 14) + 1;
      g.fillRect(s * TEX + x, y, 1, 2 + (i % 3));
      g.fillRect(s * TEX + x, y, 2 + (i % 2), 1);
    }
  }
  return c;
}
