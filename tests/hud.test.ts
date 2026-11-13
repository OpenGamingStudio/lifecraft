import { describe, expect, it } from 'vitest';
import { HOTBAR } from '../src/constants';
import { hotbarLayout, slotAt, slotRect, uiScale } from '../src/ui/hud';

// largeurs vérifiées en revue (px CSS), en portrait et en paysage, à 1x et 2x
const SCREENS: [number, number][] = [[320, 568], [568, 320], [375, 667], [667, 375], [768, 1024], [1024, 768], [1440, 900]];

describe('barre de cases (HUD)', () => {
  for (const [cw, ch] of SCREENS) {
    for (const dpr of [1, 2]) {
      it(`${cw}x${ch} @${dpr}x : cases d'au moins 44 px CSS, toutes à l'écran, sans chevauchement`, () => {
        const scale = uiScale(cw, ch, dpr);
        const l = hotbarLayout(cw * dpr, ch * dpr, scale);
        expect(l.size / dpr).toBeGreaterThanOrEqual(44);
        for (let i = 0; i < HOTBAR; i++) {
          const r = slotRect(l, i);
          expect(r.x).toBeGreaterThanOrEqual(0);
          expect(r.x + l.size).toBeLessThanOrEqual(cw * dpr);
          expect(r.y).toBeGreaterThanOrEqual(0);
          expect(r.y + l.size).toBeLessThanOrEqual(ch * dpr);
          // le centre de chaque case sélectionne cette case, et elle seule
          expect(slotAt(l, r.x + l.size / 2, r.y + l.size / 2)).toBe(i);
        }
      });
    }
  }

  it('passe sur deux rangées (5 + 4) quand neuf cases ne tiennent pas en largeur', () => {
    expect(hotbarLayout(320, 568, uiScale(320, 568, 1))).toMatchObject({ cols: 5, rows: 2 });
    expect(hotbarLayout(375, 667, uiScale(375, 667, 1))).toMatchObject({ cols: 5, rows: 2 });
    expect(hotbarLayout(768, 1024, uiScale(768, 1024, 1))).toMatchObject({ cols: 9, rows: 1 });
  });

  it('ne sélectionne rien hors des cases (écart entre deux cases, case vide de la 2e rangée)', () => {
    const l = hotbarLayout(320, 568, 1);
    const a = slotRect(l, 0);
    expect(slotAt(l, a.x + l.size + l.gap / 2, a.y + 5)).toBe(-1);
    expect(slotAt(l, a.x - 1, a.y + 5)).toBe(-1);
    const last = slotRect(l, HOTBAR - 1);
    expect(slotAt(l, last.x + l.size + l.gap + 5, last.y + 5)).toBe(-1);
  });

  it('respecte les marges sûres (encoche, barre d\'accueil)', () => {
    const l = hotbarLayout(640, 1136, 2, { top: 0, right: 0, bottom: 68, left: 0 });
    const r = slotRect(l, HOTBAR - 1);
    expect(r.y + l.size).toBeLessThanOrEqual(1136 - 68);
  });
});
