import { FALL_DAMAGE_PER_SPEED, FALL_SAFE_SPEED, LOW_HP, MAX_HP, WORLD_H, WORLD_W } from './constants';
import { benchNear, dropFor, itemDef, miningSpeed, RECIPES, type Recipe } from './items';
import { Inventory } from './player/inventory';
import { advanceMining, canPlace, inReach, type MiningState } from './player/mining';
import { Particles } from './player/particles';
import { createBody, fallDamage, overlaps, stepBody, type Body } from './player/physics';
import { diffEdits, loadWorld, type SaveData } from './save';
import { B, blockDef, isPlaceable } from './world/blocks';
import { advance, START_PHASE } from './world/daycycle';
import { LightMap } from './world/lighting';
import { generateWorld, type World } from './world/world';

export type SfxName = 'mine' | 'break' | 'place' | 'jump' | 'land' | 'hurt' | 'die' | 'respawn' | 'full' | 'craft' | 'snap';

export interface Controls {
  move: -1 | 0 | 1;
  jump: boolean;
  mine: boolean;
  place: boolean;
  aim: { x: number; y: number } | null; // tuile visée (coordonnées monde)
}

const STEP = 1 / 120;
export const SHAKE_TIME = 0.12; // secousse de caméra quand on est blessé, en secondes
export const BLINK_TIME = 0.4; // clignotement unique de la jauge quand la vie passe sous le seuil bas

export class Game {
  world!: World;
  light!: LightMap;
  player!: Body;
  inv = new Inventory();
  particles = new Particles();
  hp = MAX_HP;
  phase = START_PHASE;
  mining: MiningState | null = null;
  controls: Controls = { move: 0, jump: false, mine: false, place: false, aim: null };
  deadTimer = 0;
  shake = 0; // secousse de caméra restante (s)
  lowBlink = 0; // clignotement de la jauge de vie restant (s)
  message = '';
  messageTimer = 0;
  walkPhase = 0;
  swing = 0;
  reducedMotion = false; // prefers-reduced-motion : ni secousse ni clignotement, peu de particules
  private acc = 0;
  private tick = 0;
  private placeCd = 0;
  private sinceHurt = 0;
  private regen = 0;
  onSfx: (n: SfxName) => void = () => {};

  constructor(seed: number, save: SaveData | null = null) {
    this.reset(seed, save);
  }

  reset(seed: number, save: SaveData | null = null): void {
    this.world = save ? loadWorld(save) : generateWorld(seed, WORLD_W, WORLD_H);
    this.light = new LightMap(this.world);
    const sp = this.world.spawn();
    this.player = createBody(save ? save.player.x : sp.x, save ? save.player.y : sp.y);
    this.hp = save ? Math.min(MAX_HP, Math.max(1, save.hp)) : MAX_HP;
    this.phase = save && Number.isFinite(save.phase) ? save.phase : START_PHASE;
    this.inv = new Inventory();
    if (save) this.inv.load(save.inv, save.sel);
    this.mining = null;
    this.deadTimer = 0;
    this.shake = 0;
    this.lowBlink = 0;
    this.particles.list.length = 0;
    this.light.dirty = true;
  }

  serialize(): SaveData {
    return {
      v: 2,
      seed: this.world.seed,
      edits: diffEdits(this.world),
      player: { x: this.player.x, y: this.player.y },
      hp: this.hp,
      inv: this.inv.serialize(),
      sel: this.inv.selected,
      phase: this.phase,
    };
  }

  say(text: string): void {
    this.message = text;
    this.messageTimer = 2.5;
  }

  update(dt: number): void {
    dt = Math.min(dt, 0.1);
    this.acc += dt;
    while (this.acc >= STEP) {
      this.acc -= STEP;
      this.step(STEP);
    }
    this.particles.update(dt);
    this.shake = Math.max(0, this.shake - dt);
    this.lowBlink = Math.max(0, this.lowBlink - dt);
    this.messageTimer = Math.max(0, this.messageTimer - dt);
    this.phase = advance(this.phase, dt);
    this.light.update();
  }

  private step(dt: number): void {
    if (this.deadTimer > 0) {
      this.deadTimer -= dt;
      if (this.deadTimer <= 0) this.respawn();
      return;
    }
    const c = this.controls;
    const p = this.player;
    const res = stepBody(this.world, p, { move: c.move, jump: c.jump }, dt);
    if (res.jumped) this.onSfx('jump');
    if (res.impact > 0) {
      const dmg = fallDamage(res.impact, FALL_SAFE_SPEED, FALL_DAMAGE_PER_SPEED);
      if (dmg > 0) {
        this.hurt(dmg);
        // éclat de la matière frappée, sous les pieds
        const fx = Math.floor(p.x);
        const fy = Math.floor(p.y + 0.01);
        if (this.world.get(fx, fy) !== B.AIR) this.burst(fx, fy - 1, this.world.get(fx, fy), 8);
      } else if (res.impact > 7) this.onSfx('land');
    }
    if (p.onGround && Math.abs(p.vx) > 0.3) this.walkPhase += Math.abs(p.vx) * dt * 1.7;
    else if (!p.onGround) this.walkPhase += dt * 4;
    if (p.y > this.world.h + 5) this.hurt(MAX_HP);

    this.sinceHurt += dt;
    if (this.sinceHurt > 6 && this.hp < MAX_HP) {
      this.regen += dt;
      if (this.regen >= 2) {
        this.regen = 0;
        this.hp = Math.min(MAX_HP, this.hp + 2);
      }
    }
    this.placeCd = Math.max(0, this.placeCd - dt);
    this.actions(dt);
  }

