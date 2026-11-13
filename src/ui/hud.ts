import { HOTBAR, MAX_HP } from '../constants';
import type { Game } from '../game';
import { blockDef } from '../world/blocks';

const SLOT = 44;
const GAP = 6;

export interface Layout {
  x: number;
  y: number;
  size: number;
  gap: number;
}

/** Disposition de la barre en pixels canvas. */
export function hotbarLayout(w: number, h: number, scale: number): Layout {
  const size = SLOT * scale;
  const gap = GAP * scale;
  const total = HOTBAR * size + (HOTBAR - 1) * gap;
  return { x: (w - total) / 2, y: h - size - 12 * scale, size, gap };
}

export function slotAt(l: Layout, px: number, py: number): number {
  if (py < l.y || py > l.y + l.size) return -1;
  const i = Math.floor((px - l.x) / (l.size + l.gap));
  if (i < 0 || i >= HOTBAR) return -1;
  return px - l.x - i * (l.size + l.gap) <= l.size ? i : -1;
}

export function drawHud(g: CanvasRenderingContext2D, game: Game, w: number, h: number, scale: number, atlas: HTMLCanvasElement, muted: boolean): void {
  const l = hotbarLayout(w, h, scale);
  g.imageSmoothingEnabled = false;
  g.textBaseline = 'middle';
  g.textAlign = 'center';
  for (let i = 0; i < HOTBAR; i++) {
    const x = l.x + i * (l.size + l.gap);
    const sel = i === game.inv.selected;
    g.fillStyle = '#2a1e15';
    g.fillRect(x, l.y, l.size, l.size);
    g.lineWidth = Math.max(1, (sel ? 3 : 1.5) * scale * 0.8);
    g.strokeStyle = sel ? '#dba046' : '#7a5f45';
    g.strokeRect(x, l.y, l.size, l.size);
    const s = game.inv.slots[i];
    if (s) {
      const m = l.size * 0.62;
      g.drawImage(atlas, 0, s.id * 16, 16, 16, x + (l.size - m) / 2, l.y + (l.size - m) / 2 - 2 * scale, m, m);
      g.font = `600 ${11 * scale}px "Trebuchet MS", "Gill Sans", sans-serif`;
      g.fillStyle = '#efe6d4';
      g.textAlign = 'right';
      g.fillText(String(s.count), x + l.size - 4 * scale, l.y + l.size - 9 * scale);
      g.textAlign = 'center';
    }
    g.font = `${9 * scale}px "Trebuchet MS", "Gill Sans", sans-serif`;
    g.fillStyle = '#b9a98d';
    g.textAlign = 'left';
    g.fillText(String(i + 1), x + 4 * scale, l.y + 8 * scale);
    g.textAlign = 'center';
  }
  const cur = game.inv.current();
  if (cur) {
    g.font = `600 ${12 * scale}px "Trebuchet MS", "Gill Sans", sans-serif`;
    g.fillStyle = '#efe6d4';
    g.fillText(blockDef(cur.id).name, w / 2, l.y - 12 * scale);
  }

  // vie : 10 segments
  const segs = 10;
  const sw = 16 * scale;
  const sg = 3 * scale;
  const hx = 14 * scale;
  const hy = 14 * scale;
  for (let i = 0; i < segs; i++) {
    const fill = Math.min(1, Math.max(0, (game.hp / MAX_HP) * segs - i));
    g.fillStyle = '#2a1e15';
    g.fillRect(hx + i * (sw + sg), hy, sw, 12 * scale);
    g.fillStyle = '#c9472e';
    g.fillRect(hx + i * (sw + sg), hy, sw * fill, 12 * scale);
  }
  g.font = `600 ${12 * scale}px "Trebuchet MS", "Gill Sans", sans-serif`;
  g.fillStyle = '#efe6d4';
  g.textAlign = 'left';
  g.fillText(`${Math.ceil(game.hp)} PV`, hx, hy + 28 * scale);
  g.textAlign = 'right';
  g.fillStyle = '#b9a98d';
  g.fillText(muted ? 'Son coupé (M)' : '', w - 14 * scale, 22 * scale);
  g.textAlign = 'center';

  if (game.hurtFlash > 0) {
    g.fillStyle = `rgba(200,30,40,${game.hurtFlash * 0.35})`;
    g.fillRect(0, 0, w, h);
  }
  if (game.deadTimer > 0) {
    g.fillStyle = '#2a1e15';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#efe6d4';
    g.font = `700 ${28 * scale}px "Trebuchet MS", "Gill Sans", sans-serif`;
    g.fillText('Tu es tombé…', w / 2, h / 2);
    g.font = `${13 * scale}px "Trebuchet MS", "Gill Sans", sans-serif`;
    g.fillText('Réapparition en cours', w / 2, h / 2 + 30 * scale);
  } else if (game.messageTimer > 0) {
    g.font = `600 ${14 * scale}px "Trebuchet MS", "Gill Sans", sans-serif`;
    g.fillStyle = '#dba046';
    g.fillText(game.message, w / 2, l.y - 36 * scale);
  }
}
