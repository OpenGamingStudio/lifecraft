import { HOTBAR, LOW_HP, MAX_HP } from '../constants';
import { BLINK_TIME, type Game } from '../game';
import { nameOf, toolOf } from '../items';

const SLOT = 56; // côté d'une case en px CSS à l'échelle 1 (64 px sur tablette : voir uiScale)
const GAP = 6;
const GAP_SHORT = 4; // barre réduite : cinq cases de 56 px tiennent sur 320 px, contour et ombre compris
const MARGIN = 12;
const BAND = 6; // débord du bandeau lagon autour des cases
const ROOM = 46; // place au-dessus de la barre pour l'étiquette de la case choisie
export const VISIBLE = 5; // cases visibles de la barre réduite (écran étroit) : les autres défilent
export const FONT = '"Fredoka", ui-rounded, sans-serif';
// identité LifeCraft v2 : mêmes valeurs que le @theme de style.css (l'interface reste claire, de jour comme de nuit)
export const LAGON = '#00a6b4';
export const ECUME = '#b8f1f0';
export const PAPIER = '#ffffff';
export const ENCRE = '#16110f';
export const CUIVRE = '#007c87';
export const BRAISE = '#e8402a';

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

/** Ce que l'interface sait en plus du jeu : son, marges sûres, barre (première case visible, case sous le doigt). */
export interface HudUi {
  muted: boolean;
  inset: Insets;
  first: number;
  pressed: number;
}

export interface Layout {
  x: number; // bord gauche de la fenêtre des cases
  y: number;
  size: number;
  gap: number;
  band: number;
  cols: number; // cases visibles : toutes, ou VISIBLE quand la barre est réduite
  scroll: number; // défilement en pixels canvas (0 quand tout tient)
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/** Échelle de l'interface (px canvas par px CSS) : cases de 56 px, de 64 px dès la tablette. */
export function uiScale(cssW: number, cssH: number, dpr: number): number {
  return dpr * (Math.min(cssW, cssH) >= 768 ? 64 / SLOT : 1);
}

/**
 * Disposition de la barre en pixels canvas : huit cases sur une rangée, ou une fenêtre de cinq cases
 * défilables quand l'écran est trop étroit. `first` est la première case visible (fractionnaire en plein geste).
 */
export function hotbarLayout(w: number, h: number, scale: number, inset: Insets = NO_INSETS, first = 0): Layout {
  const size = SLOT * scale;
  const margin = MARGIN * scale;
  const room = w - inset.left - inset.right;
  const all = HOTBAR * size + (HOTBAR - 1) * GAP * scale + 2 * margin <= room;
  const cols = all ? HOTBAR : VISIBLE;
  const gap = (all ? GAP : GAP_SHORT) * scale;
  const total = cols * size + (cols - 1) * gap;
  return {
    x: inset.left + (room - total) / 2,
    y: h - inset.bottom - margin - size,
    size,
    gap,
    band: BAND * scale,
    cols,
    scroll: clamp(first, 0, HOTBAR - cols) * (size + gap),
  };
}

/** Largeur de la fenêtre des cases. */
function span(l: Layout): number {
  return l.cols * l.size + (l.cols - 1) * l.gap;
}

export function slotRect(l: Layout, i: number): { x: number; y: number } {
  return { x: l.x + i * (l.size + l.gap) - l.scroll, y: l.y };
}

export function slotAt(l: Layout, px: number, py: number): number {
  if (px < l.x || px > l.x + span(l) || py < l.y || py > l.y + l.size) return -1;
  const pitch = l.size + l.gap;
  const i = Math.floor((px - l.x + l.scroll) / pitch);
  if (px - l.x + l.scroll - i * pitch > l.size) return -1;
  return i >= 0 && i < HOTBAR ? i : -1;
}

/** Vrai si le point est sur la barre réduite, bandeau compris : un doigt qui y glisse la fait défiler. */
export function barAt(l: Layout, px: number, py: number): boolean {
  return l.cols < HOTBAR && px >= l.x - l.band && px <= l.x + span(l) + l.band && py >= l.y - l.band && py <= l.y + l.size + l.band;
}

/** Hauteur prise en bas de l'écran par la barre et son étiquette, en pixels canvas : les commandes tactiles se posent au-dessus. */
export function hudHeight(l: Layout, h: number, scale: number): number {
  return h - l.y + ROOM * scale;
}

/** Défilement de la barre réduite : première case visible, fractionnaire sous le doigt, puis calée sur une case. */
export class BarScroll {
  pos = 0;
  private target = 0;

  /** Le doigt glisse de `d` cases. */
  drag(d: number, cols: number): void {
    this.pos = this.target = clamp(this.pos + d, 0, HOTBAR - cols);
  }

  /** Doigt levé : la barre se cale sur la case la plus proche. */
  drop(): void {
    this.target = Math.round(this.pos);
  }

