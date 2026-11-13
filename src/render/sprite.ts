import type { Body } from '../player/physics';

/** Explorateur dessiné en code : pieds au point (0,0), unité u = pixels par pixel de sprite. */
export function drawPlayer(
  g: CanvasRenderingContext2D,
  b: Body,
  u: number,
  walk: number,
  mining: boolean,
  swing: number,
  alpha: number,
): void {
  g.save();
  g.globalAlpha = alpha;
  g.scale(b.facing, 1);
  const moving = b.onGround && Math.abs(b.vx) > 0.3;
  const rising = !b.onGround && b.vy < 0;
  const falling = !b.onGround && b.vy >= 0;
  const swingA = moving ? Math.sin(walk * Math.PI * 2) * 0.7 : 0;
  const bob = moving ? Math.abs(Math.sin(walk * Math.PI * 2)) * u * 0.8 : 0;
  const limb = (x: number, y: number, w: number, h: number, ang: number, col: string) => {
    g.save();
    g.translate(x * u, y * u);
    g.rotate(ang);
    g.fillStyle = col;
    g.fillRect(-w * u / 2, 0, w * u, h * u);
    g.restore();
  };
  const hipY = -8 - 0;
  // jambes
  const legBack = rising ? -0.5 : falling ? 0.35 : -swingA;
  const legFront = rising ? 0.6 : falling ? -0.35 : swingA;
  limb(-1.5, hipY, 3, 8, legBack, '#2c3e50');
  limb(1.5, hipY, 3, 8, legFront, '#34495e');
  g.translate(0, -bob);
  // bras arrière
  const armUp = falling ? -2.6 : 0;
  limb(0, -17, 3, 7, armUp ? armUp : -swingA * 0.9, '#c2793d');
  // torse
  g.fillStyle = '#2f8f83';
  g.fillRect(-4 * u, -18 * u, 8 * u, 10 * u);
  g.fillStyle = '#e6a52c'; // écharpe
  g.fillRect(-4.5 * u, -19 * u, 9 * u, 2 * u);
  g.fillRect(-6 * u, -18 * u, 2 * u, 5 * u);
  // tête
  g.fillStyle = '#e8c39a';
  g.fillRect(-3.5 * u, -26 * u, 7 * u, 7 * u);
  g.fillStyle = '#5b3a29';
  g.fillRect(-3.5 * u, -26 * u, 7 * u, 2 * u);
  g.fillRect(-3.5 * u, -26 * u, 2 * u, 5 * u);
  g.fillStyle = '#1d1d24';
  g.fillRect(1 * u, -23 * u, 1.4 * u, 1.6 * u);
  // bras avant (et pioche en cours de minage)
  if (mining) {
    const a = -1.2 + Math.sin(swing * 14) * 0.9;
    g.save();
    g.translate(2 * u, -17 * u);
    g.rotate(a);
    g.fillStyle = '#d4894a';
    g.fillRect(-1.5 * u, 0, 3 * u, 7 * u);
    g.fillStyle = '#7a5230';
    g.fillRect(-0.5 * u, 5 * u, 1 * u, 7 * u);
    g.fillStyle = '#aeb6c2';
    g.fillRect(-3 * u, 11 * u, 6 * u, 2 * u);
    g.restore();
  } else {
    limb(2, -17, 3, 7, armUp ? armUp : swingA * 0.9, '#d4894a');
  }
  g.restore();
}
