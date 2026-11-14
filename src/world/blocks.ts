export const B = {
  AIR: 0,
  MOSS: 1,
  HUMUS: 2,
  STONE: 3,
  COPPER: 4,
  IRON: 5,
  CRYSTAL: 6,
  BEDROCK: 7,
  LOG: 8, // Tronc
  LEAVES: 9, // Feuillage
  BENCH: 10, // Banc d'artisan
} as const;

export type ToolKind = 'pic' | 'cognee' | 'beche';

export interface BlockDef {
  id: number;
  name: string;
  hardness: number; // secondes de minage à mains nues
  drop: number; // bloc obtenu (0 = rien)
  solid: boolean;
  tool: ToolKind | null; // outil qui accélère ce bloc
  light: number; // émission 0..15
  base: [number, number, number]; // couleur de base de la texture procédurale
  speck: [number, number, number];
}

export const BLOCKS: BlockDef[] = [
  { id: B.AIR, name: 'Air', hardness: 0, drop: 0, solid: false, tool: null, light: 0, base: [0, 0, 0], speck: [0, 0, 0] },
  { id: B.MOSS, name: 'Mousse', hardness: 0.5, drop: B.HUMUS, solid: true, tool: 'beche', light: 0, base: [112, 84, 56], speck: [92, 66, 44] },
  { id: B.HUMUS, name: 'Humus', hardness: 0.5, drop: B.HUMUS, solid: true, tool: 'beche', light: 0, base: [112, 84, 56], speck: [92, 66, 44] },
  { id: B.STONE, name: 'Pierre', hardness: 1.6, drop: B.STONE, solid: true, tool: 'pic', light: 0, base: [122, 126, 134], speck: [96, 100, 110] },
  { id: B.COPPER, name: 'Cuivre', hardness: 2.4, drop: B.COPPER, solid: true, tool: 'pic', light: 0, base: [122, 126, 134], speck: [214, 128, 72] },
  { id: B.IRON, name: 'Fer', hardness: 3.2, drop: B.IRON, solid: true, tool: 'pic', light: 0, base: [122, 126, 134], speck: [196, 176, 160] },
  { id: B.CRYSTAL, name: 'Cristal', hardness: 3.8, drop: B.CRYSTAL, solid: true, tool: 'pic', light: 10, base: [96, 100, 118], speck: [120, 232, 224] },
  { id: B.BEDROCK, name: 'Socle', hardness: Infinity, drop: 0, solid: true, tool: null, light: 0, base: [52, 50, 58], speck: [38, 36, 44] },
  { id: B.LOG, name: 'Tronc', hardness: 1.2, drop: B.LOG, solid: false, tool: 'cognee', light: 0, base: [122, 84, 48], speck: [86, 56, 32] },
  { id: B.LEAVES, name: 'Feuillage', hardness: 0.3, drop: 0, solid: false, tool: 'cognee', light: 0, base: [64, 156, 74], speck: [40, 118, 58] },
  { id: B.BENCH, name: "Banc d'artisan", hardness: 1.2, drop: B.BENCH, solid: true, tool: 'cognee', light: 0, base: [150, 104, 60], speck: [96, 64, 36] },
];

export function blockDef(id: number): BlockDef {
  return BLOCKS[id] ?? BLOCKS[0];
}
export const isMineable = (id: number) => id !== B.AIR && Number.isFinite(blockDef(id).hardness);
export const isBlockId = (id: number) => Number.isInteger(id) && id >= 1 && id <= B.BENCH;
export const isPlaceable = (id: number) => isBlockId(id) && id !== B.BEDROCK && id !== B.MOSS && id !== B.LEAVES;
