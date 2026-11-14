import type { Game } from '../game';
import { benchNear, nameOf, RECIPES, type Recipe } from '../items';
import { ECUME, ENCRE, FONT, LAGON, PAPIER, plaque, type Insets, NO_INSETS } from './hud';
import { TEX } from '../render/textures';

const ROW = 84; // hauteur d'une recette, en px CSS à l'échelle 1 : plus que les 44 px d'une cible tactile
const HEAD = 56;
const BTN_W = 74;
const BTN_H = 44;
const PAD = 12;

/** État de la feuille Fabrication : ouverte ou non, défilement de la liste en pixels canvas. */
export class Sheet {
  open = false;
  scroll = 0;
  toggle(): void {
    this.open = !this.open;
    this.scroll = 0;
  }
  close(): void {
    this.open = false;
  }
}

export interface SheetLayout {
  x: number;
  y: number;
  w: number;
  h: number;
  head: number; // hauteur de l'en-tête
  row: number;
  listTop: number;
  listH: number;
  maxScroll: number;
  btnW: number;
  btnH: number;
  pad: number;
  close: { x: number; y: number; w: number; h: number };
}

/** Feuille centrée, au plus 440 px de large ; toute la hauteur utile quand l'écran est bas (la liste défile). */
export function sheetLayout(w: number, h: number, scale: number, inset: Insets = NO_INSETS, count = RECIPES.length): SheetLayout {
  const room = w - inset.left - inset.right;
  const sw = Math.min(440 * scale, room - 24 * scale);
  const head = HEAD * scale;
  const row = ROW * scale;
  const maxH = h - inset.top - inset.bottom - 24 * scale;
  const sh = Math.min(maxH, head + count * row + 12 * scale);
  const x = inset.left + (room - sw) / 2;
  const y = inset.top + (h - inset.top - inset.bottom - sh) / 2;
  const listTop = y + head;
  const listH = sh - head - 8 * scale;
  const cw = 92 * scale;
  return {
    x, y, w: sw, h: sh, head, row, listTop, listH,
    maxScroll: Math.max(0, count * row - listH),
    btnW: BTN_W * scale,
    btnH: BTN_H * scale,
    pad: PAD * scale,
    close: { x: x + sw - cw - 10 * scale, y: y + (head - 44 * scale) / 2, w: cw, h: 44 * scale },
  };
}

export type SheetHit = { kind: 'close' } | { kind: 'row'; index: number } | { kind: 'panel' } | { kind: 'outside' };

