import { HOTBAR } from '../constants';
import type { Controls } from '../game';

export interface InputHooks {
  /** Renvoie l'index de la case de barre à ce point écran (px CSS), ou -1. */
  slotAt(x: number, y: number): number;
  /** Vrai si le point est sur la barre réduite (défilable). */
  barAt(x: number, y: number): boolean;
  /** La barre réduite glisse de `dx` px CSS sous le doigt, puis le doigt se lève. */
  onBarDrag(dx: number): void;
  onBarDrop(): void;
  onSelect(i: number): void;
  onGesture(): void;
  onMenu(): void;
  onMute(): void;
  /** La feuille Fabrication est ouverte : le monde ne reçoit plus les appuis. */
  sheetOpen(): boolean;
  onSheetTap(x: number, y: number): void;
  onSheetScroll(dy: number): void;
  onCraft(): void;
}

const dpr = () => Math.min(window.devicePixelRatio || 1, 2);

export const STICK_REACH = 38; // course du pommeau de la manette, en px CSS
const SLOP = 8; // en deçà, un doigt posé sur la barre est un appui, pas un défilement

/**
 * Manette tactile : position du pommeau (bornée à sa course) et commandes déduites. Marche au-delà de 30 %
 * de la course ; saut quand le pouce pousse vers le haut au-delà de 60 % : un seul doigt suffit à marcher et sauter.
 */
export function stickRead(dx: number, dy: number, reach = STICK_REACH): { x: number; y: number; move: -1 | 0 | 1; jump: boolean } {
  const d = Math.hypot(dx, dy);
  const k = d > reach ? reach / d : 1;
  const x = dx * k;
  const y = dy * k;
  return { x, y, move: x < -0.3 * reach ? -1 : x > 0.3 * reach ? 1 : 0, jump: y < -0.6 * reach };
}

/** Clavier, souris et tactile (manette et boutons à l'écran) vers un état de contrôle unique. */
export class Input {
  private keys = new Set<string>();
  private stickMove: -1 | 0 | 1 = 0;
  private stickJump = false;
  private touchJump = false;
  private pointer: { x: number; y: number; action: 'mine' | 'place' } | null = null;
  private pointerId = -1;
  // doigt posé sur la barre : 'fixed' = barre entière, 'tap' = barre réduite sans glisser, 'slide' = elle défile
  private bar: { id: number; x: number; slot: number; mode: 'fixed' | 'tap' | 'slide' } | null = null;
  private sheet: { id: number; y: number; startY: number; x: number; moved: boolean } | null = null;
  touchMode: 'mine' | 'place' = 'mine';
  touchUi = false;
  hover: { x: number; y: number } | null = null; // dernier point visé (px CSS)
  pressed = -1; // case de la barre sous le doigt ou la souris

