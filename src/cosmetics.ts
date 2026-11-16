/** Garde-robe : cosmétiques ancrés sur le corps réel de l'explorateur (tête x ±3,5 / y -26..-19, torse y -18..-8). */
export type Slot = 'hat' | 'face' | 'back' | 'scarf';
export type Rarity = 'commun' | 'rare' | 'épique' | 'légendaire';

export interface Cosmetic {
  id: string;
  slot: Slot;
  name: string;
  rarity: Rarity;
  theme: string;
  hint: string;
}

export const COSMETICS: Cosmetic[] = [
  { id: 'hat-none', slot: 'hat', name: 'Tête nue', rarity: 'commun', theme: 'Simple', hint: 'Les cheveux au vent.' },
  { id: 'hat-cap', slot: 'hat', name: 'Casquette rouge', rarity: 'commun', theme: 'Rue', hint: 'Visière vers l\'avant.' },
  { id: 'hat-top', slot: 'hat', name: 'Haut-de-forme', rarity: 'rare', theme: 'Chic', hint: 'Très distingué dans une grotte.' },
  { id: 'hat-party', slot: 'hat', name: 'Chapeau de fête', rarity: 'commun', theme: 'Fête', hint: 'Il y a toujours une occasion.' },
  { id: 'hat-crown', slot: 'hat', name: 'Couronne', rarity: 'épique', theme: 'Royal', hint: 'Roi ou reine des mineurs.' },
  { id: 'hat-duck', slot: 'hat', name: 'Canard de bain', rarity: 'épique', theme: 'Rigolo', hint: 'Il couine à chaque pas (en silence).' },
  { id: 'hat-spring', slot: 'hat', name: 'Antenne à ressort', rarity: 'légendaire', theme: 'Rigolo', hint: 'Elle rebondit avec toi.' },
  { id: 'face-none', slot: 'face', name: 'Visage nu', rarity: 'commun', theme: 'Simple', hint: 'Rien devant les yeux.' },
  { id: 'face-shades', slot: 'face', name: 'Lunettes de soleil', rarity: 'commun', theme: 'Style', hint: 'Même sous terre.' },
  { id: 'face-stache', slot: 'face', name: 'Moustache', rarity: 'rare', theme: 'Chic', hint: 'Frisée, bien sûr.' },
  { id: 'face-nose', slot: 'face', name: 'Nez de clown', rarity: 'rare', theme: 'Rigolo', hint: 'Pouet.' },
  { id: 'back-none', slot: 'back', name: 'Dos libre', rarity: 'commun', theme: 'Simple', hint: 'Léger comme l\'air.' },
  { id: 'back-cape', slot: 'back', name: 'Cape de héros', rarity: 'rare', theme: 'Héros', hint: 'Elle flotte quand tu cours.' },
  { id: 'back-pack', slot: 'back', name: 'Sac de mineur', rarity: 'commun', theme: 'Aventure', hint: 'Avec une gourde.' },
  { id: 'back-wings', slot: 'back', name: 'Ailes de fée', rarity: 'légendaire', theme: 'Féerique', hint: 'Elles battent toutes seules.' },
  { id: 'scarf-miel', slot: 'scarf', name: 'Écharpe miel', rarity: 'commun', theme: 'Couleur', hint: 'Le classique.' },
  { id: 'scarf-braise', slot: 'scarf', name: 'Écharpe braise', rarity: 'commun', theme: 'Couleur', hint: 'Chaude comme un feu.' },
  { id: 'scarf-pousse', slot: 'scarf', name: 'Écharpe pousse', rarity: 'commun', theme: 'Couleur', hint: 'Verte comme une feuille.' },
  { id: 'scarf-ecume', slot: 'scarf', name: 'Écharpe écume', rarity: 'rare', theme: 'Couleur', hint: 'Fraîche comme la mer.' },
];

export const SLOTS: { slot: Slot; label: string }[] = [
  { slot: 'hat', label: 'Chapeau' },
  { slot: 'face', label: 'Visage' },
  { slot: 'back', label: 'Dos' },
  { slot: 'scarf', label: 'Écharpe' },
];

export type Outfit = Record<Slot, string>;
export const DEFAULT_OUTFIT: Outfit = { hat: 'hat-none', face: 'face-none', back: 'back-none', scarf: 'scarf-miel' };
export const SCARF_COLOR: Record<string, string> = {
  'scarf-miel': '#e6a52c',
  'scarf-braise': '#e8402a',
  'scarf-pousse': '#5fbf4a',
  'scarf-ecume': '#7fe3e0',
};
export const OUTFIT_KEY = 'lifecraft.outfit.v1';

export function sanitizeOutfit(o: unknown): Outfit {
  const out = { ...DEFAULT_OUTFIT };
  if (!o || typeof o !== 'object') return out;
  for (const s of SLOTS) {
    const id = (o as Record<string, unknown>)[s.slot];
    if (typeof id === 'string' && COSMETICS.some((c) => c.id === id && c.slot === s.slot)) out[s.slot] = id;
  }
  return out;
}

