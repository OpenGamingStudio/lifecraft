import { describe, expect, it } from 'vitest';
import { FALL_DAMAGE_PER_SPEED, FALL_SAFE_SPEED, HOTBAR, LOW_HP, MAX_HP } from '../src/constants';
import { BLINK_TIME, Game, SHAKE_TIME } from '../src/game';
import { Inventory } from '../src/player/inventory';
import { advanceMining, canPlace, inReach } from '../src/player/mining';
import { createBody, fallDamage, stepBody, JUMP_SPEED } from '../src/player/physics';
import { B } from '../src/world/blocks';
import { World } from '../src/world/world';

/** Monde plat : sol plein à partir de y = 10. */
function flat(): World {
  const w = new World(40, 30, 1);
  for (let y = 10; y < 30; y++) for (let x = 0; x < 40; x++) w.set(x, y, B.STONE);
  for (let x = 0; x < 40; x++) w.surface[x] = 10;
  return w;
}
const run = (w: World, b: ReturnType<typeof createBody>, input: { move: -1 | 0 | 1; jump: boolean }, secs: number) => {
  let impact = 0;
  for (let t = 0; t < secs * 120; t++) impact = Math.max(impact, stepBody(w, b, input, 1 / 120).impact);
  return impact;
};

describe('physique', () => {
  it('tombe puis se pose sur le sol', () => {
    const w = flat();
    const b = createBody(5, 4);
    run(w, b, { move: 0, jump: false }, 2);
    expect(b.onGround).toBe(true);
    expect(b.y).toBeCloseTo(10, 2);
  });
  it('saute d\'environ 1,9 bloc', () => {
    const w = flat();
    const b = createBody(5, 9.99);
    run(w, b, { move: 0, jump: false }, 0.2);
    let top = b.y;
    for (let i = 0; i < 240; i++) {
      stepBody(w, b, { move: 0, jump: i === 0 }, 1 / 120);
      top = Math.min(top, b.y);
    }
    expect(10 - top).toBeGreaterThan(1.5);
    expect(10 - top).toBeLessThan(2.3);
    expect(JUMP_SPEED).toBeGreaterThan(0);
  });
  it('est bloqué par un mur de deux blocs mais monte une marche', () => {
    const w = flat();
    w.set(10, 9, B.STONE);
    w.set(10, 8, B.STONE);
    const b = createBody(5, 9.99);
    run(w, b, { move: 1, jump: false }, 3);
    expect(b.x).toBeLessThan(10 - 0.3 + 0.001);
    const w2 = flat();
    w2.set(10, 9, B.STONE);
    const c = createBody(5, 9.99);
    run(w2, c, { move: 1, jump: false }, 3);
    expect(c.x).toBeGreaterThan(11);
  });
  it('le plafond arrête le saut', () => {
    const w = flat();
    for (let x = 0; x < 40; x++) w.set(x, 7, B.STONE);
    const b = createBody(5, 9.99);
    run(w, b, { move: 0, jump: false }, 0.2);
    for (let i = 0; i < 120; i++) stepBody(w, b, { move: 0, jump: i === 0 }, 1 / 120);
    expect(b.y - b.h).toBeGreaterThanOrEqual(8 - 0.001);
  });
  it('les dégâts de chute croissent avec la hauteur et sont nuls pour une petite chute', () => {
    expect(fallDamage(FALL_SAFE_SPEED, FALL_SAFE_SPEED, FALL_DAMAGE_PER_SPEED)).toBe(0);
    expect(fallDamage(25, FALL_SAFE_SPEED, FALL_DAMAGE_PER_SPEED)).toBeGreaterThan(0);
    expect(fallDamage(35, FALL_SAFE_SPEED, FALL_DAMAGE_PER_SPEED)).toBeGreaterThan(fallDamage(25, FALL_SAFE_SPEED, FALL_DAMAGE_PER_SPEED));
    const w = flat();
    const small = createBody(5, 7);
    expect(run(w, small, { move: 0, jump: false }, 2)).toBeLessThan(FALL_SAFE_SPEED);
    const high = createBody(5, -10);
    const big = new World(40, 60, 1);
    for (let y = 40; y < 60; y++) for (let x = 0; x < 40; x++) big.set(x, y, B.STONE);
    expect(run(big, high, { move: 0, jump: false }, 4)).toBeGreaterThan(FALL_SAFE_SPEED);
  });
});

