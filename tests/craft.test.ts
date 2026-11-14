import { describe, expect, it } from 'vitest';
import { WORLD_H, WORLD_W, STACK_MAX } from '../src/constants';
import { Game } from '../src/game';
import { DURA_LATTE, DURA_PIERRE, I, ITEMS, RECIPES, SPEED_LATTE, SPEED_PIERRE, benchNear, dropFor, miningSpeed, toolOf } from '../src/items';
import { Inventory } from '../src/player/inventory';
import { advanceMining } from '../src/player/mining';
import { diffEdits, loadWorld, parseSave, type SaveData } from '../src/save';
import { sheetHit, sheetLayout } from '../src/ui/sheet';
import { B, BLOCKS } from '../src/world/blocks';
import { generateWorld } from '../src/world/world';

const recipe = (id: string) => RECIPES.find((r) => r.id === id)!;
const stocked = (...items: [number, number][]) => {
  const inv = new Inventory();
  for (const [id, n] of items) inv.add(id, n);
  return inv;
};

describe('recettes (liste d\'ingrédients, sans grille)', () => {
  it('Fendre : 1 Tronc -> 3 Latte + 1 Écorce', () => {
    const inv = stocked([B.LOG, 2]);
    expect(inv.craft(recipe('fendre'))).toBe(true);
    expect(inv.count(B.LOG)).toBe(1);
    expect(inv.count(I.LATTE)).toBe(3);
    expect(inv.count(I.ECORCE)).toBe(1);
  });
  it('Cordelette : 3 Fibres -> 1 ; Manche : 1 Latte + 1 Écorce -> 2', () => {
    const inv = stocked([I.FIBRE, 7], [I.LATTE, 1], [I.ECORCE, 1]);
    expect(inv.craft(recipe('cordelette'))).toBe(true);
    expect(inv.count(I.FIBRE)).toBe(4);
    expect(inv.count(I.CORDELETTE)).toBe(1);
    expect(inv.craft(recipe('manche'))).toBe(true);
    expect(inv.count(I.MANCHE)).toBe(2);
    expect(inv.count(I.LATTE) + inv.count(I.ECORCE)).toBe(0);
  });
  it('Banc d\'artisan : 3 Latte + 2 Pierre + 1 Cordelette', () => {
    const inv = stocked([I.LATTE, 3], [B.STONE, 2], [I.CORDELETTE, 1]);
    expect(inv.craft(recipe('banc'))).toBe(true);
    expect(inv.count(B.BENCH)).toBe(1);
  });
  it('outils : coûts exacts, durabilité pleine, un seul outil par case', () => {
    const cost: Record<string, [number, number][]> = {
      'pic-latte': [[I.LATTE, 2], [I.MANCHE, 1], [I.CORDELETTE, 1]],
      'pic-pierre': [[B.STONE, 2], [I.MANCHE, 1], [I.CORDELETTE, 1]],
      'cognee-latte': [[I.LATTE, 3], [I.MANCHE, 1]],
      'cognee-pierre': [[B.STONE, 3], [I.MANCHE, 1]],
      'beche-latte': [[I.LATTE, 2], [I.MANCHE, 1]],
      'beche-pierre': [[B.STONE, 2], [I.MANCHE, 1]],
    };
    for (const [id, needs] of Object.entries(cost)) {
      const r = recipe(id);
      expect(r.needs).toEqual(needs);
      expect(r.bench).toBe(true);
      const inv = stocked(...needs);
      expect(inv.craft(r)).toBe(true);
      const slot = inv.slots.find((s) => s && toolOf(s.id))!;
      expect(slot.count).toBe(1);
      expect(slot.dur).toBe(toolOf(slot.id)!.dura);
    }
  });
  it('rien ne part si un ingrédient manque ou si le sac est plein', () => {
    const inv = stocked([I.LATTE, 2], [I.MANCHE, 1]);
    expect(inv.craft(recipe('pic-latte'))).toBe(false); // pas de cordelette
    expect(inv.count(I.LATTE)).toBe(2);
    const full = new Inventory();
    full.slots = full.slots.map((_, i) => ({ id: i % 2 ? B.IRON : B.COPPER, count: STACK_MAX }));
    full.slots[0] = { id: I.FIBRE, count: 3 };
    full.slots[1] = { id: B.IRON, count: STACK_MAX };
    expect(full.craft(recipe('cordelette'))).toBe(true); // libère sa case et y range le résultat
    const jam = new Inventory();
    jam.slots = jam.slots.map(() => ({ id: B.IRON, count: STACK_MAX }));
    jam.slots[0] = { id: B.LOG, count: 1 };
    jam.slots[1] = { id: I.LATTE, count: STACK_MAX }; // deux sorties pour une seule case libérée : impossible
    expect(jam.craft(recipe('fendre'))).toBe(false);
    expect(jam.count(B.LOG)).toBe(1);
  });
  it('les noms évitent ceux d\'un jeu existant', () => {
    const names = [...ITEMS.map((i) => i.name), ...BLOCKS.map((b) => b.name), ...RECIPES.map((r) => r.name)].join(' ').toLowerCase();
    for (const bad of ['pioche', 'hache', 'pelle', 'établi', 'planche', 'bâton', 'baton']) expect(names).not.toContain(bad);
  });
});

