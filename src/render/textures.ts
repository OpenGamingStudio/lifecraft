import { BLOCKS, B } from '../world/blocks';
import { hash2 } from '../world/rng';
import { ITEMS, LAST_ITEM, toolOf } from '../items';

export const TEX = 16;
export const VARIANTS = 4;
export const WALL_ID = 11; // fond de grotte (hors liste des blocs), juste après les blocs ; les objets suivent

const px = (c: [number, number, number], k: number) =>
  `rgb(${Math.max(0, Math.min(255, c[0] * k)) | 0},${Math.max(0, Math.min(255, c[1] * k)) | 0},${Math.max(0, Math.min(255, c[2] * k)) | 0})`;

/** Atlas de textures générées en code : une ligne par bloc, VARIANTS colonnes. */
export function buildAtlas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = TEX * VARIANTS;
  c.height = TEX * (LAST_ITEM + 1);
  const g = c.getContext('2d')!;
  for (let id = 1; id <= WALL_ID; id++) {
    for (let v = 0; v < VARIANTS; v++) paint(g, id, v);
  }
  for (const it of ITEMS) for (let v = 0; v < VARIANTS; v++) paintItem(g, it.id, v * TEX, it.id * TEX);
  return c;
}

function paint(g: CanvasRenderingContext2D, id: number, v: number): void {
  const ox = v * TEX;
  const oy = id * TEX;
  const def = id === WALL_ID ? { base: [54, 50, 62], speck: [44, 40, 52] } : BLOCKS[id];
  const base = def.base as [number, number, number];
  const speck = def.speck as [number, number, number];
  const seed = id * 13 + v * 7;
  if (id === B.LOG || id === B.LEAVES || id === B.BENCH) return paintWood(g, id, ox, oy, seed, base, speck);
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

/** Tronc, Feuillage (ajouré : le ciel passe entre les feuilles) et Banc d'artisan, en aplats nets. */
function paintWood(g: CanvasRenderingContext2D, id: number, ox: number, oy: number, seed: number, base: [number, number, number], speck: [number, number, number]): void {
  if (id === B.LEAVES) {
    for (let y = 0; y < TEX; y++) {
      for (let x = 0; x < TEX; x++) {
        const n = hash2(seed, x, y);
        if (n < 0.13) continue; // trou
        g.fillStyle = px(n > 0.62 ? speck : base, 0.9 + hash2(seed, y, x) * 0.2);
        g.fillRect(ox + x, oy + y, 1, 1);
      }
    }
    return;
  }
  if (id === B.LOG) {
    // tronc plus étroit que la tuile : fût de 10 px, cernes verticales et nœuds
    g.fillStyle = px(base, 1);
    g.fillRect(ox + 3, oy, 10, TEX);
    g.fillStyle = px(speck, 1);
    g.fillRect(ox + 3, oy, 2, TEX);
    g.fillRect(ox + 11, oy, 2, TEX);
    for (let i = 0; i < 4; i++) g.fillRect(ox + 6 + Math.floor(hash2(seed, i, 1) * 3), oy + Math.floor(hash2(seed, i, 2) * 14), 1, 2);
    return;
  }
  // Banc d'artisan : plateau épais, deux pieds, une barre ; contour d'encre
  g.fillStyle = '#16110f';
  g.fillRect(ox, oy + 2, TEX, 6);
  g.fillRect(ox + 1, oy + 8, 4, 8);
  g.fillRect(ox + 11, oy + 8, 4, 8);
  g.fillStyle = px(base, 1);
  g.fillRect(ox + 1, oy + 3, TEX - 2, 4);
  g.fillStyle = px(speck, 1);
  g.fillRect(ox + 2, oy + 9, 2, 7);
  g.fillRect(ox + 12, oy + 9, 2, 7);
  g.fillRect(ox + 4, oy + 11, 8, 2);
  g.fillStyle = '#b8f1f0';
  g.fillRect(ox + 3, oy + 4, 3, 1);
}

/** Icônes des objets : pixel art plat, couleurs unies (aucun dégradé), contour d'encre. */
function paintItem(g: CanvasRenderingContext2D, id: number, ox: number, oy: number): void {
  const it = ITEMS[id - ITEMS[0].id];
  const ink = '#16110f';
  const r = (x: number, y: number, w: number, h: number, c: string) => {
    g.fillStyle = c;
    g.fillRect(ox + x, oy + y, w, h);
  };
  const t = toolOf(id);
  if (t) {
    // manche en diagonale, tête selon la famille
    for (let i = 0; i < 11; i++) r(3 + i, 13 - i, 2, 2, ink);
    for (let i = 0; i < 11; i++) r(3 + i, 13 - i, 1, 1, '#b87a42');
    if (t.kind === 'pic') {
      r(2, 2, 12, 3, ink);
      r(3, 3, 10, 1, it.color);
      r(2, 4, 2, 3, ink);
      r(12, 4, 2, 3, ink);
      r(3, 4, 1, 2, it.accent);
      r(12, 4, 1, 2, it.accent);
    } else if (t.kind === 'cognee') {
      r(8, 1, 6, 7, ink);
      r(9, 2, 4, 5, it.color);
      r(9, 5, 4, 2, it.accent);
    } else {
      r(9, 1, 5, 7, ink);
      r(10, 2, 3, 5, it.color);
      r(10, 6, 3, 1, it.accent);
    }
    return;
  }
  switch (id) {
    case 12: // fibre : trois brins
      for (let i = 0; i < 3; i++) {
        r(3 + i * 4, 3, 3, 10, ink);
        r(4 + i * 4, 4 + (i % 2), 1, 8, it.color);
      }
      break;
    case 13: // latte : planchette allongée
      r(2, 5, 12, 6, ink);
      r(3, 6, 10, 4, it.color);
      r(3, 8, 10, 1, it.accent);
      break;
    case 14: // écorce : plaque courbe
      r(3, 3, 10, 10, ink);
      r(4, 4, 8, 8, it.color);
      r(5, 5, 1, 6, it.accent);
      r(8, 4, 1, 5, it.accent);
      r(10, 7, 1, 4, it.accent);
      break;
    case 15: // cordelette : écheveau
      r(4, 3, 8, 10, ink);
      r(5, 4, 6, 8, it.color);
      for (let i = 0; i < 4; i++) r(5, 5 + i * 2, 6, 1, it.accent);
      break;
    case 16: // manche : bâton court
      for (let i = 0; i < 11; i++) r(3 + i, 13 - i, 2, 2, ink);
      for (let i = 0; i < 11; i++) r(3 + i, 13 - i, 1, 1, it.color);
      break;
  }
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