export function loadOutfit(): Outfit {
  try {
    return sanitizeOutfit(JSON.parse(localStorage.getItem(OUTFIT_KEY) ?? 'null'));
  } catch {
    return { ...DEFAULT_OUTFIT };
  }
}

export function saveOutfit(o: Outfit): void {
  try {
    localStorage.setItem(OUTFIT_KEY, JSON.stringify(o));
  } catch {
    /* stockage plein ou interdit : la tenue reste valable pour la session */
  }
}

/** Pose du corps transmise aux dessins : décalages en pixels de sprite, déjà mesurés sur le personnage. */
export interface Pose {
  t: number; // temps en secondes (animations d'attente)
  vy: number; // vitesse verticale (ressort, cape)
  run: number; // 0..1, vitesse de marche
  flap: number; // battement -1..1
}

type R = (x: number, y: number, w: number, h: number, c: string) => void;

export function drawHat(id: string, r: R, p: Pose): void {
  switch (id) {
    case 'hat-cap':
      r(-4, -28, 8, 3, '#e8402a');
      r(-4, -26, 8, 1, '#16110f');
      r(3, -26, 4.5, 1.5, '#b82f1d'); // visière
      r(-0.5, -28.8, 1, 1, '#ffc93c');
      break;
    case 'hat-top':
      r(-5, -26.8, 10, 1.4, '#16110f');
      r(-3.2, -33, 6.4, 6.4, '#16110f');
      r(-3.2, -29, 6.4, 1.4, '#e8402a');
      break;
    case 'hat-party':
      r(-3, -28, 6, 2, '#ffc93c');
      r(-2, -30, 4, 2, '#e8402a');
      r(-1, -32, 2, 2, '#00a6b4');
      r(-0.8, -33.5, 1.6, 1.6, '#ffffff');
      break;
    case 'hat-crown':
      r(-3.5, -28, 7, 2.4, '#ffc93c');
      r(-3.5, -30.2, 1.6, 2.4, '#ffc93c');
      r(-0.8, -30.8, 1.6, 2.8, '#ffc93c');
      r(1.9, -30.2, 1.6, 2.4, '#ffc93c');
      r(-0.5, -27.4, 1, 1, '#e8402a');
      break;
    case 'hat-duck': {
      const sq = Math.sin(p.t * 6) * 0.25;
      r(-3, -29.4 - sq, 6, 3.4, '#ffd23c');
      r(0, -32 - sq, 4, 3.2, '#ffd23c');
      r(3.8, -30.6 - sq, 2.4, 1.2, '#ff8a1f');
      r(2, -31 - sq, 0.9, 0.9, '#16110f');
      break;
    }
    case 'hat-spring': {
      const sway = Math.sin(p.t * 5) * 1.4 + Math.max(-2, Math.min(2, -p.vy * 0.15)) * 1.4;
      const segs = 4;
      for (let i = 0; i < segs; i++) {
        const k = (i + 1) / segs;
        r(-0.7 + sway * k * k, -26 - (i + 1) * 1.8, 1.4, 1, '#aeb6c2');
      }
      r(-1.6 + sway, -26 - segs * 1.8 - 2.6, 3.2, 3.2, '#e8402a');
      break;
    }
  }
}

export function drawFace(id: string, r: R): void {
  switch (id) {
    case 'face-shades':
      r(-0.2, -23.6, 4.3, 2, '#16110f');
      r(-3.5, -23.2, 4, 0.8, '#16110f');
      r(0.4, -23.2, 1.2, 0.7, '#7fe3e0');
      break;
    case 'face-stache':
      r(0.2, -20.8, 4, 1.3, '#5b3a29');
      r(3.6, -20.2, 1, 1, '#5b3a29');
      break;
    case 'face-nose':
      r(2.4, -22.2, 2.4, 2.4, '#e8402a');
      break;
  }
}

/** Dessiné derrière le corps. */
export function drawBack(id: string, r: R, p: Pose): void {
  switch (id) {
    case 'back-cape': {
      const lift = p.run * 3 + Math.max(0, -p.vy) * 0.2 + Math.sin(p.t * 4) * 0.4;
      r(-7 - lift, -18, 3.4 + lift, 1.6, '#e8402a');
      r(-7.5 - lift * 1.4, -16.4, 4 + lift * 1.4, 4.2, '#e8402a');
      r(-8 - lift * 1.8, -12.2, 4.6 + lift * 1.8, 2.4, '#b82f1d');
      break;
    }
    case 'back-pack':
      r(-8, -17.5, 4.4, 8, '#7a5230');
      r(-8, -17.5, 4.4, 2, '#a06a38');
      r(-7.6, -12, 1.6, 2.4, '#ffc93c');
      break;
    case 'back-wings': {
      const f = 0.6 + Math.abs(Math.sin(p.t * 9)) * 0.4;
      r(-4.2 - 4 * f, -22 - 2 * f, 4 * f, 3.4, '#b8f1f0');
      r(-4.2 - 5.5 * f, -19, 5.5 * f, 3.4, '#7fe3e0');
      r(-4.2 - 3.2 * f, -15.8, 3.2 * f, 2.2, '#b8f1f0');
      break;
    }
  }
}
