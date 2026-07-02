export type Material = 'stone' | 'coal' | 'iron' | 'gold' | 'redstone' | 'diamond';
export type PickaxeType = 'wood' | 'stone' | 'iron' | 'gold' | 'redstone' | 'diamond';

export interface MiningItem {
  type: 'material' | 'pickaxe';
  material?: Material;
  pickaxeType?: PickaxeType;
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
    cost: { material: 'coal', count: 64, isSmelted: false },
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
    cost: { material: 'redstone', count: 256, isSmelted: false },
  },
  diamond: {
    canMine: ['stone', 'coal', 'iron', 'gold', 'redstone', 'diamond'],
    durability: 1562,
    speed: 3.5,
    cost: { material: 'diamond', count: 320, isSmelted: false },
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

export function getMaterialProbability(depth: number): Record<Material, number> {
  const d = Math.max(0, depth);

  // Rules:
  // 0-100: Stone + Coal
  // 101-500: Stone + Coal + Iron
  // 501-1000: Stone + Coal + Iron + Gold (low)
  // 1001-1101: Same + Redstone (low)
  // 1102+: All. Coal abundant, Iron yes, Gold less, Redstone much less, Diamond extremely rare.

  if (d <= 100) {
    return { stone: 85, coal: 15, iron: 0, gold: 0, redstone: 0, diamond: 0 };
  }
  if (d <= 500) {
    return { stone: 75, coal: 15, iron: 10, gold: 0, redstone: 0, diamond: 0 };
  }
  if (d <= 1000) {
    return { stone: 70, coal: 15, iron: 10, gold: 5, redstone: 0, diamond: 0 };
  }
  if (d <= 1101) {
    return { stone: 65, coal: 15, iron: 10, gold: 7, redstone: 3, diamond: 0 };
  }

  // 1102+
  return {
    stone: 55,
    coal: 20,
    iron: 15,
    gold: 6,
    redstone: 3,
    diamond: 1
  };
}

export function generateBlock(depth: number): Material {
  const probs = getMaterialProbability(depth);
  const total = Object.values(probs).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const [mat, prob] of Object.entries(probs)) {
    if (r < prob) return mat as Material;
    r -= prob;
  }
  return 'stone';
}

export function generateGrid(depth: number): Material[][] {
  const grid: Material[][] = [];
  for (let y = 0; y < 5; y++) {
    const row: Material[] = [];
    for (let x = 0; x < 5; x++) {
      row.push(generateBlock(depth + y));
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
  }
  const emptyIdx = nextInv.findIndex(s => s === null);
  if (emptyIdx !== -1) {
    nextInv[emptyIdx] = { ...item };
    return nextInv;
  }
  return nextInv;
}