describe('Banc d\'artisan', () => {
  it('requis à 3 blocs pour les outils, pas pour les matériaux', () => {
    const w = generateWorld(3, 64, 64);
    const g = new Game(3);
    g.inv = stocked([I.LATTE, 2], [I.MANCHE, 1], [I.CORDELETTE, 1]);
    const { x, y } = g.player;
    expect(g.craft(recipe('pic-latte'))).toMatch(/Banc/);
    expect(g.inv.count(I.PIC_LATTE)).toBe(0);
    g.world.set(Math.floor(x) + 3, Math.floor(y - 0.5), B.BENCH);
    expect(benchNear(g.world, x, y)).toBe(true);
    expect(g.craft(recipe('pic-latte'))).toBeNull();
    expect(g.inv.count(I.PIC_LATTE)).toBe(1);
    g.world.set(Math.floor(x) + 3, Math.floor(y - 0.5), B.AIR);
    g.world.set(Math.floor(x) + 4, Math.floor(y - 0.5), B.BENCH);
    expect(benchNear(g.world, x, y)).toBe(false);
    expect(w.w).toBe(64);
  });
});

describe('outils : vitesse et durabilité', () => {
  it('x2 en latte, x3,5 en pierre, seulement pour la bonne famille', () => {
    expect(miningSpeed(I.PIC_LATTE, B.STONE)).toBe(SPEED_LATTE);
    expect(miningSpeed(I.PIC_PIERRE, B.IRON)).toBe(SPEED_PIERRE);
    expect(miningSpeed(I.COGNEE_PIERRE, B.LOG)).toBe(SPEED_PIERRE);
    expect(miningSpeed(I.BECHE_LATTE, B.HUMUS)).toBe(SPEED_LATTE);
    expect(miningSpeed(I.PIC_PIERRE, B.LOG)).toBe(1);
    expect(miningSpeed(I.BECHE_PIERRE, B.STONE)).toBe(1);
    expect(miningSpeed(undefined, B.STONE)).toBe(1);
    expect(DURA_LATTE).toBe(40);
    expect(DURA_PIERRE).toBe(90);
  });
  it('tout reste minable à mains nues, sauf le socle', () => {
    const w = generateWorld(9, 64, 64);
    for (const id of [B.MOSS, B.HUMUS, B.STONE, B.COPPER, B.IRON, B.CRYSTAL, B.LOG, B.LEAVES, B.BENCH]) {
      w.set(10, 10, id);
      expect(advanceMining(w, null, 10, 10, 0.01).state).not.toBeNull();
    }
    w.set(10, 10, B.BEDROCK);
    expect(advanceMining(w, null, 10, 10, 1).state).toBeNull();
  });
  it('un bloc cassé use l\'outil ; à zéro il se brise (son, particules, case vidée)', () => {
    const g = new Game(11);
    const sounds: string[] = [];
    g.onSfx = (n) => sounds.push(n);
    g.inv = new Inventory();
    g.inv.slots[0] = { id: I.PIC_LATTE, count: 1, dur: 2 };
    g.inv.select(0);
    const { x, y } = g.player;
    const tx = Math.floor(x);
    const ty = Math.floor(y) + 1;
    const mine = () => {
      g.world.set(tx, ty, B.STONE);
      g.controls.aim = { x: tx, y: ty };
      g.controls.mine = true;
      for (let i = 0; i < 400 && g.world.get(tx, ty) !== B.AIR; i++) g.update(1 / 60);
    };
    mine();
    expect(g.inv.slots[0]!.dur).toBe(1);
    const before = g.particles.list.length;
    mine();
    expect(g.inv.slots[0]).toBeNull();
    expect(sounds).toContain('snap');
    expect(g.particles.list.length).toBeGreaterThan(before);
  });
  it('un Pic de pierre casse la pierre 3,5 fois plus vite que les mains', () => {
    const w = generateWorld(9, 64, 64);
    w.set(10, 10, B.STONE);
    const time = (mult: number) => {
      let t = 0;
      let s = null as ReturnType<typeof advanceMining>['state'];
      for (;;) {
        t += 1 / 120;
        const r = advanceMining(w, s, 10, 10, (1 / 120) * mult);
        if (r.broken) return t;
        s = r.state;
      }
    };
    expect(time(1) / time(SPEED_PIERRE)).toBeCloseTo(SPEED_PIERRE, 1);
  });
});

