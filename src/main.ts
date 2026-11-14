import './style.css';
import { Sfx } from './audio/sfx';
import { Game } from './game';
import { Input } from './input/input';
import { Renderer } from './render/renderer';
import { readSave, clearSave, writeSave } from './save';
import { BarScroll, barAt, drawHud, hotbarLayout, hudHeight, slotAt, type Insets } from './ui/hud';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const $ = (id: string) => document.getElementById(id)!;
const menu = $('menu');
const panel = $('menuPanel');
const menuBtn = $('menuBtn');
const touch = $('touch');
const safe = $('safe');
let inset: Insets = { top: 0, right: 0, bottom: 0, left: 0 };
const bar = new BarScroll(); // défilement de la barre réduite (écran étroit)

const renderer = new Renderer(canvas);
const sfx = new Sfx();
const saved = readSave();
const game = new Game(saved ? saved.seed : (Math.random() * 2 ** 31) | 0, saved);
game.onSfx = (n) => sfx.play(n);
const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
game.reducedMotion = calm.matches;
calm.addEventListener('change', () => (game.reducedMotion = calm.matches));
void document.fonts.load('600 14px Fredoka'); // le HUD est dessiné sur le canvas : ne pas attendre le DOM

let menuOpen = false;
function setMenu(open: boolean): void {
  menuOpen = open;
  if (open) {
    // la plaque sort du bouton Menu et y rentre : l'origine de son mouvement est le centre du bouton
    const b = menuBtn.getBoundingClientRect();
    panel.style.transformOrigin = `${b.left + b.width / 2 - panel.offsetLeft}px ${b.top + b.height / 2 - panel.offsetTop + menu.scrollTop}px`;
  }
  menu.classList.toggle('on', open);
  document.body.classList.toggle('pause', open); // commandes tactiles et bouton Menu rangés derrière la plaque
  armNew(false);
  if (open) {
    save();
    $('mResume').focus();
  }
}
function setMute(m: boolean): void {
  sfx.muted = m;
  $('mSound').textContent = m ? 'Son : coupé' : 'Son : activé';
}

const layout = () => hotbarLayout(renderer.w, renderer.h, renderer.uiScale, inset, bar.pos);
const input = new Input(
  canvas,
  {
    slotAt: (x, y) => slotAt(layout(), x * renderer.dpr, y * renderer.dpr),
    barAt: (x, y) => barAt(layout(), x * renderer.dpr, y * renderer.dpr),
    onBarDrag: (dx) => {
      const l = layout();
      bar.drag((-dx * renderer.dpr) / (l.size + l.gap), l.cols);
    },
    onBarDrop: () => bar.drop(),
    onSelect: (i) => game.inv.select(i),
    onGesture: () => sfx.unlock(),
    onMenu: () => setMenu(!menuOpen),
    onMute: () => setMute(!sfx.muted),
  },
  { stick: $('stick'), jump: $('bJump'), mode: $('bMode'), menu: menuBtn },
);

function resize(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.resize(window.innerWidth, window.innerHeight, dpr);
  // marges sûres (encoche, barre d'accueil) lues sur un élément témoin, en px canvas
  const cs = getComputedStyle(safe);
  const px = (v: string) => (parseFloat(v) || 0) * dpr;
  inset = { top: px(cs.paddingTop), right: px(cs.paddingRight), bottom: px(cs.paddingBottom), left: px(cs.paddingLeft) };
  // les commandes tactiles se posent au-dessus de la barre et de son étiquette
  document.documentElement.style.setProperty('--sol', `${Math.ceil(hudHeight(layout(), renderer.h, renderer.uiScale) / dpr)}px`);
  renderer.follow(game, 0);
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);
resize();
if (window.matchMedia('(pointer: coarse)').matches) touch.classList.add('on');

function save(): void {
  writeSave(game.serialize());
}
setInterval(() => {
  if (!menuOpen && game.deadTimer === 0) save();
}, 15000);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) save();
});
window.addEventListener('pagehide', save);

$('mResume').addEventListener('click', () => setMenu(false));
$('mSound').addEventListener('click', () => {
  sfx.unlock();
  setMute(!sfx.muted);
});
// « Nouveau monde » se confirme sur la plaque, par un second appui : pas de boîte de dialogue du navigateur
let newArmed = 0;
function armNew(on: boolean): void {
  clearTimeout(newArmed);
  newArmed = on ? window.setTimeout(() => armNew(false), 5000) : 0;
  $('mNew').textContent = on ? 'Ce monde sera perdu. Confirmer.' : 'Nouveau monde';
  $('mNew').classList.toggle('alerte', on);
}
$('mNew').addEventListener('click', () => {
  if (!newArmed) return armNew(true);
  clearSave();
  game.reset((Math.random() * 2 ** 31) | 0);
  renderer.follow(game, 0);
  setMenu(false);
});
menu.addEventListener('pointerdown', (e) => e.stopPropagation());

const g2 = canvas.getContext('2d')!;
let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (input.touchUi) touch.classList.add('on');
  const l = layout();
  if (game.inv.selected !== input.sel) bar.reveal(game.inv.selected, l.cols); // case choisie au clavier ou à la molette
  bar.update(dt, l.cols, game.reducedMotion);
  input.sel = game.inv.selected;
  if (!menuOpen) {
    input.read(game.controls);
    const hv = input.hover;
    game.controls.aim = hv ? renderer.screenToTile(hv.x * renderer.dpr, hv.y * renderer.dpr) : null;
    game.update(dt);
  }
  renderer.follow(game, menuOpen ? 0.0001 : dt);
  renderer.render(game);
  drawHud(g2, game, renderer.w, renderer.h, renderer.uiScale, renderer.atlas, { muted: sfx.muted, inset, first: bar.pos, pressed: input.pressed });
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// accès aux fins de débogage / tests de bout en bout
if (import.meta.env.DEV) (window as unknown as { __lifecraft: unknown }).__lifecraft = { game, renderer, bar };
