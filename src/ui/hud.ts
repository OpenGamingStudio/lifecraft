import { HOTBAR, MAX_HP } from '../constants';
import type { Game } from '../game';
import { blockDef } from '../world/blocks';

const SLOT = 44; // côté d'une case en px CSS à l'échelle 1 : la cible tactile minimale
const GAP = 6;
const MARGIN = 12;
const BAND = 6; // débord du bandeau lagon autour des cases
const ROOM = 46; // place au-dessus de la barre pour l'étiquette de la case choisie
const FONT = '"Fredoka", ui-rounded, sans-serif';
// identité LifeCraft v2 : mêmes valeurs que le @theme de style.css (l'interface reste claire, de jour comme de nuit)
const LAGON = '#00a6b4';
const ECUME = '#b8f1f0';
const PAPIER = '#ffffff';
const ENCRE = '#16110f';
const CUIVRE = '#007c87';
const BRAISE = '#e8402a';

/** Biseaux d'une plaque en px CSS, sens horaire depuis le coin haut gauche. */
type Bevels = readonly [number, number, number, number];

/** Marges sûres de l'écran (encoche, barre d'accueil), en pixels canvas. */
export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}
export const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

export interface Layout {
  x: number;
  y: number;
  size: number;
  gap: number;
  cols: number;
  rows: number;
}

/** Échelle de l'interface (px canvas par px CSS) : jamais sous 1, pour que les cases gardent 44 px CSS. */
export function uiScale(cssW: number, cssH: number, dpr: number): number {
  return dpr * Math.min(1.5, Math.max(1, Math.min(cssW, cssH) / 560));
}

/** Disposition de la barre en pixels canvas : une rangée, ou deux (5 + 4) quand l'écran est trop étroit. */
export function hotbarLayout(w: number, h: number, scale: number, inset: Insets = NO_INSETS): Layout {
  const size = SLOT * scale;
  const gap = GAP * scale;
  const margin = MARGIN * scale;
  const room = w - inset.left - inset.right;
  const cols = HOTBAR * size + (HOTBAR - 1) * gap + 2 * margin <= room ? HOTBAR : Math.ceil(HOTBAR / 2);
  const rows = Math.ceil(HOTBAR / cols);
  const total = cols * size + (cols - 1) * gap;
  const height = rows * size + (rows - 1) * gap;
  return { x: inset.left + (room - total) / 2, y: h - inset.bottom - margin - height, size, gap, cols, rows };
}

export function slotRect(l: Layout, i: number): { x: number; y: number } {
  const pitch = l.size + l.gap;
  return { x: l.x + (i % l.cols) * pitch, y: l.y + Math.floor(i / l.cols) * pitch };
}

export function slotAt(l: Layout, px: number, py: number): number {
  const pitch = l.size + l.gap;
  const c = Math.floor((px - l.x) / pitch);
  const r = Math.floor((py - l.y) / pitch);
  if (c < 0 || c >= l.cols || r < 0 || r >= l.rows) return -1;
  if (px - l.x - c * pitch > l.size || py - l.y - r * pitch > l.size) return -1;
  const i = r * l.cols + c;
  return i < HOTBAR ? i : -1;
}

/** Hauteur prise en bas de l'écran par la barre et son étiquette, en pixels canvas : les boutons tactiles se posent au-dessus. */
export function hudHeight(l: Layout, h: number, scale: number): number {
  return h - l.y + ROOM * scale;
}

function bevelPath(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: Bevels, scale: number): void {
  const [a, b, d, e] = c.map((v) => v * scale);
  g.beginPath();
  g.moveTo(x + a, y);
  g.lineTo(x + w - b, y);
  g.lineTo(x + w, y + b);
  g.lineTo(x + w, y + h - d);
  g.lineTo(x + w - d, y + h);
  g.lineTo(x + e, y + h);
  g.lineTo(x, y + h - e);
  g.lineTo(x, y + a);
  g.closePath();
}

/** Plaque de l'identité : aplat opaque, contour encre, ombre dure, coins biseautés ; bandeau lagon en tête si `band` > 0. */
function plaque(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, c: Bevels, scale: number, line = 3, band = 0): void {
  x = Math.round(x);
  y = Math.round(y);
  w = Math.round(w);
  h = Math.round(h);
  const off = 3 * scale;
  bevelPath(g, x + off, y + off, w, h, c, scale);
  g.fillStyle = ENCRE;
  g.fill();
  bevelPath(g, x, y, w, h, c, scale);
  g.fillStyle = fill;
  g.fill();
  if (band > 0) {
    g.save();
    g.clip();
    g.fillStyle = LAGON;
    g.fillRect(x, y, w, band);
    g.fillStyle = ENCRE;
    g.fillRect(x, y + band, w, line * scale);
    g.restore();
    bevelPath(g, x, y, w, h, c, scale);
  }
  g.lineJoin = 'miter';
  g.lineWidth = line * scale;
  g.strokeStyle = ENCRE;
  g.stroke();
}

