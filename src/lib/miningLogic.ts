export type Material = 'stone' | 'coal' | 'iron' | 'gold' | 'redstone' | 'diamond';
export type PickaxeType = 'wood' | 'stone' | 'iron' | 'gold' | 'redstone' | 'diamond';
export type ItemType = 'material' | 'pickaxe' | 'tnt';

export interface MiningItem {
  type: ItemType;
  material?: Material;
  pickaxeType?: PickaxeType;
  tntLevel?: number;
  count?: number;
  durability?: number;
  isSmelted?: boolean;
}

export interface FurnaceState {
  input: MiningItem | null;
  fuel: MiningItem | null;
  output: MiningItem | null;
  remainingFuelTime: number;
  cookingStartTime: number | null;
  totalCookingTime: number;
}

export interface MiningState {
  depth: number;
  inventory: (MiningItem | null)[];
  furnace: FurnaceState;
  unlockedPickaxes: PickaxeType[];
  firstTime: boolean;
  lastDeathTime: number | null;
  lastFreeClaimDate: string | null;
  grid: Material[][] | null;
  minedBlocks: boolean[][] | null;
}

export const PICKAXES: Record<PickaxeType, {
  canMine: Material[],
  durability: number,
  speed: number,
  cost: { material: Material, count: number, isSmelted: boolean } | null
}> = {
  wood: {
    canMine: ['stone', 'coal'],
    durability: 60,
    speed: 1,
    cost: null,
  },
  stone: {
    canMine: ['stone', 'coal', 'iron'],
    durability: 132,
    speed: 1.5,
    cost: { material: 'coal', count: 64, isSmelted: true },
  },
  iron: {
    canMine: ['stone', 'coal', 'iron', 'gold'],
    durability: 251,
    speed: 2,
    cost: { material: 'iron', count: 128, isSmelted: true },
  },
  gold: {
    canMine: ['stone', 'coal', 'iron', 'gold', 'redstone'],
    durability: 32,
    speed: 4,
    cost: { material: 'gold', count: 192, isSmelted: true },
  },
  redstone: {
    canMine: ['stone', 'coal', 'iron', 'gold', 'redstone', 'diamond'],
    durability: 500,
    speed: 2.5,
    cost: { material: 'redstone', count: 256, isSmelted: true },
  },
  diamond: {
    canMine: ['stone', 'coal', 'iron', 'gold', 'redstone', 'diamond'],
    durability: 1562,
    speed: 3.5,
    cost: { material: 'diamond', count: 320, isSmelted: true },
  },
};

export const MATERIAL_COLORS: Record<Material, string> = {
  stone: '#78716c',
  coal: '#1c1917',
  iron: '#d6d3d1',
  gold: '#fbbf24',
  redstone: '#ef4444',
  diamond: '#22d3ee',
};

export const MATERIAL_SELL_PRICE: Record<Material, number> = {
  stone: 1,
  coal: 2,
  iron: 10,
  gold: 50,
  redstone: 20,
  diamond: 500,
};

export const TNT_COSTS: Record<number, { material: Material, count: number, isSmelted: boolean }> = {
  1: { material: 'redstone', count: 10, isSmelted: true },
  2: { material: 'redstone', count: 20, isSmelted: true },
  3: { material: 'redstone', count: 30, isSmelted: true },
  4: { material: 'redstone', count: 40, isSmelted: true },
  5: { material: 'redstone', count: 50, isSmelted: true },
};

export const SMELTING_TIMES: Partial<Record<Material, number>> = {
  iron: 60000,    // 1 min
  gold: 120000,   // 2 min
  redstone: 180000, // 3 min
  diamond: 300000,  // 5 min
};

export const INITIAL_MINING_STATE: MiningState = {
  depth: 0,
  inventory: Array(9).fill(null),
  furnace: {
    input: null,
    fuel: null,
    output: null,
    remainingFuelTime: 0,
    cookingStartTime: null,
    totalCookingTime: 0,
  },
  unlockedPickaxes: ['wood'],
  firstTime: true,
  lastDeathTime: null,
  lastFreeClaimDate: null,
  grid: null,
  minedBlocks: null,
};

