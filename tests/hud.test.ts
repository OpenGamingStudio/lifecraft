import { describe, expect, it } from 'vitest';
import { HOTBAR } from '../src/constants';
import { BarScroll, VISIBLE, barAt, hotbarLayout, hudHeight, slotAt, slotRect, uiScale } from '../src/ui/hud';

// largeurs vérifiées en revue (px CSS), en portrait et en paysage, à 1x et 2x
const SCREENS: [number, number][] = [[320, 568], [568, 320], [375, 667], [667, 375], [768, 1024], [1024, 768], [1440, 900]];

describe('barre de cases (HUD)', () => {
  for (const [cw, ch] of SCREENS) {
    for (const dpr of [1, 2]) {
      it(`${cw}x${ch} @${dpr}x : cases de 56 px CSS (64 px dès la tablette), à l'écran, sans chevauchement`, () => {
        const scale = uiScale(cw, ch, dpr);
        const l = hotbarLayout(cw * dpr, ch * dpr, scale);
        expect(l.size / dpr).toBeCloseTo(Math.min(cw, ch) >= 768 ? 64 : 56, 5);
        for (let i = 0; i < l.cols; i++) {
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

  it('montre toutes les cases quand elles tiennent, sinon une fenêtre de cinq cases défilables', () => {
    expect(hotbarLayout(320, 568, uiScale(320, 568, 1)).cols).toBe(VISIBLE);
    expect(hotbarLayout(375, 667, uiScale(375, 667, 1)).cols).toBe(VISIBLE);
    expect(hotbarLayout(568, 320, uiScale(568, 320, 1)).cols).toBe(VISIBLE);
    expect(hotbarLayout(768, 1024, uiScale(768, 1024, 1)).cols).toBe(VISIBLE);
    expect(hotbarLayout(1024, 768, uiScale(1024, 768, 1)).cols).toBe(HOTBAR);
    expect(hotbarLayout(1440, 900, uiScale(1440, 900, 1)).cols).toBe(HOTBAR);
  });

  it('barre réduite : le défilement amène les dernières cases dans la fenêtre, borné aux deux bouts', () => {
    const at = (first: number) => hotbarLayout(320, 568, 1, undefined, first);
    const first = HOTBAR - VISIBLE;
    const l = at(first);
    for (let i = first; i < HOTBAR; i++) {
      const r = slotRect(l, i);
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.x + l.size).toBeLessThanOrEqual(320);
      expect(slotAt(l, r.x + l.size / 2, r.y + l.size / 2)).toBe(i);
    }
    // les cases sorties de la fenêtre ne se choisissent pas
    const hidden = slotRect(l, first - 1);
    expect(slotAt(l, hidden.x + l.size / 2, hidden.y + 5)).toBe(-1);
    expect(at(99).scroll).toBe(l.scroll);
    expect(at(-4).scroll).toBe(0);
    // quand tout tient, rien ne défile
    expect(hotbarLayout(1440, 900, 1, undefined, 3).scroll).toBe(0);
  });

  it('seule la barre réduite se fait glisser, bandeau compris', () => {
    const small = hotbarLayout(320, 568, 1);
    expect(barAt(small, small.x - 3, small.y + 5)).toBe(true);
    expect(barAt(small, small.x + 20, small.y - 20)).toBe(false);
    const wide = hotbarLayout(1440, 900, 1);
    expect(barAt(wide, wide.x + 5, wide.y + 5)).toBe(false);
  });

  it('ne sélectionne rien hors des cases (écart entre deux cases, bandeau)', () => {
    const l = hotbarLayout(320, 568, 1);
    const a = slotRect(l, 0);
    expect(slotAt(l, a.x + l.size + l.gap / 2, a.y + 5)).toBe(-1);
    expect(slotAt(l, a.x - 1, a.y + 5)).toBe(-1);
    expect(slotAt(l, a.x + 5, a.y - 1)).toBe(-1);
    const last = slotRect(l, l.cols - 1);
    expect(slotAt(l, last.x + l.size + 1, last.y + 5)).toBe(-1);
  });

  it('respecte les marges sûres (encoche, barre d\'accueil)', () => {
    const l = hotbarLayout(640, 1136, 2, { top: 0, right: 0, bottom: 68, left: 0 });
    const r = slotRect(l, l.cols - 1);
    expect(r.y + l.size).toBeLessThanOrEqual(1136 - 68);
  });

  it('garde le bandeau de la barre, son contour et son ombre dure à l\'écran', () => {
    for (const [cw, ch] of SCREENS) {
      const scale = uiScale(cw, ch, 2);
      const l = hotbarLayout(cw * 2, ch * 2, scale);
      const out = (6 + 1.5 + 3) * scale; // débord du bandeau + demi-contour + ombre
      const last = slotRect(l, l.cols - 1);
      expect(l.x - out).toBeGreaterThanOrEqual(0);
      expect(last.x + l.size + out).toBeLessThanOrEqual(cw * 2);
      expect(last.y + l.size + out).toBeLessThanOrEqual(ch * 2);
    }
  });

  it('réserve la place de l\'étiquette au-dessus de la barre pour les commandes tactiles', () => {
    const l = hotbarLayout(640, 1136, 2);
    expect(hudHeight(l, 1136, 2)).toBe(1136 - l.y + 46 * 2);
  });
});

describe('défilement de la barre réduite', () => {
  it('suit le doigt sans dépasser les bouts, puis se cale sur une case', () => {
    const s = new BarScroll();
    s.drag(1.4, VISIBLE);
    expect(s.pos).toBeCloseTo(1.4);
    s.drop();
    for (let i = 0; i < 60; i++) s.update(1 / 60, VISIBLE, false);
    expect(s.pos).toBe(1);
    s.drag(9, VISIBLE);
    expect(s.pos).toBe(HOTBAR - VISIBLE);
    s.drag(-9, VISIBLE);
    expect(s.pos).toBe(0);
  });

  it('amène la case choisie au clavier dans la fenêtre, sans bouger si elle y est déjà', () => {
    const s = new BarScroll();
    s.reveal(7, VISIBLE);
    s.update(0, VISIBLE, true);
    expect(s.pos).toBe(3);
    s.reveal(4, VISIBLE);
    s.update(0, VISIBLE, true);
    expect(s.pos).toBe(3);
    s.reveal(0, VISIBLE);
    s.update(0, VISIBLE, true);
    expect(s.pos).toBe(0);
  });

  it('revient à zéro quand l\'écran s\'élargit et que tout tient', () => {
    const s = new BarScroll();
    s.drag(3, VISIBLE);
    s.update(0, HOTBAR, true);
    expect(s.pos).toBe(0);
  });
});
