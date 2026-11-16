import { describe, expect, it } from 'vitest';
import { COSMETICS, DEFAULT_OUTFIT, sanitizeOutfit } from '../src/cosmetics';
import { VERSION } from '../src/version';
import pkg from '../package.json';

describe('cosmétiques', () => {
  it('chaque emplacement a une valeur par défaut valide', () => {
    for (const id of Object.values(DEFAULT_OUTFIT)) expect(COSMETICS.some((c) => c.id === id)).toBe(true);
  });
  it('rejette les identifiants inconnus ou mal rangés', () => {
    expect(sanitizeOutfit({ hat: 'nope', face: 'hat-cap', back: 'back-cape', scarf: 7 })).toEqual({ ...DEFAULT_OUTFIT, back: 'back-cape' });
    expect(sanitizeOutfit(null)).toEqual(DEFAULT_OUTFIT);
  });
  it('version alignée sur package.json', () => expect(VERSION).toBe(pkg.version));
});