export function loadMiningState(): MiningState {
  if (typeof window === 'undefined') return INITIAL_MINING_STATE;
  const saved = localStorage.getItem('rtb-mining-state');
  if (!saved) return INITIAL_MINING_STATE;
  try {
    const parsed = JSON.parse(saved);
    return { ...INITIAL_MINING_STATE, ...parsed };
  } catch {
    return INITIAL_MINING_STATE;
  }
}

export function saveMiningState(state: MiningState) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('rtb-mining-state', JSON.stringify(state));
}

export function getMaterialProbability(depth: number, unlockedPickaxes: PickaxeType[] = ['wood']): Record<Material, number> {
  const d = Math.max(0, depth);
  const has = (type: PickaxeType) => unlockedPickaxes.includes(type);

  // Default probabilities
  const probs: Record<Material, number> = {
    stone: 80,
    coal: 20,
    iron: 0,
    gold: 0,
    redstone: 0,
    diamond: 0
  };

  if (has('stone')) {
    probs.iron = 12;
    probs.stone -= 6;
    probs.coal -= 6;
  }

  if (has('iron')) {
    probs.gold = 8;
    probs.stone -= 4;
    probs.iron -= 4;
  }

  if (has('gold')) {
    probs.redstone = 5;
    probs.stone -= 3;
    probs.gold -= 2;
  }

  if (has('redstone')) {
    // Diamonds are always rare, but scale slightly with depth
    probs.diamond = Math.min(5, 1 + d / 500);
    probs.stone -= probs.diamond;
  }

  // Ensure stone doesn't go below a reasonable floor
  probs.stone = Math.max(10, probs.stone);

  return probs;
}

export function generateBlock(depth: number, unlockedPickaxes: PickaxeType[]): Material {
  const probs = getMaterialProbability(depth, unlockedPickaxes);
  const total = Object.values(probs).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const [mat, prob] of Object.entries(probs)) {
    if (r < prob) return mat as Material;
    r -= prob;
  }
  return 'stone';
}

export function generateGrid(depth: number, unlockedPickaxes: PickaxeType[] = ['wood']): Material[][] {
  const grid: Material[][] = [];
  for (let y = 0; y < 5; y++) {
    const row: Material[] = [];
    for (let x = 0; x < 5; x++) {
      row.push(generateBlock(depth, unlockedPickaxes));
    }
    grid.push(row);
  }
  return grid;
}

export function canMine(pickaxe: PickaxeType, material: Material): boolean {
  return PICKAXES[pickaxe].canMine.includes(material);
}

export function addToInventory(inventory: (MiningItem | null)[], item: MiningItem): (MiningItem | null)[] {
  const nextInv = [...inventory];
  if (item.type === 'material') {
    for (let i = 0; i < nextInv.length; i++) {
      const slot = nextInv[i];
      if (slot && slot.type === 'material' && slot.material === item.material && slot.isSmelted === item.isSmelted && (slot.count || 0) < 64) {
        const canAdd = 64 - (slot.count || 0);
        const toAdd = Math.min(canAdd, item.count || 0);
        slot.count = (slot.count || 0) + toAdd;
        item.count = (item.count || 0) - toAdd;
        if ((item.count || 0) <= 0) return nextInv;
      }
    }
  } else if (item.type === 'tnt') {
    for (let i = 0; i < nextInv.length; i++) {
      const slot = nextInv[i];
      if (slot && slot.type === 'tnt' && slot.tntLevel === item.tntLevel && (slot.count || 0) < 64) {
        const canAdd = 64 - (slot.count || 0);
        const toAdd = Math.min(canAdd, item.count || 0);
        slot.count = (slot.count || 0) + toAdd;
        item.count = (item.count || 0) - toAdd;
        if ((item.count || 0) <= 0) return nextInv;
      }
    }
  }
  const emptyIdx = nextInv.findIndex(s => s === null);
  if (emptyIdx !== -1) {
    nextInv[emptyIdx] = { ...item };
    return nextInv;
  }
  return nextInv;
}