describe('inventaire', () => {
  it('empile jusqu\'à 99 puis déborde sur une autre case', () => {
    const inv = new Inventory();
    expect(inv.add(B.STONE, 120)).toBe(0);
    expect(inv.slots[0]).toEqual({ id: B.STONE, count: 99 });
    expect(inv.slots[1]).toEqual({ id: B.STONE, count: 21 });
  });
  it('retire, vide la case et refuse quand c\'est insuffisant', () => {
    const inv = new Inventory();
    inv.add(B.HUMUS, 2);
    expect(inv.remove(0, 3)).toBe(false);
    expect(inv.remove(0, 2)).toBe(true);
    expect(inv.slots[0]).toBeNull();
  });
  it('renvoie le surplus quand les 9 cases sont pleines', () => {
    const inv = new Inventory();
    expect(inv.add(B.STONE, HOTBAR * 99 + 5)).toBe(5);
    expect(inv.canAdd(B.IRON)).toBe(false);
  });
  it('sérialise et recharge', () => {
    const inv = new Inventory();
    inv.add(B.COPPER, 7);
    inv.select(3);
    const inv2 = new Inventory();
    inv2.load(JSON.parse(JSON.stringify(inv.serialize())), inv.selected);
    expect(inv2.slots[0]).toEqual({ id: B.COPPER, count: 7 });
    expect(inv2.selected).toBe(3);
  });
  it('reprend une sauvegarde à neuf cases : la neuvième rejoint une pile ou une case libre', () => {
    const inv = new Inventory();
    inv.load([[B.STONE, 90], null, [B.IRON, 4], null, null, null, null, null, [B.STONE, 20]], 8);
    expect(inv.slots).toHaveLength(HOTBAR);
    expect(inv.slots[0]).toEqual({ id: B.STONE, count: 99 });
    expect(inv.slots[1]).toEqual({ id: B.STONE, count: 11 });
    expect(inv.selected).toBe(0);
  });
});

describe('minage et pose', () => {
  it('la durée dépend du bloc et la cible change remet à zéro', () => {
    const w = flat();
    w.set(5, 9, B.HUMUS);
    let r = advanceMining(w, null, 5, 10, 0.5);
    expect(r.broken).toBe(false);
    const dirt = advanceMining(w, null, 5, 9, 0.5);
    expect(dirt.broken).toBe(true);
    r = advanceMining(w, r.state, 5, 10, 1.2);
    expect(r.broken).toBe(true);
    const moved = advanceMining(w, { tx: 6, ty: 10, progress: 0.9 }, 5, 10, 0.1);
    expect(moved.state!.progress).toBeLessThan(0.2);
  });
  it('le socle et l\'air ne se minent pas', () => {
    const w = flat();
    w.set(3, 12, B.BEDROCK);
    expect(advanceMining(w, null, 3, 12, 100).broken).toBe(false);
    expect(advanceMining(w, null, 3, 5, 100).broken).toBe(false);
  });
  it('la pose respecte la portée, l\'adjacence et le joueur', () => {
    const w = flat();
    const b = createBody(5.5, 10);
    expect(inReach(b, 5, 9)).toBe(true);
    expect(inReach(b, 30, 9)).toBe(false);
    expect(canPlace(w, b, 8, 9)).toBe(true);
    expect(canPlace(w, b, 8, 5)).toBe(false); // flotte
    expect(canPlace(w, b, 5, 9)).toBe(false); // sur le joueur
    expect(canPlace(w, b, 30, 9)).toBe(false); // hors de portée
  });
});

describe('boucle de jeu', () => {
  it('mine, ramasse, pose, subit la chute, meurt et réapparaît', () => {
    const g = new Game(7);
    const tx = Math.floor(g.player.x) + 1;
    const ty = g.world.surface[tx];
    g.update(0.5);
    g.controls.aim = { x: tx, y: ty };
    g.controls.mine = true;
    for (let i = 0; i < 20; i++) g.update(0.1);
    g.controls.mine = false;
    expect(g.world.get(tx, ty)).toBe(B.AIR);
    expect(g.inv.slots[0]).toEqual({ id: B.HUMUS, count: 1 });
    g.controls.place = true;
    g.update(0.1);
    g.controls.place = false;
    expect(g.world.get(tx, ty)).toBe(B.HUMUS);
    expect(g.inv.slots[0]).toBeNull();
    g.hurt(MAX_HP);
    expect(g.deadTimer).toBeGreaterThan(0);
    for (let i = 0; i < 30; i++) g.update(0.1);
    expect(g.hp).toBe(MAX_HP);
    expect(g.deadTimer).toBe(0);
  });
  it('blessure : secousse courte, et la jauge clignote une seule fois en passant sous 20 %', () => {
    const g = new Game(7);
    g.hurt(50);
    expect(g.shake).toBe(SHAKE_TIME);
    expect(g.lowBlink).toBe(0);
    g.hurt(35);
    expect(g.hp).toBeLessThan(LOW_HP);
    expect(g.lowBlink).toBe(BLINK_TIME);
    for (let i = 0; i < 10; i++) g.update(0.1);
    expect(g.shake).toBe(0);
    expect(g.lowBlink).toBe(0);
    g.hurt(5); // déjà sous le seuil : pas de second clignotement
    expect(g.lowBlink).toBe(0);
  });
  it('mouvements réduits : ni secousse ni clignotement', () => {
    const g = new Game(7);
    g.reducedMotion = true;
    g.hurt(90);
    expect(g.shake).toBe(0);
    expect(g.lowBlink).toBe(0);
  });
  it('subit des dégâts après une longue chute', () => {
    const g = new Game(7);
    g.player.y -= 0; // sol de départ
    g.update(0.5);
    const x = Math.floor(g.player.x);
    for (let y = g.world.surface[x]; y < g.world.surface[x] + 30; y++) g.world.set(x, y, B.AIR);
    g.world.set(x, g.world.surface[x] + 30, B.STONE);
    g.world.set(x - 1, g.world.surface[x] + 30, B.STONE);
    g.world.set(x + 1, g.world.surface[x] + 30, B.STONE);
    for (let i = 0; i < 60; i++) g.update(0.1);
    expect(g.hp).toBeLessThan(MAX_HP);
  });
});
