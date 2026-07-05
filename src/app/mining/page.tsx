'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Pickaxe,
  Flame,
  Trash2,
  ChevronDown,
  ArrowLeft,
  Coins,
  ShoppingCart,
  Zap,
  Clock,
  X,
  ArrowRight
} from 'lucide-react';
import {
  type MiningState,
  type MiningItem,
  type Material,
  type PickaxeType,
  loadMiningState,
  saveMiningState,
  PICKAXES,
  MATERIAL_COLORS,
  generateGrid,
  canMine,
  addToInventory,
  SMELTING_TIMES,
  MATERIAL_SELL_PRICE,
  INITIAL_MINING_STATE,
  TNT_COSTS
} from '@/lib/miningLogic';
import { loadBalance, saveBalance, formatBalance } from '@/lib/gameLogic';
import { translations, Language } from '@/lib/translations';

export default function MiningPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Language>('en');
  const [miningState, setMiningState] = useState<MiningState>(INITIAL_MINING_STATE);
  const [balance, setBalance] = useState(0);
  const [grid, setGrid] = useState<Material[][]>([]);
  const [minedBlocks, setMinedBlocks] = useState<boolean[][]>(Array(5).fill(null).map(() => Array(5).fill(false)));
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [isMining, setIsMining] = useState(false);
  const [creeperActive, setCreeperActive] = useState(false);
  const [creeperTaps, setCreeperTaps] = useState(0);
  const [creeperTimeLeft, setCreeperTimeLeft] = useState(10);
  const [showShop, setShowShop] = useState(false);
  const [showFurnace, setShowFurnace] = useState(false);
  const showShopRef = useRef(showShop);
  const showFurnaceRef = useRef(showFurnace);

  useEffect(() => { showShopRef.current = showShop; }, [showShop]);
  useEffect(() => { showFurnaceRef.current = showFurnace; }, [showFurnace]);

  const [shopPage, setShopPage] = useState(0);
  const [shopDirection, setShopDirection] = useState(0);
  const totalShopPages = 7;
  const [timeToFreePick, setTimeToFreePick] = useState<string | null>(null);

  const furnaceInterval = useRef<any>(null);
  const furnaceInputRef = useRef<HTMLDivElement>(null);
  const furnaceFuelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedLang = (localStorage.getItem('rtb-lang') as Language) || 'en';
    setLang(savedLang);
    const mState = loadMiningState();
    if (mState.firstTime) {
      mState.inventory[0] = { type: 'pickaxe', pickaxeType: 'wood', durability: PICKAXES.wood.durability };
      mState.grid = generateGrid(0, mState.unlockedPickaxes);
      mState.minedBlocks = Array(5).fill(null).map(() => Array(5).fill(false));
      mState.firstTime = false;
    }
    setMiningState(mState);
    setGrid(mState.grid || generateGrid(mState.depth, mState.unlockedPickaxes));
    setMinedBlocks(mState.minedBlocks || Array(5).fill(null).map(() => Array(5).fill(false)));
    setBalance(loadBalance());

    // Developer Cheat Hook
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('give_redstone')) {
      const amount = parseInt(urlParams.get('give_redstone') || '0');
      if (amount > 0) {
        setMiningState(prev => ({
          ...prev,
          inventory: addToInventory(prev.inventory, { type: 'material', material: 'redstone', count: amount, isSmelted: true })
        }));
        router.replace('/mining');
      }
    }

    // Back button handling
    const handlePopState = (e: PopStateEvent) => {
      if (showShopRef.current) {
        setShowShop(false);
      } else if (showFurnaceRef.current) {
        setShowFurnace(false);
      } else {
        router.push('/');
      }
    };

    window.history.pushState(null, '', window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [router]);

  useEffect(() => {
    if (showShop || showFurnace) {
      window.history.pushState(null, '', window.location.pathname);
    }
  }, [showShop, showFurnace]);

  useEffect(() => {
    if (miningState.firstTime === false) {
      saveMiningState({ ...miningState, grid, minedBlocks });
    }
  }, [miningState, grid, minedBlocks]);

  useEffect(() => {
    const checkFreeClaim = () => {
      const today = new Date().toDateString();
      if (miningState.lastFreeClaimDate === today) {
        const tomorrow = new Date();
        tomorrow.setHours(24, 0, 0, 0);
        const diff = tomorrow.getTime() - Date.now();
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeToFreePick(`${h}h ${m}m ${s}s`);
      } else {
        setTimeToFreePick(null);
      }
    };
    const timer = setInterval(checkFreeClaim, 1000);
    return () => clearInterval(timer);
  }, [miningState.lastFreeClaimDate]);

  useEffect(() => {
    furnaceInterval.current = setInterval(() => {
      setMiningState(prev => {
        const { furnace } = prev;
        if (!furnace.input || (furnace.remainingFuelTime <= 0 && !furnace.fuel)) {
          return { ...prev, furnace: { ...furnace, cookingStartTime: null } };
        }

        if (!furnace.cookingStartTime) {
          return {
            ...prev,
            furnace: {
              ...furnace,
              cookingStartTime: Date.now(),
              totalCookingTime: (SMELTING_TIMES[furnace.input.material!] || 30000) / 64
            }
          };
        }

        const now = Date.now();
        const elapsed = now - furnace.cookingStartTime;
        if (elapsed >= furnace.totalCookingTime) {
          let newRemainingFuel = furnace.remainingFuelTime;
          let newFuel = furnace.fuel ? { ...furnace.fuel } : null;

          if (newRemainingFuel <= 0) {
            if (!newFuel) return { ...prev, furnace: { ...furnace, cookingStartTime: null } };
            newFuel.count = (newFuel.count || 0) - 1;
            if (newFuel.count <= 0) newFuel = null;
            newRemainingFuel = 8;
          }

          newRemainingFuel -= 1;
          const newInput = { ...furnace.input };
          newInput.count = (newInput.count || 0) - 1;
          const newOutput = furnace.output
            ? { ...furnace.output, count: (furnace.output.count || 0) + 1 }
            : { type: 'material' as const, material: furnace.input.material, count: 1, isSmelted: true };

          return {
            ...prev,
            furnace: {
              ...furnace,
              input: newInput.count <= 0 ? null : newInput,
              fuel: newFuel,
              output: newOutput,
              remainingFuelTime: newRemainingFuel,
              cookingStartTime: newInput.count <= 0 ? null : Date.now()
            }
          };
        }
        return prev;
      });
    }, 500);
    return () => { if (furnaceInterval.current) clearInterval(furnaceInterval.current); };
  }, []);

  const t = translations[lang] || translations.en;
  const hasWoodPickaxe = miningState.inventory.some(s => s?.type === 'pickaxe' && s.pickaxeType === 'wood');

  const handleMineBlock = useCallback((x: number, y: number) => {
    if (isMining || creeperActive || minedBlocks[y][x]) return;
    let pickIdx = selectedSlot;
    let activeItem = pickIdx !== null ? miningState.inventory[pickIdx] : null;

    // TNT Logic
    if (activeItem?.type === 'tnt') {
      const layers = activeItem.tntLevel || 1;
      let finalInventory = [...miningState.inventory];

      // Consume TNT
      const nextTnt = { ...activeItem };
      nextTnt.count = (nextTnt.count || 0) - 1;
      finalInventory[pickIdx!] = nextTnt.count <= 0 ? null : nextTnt;
      if (nextTnt.count <= 0) setSelectedSlot(null);

      let currentDepth = miningState.depth;
      let currentGrid = grid;
      let currentMined = minedBlocks;

      for (let l = 0; l < layers; l++) {
        // Collect everything from current grid that isn't mined
        for (let ry = 0; ry < 5; ry++) {
          for (let rx = 0; rx < 5; rx++) {
            if (!currentMined[ry][rx]) {
              const mat = currentGrid[ry][rx];
              finalInventory = addToInventory(finalInventory, { type: 'material', material: mat, count: 1, isSmelted: mat === 'coal' });
            }
          }
        }
        // Advance
        currentDepth++;
        currentGrid = generateGrid(currentDepth, miningState.unlockedPickaxes);
        currentMined = Array(5).fill(null).map(() => Array(5).fill(false));
      }

      setGrid(currentGrid);
      setMinedBlocks(currentMined);
      setMiningState(prev => ({ ...prev, inventory: finalInventory, depth: currentDepth }));
      return;
    }

    let activePick = activeItem?.type === 'pickaxe' ? activeItem : null;
    if (!activePick || (activePick.durability || 0) <= 0) {
      pickIdx = miningState.inventory.findIndex(s => s?.type === 'pickaxe' && (s.durability || 0) > 0);
      if (pickIdx === -1) { alert(t.buyPickaxe); return; }
      setSelectedSlot(pickIdx);
      activePick = miningState.inventory[pickIdx] as any;
    }
    const material = grid[y][x];
    if (!canMine(activePick!.pickaxeType!, material)) return;
    setIsMining(true);
    const speed = PICKAXES[activePick!.pickaxeType!].speed;
    setTimeout(() => {
      const nextInv = [...miningState.inventory];
      const pick = { ...nextInv[pickIdx!]! };

      // Wood pickaxe is unbreakable
      if (pick.pickaxeType !== 'wood') {
        pick.durability = (pick.durability || 0) - 1;
        if (pick.durability <= 0) {
          nextInv[pickIdx!] = null;
          setSelectedSlot(null);
        } else {
          nextInv[pickIdx!] = pick;
        }
      }

      const updatedInv = addToInventory(nextInv, { type: 'material', material, count: 1, isSmelted: material === 'coal' });
      const newMined = minedBlocks.map((row, ry) => row.map((b, rx) => (ry === y && rx === x ? true : b)));
      setMinedBlocks(newMined);
      setMiningState(prev => ({ ...prev, inventory: updatedInv }));
      setIsMining(false);
      const isCleared = newMined.every(row => row.every(b => b));
      if (isCleared) {
        const nextDepth = miningState.depth + 1;
        const nextGrid = generateGrid(nextDepth, miningState.unlockedPickaxes);
        const nextMined = Array(5).fill(null).map(() => Array(5).fill(false));
        setGrid(nextGrid);
        setMinedBlocks(nextMined);
        setMiningState(prev => ({ ...prev, depth: nextDepth }));
        if (nextDepth > 50 && Math.random() < 0.02 + (nextDepth / 10000)) { triggerCreeper(); }
      }
    }, 400 / speed);
  }, [isMining, grid, miningState, selectedSlot, creeperActive, t, minedBlocks]);

  const triggerCreeper = () => {
    setCreeperActive(true); setCreeperTaps(0); setCreeperTimeLeft(10);
    const timer = setInterval(() => {
      setCreeperTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timer); explodeCreeper(); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const explodeCreeper = () => {
    const freshGrid = generateGrid(0, INITIAL_MINING_STATE.unlockedPickaxes);
    const freshMined = Array(5).fill(null).map(() => Array(5).fill(false));
    setGrid(freshGrid);
    setMinedBlocks(freshMined);
    setMiningState({
      ...INITIAL_MINING_STATE,
      lastDeathTime: Date.now(),
      grid: freshGrid,
      minedBlocks: freshMined
    });
    setCreeperActive(false);
    alert(t.boom);
  };

  const tapCreeper = () => {
    if (!creeperActive) return;
    const nextTaps = creeperTaps + 1;
    if (nextTaps >= 10) { setCreeperActive(false); }
    else { setCreeperTaps(nextTaps); }
  };

  const buyWoodPickaxe = (method: 'money' | 'free') => {
    if (method === 'money') {
      if (balance < 5) return;
      const newBal = balance - 5;
      setBalance(newBal); saveBalance(newBal);
      window.dispatchEvent(new CustomEvent('rtb-update-balance', { detail: newBal }));
    } else {
      if (timeToFreePick) return;
      const today = new Date().toDateString();
      setMiningState(prev => ({ ...prev, lastFreeClaimDate: today }));
    }
    const nextInv = [...miningState.inventory];
    const emptySlot = nextInv.findIndex(s => s === null);
    if (emptySlot === -1) { alert(t.full); return; }
    nextInv[emptySlot] = { type: 'pickaxe', pickaxeType: 'wood', durability: PICKAXES.wood.durability };
    setMiningState(prev => ({ ...prev, inventory: nextInv, lastDeathTime: null }));
    setShowShop(false);
  };

  const buyPickaxe = (type: PickaxeType) => {
    const config = PICKAXES[type];
    if (!config.cost) return;
    const { material, count, isSmelted } = config.cost;
    let totalFound = 0;
    miningState.inventory.forEach(item => { if (item?.type === 'material' && item.material === material && item.isSmelted === isSmelted) totalFound += item.count || 0; });
    if (totalFound < count) return;
    const nextInv = [...miningState.inventory];
    let remainingToRemove = count;
    for (let i = 0; i < nextInv.length; i++) {
      const item = nextInv[i];
      if (item?.type === 'material' && item.material === material && item.isSmelted === isSmelted) {
        const take = Math.min(remainingToRemove, item.count || 0);
        item.count = (item.count || 0) - take;
        if (item.count <= 0) nextInv[i] = null;
        remainingToRemove -= take;
        if (remainingToRemove <= 0) break;
      }
    }
    const emptySlot = nextInv.findIndex(s => s === null);
    if (emptySlot === -1) { alert(t.inventoryFull); return; }
    nextInv[emptySlot] = { type: 'pickaxe', pickaxeType: type, durability: config.durability };
    setMiningState(prev => ({ ...prev, inventory: nextInv, unlockedPickaxes: Array.from(new Set([...prev.unlockedPickaxes, type])) }));
  };

  const buyTNT = (level: number) => {
    const cost = TNT_COSTS[level];
    if (!cost) return;
    const { material, count, isSmelted } = cost;
    let totalFound = 0;
    miningState.inventory.forEach(item => { if (item?.type === 'material' && item.material === material && item.isSmelted === isSmelted) totalFound += item.count || 0; });
    if (totalFound < count) return;

    const nextInv = [...miningState.inventory];
    let remainingToRemove = count;
    for (let i = 0; i < nextInv.length; i++) {
      const item = nextInv[i];
      if (item?.type === 'material' && item.material === material && item.isSmelted === isSmelted) {
        const take = Math.min(remainingToRemove, item.count || 0);
        item.count = (item.count || 0) - take;
        if (item.count <= 0) nextInv[i] = null;
        remainingToRemove -= take;
        if (remainingToRemove <= 0) break;
      }
    }
    const updatedInv = addToInventory(nextInv, { type: 'tnt', tntLevel: level, count: 1 });
    setMiningState(prev => ({ ...prev, inventory: updatedInv }));
  };

  const addToFurnace = (slotIdx: number, slotType: 'input' | 'fuel') => {
    const item = miningState.inventory[slotIdx];
    if (!item || item.type !== 'material') return;

    if (slotType === 'fuel') {
      if (item.material !== 'coal') { alert(t.onlyCoalFuel); return; }
      const nextInv = [...miningState.inventory];
      const toAdd = { ...item };
      const currentFuel = miningState.furnace.fuel;
      if (currentFuel) {
        const canTake = 64 - (currentFuel.count || 0);
        const taking = Math.min(canTake, toAdd.count || 0);
        currentFuel.count = (currentFuel.count || 0) + taking;
        toAdd.count = (toAdd.count || 0) - taking;
        nextInv[slotIdx] = toAdd.count <= 0 ? null : toAdd;
        setMiningState(prev => ({ ...prev, inventory: nextInv, furnace: { ...prev.furnace, fuel: currentFuel } }));
      } else {
        nextInv[slotIdx] = null;
        setMiningState(prev => ({ ...prev, inventory: nextInv, furnace: { ...prev.furnace, fuel: toAdd } }));
      }
    } else {
      if (item.isSmelted || item.material === 'stone' || item.material === 'coal') { alert(t.notSmeltable); return; }
      if (miningState.furnace.input && miningState.furnace.input.material !== item.material) { alert(t.furnaceBusy); return; }
      const nextInv = [...miningState.inventory];
      const toAdd = { ...item };
      const currentInput = miningState.furnace.input;
      if (currentInput) {
        const canTake = 64 - (currentInput.count || 0);
        const taking = Math.min(canTake, toAdd.count || 0);
        currentInput.count = (currentInput.count || 0) + taking;
        toAdd.count = (toAdd.count || 0) - taking;
        nextInv[slotIdx] = toAdd.count <= 0 ? null : toAdd;
        setMiningState(prev => ({ ...prev, inventory: nextInv, furnace: { ...prev.furnace, input: currentInput } }));
      } else {
        nextInv[slotIdx] = null;
        setMiningState(prev => ({ ...prev, inventory: nextInv, furnace: { ...prev.furnace, input: toAdd } }));
      }
    }
  };

  const collectFurnace = () => {
    if (!miningState.furnace.output) return;
    const nextInv = addToInventory(miningState.inventory, miningState.furnace.output);
    setMiningState(prev => ({ ...prev, inventory: nextInv, furnace: { ...prev.furnace, output: null } }));
  };

  const removeFromFurnace = (slotType: 'input' | 'fuel') => {
    const item = miningState.furnace[slotType];
    if (!item) return;
    const nextInv = addToInventory(miningState.inventory, item);
    setMiningState(prev => ({
      ...prev,
      inventory: nextInv,
      furnace: {
        ...prev.furnace,
        [slotType]: null,
        cookingStartTime: slotType === 'input' ? null : prev.furnace.cookingStartTime
      }
    }));
  };

  const sellItem = (slotIdx: number) => {
    const item = miningState.inventory[slotIdx];
    if (!item || item.type !== 'material' || !item.isSmelted || item.material === 'coal') return;
    const price = MATERIAL_SELL_PRICE[item.material!] * (item.count || 0);
    const newBal = balance + price;
    setBalance(newBal); saveBalance(newBal);
    const nextInv = [...miningState.inventory]; nextInv[slotIdx] = null;
    setMiningState(prev => ({ ...prev, inventory: nextInv }));
    window.dispatchEvent(new CustomEvent('rtb-update-balance', { detail: newBal }));
  };

  const getInventoryMaterialCount = (material: Material, isSmelted: boolean) => {
    return miningState.inventory.reduce((total, item) => {
      if (item?.type === 'material' && item.material === material && item.isSmelted === isSmelted) {
        return total + (item.count || 0);
      }
      return total;
    }, 0);
  };

  const swapSlots = (from: number, to: number) => {
    setMiningState(prev => {
      const nextInv = [...prev.inventory];
      const temp = nextInv[from];
      nextInv[from] = nextInv[to];
      nextInv[to] = temp;
      return { ...prev, inventory: nextInv };
    });
    if (selectedSlot === from) setSelectedSlot(to);
    else if (selectedSlot === to) setSelectedSlot(from);
  };

  const handleDragEnd = (event: any, info: any, slotIdx: number) => {
    const item = miningState.inventory[slotIdx];
    if (!item) return;

    const x = info.point.x;
    const y = info.point.y;

    if (showFurnace && item.type === 'material') {
      if (furnaceInputRef.current) {
        const rect = furnaceInputRef.current.getBoundingClientRect();
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
          addToFurnace(slotIdx, 'input');
          return;
        }
      }

      if (furnaceFuelRef.current) {
        const rect = furnaceFuelRef.current.getBoundingClientRect();
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
          addToFurnace(slotIdx, 'fuel');
          return;
        }
      }
    }

    // Swap items in inventory
    const elements = document.elementsFromPoint(x, y);
    const targetSlot = elements.find(el => el.hasAttribute('data-slot-index'));
    if (targetSlot) {
      const targetIdx = parseInt(targetSlot.getAttribute('data-slot-index') || '-1');
      if (targetIdx !== -1 && targetIdx !== slotIdx) {
        swapSlots(slotIdx, targetIdx);
        return;
      }
    }
  };

  const getBlockTexture = (mat: Material) => `/assets/mining/blocks/${mat}.png`;
  const getItemTexture = (item: MiningItem | Material, isSmelted: boolean = false) => {
    if (typeof item === 'string') return isSmelted ? `/assets/mining/items/${item}.png` : `/assets/mining/blocks/${item}.png`;
    if (item.type === 'tnt') return `/assets/mining/items/tnt/lvl${item.tntLevel}.png`;
    return item.isSmelted ? `/assets/mining/items/${item.material}.png` : `/assets/mining/blocks/${item.material}.png`;
  };

  const inventorySlotClass = (i: number) => `
    aspect-square border-2 flex items-center justify-center relative cursor-pointer transition-all duration-100
    w-full max-w-[38px] xs:max-w-[42px] md:max-w-[70px]
    ${selectedSlot === i ? 'border-white bg-white/20 scale-105 z-10' : 'border-[#373737] bg-[#8B8B8B]/10 hover:border-[#555555]'}
  `;

  return (
    <div className="fixed inset-0 felt-bg text-white flex flex-col select-none overflow-hidden h-[100dvh] w-full">
      {/* Background Image Layer */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <img
          src="/assets/mining/bg/background.png"
          alt="Mining Background"
          className="w-full h-full object-cover blur-[4px] opacity-80 scale-100"
          style={{ transformOrigin: 'center' }}
          onError={(e) => (e.currentTarget.style.display = 'none')}
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      <header className="w-full flex items-center justify-between px-4 py-2.5 bg-black/80 border-b border-blue-500/20 backdrop-blur-md z-50">
        <button onClick={() => router.push('/')} className="p-2 bg-slate-900/50 border border-slate-800 text-slate-400 rounded-xl active:scale-95 transition-all"><ArrowLeft size={20} /></button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] uppercase font-black tracking-[0.2em] text-blue-500/70">{t.mine}</span>
          <span className="text-lg font-black tracking-tighter text-orange-500 drop-shadow-[0_0_10px_rgba(249,115,22,0.5)]">{miningState.depth}m</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/40 rounded-lg font-bold text-sm text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.1)]">
          <span className="text-xs">$</span><span className="tabular-nums">{formatBalance(balance)}</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto pb-32 md:pb-48 pt-6">
        <section className="flex-shrink-0 relative aspect-square w-full max-w-sm md:max-w-md mx-auto bg-black/40 border-4 border-[#373737] grid grid-cols-5 grid-rows-5 gap-0 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
          {grid.map((row, y) => row.map((mat, x) => (
            <motion.div key={`${x}-${y}`} whileTap={{ scale: 0.95 }} onClick={() => handleMineBlock(x, y)} className={`relative cursor-pointer transition-all duration-300 ${minedBlocks[y][x] ? 'opacity-0 scale-50 pointer-events-none' : 'opacity-100 scale-100'}`} style={{ backgroundColor: MATERIAL_COLORS[mat] }}>
              <img src={getBlockTexture(mat)} alt={mat} className="absolute inset-0 w-full h-full object-cover pixel-art" onError={(e) => (e.currentTarget.style.display = 'none')} />
              {isMining && !minedBlocks[y][x] && <div className="absolute inset-0 bg-white/10 animate-pulse flex items-center justify-center"><Zap size={12} className="text-yellow-400" /></div>}
            </motion.div>
          )))}
        </section>

        <section className="flex gap-4 md:gap-20 justify-center items-center py-0.5 md:py-10">
          <button className="group relative active:scale-90 transition-all focus:outline-none" onClick={() => setShowFurnace(!showFurnace)} style={{ filter: 'drop-shadow(0 0 8px rgba(148, 163, 184, 0.6))' }}>
             <img src="/assets/mining/ui/furnace.png" className="w-6 h-6 md:w-32 md:h-32 object-contain pixel-art" onError={(e) => (e.currentTarget.style.display = 'none')} />
             {miningState.furnace.output && <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 md:w-8 md:h-8 bg-green-500 rounded-full animate-ping" />}
          </button>

          <button className="group relative active:scale-90 transition-all focus:outline-none" onClick={() => { if(selectedSlot !== null) { const item = miningState.inventory[selectedSlot!]; if(item && item.type === 'pickaxe' && !confirm(t.destroyConfirm)) return; const ni = [...miningState.inventory]; ni[selectedSlot!] = null; setMiningState(p => ({...p, inventory: ni})); setSelectedSlot(null); } }} style={{ filter: 'drop-shadow(0 0 8px rgba(249, 115, 22, 0.6))' }}>
             <img src="/assets/mining/ui/lava.png" className="w-6 h-6 md:w-32 md:h-32 object-contain pixel-art" onError={(e) => (e.currentTarget.style.display = 'none')} />
          </button>

          <button className="group relative active:scale-90 transition-all focus:outline-none" onClick={() => setShowShop(true)} style={{ filter: 'drop-shadow(0 0 8px rgba(168, 85, 247, 0.6))' }}>
             <img src="/assets/mining/ui/shop.png" className="w-6 h-6 md:w-32 md:h-32 object-contain pixel-art" onError={(e) => (e.currentTarget.style.display = 'none')} />
          </button>
        </section>

        <AnimatePresence>
          {showFurnace && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="w-full max-w-[150px] md:max-w-xl mx-auto flex flex-col items-center gap-0 py-0.5 md:py-14"
            >
              <div className="flex items-center gap-1 md:gap-20">
                <div className="flex flex-col gap-0.5 md:gap-14">
                  {/* Input Slot */}
                  <div
                    ref={furnaceInputRef}
                    className="w-5 h-5 md:w-32 md:h-32 bg-[#373737] border-2 border-[#1e1e1e] flex items-center justify-center relative cursor-pointer active:scale-95 transition-all shadow-inner"
                    onClick={() => removeFromFurnace('input')}
                  >
                    {miningState.furnace.input ? (
                      <div className="flex flex-col items-center">
                        <img src={getItemTexture(miningState.furnace.input.material!, false)} className="w-3 h-3 md:w-24 md:h-24 pixel-art" />
                        <span className="absolute bottom-0 right-0 text-[4px] md:text-lg font-black text-white drop-shadow-md">{miningState.furnace.input.count}</span>
                      </div>
                    ) : <span className="text-[4px] md:text-lg text-white/10 font-black uppercase tracking-tighter">{t.inputShort}</span>}
                  </div>

                  {/* Fuel Slot */}
                  <div
                    ref={furnaceFuelRef}
                    className="w-5 h-5 md:w-32 md:h-32 bg-[#373737] border-2 border-[#1e1e1e] flex items-center justify-center relative cursor-pointer active:scale-95 transition-all shadow-inner"
                    onClick={() => removeFromFurnace('fuel')}
                  >
                    {miningState.furnace.fuel ? (
                      <div className="flex flex-col items-center">
                        <img src={getItemTexture('coal', true)} className="w-3 h-3 md:w-24 md:h-24 pixel-art" />
                        <span className="absolute bottom-0 right-0 text-[4px] md:text-lg font-black text-white drop-shadow-md">{miningState.furnace.fuel.count}</span>
                      </div>
                    ) : (
                      <>
                        <Flame size={8} className="text-white/5 md:hidden" />
                        <Flame size={48} className="text-white/5 hidden md:block" />
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-center">
                   <ArrowRight size={10} className={miningState.furnace.cookingStartTime ? "text-orange-500 animate-pulse md:hidden" : "text-white/5 md:hidden"} />
                   <ArrowRight size={80} className={miningState.furnace.cookingStartTime ? "text-orange-500 animate-pulse hidden md:block" : "text-white/5 hidden md:block"} />
                </div>

                {/* Output Slot */}
                <div
                  className="w-8 h-8 md:w-40 md:h-40 bg-[#373737] border-2 border-[#1e1e1e] flex items-center justify-center relative cursor-pointer active:scale-95 transition-all shadow-inner"
                  onClick={collectFurnace}
                >
                  {miningState.furnace.output ? (
                    <div className="flex flex-col items-center">
                      <img src={getItemTexture(miningState.furnace.output.material!, true)} className="w-5 h-5 md:w-28 md:h-28 pixel-art" />
                      <span className="absolute bottom-0 right-0 text-[5px] md:text-xl font-black text-green-400 drop-shadow-md">{miningState.furnace.output.count}</span>
                    </div>
                  ) : <span className="text-[4px] md:text-lg text-white/10 font-black uppercase tracking-tighter">{t.outputShort}</span>}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="fixed bottom-0 left-0 right-0 z-[200] bg-[#0a0a0a] p-3 xs:p-4 border-t border-white/10">
          <section className="grid grid-cols-9 gap-1 xs:gap-1.5 w-full max-w-xl mx-auto justify-items-center">
            {miningState.inventory.map((item, i) => (
              <div
                key={`inv-slot-${i}`}
                data-slot-index={i}
                onClick={() => { if (item?.type === 'material' && item.isSmelted) sellItem(i); else setSelectedSlot(i); }}
                className={inventorySlotClass(i)}
              >
                {item?.type === 'pickaxe' && (
                  <motion.div
                    drag
                    dragSnapToOrigin
                    onDragEnd={(e, info) => handleDragEnd(e, info, i)}
                    className="flex items-center justify-center w-full h-full p-1 relative z-50 cursor-grab active:cursor-grabbing"
                    style={{ touchAction: 'none' }}
                  >
                    <Pickaxe
                      size={32}
                      className={item.pickaxeType === 'wood' ? 'text-orange-800' : item.pickaxeType === 'stone' ? 'text-slate-400' : item.pickaxeType === 'iron' ? 'text-slate-200' : item.pickaxeType === 'gold' ? 'text-yellow-400' : item.pickaxeType === 'redstone' ? 'text-red-500' : 'text-cyan-400'}
                    />
                    {item.pickaxeType !== 'wood' && (
                      <div className="absolute bottom-1 left-1.5 right-1.5 h-1 bg-black/40 rounded-none overflow-hidden pointer-events-none">
                        <div className="h-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.8)]" style={{ width: `${((item.durability || 0) / PICKAXES[item.pickaxeType!].durability) * 100}%` }} />
                      </div>
                    )}
                  </motion.div>
                )}
                {item?.type === 'tnt' && (
                  <motion.div
                    drag
                    dragSnapToOrigin
                    onDragEnd={(e, info) => handleDragEnd(e, info, i)}
                    className="w-full h-full flex items-center justify-center relative cursor-grab active:cursor-grabbing z-50"
                    style={{ touchAction: 'none' }}
                  >
                    <img
                      src={getItemTexture(item)}
                      className="w-full h-full object-contain pixel-art p-1.5 pointer-events-none"
                    />
                    <span className="absolute bottom-0.5 right-1 text-[10px] font-black tabular-nums text-white drop-shadow-md pointer-events-none">{item.count}</span>
                  </motion.div>
                )}
                {item?.type === 'material' && (
                  <motion.div
                    drag
                    dragSnapToOrigin
                    onDragEnd={(e, info) => handleDragEnd(e, info, i)}
                    className="w-full h-full flex items-center justify-center relative cursor-grab active:cursor-grabbing z-50"
                    style={{ touchAction: 'none' }}
                  >
                    <img
                      src={getItemTexture(item.material!, item.isSmelted || false)}
                      className="w-full h-full object-contain pixel-art p-1.5 pointer-events-none"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                    <span className="absolute bottom-0.5 right-1 text-[10px] font-black tabular-nums text-white drop-shadow-md pointer-events-none">{item.count}</span>
                    {item.isSmelted && item.material !== 'coal' && <Zap size={10} className="absolute top-1 right-1 text-yellow-400 fill-yellow-400 animate-pulse pointer-events-none" />}
                  </motion.div>
                )}
              </div>
            ))}
          </section>
        </footer>
      </main>

      <AnimatePresence>
        {showShop && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 h-[100dvh] z-[150] bg-black flex flex-col touch-none w-full"
          >
            {/* Custom Background per Page */}
            <div className="absolute inset-0 z-0 overflow-hidden h-full w-full">
               <motion.img
                 key={shopPage}
                 initial={{ scale: 1.1, opacity: 0 }}
                 animate={{ scale: 1, opacity: 0.7 }}
                 src={`/assets/mining/bg/shop${shopPage + 1}.png`}
                 className="w-full h-full object-cover"
                 onError={(e) => { e.currentTarget.src = '/assets/mining/bg/background.png'; }}
               />
               <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 h-full w-full" />
            </div>

            <header className="relative z-10 w-full flex items-center justify-end px-6 py-6">
              <button onClick={() => setShowShop(false)} className="p-3 bg-white/5 border border-white/10 rounded-2xl text-white/50 hover:text-white transition-all active:scale-90 shadow-2xl"><X size={28}/></button>
            </header>

            <motion.div
              className="flex-1 relative z-10 overflow-hidden flex flex-col"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={(e, info) => {
                if (info.offset.x < -100 && shopPage < totalShopPages - 1) setShopPage(p => p + 1);
                if (info.offset.x > 100) {
                   if (shopPage > 0) setShopPage(p => p - 1);
                   else setShowShop(false);
                }
              }}
            >
              <div className="flex-1 flex flex-col justify-center px-6 py-8">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={shopPage}
                    initial={{ x: 100, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -100, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="w-full max-w-md mx-auto"
                  >
                    {shopPage === 0 ? (
                      <div className="grid gap-3">
                        {/* Wood Pickaxe Offer */}
                        <div className="bg-white/[0.05] border-2 border-white/10 rounded-2xl p-3 flex items-center justify-between group transition-all shadow-xl backdrop-blur-md">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-black/40 border border-white/10 rounded-xl flex items-center justify-center relative overflow-hidden">
                               <Pickaxe size={24} className="text-orange-800" />
                            </div>
                            <div className="flex flex-col flex-1 justify-center">
                              <div className="font-black uppercase text-sm tracking-widest text-white">{t.woodPickaxe}</div>
                              <div className="text-[10px] text-white/40 font-bold mt-0.5 uppercase">
                                {timeToFreePick ? `${t.freeIn} ${timeToFreePick}` : t.freeClaim}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {!timeToFreePick && (
                              <button onClick={() => buyWoodPickaxe('free')} className="px-3 py-2 bg-green-600 text-white rounded-xl font-black flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-all">
                                <span className="text-[10px] uppercase">{t.free}</span>
                                <Zap size={14} className="fill-white" />
                              </button>
                            )}
                            <button onClick={() => buyWoodPickaxe('money')} className={`px-3 py-2 ${balance >= 5 ? 'bg-green-600' : 'bg-red-600'} text-white rounded-xl font-black flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-all`}>
                               <span className="text-sm">5</span>
                               <span className="text-lg leading-none">$</span>
                            </button>
                          </div>
                        </div>

                        {(['stone', 'iron', 'gold', 'redstone', 'diamond'] as PickaxeType[]).map(type => {
                          const config = PICKAXES[type];
                          const unlocked = miningState.unlockedPickaxes.includes(type);
                          const canAfford = config.cost ? getInventoryMaterialCount(config.cost.material, config.cost.isSmelted) >= config.cost.count : false;
                          return (
                            <div key={type} className="bg-white/[0.03] border-2 border-white/5 rounded-2xl p-3 flex items-center justify-between group hover:bg-white/[0.07] hover:border-blue-500/30 transition-all shadow-xl backdrop-blur-md">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-black/40 border border-white/10 rounded-xl flex items-center justify-center shadow-inner relative overflow-hidden">
                                   <Pickaxe size={24} className={type === 'stone' ? 'text-slate-400' : type === 'iron' ? 'text-slate-200' : type === 'gold' ? 'text-yellow-400' : type === 'redstone' ? 'text-red-500' : 'text-cyan-400'} />
                                   {unlocked && <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5 shadow-lg"><Zap size={8} className="text-black fill-black"/></div>}
                                </div>
                                <div className="flex flex-col flex-1 items-center justify-center">
                                  <div className="font-black uppercase text-sm tracking-widest text-white text-center w-full">{type}</div>
                                </div>
                              </div>
                              <button
                                onClick={() => buyPickaxe(type)}
                                className={`px-3 py-2 ${canAfford ? 'bg-green-600' : 'bg-red-600'} text-white rounded-xl font-black flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-all`}
                              >
                                <span className="text-sm">{config.cost?.count}</span>
                                <img
                                  src={getItemTexture(config.cost!.material, config.cost!.isSmelted)}
                                  className="w-5 h-5 object-contain pixel-art"
                                  alt={config.cost?.material}
                                />
                              </button>
                            </div>
                          );
                        })}
                        {/* Temporary Developer Button */}
                        <button
                          onClick={() => {
                            setMiningState(prev => ({
                              ...prev,
                              inventory: addToInventory(prev.inventory, { type: 'material', material: 'redstone', count: 10, isSmelted: true })
                            }));
                          }}
                          className="mt-2 py-1 bg-yellow-600/20 border border-yellow-600/40 text-yellow-500 rounded-xl font-black uppercase text-[8px] tracking-widest opacity-50 hover:opacity-100 transition-all"
                        >
                          DEBUG: +10 REDSTONE
                        </button>
                      </div>
                    ) : shopPage === 1 ? (
                      <div className="grid gap-3">
                        {[1, 2, 3, 4, 5].map(level => {
                          const cost = TNT_COSTS[level];
                          const canAfford = getInventoryMaterialCount(cost.material, cost.isSmelted) >= cost.count;
                          return (
                            <div key={level} className="bg-white/[0.03] border-2 border-white/5 rounded-2xl p-3 flex items-center justify-between group hover:bg-white/[0.07] hover:border-blue-500/30 transition-all shadow-xl backdrop-blur-md">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-black/40 border border-white/10 rounded-xl flex items-center justify-center shadow-inner relative overflow-hidden">
                                   <img src={`/assets/mining/items/tnt/lvl${level}.png`} className="w-8 h-8 object-contain pixel-art" onError={(e) => (e.currentTarget.src = '/assets/mining/ui/shop.png')} />
                                </div>
                                <div className="flex flex-col flex-1 items-center justify-center">
                                  <div className="font-black uppercase text-sm tracking-widest text-white text-center w-full">{t.tnt} {t.level} {level}</div>
                                </div>
                              </div>
                              <button
                                onClick={() => buyTNT(level)}
                                className={`px-3 py-2 ${canAfford ? 'bg-green-600' : 'bg-red-600'} text-white rounded-xl font-black flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-all`}
                              >
                                <span className="text-sm">{cost.count}</span>
                                <img
                                  src={getItemTexture(cost.material, cost.isSmelted)}
                                  className="w-5 h-5 object-contain pixel-art"
                                  alt={cost.material}
                                />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center">
                         <div className="w-32 h-32 bg-white/5 rounded-[2.5rem] flex items-center justify-center border border-white/10 mb-8">
                            <ShoppingCart size={54} className="text-white/20"/>
                         </div>
                         <h3 className="text-3xl font-black text-white/60 uppercase italic tracking-tighter">{t.underConstruction}</h3>
                         <p className="text-sm text-white/30 font-bold max-w-[260px] mt-3">{t.checkBackLater}</p>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Navigation Indicators */}
              <div className="flex justify-center gap-2 mb-8">
                 {Array.from({ length: totalShopPages }).map((_, i) => (
                   <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${shopPage === i ? 'bg-blue-500 w-10' : 'bg-white/10 w-4'}`} />
                 ))}
              </div>

              {/* Inventory in Shop */}
              <footer className="w-full bg-black/40 backdrop-blur-md p-6 xs:p-8 pt-4 border-t border-white/5">
                 <section className="grid grid-cols-9 gap-2 xs:gap-3 w-full max-w-xl mx-auto">
                    {miningState.inventory.map((item, i) => (
                      <div key={`shop-inv-${i}`} className={inventorySlotClass(i)}>
                        {item?.type === 'pickaxe' && (
                          <div className="flex items-center justify-center w-full h-full p-1 relative">
                            <Pickaxe
                              size={32}
                              className={item.pickaxeType === 'wood' ? 'text-orange-800' : item.pickaxeType === 'stone' ? 'text-slate-400' : item.pickaxeType === 'iron' ? 'text-slate-200' : item.pickaxeType === 'gold' ? 'text-yellow-400' : item.pickaxeType === 'redstone' ? 'text-red-500' : 'text-cyan-400'}
                            />
                          </div>
                        )}
                        {item?.type === 'tnt' && (
                          <div className="w-full h-full flex items-center justify-center relative">
                            <img src={getItemTexture(item)} className="w-full h-full object-contain pixel-art p-1.5" />
                            <span className="absolute bottom-0.5 right-1 text-[10px] font-black text-white drop-shadow-md">{item.count}</span>
                          </div>
                        )}
                        {item?.type === 'material' && (
                          <div className="w-full h-full flex items-center justify-center relative">
                            <img src={getItemTexture(item.material!, item.isSmelted || false)} className="w-full h-full object-contain pixel-art p-1.5" />
                            <span className="absolute bottom-0.5 right-1 text-[10px] font-black text-white drop-shadow-md">{item.count}</span>
                          </div>
                        )}
                      </div>
                    ))}
                 </section>
              </footer>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {creeperActive && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-green-950/90 backdrop-blur-2xl" onClick={tapCreeper}>
            <div className="text-5xl font-black text-white mb-12 animate-pulse text-center tracking-tighter">{t.creeperAlert}<br/><span className="text-8xl text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]">{creeperTimeLeft}s</span></div>
            <motion.div style={{ scale: 1 - (creeperTaps * 0.09) }} className="w-64 h-64 bg-[#3cbf3c] border-[12px] border-black flex flex-col p-8 justify-between relative shadow-[0_0_100px_rgba(60,191,60,0.3)]">
              <div className="flex justify-between"><div className="w-16 h-16 bg-black" /><div className="w-16 h-16 bg-black" /></div>
              <div className="flex flex-col items-center"><div className="w-12 h-16 bg-black" /><div className="w-32 h-16 bg-black flex justify-between"><div className="w-8 h-8 bg-black self-end" /><div className="w-8 h-8 bg-black self-end" /></div></div>
              <div className="absolute inset-0 flex items-center justify-center text-black font-black text-5xl pointer-events-none opacity-20">{creeperTaps}</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
