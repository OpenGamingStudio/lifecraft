export const B = {
  AIR: 0,
  MOSS: 1,
  HUMUS: 2,
  STONE: 3,
  COPPER: 4,
  IRON: 5,
  CRYSTAL: 6,
  BEDROCK: 7,
} as const;

export interface BlockDef {
  id: number;
  name: string;
  hardness: number; // secondes de minage à mains nues
  drop: number; // bloc obtenu (0 = rien)
  solid: boolean;
  light: number; // émission 0..15
  base: [number, number, number]; // couleur de base de la texture procédurale
  speck: [number, number, number];
}

export const BLOCKS: BlockDef[] = [
  { id: B.AIR, name: 'Air', hardness: 0, drop: 0, solid: false, light: 0, base: [0, 0, 0], speck: [0, 0, 0] },
  { id: B.MOSS, name: 'Mousse', hardness: 0.5, drop: B.HUMUS, solid: true, light: 0, base: [112, 84, 56], speck: [92, 66, 44] },
  { id: B.HUMUS, name: 'Humus', hardness: 0.5, drop: B.HUMUS, solid: true, light: 0, base: [112, 84, 56], speck: [92, 66, 44] },
  { id: B.STONE, name: 'Pierre', hardness: 1.6, drop: B.STONE, solid: true, light: 0, base: [122, 126, 134], speck: [96, 100, 110] },
  { id: B.COPPER, name: 'Cuivre', hardness: 2.4, drop: B.COPPER, solid: true, light: 0, base: [122, 126, 134], speck: [214, 128, 72] },
  { id: B.IRON, name: 'Fer', hardness: 3.2, drop: B.IRON, solid: true, light: 0, base: [122, 126, 134], speck: [196, 176, 160] },
  { id: B.CRYSTAL, name: 'Cristal', hardness: 3.8, drop: B.CRYSTAL, solid: true, light: 10, base: [96, 100, 118], speck: [120, 232, 224] },
  { id: B.BEDROCK, name: 'Socle', hardness: Infinity, drop: 0, solid: true, light: 0, base: [52, 50, 58], speck: [38, 36, 44] },
];

export function blockDef(id: number): BlockDef {
  return BLOCKS[id] ?? BLOCKS[0];
}
export const isMineable = (id: number) => id !== B.AIR && Number.isFinite(blockDef(id).hardness);
export const isPlaceable = (id: number) => id !== B.AIR && id !== B.BEDROCK && id !== B.MOSS;
