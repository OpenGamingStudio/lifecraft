import { describe, expect, it } from 'vitest';
import { Game } from '../src/game';
import { parseSave, loadWorld } from '../src/save';
import { B } from '../src/world/blocks';

describe('sauvegarde', () => {
  it('fait un aller-retour complet (monde modifié, joueur, inventaire, heure)', () => {
    const g = new Game(11);
    const x = Math.floor(g.player.x) + 2;
    const y = g.world.surface[x];
    g.world.set(x, y, B.AIR);
    g.world.set(x + 1, y - 1, B.CRYSTAL);
    g.inv.add(B.IRON, 5);
    g.hp = 64;
    g.phase = 0.4;
    const raw = JSON.stringify(g.serialize());
    const data = parseSave(raw)!;
    expect(data).not.toBeNull();
    const g2 = new Game(0, data);
    expect(g2.world.get(x, y)).toBe(B.AIR);
    expect(g2.world.get(x + 1, y - 1)).toBe(B.CRYSTAL);
    expect(g2.inv.slots[0]).toEqual({ id: B.IRON, count: 5 });
    expect(g2.hp).toBe(64);
    expect(g2.phase).toBeCloseTo(0.4);
    expect(g2.player.x).toBeCloseTo(g.player.x);
    expect(loadWorld(data).seed).toBe(11);
  });
  it('la sauvegarde ne stocke que les différences', () => {
    const g = new Game(11);
    expect(g.serialize().edits).toHaveLength(0);
  });
  it('rejette les données absentes ou corrompues', () => {
    expect(parseSave(null)).toBeNull();
    expect(parseSave('pas du json')).toBeNull();
    expect(parseSave('{"v":2}')).toBeNull();
    expect(parseSave('{"v":1,"seed":"x","edits":[],"player":{"x":1,"y":1},"hp":1}')).toBeNull();
  });
  it('rejette les sauvegardes hostiles ou hors bornes', () => {
    const ok = JSON.parse(JSON.stringify(new Game(3).serialize()));
    expect(parseSave(JSON.stringify(ok))).not.toBeNull();
    for (const bad of [
      { ...ok, seed: 'x' },
      { ...ok, hp: 'NaN' },
      { ...ok, edits: [0] },
      { ...ok, edits: [-1, 1] },
      { ...ok, edits: [0, 99] },
      { ...ok, player: { x: 1e12, y: 0 } },
    ]) expect(parseSave(JSON.stringify(bad))).toBeNull();
    expect(parseSave('{"v":1,"__proto__":{"a":1}')).toBeNull();
    expect(parseSave('x'.repeat(6_000_000))).toBeNull();
  });
});