/** Texte à l'encre sur une étiquette opaque : lisible quel que soit le décor derrière (ciel de jour, grotte). */
function label(g: CanvasRenderingContext2D, text: string, x: number, y: number, scale: number, fill: string, align: 'left' | 'center' | 'right'): void {
  const pad = 9 * scale;
  const tw = g.measureText(text).width + 2 * pad;
  const th = 26 * scale;
  const left = align === 'center' ? x - tw / 2 : align === 'right' ? x - tw : x;
  plaque(g, left, y - th / 2, tw, th, fill, [5, 3, 6, 4], scale, 2);
  g.fillStyle = ENCRE;
  g.textAlign = 'left';
  g.fillText(text, Math.round(left) + pad, y + scale);
}

/** Pictogramme de la vie : un cœur plein, contour encre. */
function heart(g: CanvasRenderingContext2D, x: number, y: number, s: number, fill: string, scale: number): void {
  g.beginPath();
  g.moveTo(x + s / 2, y + s * 0.96);
  g.bezierCurveTo(x - s * 0.2, y + s * 0.5, x + s * 0.08, y - s * 0.1, x + s / 2, y + s * 0.28);
  g.bezierCurveTo(x + s * 0.92, y - s * 0.1, x + s * 1.2, y + s * 0.5, x + s / 2, y + s * 0.96);
  g.closePath();
  g.fillStyle = fill;
  g.fill();
  g.lineJoin = 'round';
  g.lineWidth = 2 * scale;
  g.strokeStyle = ENCRE;
  g.stroke();
}