  constructor(private canvas: HTMLCanvasElement, private hooks: InputHooks, buttons: Record<string, HTMLElement>) {
    window.addEventListener('keydown', (e) => this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.onKey(e, false));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.pointer = null;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('pointerdown', (e) => this.onDown(e));
    canvas.addEventListener('pointermove', (e) => this.onMove(e));
    canvas.addEventListener('pointerup', (e) => this.onUp(e));
    canvas.addEventListener('pointercancel', (e) => this.onUp(e));
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (this.hooks.sheetOpen()) this.hooks.onSheetScroll(e.deltaY * dpr());
      else this.hooks.onSelect(this.sel + (e.deltaY > 0 ? 1 : -1));
    }, { passive: false });
    this.stick(buttons.stick);
    this.hold(buttons.jump, (v) => (this.touchJump = v));
    buttons.mode.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.hooks.onGesture();
      this.touchMode = this.touchMode === 'mine' ? 'place' : 'mine';
      buttons.mode.textContent = this.touchMode === 'mine' ? 'Miner' : 'Poser';
      buttons.mode.dataset.mode = this.touchMode;
    });
    buttons.menu.addEventListener('pointerdown', (e) => { e.preventDefault(); this.hooks.onMenu(); });
    buttons.craft.addEventListener('pointerdown', (e) => { e.preventDefault(); this.hooks.onGesture(); this.hooks.onCraft(); });
  }

  sel = 0;

  private hold(el: HTMLElement, set: (v: boolean) => void): void {
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      this.hooks.onGesture();
      set(true);
      el.classList.add('down');
    });
    const up = () => {
      set(false);
      el.classList.remove('down');
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('lostpointercapture', up);
  }

  /** Manette : le pommeau suit le pouce (--jx, --jy lus par style.css) et revient au centre quand il se lève. */
  private stick(el: HTMLElement): void {
    let id = -1;
    const place = (e: PointerEvent | null) => {
      const r = el.getBoundingClientRect();
      const s = e ? stickRead(e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2) : stickRead(0, 0);
      this.stickMove = s.move;
      this.stickJump = s.jump;
      el.style.setProperty('--jx', `${s.x.toFixed(1)}px`);
      el.style.setProperty('--jy', `${s.y.toFixed(1)}px`);
    };
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (id !== -1) return;
      id = e.pointerId;
      el.setPointerCapture(id);
      this.hooks.onGesture();
      el.classList.add('down');
      place(e);
    });
    el.addEventListener('pointermove', (e) => {
      if (e.pointerId === id) place(e);
    });
    const up = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = -1;
      el.classList.remove('down');
      place(null);
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('lostpointercapture', up);
  }

  private onKey(e: KeyboardEvent, down: boolean): void {
    if (e.target instanceof HTMLInputElement) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (down) {
      this.hooks.onGesture();
      if (k >= '0' && k <= '9' && !e.ctrlKey && !e.metaKey) {
        const slot = k === '0' ? 9 : Number(k) - 1;
        if (slot < HOTBAR) this.hooks.onSelect(slot);
      }
      if (k === 'c' && !e.repeat && !e.ctrlKey && !e.metaKey) this.hooks.onCraft();
      if (k === 'Escape' && !e.repeat) this.hooks.onMenu();
      if (k === 'm' && !e.repeat) this.hooks.onMute();
    }
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', ' '].includes(k)) e.preventDefault();
    if (down) this.keys.add(k);
    else this.keys.delete(k);
  }

  private rel(e: PointerEvent): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private onDown(e: PointerEvent): void {
    this.hooks.onGesture();
    const p = this.rel(e);
    this.hover = p;
    if (e.pointerType === 'touch') this.touchUi = true;
    if (this.hooks.sheetOpen()) {
      // feuille ouverte : un appui sans glisser choisit une recette, un glissé vertical fait défiler
      if (!this.sheet) {
        this.sheet = { id: e.pointerId, y: p.y, startY: p.y, x: p.x, moved: false };
        this.canvas.setPointerCapture(e.pointerId);
      }
      return;
    }
    const slot = this.hooks.slotAt(p.x, p.y);
    const scrollable = this.hooks.barAt(p.x, p.y);
    if (slot >= 0 || scrollable) {
      if (this.bar) return;
      // barre entière : la case est choisie dès l'appui. Barre réduite : au lever du doigt, s'il n'a pas glissé.
      if (!scrollable) this.hooks.onSelect(slot);
      this.bar = { id: e.pointerId, x: p.x, slot, mode: scrollable ? 'tap' : 'fixed' };
      this.pressed = slot;
      this.canvas.setPointerCapture(e.pointerId);
      return;
    }
    if (this.pointerId !== -1) return;
    const action = e.pointerType === 'touch' ? this.touchMode : e.button === 2 ? 'place' : 'mine';
    this.pointerId = e.pointerId;
    this.pointer = { ...p, action };
    this.canvas.setPointerCapture(e.pointerId);
  }

  private onMove(e: PointerEvent): void {
    const p = this.rel(e);
    const sh = this.sheet;
    if (sh && e.pointerId === sh.id) {
      if (!sh.moved && Math.abs(p.y - sh.startY) >= SLOP) sh.moved = true;
      if (sh.moved) this.hooks.onSheetScroll(-(p.y - sh.y) * dpr());
      sh.y = p.y;
      return;
    }
    const b = this.bar;
    if (b && e.pointerId === b.id) {
      if (b.mode === 'tap' && Math.abs(p.x - b.x) >= SLOP) {
        b.mode = 'slide';
        b.x = p.x;
        this.pressed = -1;
      }
      if (b.mode === 'slide') {
        this.hooks.onBarDrag(p.x - b.x);
        b.x = p.x;
      }
      return;
    }
    if (e.pointerType !== 'touch') this.hover = p;
    if (this.pointer && e.pointerId === this.pointerId) {
      this.pointer.x = p.x;
      this.pointer.y = p.y;
      this.hover = p;
    }
  }

  private onUp(e: PointerEvent): void {
    const sh = this.sheet;
    if (sh && e.pointerId === sh.id) {
      if (!sh.moved && e.type === 'pointerup') this.hooks.onSheetTap(sh.x, sh.startY);
      this.sheet = null;
      return;
    }
    const b = this.bar;
    if (b && e.pointerId === b.id) {
      if (b.mode === 'tap' && b.slot >= 0 && e.type === 'pointerup') this.hooks.onSelect(b.slot);
      if (b.mode === 'slide') this.hooks.onBarDrop();
      this.bar = null;
      this.pressed = -1;
      if (e.pointerType === 'touch') this.hover = null;
      return;
    }
    if (e.pointerId !== this.pointerId) return;
    this.pointerId = -1;
    this.pointer = null;
    if (e.pointerType === 'touch') this.hover = null;
  }

  read(c: Controls): void {
    const left = this.keys.has('a') || this.keys.has('q') || this.keys.has('ArrowLeft') || this.stickMove < 0;
    const right = this.keys.has('d') || this.keys.has('ArrowRight') || this.stickMove > 0;
    c.move = left === right ? 0 : left ? -1 : 1;
    c.jump = this.keys.has('w') || this.keys.has('z') || this.keys.has('ArrowUp') || this.keys.has(' ') || this.touchJump || this.stickJump;
    const shut = this.hooks.sheetOpen();
    c.mine = !shut && this.pointer?.action === 'mine';
    c.place = !shut && this.pointer?.action === 'place';
  }
}