export function sheetHit(l: SheetLayout, scroll: number, px: number, py: number): SheetHit {
  if (px < l.x || px > l.x + l.w || py < l.y || py > l.y + l.h) return { kind: 'outside' };
  const c = l.close;
  if (px >= c.x && px <= c.x + c.w && py >= c.y && py <= c.y + c.h) return { kind: 'close' };
  if (py >= l.listTop && py <= l.listTop + l.listH) {
    const i = Math.floor((py - l.listTop + scroll) / l.row);
    if (i >= 0 && i < RECIPES.length) return { kind: 'row', index: i };
  }
  return { kind: 'panel' };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
export const clampScroll = (l: SheetLayout, v: number) => clamp(v, 0, l.maxScroll);

/** Ligne d'ingrédients : « Latte 2/3 · Manche 1/1 » (possédé / requis). */
export function needsText(game: Game, r: Recipe): string {
  return needsParts(game, r).join(' · ');
}

const needsParts = (game: Game, r: Recipe) => r.needs.map(([id, n]) => `${nameOf(id)} ${Math.min(game.inv.count(id), 99)}/${n}`);

/** Répartit les morceaux sur des lignes de largeur `max` au plus (le texte courant est déjà réglé sur `g`). */
function wrap(g: CanvasRenderingContext2D, parts: string[], max: number, sep = ' · '): string[] {
  const lines: string[] = [];
  let cur = '';
  for (const p of parts) {
    const next = cur ? `${cur}${sep}${p}` : p;
    if (cur && g.measureText(next).width > max) {
      lines.push(cur);
      cur = p;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

export function drawSheet(g: CanvasRenderingContext2D, game: Game, w: number, h: number, scale: number, atlas: HTMLCanvasElement, inset: Insets, sheet: Sheet): void {
  const l = sheetLayout(w, h, scale, inset);
  sheet.scroll = clampScroll(l, sheet.scroll);
  g.imageSmoothingEnabled = false;
  g.textBaseline = 'middle';
  plaque(g, l.x, l.y, l.w, l.h, ECUME, [14, 9, 16, 10], scale, 3, l.head);

  const edge = 2 * scale;
  g.textAlign = 'left';
  g.fillStyle = ENCRE;
  g.font = `700 ${24 * scale}px ${FONT}`;
  g.fillText('Fabrication', Math.round(l.x + l.pad), Math.round(l.y + l.head / 2 - 2 * scale));
  const bench = benchNear(game.world, game.player.x, game.player.y);
  g.font = `600 ${13 * scale}px ${FONT}`;
  g.fillText(game.messageTimer > 0 ? game.message : bench ? 'Banc à portée' : 'Pas de banc à portée', Math.round(l.x + l.pad), Math.round(l.y + l.head - 11 * scale));

  // fermer : aplat papier, contour d'encre
  const c = l.close;
  g.fillStyle = ENCRE;
  g.fillRect(Math.round(c.x), Math.round(c.y), Math.round(c.w), Math.round(c.h));
  g.fillStyle = PAPIER;
  g.fillRect(Math.round(c.x + edge), Math.round(c.y + edge), Math.round(c.w - 2 * edge), Math.round(c.h - 2 * edge));
  g.fillStyle = ENCRE;
  g.textAlign = 'center';
  g.font = `600 ${16 * scale}px ${FONT}`;
  g.fillText('Fermer', Math.round(c.x + c.w / 2), Math.round(c.y + c.h / 2 + scale));

  g.save();
  g.beginPath();
  g.rect(Math.round(l.x + 3 * scale), Math.round(l.listTop), Math.round(l.w - 6 * scale), Math.round(l.listH));
  g.clip();
  const icon = Math.max(1, Math.floor((38 * scale) / TEX)) * TEX;
  RECIPES.forEach((r, i) => {
    const ry = Math.round(l.listTop + i * l.row - sheet.scroll);
    if (ry + l.row < l.listTop || ry > l.listTop + l.listH) return;
    const ok = game.inv.canCraft(r) && (!r.bench || bench);
    const x = Math.round(l.x + l.pad);
    const rw = Math.round(l.w - 2 * l.pad);
    const rh = Math.round(l.row - 6 * scale);
    // ligne : papier, contour d'encre ; aplat lagon quand on peut fabriquer
    g.fillStyle = ENCRE;
    g.fillRect(x, ry, rw, rh);
    g.fillStyle = ok ? ECUME : PAPIER;
    g.fillRect(x + edge, ry + edge, rw - 2 * edge, rh - 2 * edge);
    const [gid] = r.gives[0];
    g.drawImage(atlas, 0, gid * TEX, TEX, TEX, x + 8 * scale, Math.round(ry + (rh - icon) / 2), icon, icon);
    const tx = x + 8 * scale + icon + 10 * scale;
    g.textAlign = 'left';
    g.fillStyle = ENCRE;
    g.font = `700 ${17 * scale}px ${FONT}`;
    const n1 = r.gives.length === 1 && r.gives[0][1] > 1 ? ` ×${r.gives[0][1]}` : '';
    g.fillText(r.name + n1, Math.round(tx), Math.round(ry + 15 * scale));
    g.font = `500 ${12.5 * scale}px ${FONT}`;
    // ingrédients : à la ligne quand ils débordent sur le bouton (écran étroit)
    const avail = x + rw - l.btnW - 16 * scale - tx;
    const lines = wrap(g, needsParts(game, r), avail);
    lines.forEach((t, k) => g.fillText(t, Math.round(tx), Math.round(ry + (33 + 15 * k) * scale)));
    const notes = r.gives.length > 1 ? wrap(g, ['Donne ' + r.gives.map(([id, n]) => `${n} ${nameOf(id)}`)[0], ...r.gives.slice(1).map(([id, n]) => `${n} ${nameOf(id)}`)], avail, ' + ') : r.bench ? ['Banc requis'] : [];
    notes.forEach((t, k) => g.fillText(t, Math.round(tx), Math.round(ry + (33 + 15 * (lines.length + k)) * scale)));
    // bouton : « Faire » lagon si possible, « Manque » papier sinon (le texte porte l'état, pas la couleur seule)
    const bx = Math.round(x + rw - l.btnW - 8 * scale);
    const by = Math.round(ry + (rh - l.btnH) / 2);
    g.fillStyle = ENCRE;
    g.fillRect(bx, by, Math.round(l.btnW), Math.round(l.btnH));
    g.fillStyle = ok ? LAGON : PAPIER;
    g.fillRect(bx + edge, by + edge, Math.round(l.btnW - 2 * edge), Math.round(l.btnH - 2 * edge));
    g.fillStyle = ENCRE;
    g.textAlign = 'center';
    g.font = `700 ${14 * scale}px ${FONT}`;
    g.fillText(ok ? 'Faire' : r.bench && !bench && game.inv.canCraft(r) ? 'Banc' : 'Manque', Math.round(bx + l.btnW / 2), Math.round(by + l.btnH / 2 + scale));
  });
  g.restore();

  if (l.maxScroll > 0) {
    // glissière : barre pleine à droite
    const th = Math.max(24 * scale, (l.listH / (l.listH + l.maxScroll)) * l.listH);
    const ty = l.listTop + (sheet.scroll / l.maxScroll) * (l.listH - th);
    g.fillStyle = ENCRE;
    g.fillRect(Math.round(l.x + l.w - 9 * scale), Math.round(ty), Math.round(4 * scale), Math.round(th));
  }
}
