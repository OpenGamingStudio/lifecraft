import { DAY_LENGTH } from '../constants';

/** phase 0..1 ; 0,25 = midi, 0,75 = minuit. Début de partie : matin. */
export const START_PHASE = 0.05;

export function advance(phase: number, dt: number): number {
  const p = (phase + dt / DAY_LENGTH) % 1;
  return p < 0 ? p + 1 : p;
}

/** Hauteur du soleil, -1..1 (1 = zénith). */
export function sunHeight(phase: number): number {
  return Math.sin(phase * Math.PI * 2);
}

/** Éclairage du jour 0,12 (nuit, clair de lune) .. 1 (plein jour). */
export function daylight(phase: number): number {
  const h = sunHeight(phase);
  const t = Math.min(1, Math.max(0, (h + 0.2) / 0.5));
  return 0.12 + 0.88 * t * t * (3 - 2 * t);
}
