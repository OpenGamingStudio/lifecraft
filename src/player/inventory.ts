import { HOTBAR, STACK_MAX } from '../constants';
import { isPlaceable } from '../world/blocks';
import { isStorable, maxStack, toolOf, type Recipe } from '../items';

export interface Slot {
  id: number;
  count: number;
  dur?: number; // durabilité restante d'un outil
}

export class Inventory {
  slots: (Slot | null)[] = Array.from({ length: HOTBAR }, () => null);
  selected = 0;

  canAdd(id: number): boolean {
    const max = maxStack(id, STACK_MAX);
    return this.slots.some((s) => (s && s.id === id && s.count < max) || s === null);
  }

  /** Ajoute n éléments ; renvoie ce qui n'a pas pu être rangé. Un outil neuf a toute sa durabilité. */
  add(id: number, n = 1): number {
    const max = maxStack(id, STACK_MAX);
    for (const s of this.slots) {
      if (n > 0 && s && s.id === id && s.count < max) {
        const t = Math.min(n, max - s.count);
        s.count += t;
        n -= t;
      }
    }
    const dura = toolOf(id)?.dura;
    for (let i = 0; i < this.slots.length && n > 0; i++) {
      if (this.slots[i] === null) {
        const t = Math.min(n, max);
        this.slots[i] = dura ? { id, count: t, dur: dura } : { id, count: t };
        n -= t;
      }
    }
    return n;
  }

  /** Quantité d'un élément dans tout le sac. */
  count(id: number): number {
    let n = 0;
    for (const s of this.slots) if (s && s.id === id) n += s.count;
    return n;
  }

  /** Retire n éléments où qu'ils soient (en vidant les dernières cases d'abord) ; renvoie false si insuffisant. */
  take(id: number, n: number): boolean {
    if (this.count(id) < n) return false;
    for (let i = this.slots.length - 1; i >= 0 && n > 0; i--) {
      const s = this.slots[i];
      if (s && s.id === id) {
        const t = Math.min(n, s.count);
        s.count -= t;
        n -= t;
        if (s.count === 0) this.slots[i] = null;
      }
    }
    return true;
  }

  /** Vrai si le sac a de quoi payer la recette ET de la place pour le résultat (rien n'est modifié). */
  canCraft(r: Recipe): boolean {
    if (!r.needs.every(([id, n]) => this.count(id) >= n)) return false;
    const t = this.clone();
    for (const [id, n] of r.needs) t.take(id, n);
    return r.gives.every(([id, n]) => t.add(id, n) === 0);
  }

  /** Fabrique : retire les ingrédients, range le résultat. Tout ou rien. */
  craft(r: Recipe): boolean {
    if (!this.canCraft(r)) return false;
    for (const [id, n] of r.needs) this.take(id, n);
    for (const [id, n] of r.gives) this.add(id, n);
    return true;
  }

  clone(): Inventory {
    const c = new Inventory();
    c.slots = this.slots.map((s) => (s ? { ...s } : null));
    c.selected = this.selected;
    return c;
  }

  /** Retire un cran de durabilité de l'outil de la case ; renvoie true s'il se brise (la case est vidée). */
  wear(index: number): boolean {
    const s = this.slots[index];
    if (!s || s.dur === undefined) return false;
    s.dur -= 1;
    if (s.dur > 0) return false;
    this.slots[index] = null;
    return true;
  }

  /** Retire n éléments de la case ; renvoie false si insuffisant. */
  remove(index: number, n = 1): boolean {
    const s = this.slots[index];
    if (!s || s.count < n) return false;
    s.count -= n;
    if (s.count === 0) this.slots[index] = null;
    return true;
  }

  current(): Slot | null {
    return this.slots[this.selected];
  }

  select(i: number): void {
    this.selected = ((i % HOTBAR) + HOTBAR) % HOTBAR;
  }

  serialize(): ([number, number] | [number, number, number] | null)[] {
    return this.slots.map((s) => (s ? (s.dur !== undefined ? [s.id, s.count, s.dur] : [s.id, s.count]) : null));
  }

  load(data: unknown, selected: number): void {
    if (!Array.isArray(data)) return;
    const read = (d: unknown): Slot | null => {
      if (!Array.isArray(d) || !Number.isInteger(d[0]) || !isStorable(d[0], isPlaceable) || !Number.isFinite(d[1]) || d[1] < 1) return null;
      const t = toolOf(d[0]);
      if (!t) return { id: d[0], count: Math.min(STACK_MAX, d[1] | 0) };
      const dur = Number.isFinite(d[2]) ? Math.min(t.dura, Math.max(1, d[2] | 0)) : t.dura;
      return { id: d[0], count: 1, dur };
    };
    this.slots = Array.from({ length: HOTBAR }, (_, i) => read(data[i]));
    // sauvegarde d'une version à neuf cases : le contenu en trop rejoint une pile ou une case libre
    for (const d of data.slice(HOTBAR)) {
      const extra = read(d);
      if (extra) this.add(extra.id, extra.count);
    }
    this.select(Number.isInteger(selected) ? selected : 0);
  }
}
