import { describe, expect, it } from 'vitest';
import { STICK_REACH, stickRead } from '../src/input/input';

describe('manette tactile', () => {
  it('au repos ou à peine poussée : ni marche ni saut', () => {
    expect(stickRead(0, 0)).toMatchObject({ move: 0, jump: false });
    expect(stickRead(0.2 * STICK_REACH, -0.2 * STICK_REACH)).toMatchObject({ move: 0, jump: false });
  });

  it('marche à gauche et à droite au-delà de 30 % de la course', () => {
    expect(stickRead(-0.5 * STICK_REACH, 0).move).toBe(-1);
    expect(stickRead(0.5 * STICK_REACH, 0).move).toBe(1);
  });

  it('saute quand le pouce pousse franchement vers le haut, y compris en marchant', () => {
    expect(stickRead(0, -0.7 * STICK_REACH)).toMatchObject({ move: 0, jump: true });
    expect(stickRead(0.6 * STICK_REACH, -0.7 * STICK_REACH)).toMatchObject({ move: 1, jump: true });
    expect(stickRead(STICK_REACH, -0.4 * STICK_REACH).jump).toBe(false);
    expect(stickRead(0, 0.9 * STICK_REACH).jump).toBe(false);
  });

  it('le pommeau reste dans sa course', () => {
    const s = stickRead(300, -400);
    expect(Math.hypot(s.x, s.y)).toBeCloseTo(STICK_REACH);
    expect(s).toMatchObject({ move: 1, jump: true });
  });
});
