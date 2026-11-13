import { HOTBAR, STACK_MAX } from '../constants';
import { isPlaceable } from '../world/blocks';

export interface Slot {
  id: number;
  count: number;
}

export class Inventory {
  slots: (Slot | null)[] = Array.from({ length: HOTBAR }, () => null);
  selected = 0;

  canAdd(id: number): boolean {
    return this.slots.some((s) => (s && s.id === id && s.count < STACK_MAX) || s === null);
  }

  /** Ajoute n blocs ; renvoie ce qui n'a pas pu être rangé. */
  add(id: number, n = 1): number {
    for (const s of this.slots) {
      if (n > 0 && s && s.id === id && s.count < STACK_MAX) {
        const t = Math.min(n, STACK_MAX - s.count);
        s.count += t;
        n -= t;
      }
    }
    for (let i = 0; i < this.slots.length && n > 0; i++) {
      if (this.slots[i] === null) {
        const t = Math.min(n, STACK_MAX);
        this.slots[i] = { id, count: t };
        n -= t;
      }
    }
    return n;
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

  serialize(): ([number, number] | null)[] {
    return this.slots.map((s) => (s ? [s.id, s.count] : null));
  }

  load(data: unknown, selected: number): void {
    if (!Array.isArray(data)) return;
    this.slots = Array.from({ length: HOTBAR }, (_, i) => {
      const d = data[i];
      if (Array.isArray(d) && Number.isInteger(d[0]) && isPlaceable(d[0]) && Number.isFinite(d[1]) && d[1] >= 1) {
        return { id: d[0], count: Math.min(STACK_MAX, d[1] | 0) };
      }
      return null;
    });
    this.select(Number.isInteger(selected) ? selected : 0);
  }
}