describe('Feuillage et Fibre', () => {
  it('donne 1 Fibre un bloc sur deux, déterministe par graine et position', () => {
    let n = 0;
    for (let x = 0; x < 400; x++) {
      const d = dropFor(77, x, 20, B.LEAVES);
      expect(d === I.FIBRE || d === 0).toBe(true);
      expect(dropFor(77, x, 20, B.LEAVES)).toBe(d);
      if (d === I.FIBRE) n++;
    }
    expect(n).toBeGreaterThan(150);
    expect(n).toBeLessThan(250);
    expect(dropFor(77, 3, 3, B.LOG)).toBe(B.LOG);
  });
});

describe('arbres', () => {
  it('sont déterministes, plantés sur la mousse, en laissant le départ dégagé', () => {
    const a = generateWorld(21, WORLD_W, WORLD_H);
    const b = generateWorld(21, WORLD_W, WORLD_H);
    expect(a.tiles).toEqual(b.tiles);
    let trunks = 0;
    for (let x = 0; x < WORLD_W; x++) {
      const base = a.get(x, a.surface[x] - 1);
      if (base === B.LOG) {
        trunks++;
        expect(a.get(x, a.surface[x])).toBe(B.MOSS);
        expect(Math.abs(x - WORLD_W / 2)).toBeGreaterThan(4);
      }
    }
    expect(trunks).toBeGreaterThan(5);
    for (const t of a.tiles) expect(t).toBeLessThanOrEqual(B.BENCH);
  });
});