export function drawHud(g: CanvasRenderingContext2D, game: Game, w: number, h: number, scale: number, atlas: HTMLCanvasElement, muted: boolean, inset: Insets = NO_INSETS): void {
  const l = hotbarLayout(w, h, scale, inset);
  g.imageSmoothingEnabled = false;
  g.textBaseline = 'middle';

  // barre d'outils : bandeau lagon, cases écume ; la case choisie passe au cuivre et monte de 4 px
  const band = BAND * scale;
  const barW = l.cols * l.size + (l.cols - 1) * l.gap;
  const barH = l.rows * l.size + (l.rows - 1) * l.gap;
  plaque(g, l.x - band, l.y - band, barW + 2 * band, barH + 2 * band, LAGON, [9, 5, 10, 6], scale);
  const edge = 2 * scale;
  for (let i = 0; i < HOTBAR; i++) {
    const sel = i === game.inv.selected;
    const r = slotRect(l, i);
    const x = Math.round(r.x);
    const y = Math.round(r.y - (sel ? 4 * scale : 0)); // pas la couleur seule : la case choisie se soulève
    const bg = sel ? CUIVRE : ECUME;
    const ink = sel ? PAPIER : ENCRE;
    g.fillStyle = ENCRE;
    g.fillRect(x, Math.round(r.y), l.size, l.size);
    g.fillStyle = bg;
    g.fillRect(x + edge, y + edge, l.size - 2 * edge, l.size - 2 * edge);
    g.lineWidth = edge;
    g.strokeStyle = ENCRE;
    g.strokeRect(x + edge / 2, y + edge / 2, l.size - edge, l.size - edge);
    const s = game.inv.slots[i];
    if (s) {
      const m = l.size * 0.6;
      g.drawImage(atlas, 0, s.id * 16, 16, 16, x + (l.size - m) / 2 + scale, y + (l.size - m) / 2, m, m);
    }
    // numéro de la case, dans son coin, sur le fond de la case
    g.font = `600 ${14 * scale}px ${FONT}`;
    const n = String(i + 1);
    g.fillStyle = bg;
    g.fillRect(x + edge, y + edge, g.measureText(n).width + 5 * scale, 15 * scale);
    g.fillStyle = ink;
    g.textAlign = 'left';
    g.fillText(n, x + 5 * scale, y + 10 * scale);
    if (s) {
      // quantité : petite étiquette de papier collée dans le coin
      const c = String(s.count);
      const cw = g.measureText(c).width + 6 * scale;
      const ch = 16 * scale;
      const cx = x + l.size - edge - cw;
      const cy = y + l.size - edge - ch;
      g.fillStyle = ENCRE;
      g.fillRect(cx - 1.5 * scale, cy - 1.5 * scale, cw + 1.5 * scale, ch + 1.5 * scale);
      g.fillStyle = PAPIER;
      g.fillRect(cx, cy, cw, ch);
      g.fillStyle = ENCRE;
      g.fillText(c, cx + 3 * scale, cy + ch / 2 + scale);
    }
  }
  const cur = game.inv.current();
  if (cur) {
    g.font = `600 ${15 * scale}px ${FONT}`;
    label(g, blockDef(cur.id).name, inset.left + (w - inset.left - inset.right) / 2, l.y - 28 * scale, scale, PAPIER, 'center');
  }

  // vie : pictogramme, jauge braise pleine et valeur chiffrée (jamais la couleur seule)
  const hx = inset.left + 12 * scale;
  const hy = inset.top + 12 * scale;
  const ph = 34 * scale;
  const pict = 17 * scale;
  const gw = 62 * scale;
  const gh = 12 * scale;
  g.font = `600 ${15 * scale}px ${FONT}`;
  const vw = g.measureText(`${MAX_HP}/${MAX_HP}`).width; // largeur fixe : le compteur ne tremble pas
  const ratio = Math.min(1, Math.max(0, game.hp / MAX_HP));
  plaque(g, hx, hy, 9 * scale + pict + 7 * scale + gw + 7 * scale + vw + 9 * scale, ph, ECUME, [7, 10, 5, 8], scale);
  heart(g, hx + 9 * scale, hy + (ph - pict) / 2, pict, ratio < 0.2 ? ENCRE : BRAISE, scale);
  const gx = Math.round(hx + 9 * scale + pict + 7 * scale);
  const gy = Math.round(hy + (ph - gh) / 2);
  g.fillStyle = PAPIER;
  g.fillRect(gx, gy, gw, gh);
  g.fillStyle = BRAISE;
  g.fillRect(gx, gy, Math.round(gw * ratio), gh);
  g.lineJoin = 'miter';
  g.lineWidth = edge;
  g.strokeStyle = ENCRE;
  g.strokeRect(gx, gy, gw, gh);
  g.fillStyle = ENCRE;
  g.textAlign = 'right';
  g.fillText(`${Math.ceil(game.hp)}/${MAX_HP}`, gx + gw + 7 * scale + vw, hy + ph / 2 + scale);
  if (muted) {
    // sous la jauge de vie : à droite, les boutons tactiles montent jusqu'au bouton Menu sur un petit écran couché
    g.font = `600 ${14 * scale}px ${FONT}`;
    label(g, 'Son coupé.', hx, hy + ph + 24 * scale, scale, PAPIER, 'left');
  }

  if (game.hurtFlash > 0 && !game.reducedMotion) {
    g.fillStyle = `rgba(200,30,40,${game.hurtFlash * 0.35})`;
    g.fillRect(0, 0, w, h);
  }
  if (game.deadTimer > 0) {
    // une plaque, le monde reste visible derrière : pas d'écran sombre. Étroite et dans le tiers haut :
    // elle passe entre les boutons tactiles d'un écran couché et au-dessus d'eux sur un écran debout.
    const pw = Math.min(204 * scale, w - inset.left - inset.right - 32 * scale);
    const dh = 96 * scale;
    const px = inset.left + (w - inset.left - inset.right - pw) / 2;
    const py = Math.max(inset.top + 100 * scale, h * 0.33 - dh / 2);
    plaque(g, px, py, pw, dh, ECUME, [12, 8, 14, 9], scale, 3, 56 * scale);
    g.textAlign = 'center';
    g.fillStyle = ENCRE;
    g.font = `700 ${26 * scale}px ${FONT}`;
    g.fillText('Tu es tombé.', px + pw / 2, py + 30 * scale);
    g.font = `500 ${15 * scale}px ${FONT}`;
    g.fillText('Réapparition en cours.', px + pw / 2, py + 78 * scale);
  } else if (game.messageTimer > 0) {
    // en haut, loin des doigts et des boutons tactiles
    g.font = `600 ${15 * scale}px ${FONT}`;
    label(g, game.message, w / 2, hy + 66 * scale, scale, ECUME, 'center');
  }
}