  private actions(dt: number): void {
    const c = this.controls;
    const aim = c.aim;
    if (c.mine && aim && inReach(this.player, aim.x, aim.y)) {
      this.swing += dt;
      const held = this.inv.current();
      const r = advanceMining(this.world, this.mining, aim.x, aim.y, dt * miningSpeed(held?.id, this.world.get(aim.x, aim.y)));
      this.mining = r.state;
      const id = this.world.get(aim.x, aim.y);
      if (r.broken) this.breakBlock(aim.x, aim.y);
      else if (r.state && ++this.tick % 14 === 0) {
        this.burst(aim.x, aim.y, id, 3);
        this.onSfx('mine');
      }
    } else {
      this.mining = null;
      this.swing = 0;
    }
    if (c.place && aim && this.placeCd === 0) {
      const slot = this.inv.current();
      if (slot && isPlaceable(slot.id) && canPlace(this.world, this.player, aim.x, aim.y)) {
        this.world.set(aim.x, aim.y, slot.id);
        this.inv.remove(this.inv.selected);
        this.light.dirty = true;
        this.placeCd = 0.18;
        this.onSfx('place');
      }
    }
  }

  private breakBlock(tx: number, ty: number): void {
    const id = this.world.get(tx, ty);
    const drop = dropFor(this.world.seed, tx, ty, id);
    if (drop && !this.inv.canAdd(drop)) {
      this.say('Sac plein.');
      this.onSfx('full');
      return;
    }
    this.world.set(tx, ty, B.AIR);
    this.light.dirty = true;
    if (drop) this.inv.add(drop);
    this.burst(tx, ty, id, 10);
    this.onSfx('break');
    this.wearTool(id);
  }

  /** Un bloc cassé avec l'outil de la bonne famille l'use d'un cran ; à zéro, il se brise avec un bruit sec et des éclats. */
  private wearTool(blockId: number): void {
    const i = this.inv.selected;
    const held = this.inv.current();
    if (!held || miningSpeed(held.id, blockId) === 1) return;
    if (!this.inv.wear(i)) return;
    const d = itemDef(held.id);
    const p = this.player;
    const n = this.reducedMotion ? 2 : 12;
    this.particles.burst(p.x + p.facing * 0.7, p.y - p.h * 0.6, d?.accent ?? '#7a5230', n);
    this.say(`${d?.name ?? 'Outil'} s'est brisé.`);
    this.onSfx('snap');
  }

  /** Fabrique une recette depuis la feuille ; renvoie le motif d'un refus, ou null si c'est fait. */
  craft(r: Recipe): string | null {
    if (r.bench && !benchNear(this.world, this.player.x, this.player.y)) return 'Il faut un Banc d\'artisan à portée.';
    if (!this.inv.craft(r)) return this.inv.clone().canCraft({ ...r, gives: [] }) ? 'Sac plein.' : 'Il manque des ingrédients.';
    this.onSfx('craft');
    return null;
  }

  recipes(): Recipe[] {
    return RECIPES;
  }

  private burst(tx: number, ty: number, id: number, n: number): void {
    const [r, g, b] = blockDef(id).speck;
    this.particles.burst(tx + 0.5, ty + 0.5, `rgb(${r},${g},${b})`, this.reducedMotion ? Math.ceil(n * 0.2) : n);
  }

  hurt(dmg: number): void {
    if (this.deadTimer > 0) return;
    const before = this.hp;
    this.hp = Math.max(0, this.hp - dmg);
    this.sinceHurt = 0;
    if (!this.reducedMotion) {
      this.shake = SHAKE_TIME;
      if (before >= LOW_HP && this.hp < LOW_HP && this.hp > 0) this.lowBlink = BLINK_TIME;
    }
    if (this.hp <= 0) {
      this.deadTimer = 2;
      this.onSfx('die');
    } else this.onSfx('hurt');
  }

  respawn(): void {
    const sp = this.world.spawn();
    this.player = createBody(sp.x, sp.y);
    while (overlaps(this.world, this.player) && this.player.y > 2) this.player.y -= 1;
    this.hp = MAX_HP;
    this.deadTimer = 0;
    this.sinceHurt = 0;
    this.mining = null;
    this.onSfx('respawn');
  }
}
