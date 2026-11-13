import { HOTBAR, MAX_HP } from '../constants';
import type { Game } from '../game';
import { blockDef } from '../world/blocks';

const SLOT = 44; // côté d'une case en px CSS à l'échelle 1 : la cible tactile minimale
const GAP = 6;
const MARGIN = 12;
const FONT = '"Fredoka", "Trebuchet MS", sans-serif';
const TERRE = '#2a1e15';
const OS = '#efe6d4';
const BRUME = '#b9a98d';
const OCRE = '#dba046';

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

/** Texte sur une plaque unie : lisible quel que soit le décor derrière (ciel de jour, grotte). */
function plate(g: CanvasRenderingContext2D, text: string, x: number, y: number, scale: number, color: string, align: 'left' | 'center' | 'right'): void {
  const pad = 7 * scale;
  const tw = g.measureText(text).width + 2 * pad;
  const th = 22 * scale;
  const left = align === 'center' ? x - tw / 2 : align === 'right' ? x - tw : x;
  g.fillStyle = TERRE;
  g.fillRect(Math.round(left), Math.round(y - th / 2), Math.round(tw), Math.round(th));
  g.fillStyle = color;
  g.textAlign = 'left';
  g.fillText(text, left + pad, y + scale);
}

export function drawHud(g: CanvasRenderingContext2D, game: Game, w: number, h: number, scale: number, atlas: HTMLCanvasElement, muted: boolean, inset: Insets = NO_INSETS): void {
  const l = hotbarLayout(w, h, scale, inset);
  g.imageSmoothingEnabled = false;
  g.textBaseline = 'middle';
  for (let i = 0; i < HOTBAR; i++) {
    const sel = i === game.inv.selected;
    const r = slotRect(l, i);
    const x = r.x;
    const y = r.y - (sel ? 3 * scale : 0); // la case choisie se soulève : pas la couleur seule
    g.fillStyle = TERRE;
    g.fillRect(x, y, l.size, l.size);
    g.lineWidth = (sel ? 3 : 1.5) * scale;
    g.strokeStyle = sel ? OCRE : BRUME;
    g.strokeRect(x, y, l.size, l.size);
    const s = game.inv.slots[i];
    if (s) {
      const m = l.size * 0.62;
      g.drawImage(atlas, 0, s.id * 16, 16, 16, x + (l.size - m) / 2, y + (l.size - m) / 2 - 2 * scale, m, m);
      g.font = `600 ${13 * scale}px ${FONT}`;
      g.fillStyle = OS;
      g.textAlign = 'right';
      g.fillText(String(s.count), x + l.size - 6 * scale, y + l.size - 10 * scale);
    }
    g.font = `${11 * scale}px ${FONT}`;
    g.fillStyle = BRUME;
    g.textAlign = 'left';
    g.fillText(String(i + 1), x + 4 * scale, y + 9 * scale);
  }
  const cur = game.inv.current();
  if (cur) {
    g.font = `600 ${14 * scale}px ${FONT}`;
    plate(g, blockDef(cur.id).name, inset.left + (w - inset.left - inset.right) / 2, l.y - 16 * scale, scale, OS, 'center');
  }

  // vie : 10 segments
  const segs = 10;
  const sw = 16 * scale;
  const sg = 3 * scale;
  const hx = inset.left + 14 * scale;
  const hy = inset.top + 14 * scale;
  for (let i = 0; i < segs; i++) {
    const fill = Math.min(1, Math.max(0, (game.hp / MAX_HP) * segs - i));
    g.fillStyle = TERRE;
    g.fillRect(hx + i * (sw + sg), hy, sw, 12 * scale);
    g.fillStyle = '#c9472e';
    g.fillRect(hx + i * (sw + sg), hy, sw * fill, 12 * scale);
  }
  g.font = `600 ${14 * scale}px ${FONT}`;
  plate(g, `${Math.ceil(game.hp)} PV`, hx, hy + 29 * scale, scale, OS, 'left');
  if (muted) {
    // sous le bouton Menu (44 px CSS en haut à droite)
    g.font = `${13 * scale}px ${FONT}`;
    plate(g, 'Son coupé', w - inset.right - 10 * scale, inset.top + 76 * scale, scale, BRUME, 'right');
  }

  if (game.hurtFlash > 0 && !game.reducedMotion) {
    g.fillStyle = `rgba(200,30,40,${game.hurtFlash * 0.35})`;
    g.fillRect(0, 0, w, h);
  }
  g.textAlign = 'center';
  if (game.deadTimer > 0) {
    g.fillStyle = TERRE;
    g.fillRect(0, 0, w, h);
    g.fillStyle = OS;
    g.font = `700 ${28 * scale}px ${FONT}`;
    g.fillText('Tu es tombé…', w / 2, h / 2);
    g.font = `${14 * scale}px ${FONT}`;
    g.fillText('Réapparition en cours', w / 2, h / 2 + 30 * scale);
  } else if (game.messageTimer > 0) {
    // en haut, loin des doigts et des boutons tactiles
    g.font = `600 ${15 * scale}px ${FONT}`;
    plate(g, game.message, w / 2, hy + 62 * scale, scale, OCRE, 'center');
  }
}
