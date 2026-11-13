import type { World } from '../world/world';

export const GRAVITY = 38;
export const JUMP_SPEED = 12;
export const MAX_SPEED = 6.5;
export const MAX_FALL = 42;
const EPS = 1e-4;
const COYOTE = 0.1;

export interface Body {
  x: number; // centre horizontal (tuiles)
  y: number; // pieds (tuiles, y vers le bas)
  vx: number;
  vy: number;
  w: number;
  h: number;
  onGround: boolean;
  facing: 1 | -1;
  coyote: number;
}

export interface MoveInput {
  move: -1 | 0 | 1;
  jump: boolean;
}

export function createBody(x: number, y: number): Body {
  return { x, y, vx: 0, vy: 0, w: 0.6, h: 1.8, onGround: false, facing: 1, coyote: 0 };
}

export function overlaps(world: World, b: Body): boolean {
  const x0 = Math.floor(b.x - b.w / 2);
  const x1 = Math.floor(b.x + b.w / 2);
  const y0 = Math.floor(b.y - b.h);
  const y1 = Math.floor(b.y - EPS);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (world.isSolid(tx, ty)) return true;
  return false;
}

function approach(v: number, target: number, step: number): number {
  return v < target ? Math.min(v + step, target) : Math.max(v - step, target);
}

/** Avance le corps d'un pas. Renvoie la vitesse d'impact si le corps vient de toucher le sol (sinon 0). */
export function stepBody(world: World, b: Body, input: MoveInput, dt: number): { impact: number; jumped: boolean } {
  let jumped = false;
  if (input.move !== 0) b.facing = input.move;
  b.vx = approach(b.vx, input.move * MAX_SPEED, (b.onGround ? 70 : 32) * dt);
  b.coyote = b.onGround ? COYOTE : Math.max(0, b.coyote - dt);
  if (input.jump && b.coyote > 0) {
    b.vy = -JUMP_SPEED;
    b.coyote = 0;
    b.onGround = false;
    jumped = true;
  }
  b.vy = Math.min(b.vy + GRAVITY * dt, MAX_FALL);

  // axe X
  b.x += b.vx * dt;
  if (overlaps(world, b)) {
    let stepped = false;
    if (b.onGround) {
      // montée automatique d'une marche d'un bloc
      const oy = b.y;
      b.y -= 1;
      if (!overlaps(world, b)) stepped = true;
      else b.y = oy;
    }
    if (!stepped) {
      if (b.vx > 0) b.x = Math.floor(b.x + b.w / 2) - b.w / 2 - EPS;
      else if (b.vx < 0) b.x = Math.floor(b.x - b.w / 2) + 1 + b.w / 2 + EPS;
      b.vx = 0;
    }
  }

  // axe Y
  let impact = 0;
  const wasFalling = b.vy > 0;
  b.y += b.vy * dt;
  b.onGround = false;
  if (overlaps(world, b)) {
    if (b.vy > 0) {
      b.y = Math.floor(b.y) - EPS;
      impact = wasFalling ? b.vy : 0;
      b.onGround = true;
    } else {
      b.y = Math.floor(b.y - b.h) + 1 + b.h + EPS;
    }
    b.vy = 0;
  } else if (b.vy >= 0) {
    // détecte le sol juste sous les pieds (évite le clignotement de onGround)
    b.y += 0.01;
    if (overlaps(world, b)) b.onGround = true;
    b.y -= 0.01;
  }
  return { impact, jumped };
}

export function fallDamage(impact: number, safe: number, perSpeed: number): number {
  return impact > safe ? Math.round((impact - safe) * perSpeed) : 0;
}
