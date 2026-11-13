import { HOTBAR } from '../constants';
import type { Controls } from '../game';

export interface InputHooks {
  /** Renvoie l'index de la case de barre à ce point écran (px CSS), ou -1. */
  slotAt(x: number, y: number): number;
  onSelect(i: number): void;
  onGesture(): void;
  onMenu(): void;
  onMute(): void;
}

/** Clavier, souris et tactile (boutons à l'écran) vers un état de contrôle unique. */
export class Input {
  private keys = new Set<string>();
  private touchLeft = false;
  private touchRight = false;
  private touchJump = false;
  private pointer: { x: number; y: number; action: 'mine' | 'place' } | null = null;
  private pointerId = -1;
  touchMode: 'mine' | 'place' = 'mine';
  touchUi = false;
  hover: { x: number; y: number } | null = null; // dernier point visé (px CSS)

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
    canvas.addEventListener('wheel', (e) => { e.preventDefault(); this.hooks.onSelect(this.sel + (e.deltaY > 0 ? 1 : -1)); }, { passive: false });
    this.hold(buttons.left, (v) => (this.touchLeft = v));
    this.hold(buttons.right, (v) => (this.touchRight = v));
    this.hold(buttons.jump, (v) => (this.touchJump = v));
    buttons.mode.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.hooks.onGesture();
      this.touchMode = this.touchMode === 'mine' ? 'place' : 'mine';
      buttons.mode.textContent = this.touchMode === 'mine' ? 'Miner' : 'Poser';
      buttons.mode.dataset.mode = this.touchMode;
    });
    buttons.menu.addEventListener('pointerdown', (e) => { e.preventDefault(); this.hooks.onMenu(); });
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

  private onKey(e: KeyboardEvent, down: boolean): void {
    if (e.target instanceof HTMLInputElement) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (down) {
      this.hooks.onGesture();
      if (k >= '1' && k <= String(HOTBAR)) this.hooks.onSelect(Number(k) - 1);
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
    const slot = this.hooks.slotAt(p.x, p.y);
    if (slot >= 0) {
      this.hooks.onSelect(slot);
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
    if (e.pointerType !== 'touch') this.hover = p;
    if (this.pointer && e.pointerId === this.pointerId) {
      this.pointer.x = p.x;
      this.pointer.y = p.y;
      this.hover = p;
    }
  }

  private onUp(e: PointerEvent): void {
    if (e.pointerId !== this.pointerId) return;
    this.pointerId = -1;
    this.pointer = null;
    if (e.pointerType === 'touch') this.hover = null;
  }

  read(c: Controls): void {
    const left = this.keys.has('a') || this.keys.has('q') || this.keys.has('ArrowLeft') || this.touchLeft;
    const right = this.keys.has('d') || this.keys.has('ArrowRight') || this.touchRight;
    c.move = left === right ? 0 : left ? -1 : 1;
    c.jump = this.keys.has('w') || this.keys.has('z') || this.keys.has('ArrowUp') || this.keys.has(' ') || this.touchJump;
    c.mine = this.pointer?.action === 'mine';
    c.place = this.pointer?.action === 'place';
  }
}