describe('sauvegardes V1', () => {
  const v1 = (seed: number, edits: number[]): SaveData => ({
    v: 1,
    seed,
    edits,
    player: { x: 128.5, y: 40 },
    hp: 80,
    inv: [[B.STONE, 12], [B.COPPER, 3], null, null, null, null, null, null],
    sel: 1,
    phase: 0.3,
  });

  it('une V1 s\'ouvre : sac conservé, tuiles modifiées respectées, bloc posé intact', () => {
    const fresh = generateWorld(21, WORLD_W, WORLD_H);
    // une tour posée par le joueur V1 sur une colonne où pousserait un arbre
    const tree = [...Array(WORLD_W).keys()].find((x) => fresh.get(x, fresh.surface[x] - 1) === B.LOG)!;
    const idx = (x: number, y: number) => y * WORLD_W + x;
    const sy = fresh.surface[tree];
    const edits = [idx(tree, sy - 1), B.STONE, idx(tree, sy - 2), B.STONE];
    const raw = JSON.stringify(v1(21, edits));
    const data = parseSave(raw);
    expect(data).not.toBeNull();
    const w = loadWorld(data!);
    expect(w.get(tree, sy - 1)).toBe(B.STONE);
    expect(w.get(tree, sy - 2)).toBe(B.STONE);
    expect(w.get(tree + 1, sy - 3)).not.toBe(B.LEAVES); // pas de feuilles collées à sa construction
    expect(w.get(tree, sy - 3)).not.toBe(B.LOG);
    const g = new Game(21, data);
    expect(g.inv.slots[0]).toEqual({ id: B.STONE, count: 12 });
    expect(g.inv.slots[1]).toEqual({ id: B.COPPER, count: 3 });
    expect(g.inv.selected).toBe(1);
    expect(g.hp).toBe(80);
    // la sauvegarde suivante est une V2 qui se relit à l'identique
    const next = g.serialize();
    expect(next.v).toBe(2);
    const again = loadWorld(parseSave(JSON.stringify(next))!);
    expect(again.tiles).toEqual(g.world.tiles);
  });
  it('une V1 sans modification gagne les arbres', () => {
    const w = loadWorld(v1(21, []));
    expect(w.tiles).toEqual(generateWorld(21, WORLD_W, WORLD_H).tiles);
    expect(diffEdits(w)).toEqual([]);
  });
  it('refuse une V3 ou un bloc inconnu', () => {
    expect(parseSave(JSON.stringify({ ...v1(1, []), v: 3 }))).toBeNull();
    expect(parseSave(JSON.stringify(v1(1, [5, B.BENCH + 1])))).toBeNull();
    expect(parseSave(JSON.stringify(v1(1, [5, B.BENCH])))).not.toBeNull();
  });
  it('le sac V2 garde l\'usure des outils ; les valeurs folles sont bornées', () => {
    const inv = new Inventory();
    inv.add(I.PIC_PIERRE, 1);
    inv.slots[0]!.dur = 17;
    inv.add(I.FIBRE, 5);
    const back = new Inventory();
    back.load(JSON.parse(JSON.stringify(inv.serialize())), 0);
    expect(back.slots[0]).toEqual({ id: I.PIC_PIERRE, count: 1, dur: 17 });
    expect(back.slots[1]).toEqual({ id: I.FIBRE, count: 5 });
    back.load([[I.PIC_LATTE, 9, 9999], [I.COGNEE_LATTE, 1, -5], [999, 3], [B.LEAVES, 2], [B.BEDROCK, 1]], 0);
    expect(back.slots[0]).toEqual({ id: I.PIC_LATTE, count: 1, dur: DURA_LATTE });
    expect(back.slots[1]!.dur).toBe(1);
    expect(back.slots.slice(2).every((s) => s === null)).toBe(true);
  });
});

describe('feuille Fabrication', () => {
  it('garde ses lignes dans l\'écran et les touches assez grandes, de 320 px à 1440 px', () => {
    for (const [w, h] of [[320, 568], [568, 320], [375, 667], [768, 1024], [1440, 900]]) {
      const scale = Math.min(w, h) >= 768 ? 64 / 56 : 1;
      const l = sheetLayout(w, h, scale);
      expect(l.x).toBeGreaterThanOrEqual(0);
      expect(l.x + l.w).toBeLessThanOrEqual(w);
      expect(l.y).toBeGreaterThanOrEqual(0);
      expect(l.y + l.h).toBeLessThanOrEqual(h);
      expect(l.row / scale).toBeGreaterThanOrEqual(44);
      expect(l.btnH / scale).toBeGreaterThanOrEqual(44);
      expect(l.close.h / scale).toBeGreaterThanOrEqual(44);
      // la dernière recette est atteignable en défilant
      const last = sheetHit(l, l.maxScroll, l.x + l.w / 2, l.listTop + RECIPES.length * l.row - l.maxScroll - l.row / 2);
      expect(last).toEqual({ kind: 'row', index: RECIPES.length - 1 });
      expect(sheetHit(l, 0, l.x + l.w / 2, l.listTop + 5)).toEqual({ kind: 'row', index: 0 });
      expect(sheetHit(l, 0, l.close.x + 2, l.close.y + 2)).toEqual({ kind: 'close' });
      expect(sheetHit(l, 0, l.x - 5, l.y)).toEqual({ kind: 'outside' });
    }
  });
});