  /** Amène la case `i` dans la fenêtre (choix au clavier ou à la molette). */
  reveal(i: number, cols: number): void {
    this.target = clamp(Math.round(this.target), i - cols + 1, i);
  }

  /** Rejoint la cible sans rebond ; d'un coup si les mouvements sont réduits. */
  update(dt: number, cols: number, calm: boolean): void {
    this.target = clamp(this.target, 0, HOTBAR - cols);
    this.pos += (this.target - this.pos) * (calm ? 1 : 1 - Math.exp(-dt * 22));
    if (Math.abs(this.target - this.pos) < 0.002) this.pos = this.target;
  }
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
export function plaque(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, c: Bevels, scale: number, line = 3, band = 0): void {
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
export function label(g: CanvasRenderingContext2D, text: string, x: number, y: number, scale: number, fill: string, align: 'left' | 'center' | 'right'): void {
  const pad = 9 * scale;
  const tw = g.measureText(text).width + 2 * pad;
  const th = 28 * scale;
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

/** Repère de défilement : triangle d'encre à cheval sur le bord de la fenêtre, du côté où il reste des cases. */
function more(g: CanvasRenderingContext2D, x: number, y: number, dir: -1 | 1, scale: number): void {
  g.beginPath();
  g.moveTo(x + dir * 5 * scale, y);
  g.lineTo(x - dir * 5 * scale, y - 9 * scale);
  g.lineTo(x - dir * 5 * scale, y + 9 * scale);
  g.closePath();
  g.fillStyle = ENCRE;
  g.fill();
}

export function drawHud(g: CanvasRenderingContext2D, game: Game, w: number, h: number, scale: number, atlas: HTMLCanvasElement, ui: HudUi): void {
  const { inset } = ui;
  const l = hotbarLayout(w, h, scale, inset, ui.first);
  g.imageSmoothingEnabled = false;
  g.textBaseline = 'middle';

  // barre d'outils : bandeau lagon, cases écume ; la case choisie passe au cuivre et monte de 4 px,
  // la case sous le doigt s'enfonce de 3 px
  const barW = span(l);
  plaque(g, l.x - l.band, l.y - l.band, barW + 2 * l.band, l.size + 2 * l.band, LAGON, [9, 5, 10, 6], scale);
  const edge = 2 * scale;
  const pitch = l.size + l.gap;
  const icon = Math.max(1, Math.floor((l.size * 0.62) / 16)) * 16; // multiple entier de la texture : pixels nets
  g.save();
  if (l.cols < HOTBAR) {
    // barre réduite : les cases défilent derrière les bords du bandeau
    g.beginPath();
    g.rect(Math.round(l.x - 3 * scale), l.y - l.band, Math.round(barW + 6 * scale), l.size + 2 * l.band);
    g.clip();
  }
  for (let i = 0; i < HOTBAR; i++) {
    const r = slotRect(l, i);
    if (r.x + l.size < l.x - l.band || r.x > l.x + barW + l.band) continue;
    const sel = i === game.inv.selected;
    const down = i === ui.pressed;
    const x = Math.round(r.x);
    const y = Math.round(r.y + (down ? 3 * scale : sel ? -4 * scale : 0)); // pas la couleur seule : la case choisie se soulève
    const bg = sel ? CUIVRE : ECUME;
    const ink = sel ? PAPIER : ENCRE;
    g.fillStyle = ENCRE;
    g.fillRect(x, down ? y : Math.round(r.y), l.size, l.size);
    g.fillStyle = bg;
    g.fillRect(x + edge, y + edge, l.size - 2 * edge, l.size - 2 * edge);
    g.lineWidth = edge;
    g.strokeStyle = ENCRE;
    g.strokeRect(x + edge / 2, y + edge / 2, l.size - edge, l.size - edge);
    const s = game.inv.slots[i];
    if (s) g.drawImage(atlas, 0, s.id * 16, 16, 16, x + Math.round((l.size - icon) / 2), y + Math.round((l.size - icon) / 2), icon, icon);
    // numéro de la case, dans son coin, sur le fond de la case
    g.font = `600 ${14 * scale}px ${FONT}`;
    const n = String(i + 1);
    g.fillStyle = bg;
    g.fillRect(x + edge, y + edge, g.measureText(n).width + 5 * scale, 15 * scale);
    g.fillStyle = ink;
    g.textAlign = 'left';
    g.fillText(n, x + 5 * scale, y + 10 * scale);
    const tool = s ? toolOf(s.id) : null;
    if (s && tool) {
      // outil : jauge de durabilité en bas de la case, aplat plein (braise sous le quart), contour d'encre
      const gw2 = l.size - 4 * edge;
      const gx2 = x + 2 * edge;
      const gy2 = y + l.size - 2 * edge - 6 * scale;
      const ratio = Math.min(1, Math.max(0, (s.dur ?? tool.dura) / tool.dura));
      g.fillStyle = ENCRE;
      g.fillRect(gx2 - scale, gy2 - scale, gw2 + 2 * scale, 6 * scale + 2 * scale);
      g.fillStyle = PAPIER;
      g.fillRect(gx2, gy2, gw2, 6 * scale);
      g.fillStyle = ratio <= 0.25 ? BRAISE : sel ? ECUME : CUIVRE;
      g.fillRect(gx2, gy2, Math.max(scale, Math.round(gw2 * ratio)), 6 * scale);
    } else if (s) {
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
  g.restore();
  if (l.cols < HOTBAR) {
    const max = (HOTBAR - l.cols) * pitch;
    if (l.scroll > 1) more(g, l.x, l.y + l.size / 2, -1, scale);
    if (l.scroll < max - 1) more(g, l.x + barW, l.y + l.size / 2, 1, scale);
  }
  const cur = game.inv.current();
  if (cur) {
    g.font = `700 ${17 * scale}px ${FONT}`;
    const t = toolOf(cur.id);
    const text = t ? `${nameOf(cur.id)} ${cur.dur ?? t.dura}/${t.dura}` : nameOf(cur.id);
    label(g, text, inset.left + (w - inset.left - inset.right) / 2, l.y - 28 * scale, scale, PAPIER, 'center');
  }

  // vie : pictogramme, jauge braise pleine et valeur chiffrée (jamais la couleur seule) ; sous le seuil bas,
  // le pictogramme passe à l'encre et la jauge clignote une fois
  const hx = inset.left + 12 * scale;
  const hy = inset.top + 12 * scale;
  const ph = 34 * scale;
  const pict = 17 * scale;
  const gw = 62 * scale;
  const gh = 12 * scale;
  g.font = `600 ${16 * scale}px ${FONT}`;
  const vw = g.measureText(`${MAX_HP}/${MAX_HP}`).width; // largeur fixe : le compteur ne tremble pas
  const ratio = Math.min(1, Math.max(0, game.hp / MAX_HP));
  plaque(g, hx, hy, 9 * scale + pict + 7 * scale + gw + 7 * scale + vw + 9 * scale, ph, ECUME, [7, 10, 5, 8], scale);
  heart(g, hx + 9 * scale, hy + (ph - pict) / 2, pict, game.hp < LOW_HP ? ENCRE : BRAISE, scale);
  const gx = Math.round(hx + 9 * scale + pict + 7 * scale);
  const gy = Math.round(hy + (ph - gh) / 2);
  g.fillStyle = PAPIER;
  g.fillRect(gx, gy, gw, gh);
  if (game.lowBlink < BLINK_TIME / 3 || game.lowBlink > (2 * BLINK_TIME) / 3) {
    g.fillStyle = BRAISE;
    g.fillRect(gx, gy, Math.round(gw * ratio), gh);
  }
  g.lineJoin = 'miter';
  g.lineWidth = edge;
  g.strokeStyle = ENCRE;
  g.strokeRect(gx, gy, gw, gh);
  g.fillStyle = ENCRE;
  g.textAlign = 'right';
  g.fillText(`${Math.ceil(game.hp)}/${MAX_HP}`, gx + gw + 7 * scale + vw, hy + ph / 2 + scale);
  if (ui.muted) {
    // sous la jauge de vie, à gauche : le coin droit est au bouton Menu
    g.font = `600 ${16 * scale}px ${FONT}`;
    label(g, 'Son coupé.', hx, hy + ph + 24 * scale, scale, PAPIER, 'left');
  }

  if (game.deadTimer > 0) {
    // une plaque, le monde reste visible derrière : pas d'écran sombre. Étroite et dans le tiers haut :
    // elle passe entre les commandes tactiles d'un écran couché et au-dessus d'elles sur un écran debout.
    const pw = Math.min(204 * scale, w - inset.left - inset.right - 32 * scale);
    const dh = 96 * scale;
    const px = inset.left + (w - inset.left - inset.right - pw) / 2;
    const py = Math.max(inset.top + 100 * scale, h * 0.33 - dh / 2);
    plaque(g, px, py, pw, dh, ECUME, [12, 8, 14, 9], scale, 3, 56 * scale);
    g.textAlign = 'center';
    g.fillStyle = ENCRE;
    g.font = `600 ${24 * scale}px ${FONT}`;
    g.fillText('Tu es tombé.', px + pw / 2, py + 30 * scale);
    g.font = `400 ${15 * scale}px ${FONT}`;
    g.fillText('Réapparition en cours.', px + pw / 2, py + 78 * scale);
  } else if (game.messageTimer > 0) {
    // en haut, loin des doigts et des commandes tactiles
    g.font = `600 ${16 * scale}px ${FONT}`;
    label(g, game.message, w / 2, hy + 66 * scale, scale, ECUME, 'center');
  }
}
