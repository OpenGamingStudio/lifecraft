import { REACH } from '../constants';
import type { Game } from '../game';
import { inReach } from '../player/mining';
import { B } from '../world/blocks';
import { daylight, sunHeight } from '../world/daycycle';
import { hash2 } from '../world/rng';
import { drawPlayer } from './sprite';
import { buildAtlas, buildCracks, TEX, VARIANTS, WALL_ID } from './textures';

const mix = (a: number[], b: number[], t: number) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const rgb = (c: number[]) => `rgb(${c[0]},${c[1]},${c[2]})`;
const NIGHT = [9, 12, 32];
const DAY = [126, 196, 232];
const DUSK = [226, 140, 96];

export class Renderer {
  readonly atlas = buildAtlas();
  readonly cracks = buildCracks();
  private light = document.createElement('canvas');
  private lightG = this.light.getContext('2d')!;
  private lightImg: ImageData | null = null;
  w = 0;
  h = 0;
  dpr = 1;
  tile = 24;
  camX = 0;
  camY = 0;
  private g: CanvasRenderingContext2D;

  constructor(readonly canvas: HTMLCanvasElement) {
    this.g = canvas.getContext('2d', { alpha: false })!;
  }

  resize(cssW: number, cssH: number, dpr: number): void {
    this.dpr = dpr;
    this.w = Math.round(cssW * dpr);
    this.h = Math.round(cssH * dpr);
    this.canvas.width = this.w;
    this.canvas.height = this.h;
    this.tile = Math.max(16, Math.min(Math.round(this.h / 20), Math.round(this.w / 14)));
    this.lightImg = null;
  }

  get uiScale(): number {
    const css = Math.min(this.w, this.h) / this.dpr;
    const fit = (this.w / this.dpr - 12) / 444; // la barre de 9 cases doit tenir en largeur
    return this.dpr * Math.min(fit, 1.5, Math.max(0.85, css / 560));
  }

  /** Tuile visée à partir d'un point de l'écran (pixels canvas). */
  screenToTile(sx: number, sy: number): { x: number; y: number } {
    return { x: Math.floor(this.camX + sx / this.tile), y: Math.floor(this.camY + sy / this.tile) };
  }

  follow(game: Game, dt: number): void {
    const p = game.player;
    const vw = this.w / this.tile;
    const vh = this.h / this.tile;
    const tx = Math.min(Math.max(p.x - vw / 2, 0), game.world.w - vw);
    const ty = Math.min(Math.max(p.y - p.h / 2 - vh / 2, 0), game.world.h - vh);
    const k = 1 - Math.exp(-dt * 9);
    if (dt === 0 || Math.abs(tx - this.camX) > vw) {
      this.camX = tx;
      this.camY = ty;
    } else {
      this.camX += (tx - this.camX) * k;
      this.camY += (ty - this.camY) * k;
    }
  }

  render(game: Game): void {
    const g = this.g;
    const T = this.tile;
    const world = game.world;
    g.imageSmoothingEnabled = false;
    const day = daylight(game.phase);
    this.drawSky(game, day);

    const x0 = Math.floor(this.camX);
    const y0 = Math.floor(this.camY);
    const cols = Math.ceil(this.w / T) + 2;
    const rows = Math.ceil(this.h / T) + 2;
    const ox = -(this.camX - x0) * T;
    const oy = -(this.camY - y0) * T;
    const px = (x: number) => Math.round(ox + (x - x0) * T);
    const py = (y: number) => Math.round(oy + (y - y0) * T);

    for (let ty = y0; ty < y0 + rows; ty++) {
      for (let tx = x0; tx < x0 + cols; tx++) {
        if (!world.inBounds(tx, ty)) continue;
        let id = world.tiles[ty * world.w + tx];
        if (id === B.AIR) {
          if (ty <= world.surface[tx]) continue;
          id = WALL_ID;
        }
        const v = Math.floor(hash2(world.seed, tx, ty) * VARIANTS);
        const dx = px(tx);
        const dy = py(ty);
        g.drawImage(this.atlas, v * TEX, id * TEX, TEX, TEX, dx, dy, px(tx + 1) - dx, py(ty + 1) - dy);
      }
    }

    // minage : fissures et surbrillance de la cible
    const aim = game.controls.aim;
    if (aim && game.deadTimer === 0) {
      const ok = inReach(game.player, aim.x, aim.y, REACH);
      g.lineWidth = Math.max(1, T / 14);
      g.strokeStyle = ok ? 'rgba(255,236,170,0.9)' : 'rgba(255,255,255,0.25)';
      g.strokeRect(px(aim.x) + 0.5, py(aim.y) + 0.5, T - 1, T - 1);
    }
    const m = game.mining;
    if (m) {
      const lvl = Math.min(4, Math.floor(m.progress * 5));
      g.drawImage(this.cracks, lvl * TEX, 0, TEX, TEX, px(m.tx), py(m.ty), T, T);
    }

    // joueur
    const p = game.player;
    if (game.deadTimer === 0 || Math.floor(game.deadTimer * 10) % 2 === 0) {
      g.save();
      g.translate(Math.round(ox + (p.x - x0) * T), Math.round(oy + (p.y - y0) * T));
      drawPlayer(g, p, T / 14.5, game.walkPhase, !!m, game.swing, game.deadTimer > 0 ? 0.5 : 1);
      g.restore();
    }

    // particules
    for (const q of game.particles.list) {
      g.globalAlpha = Math.min(1, (q.life / q.max) * 1.5);
      g.fillStyle = q.color;
      const s = Math.max(2, q.size * T);
      g.fillRect(Math.round(ox + (q.x - x0) * T - s / 2), Math.round(oy + (q.y - y0) * T - s / 2), s, s);
    }
    g.globalAlpha = 1;

    this.drawLighting(game, x0, y0, cols, rows, ox, oy, day);
  }

  private drawSky(game: Game, day: number): void {
    const g = this.g;
    const h = sunHeight(game.phase);
    const dusk = Math.max(0, 1 - Math.abs(h) / 0.35);
    let sky = mix(NIGHT, DAY, (day - 0.12) / 0.88);
    sky = mix(sky, DUSK, dusk * 0.45);
    g.fillStyle = rgb(sky);
    g.fillRect(0, 0, this.w, this.h);
    // bandes d'horizon (aplats, sans dégradé)
    const horizon = (game.world.h * 0.32 - this.camY) * this.tile;
    const band = mix(sky, dusk > 0.1 ? DUSK : [255, 255, 255], 0.14 + dusk * 0.12);
    g.fillStyle = rgb(band);
    g.fillRect(0, Math.max(0, horizon - this.tile * 7), this.w, this.tile * 7);
    // astres
    const t = game.phase * Math.PI * 2;
    const cx = this.w * (0.5 + Math.cos(t) * 0.42);
    const cy = this.h * 0.55 - Math.sin(t) * this.h * 0.42;
    g.fillStyle = '#ffe9a8';
    g.beginPath();
    g.arc(cx, cy, this.tile * 1.1, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#dfe6f2';
    g.beginPath();
    g.arc(this.w - cx, this.h * 0.55 + Math.sin(t) * this.h * 0.42, this.tile * 0.8, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = rgb(mix(sky, [210, 220, 240], 0.9));
    g.globalAlpha = Math.max(0, 1 - day * 1.6);
    for (let i = 0; i < 70; i++) {
      g.fillRect(hash2(3, i, 1) * this.w, hash2(3, i, 2) * horizon * 0.9, 2, 2);
    }
    g.globalAlpha = 1;
    // collines lointaines, en aplat teinté par le ciel
    for (let layer = 0; layer < 2; layer++) {
      const par = 0.25 + layer * 0.2;
      g.fillStyle = rgb(mix(mix([104, 156, 140], [72, 122, 100], layer), NIGHT, 1 - day) );
      g.beginPath();
      g.moveTo(0, this.h);
      for (let sx = 0; sx <= this.w; sx += 8) {
        const wx = this.camX * par + sx / this.tile;
        const hh = Math.sin(wx * (0.21 + layer * 0.13) + layer * 2) * 2.2 + Math.sin(wx * 0.07 + layer) * 3;
        g.lineTo(sx, horizon + (2 - 1.5 - layer * 1.5 - hh * 0.5) * this.tile);
      }
      g.lineTo(this.w, this.h);
      g.fill();
    }
  }

  private drawLighting(game: Game, x0: number, y0: number, cols: number, rows: number, ox: number, oy: number, day: number): void {
    const lc = this.light;
    if (lc.width !== cols || lc.height !== rows || !this.lightImg) {
      lc.width = cols;
      lc.height = rows;
      this.lightImg = this.lightG.createImageData(cols, rows);
    }
    const d = this.lightImg.data;
    const lm = game.light;
    const lx = game.player.x; // lanterne de l'explorateur
    const ly = game.player.y - 1;
    let i = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const dx = x0 + c + 0.5 - lx;
        const dy = y0 + r + 0.5 - ly;
        const lamp = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / 8);
        const b = Math.max(lm.brightness(x0 + c, y0 + r, day), lamp * lamp * 0.85, 0.04);
        d[i++] = 4;
        d[i++] = 6;
        d[i++] = 20;
        d[i++] = Math.round(255 * Math.min(0.94, Math.max(0, 1 - Math.pow(b, 0.85) - 0.03)));
      }
    }
    this.lightG.putImageData(this.lightImg, 0, 0);
    const g = this.g;
    g.imageSmoothingEnabled = true;
    g.drawImage(lc, ox, oy, cols * this.tile, rows * this.tile);
    g.imageSmoothingEnabled = false;
  }
}

