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
  INITIAL_MINING_STATE
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

  const handleMineBlock = useCallback((x: number, y: number) => {
    if (isMining || creeperActive || minedBlocks[y][x]) return;
    let pickIdx = selectedSlot;
    let activePick = pickIdx !== null ? miningState.inventory[pickIdx] : null;
    if (!activePick || activePick.type !== 'pickaxe' || (activePick.durability || 0) <= 0) {
      pickIdx = miningState.inventory.findIndex(s => s?.type === 'pickaxe' && (s.durability || 0) > 0);
      if (pickIdx === -1) { alert(t.buyPickaxe); return; }
      setSelectedSlot(pickIdx);
      activePick = miningState.inventory[pickIdx];
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
    alert('BOOM!');
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
    if (emptySlot === -1) { alert('Full'); return; }
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
    if (totalFound < count) { alert(`Need ${count} ${material}${isSmelted ? ' (smelted)' : ''}`); return; }
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
    if (emptySlot === -1) { alert('Inventory full'); return; }
    nextInv[emptySlot] = { type: 'pickaxe', pickaxeType: type, durability: config.durability };
    setMiningState(prev => ({ ...prev, inventory: nextInv, unlockedPickaxes: Array.from(new Set([...prev.unlockedPickaxes, type])) }));
    setShowShop(false);
  };

  const addToFurnace = (slotIdx: number, slotType: 'input' | 'fuel') => {
    const item = miningState.inventory[slotIdx];
    if (!item || item.type !== 'material') return;

    if (slotType === 'fuel') {
      if (item.material !== 'coal') { alert('Only coal allowed as fuel'); return; }
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
      if (item.isSmelted || item.material === 'stone' || item.material === 'coal') { alert('Not smeltable'); return; }
      if (miningState.furnace.input && miningState.furnace.input.material !== item.material) { alert('Furnace busy'); return; }
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

  const handleDragEnd = (event: any, info: any, slotIdx: number) => {
    if (!showFurnace) return;
    const item = miningState.inventory[slotIdx];
    if (!item || item.type !== 'material') return;

    const x = info.point.x;
    const y = info.point.y;

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
  };

  const getBlockTexture = (mat: Material) => `/assets/mining/blocks/${mat}.png`;
  const getItemTexture = (mat: Material, isSmelted: boolean) => isSmelted ? `/assets/mining/items/${mat}.png` : `/assets/mining/blocks/${mat}.png`;

  const inventorySlotClass = (i: number) => `
    aspect-square border-2 flex items-center justify-center relative cursor-pointer transition-all duration-100
    w-[42px] h-[42px] sm:w-[54px] sm:h-[54px]
    ${selectedSlot === i ? 'border-white bg-white/20 scale-105 z-10' : 'border-[#373737] bg-[#8B8B8B]/10 hover:border-[#555555]'}
  `;

  return (
    <div className="min-h-screen felt-bg text-white flex flex-col select-none overflow-hidden relative">
      {/* Background Image Layer */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <img
          src="/assets/mining/bg/background.png"
          alt="Mining Background"
          className="w-full h-full object-cover blur-[4px] opacity-80 scale-100"
          style={{ transformOrigin: 'center' }}
          onError={(e) => (e.currentTarget.style.display = 'none')}
        />
        <div className="absolute inset-0 bg-black/20" />
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

      <main className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto pb-28 pt-6">
        <section className="relative aspect-square w-full max-w-sm mx-auto bg-black/40 border-4 border-[#373737] grid grid-cols-5 grid-rows-5 gap-0 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
          {grid.map((row, y) => row.map((mat, x) => (
            <motion.div key={`${x}-${y}`} whileTap={{ scale: 0.95 }} onClick={() => handleMineBlock(x, y)} className={`relative cursor-pointer transition-all duration-300 ${minedBlocks[y][x] ? 'opacity-0 scale-50 pointer-events-none' : 'opacity-100 scale-100'}`} style={{ backgroundColor: MATERIAL_COLORS[mat] }}>
              <img src={getBlockTexture(mat)} alt={mat} className="absolute inset-0 w-full h-full object-cover pixel-art" onError={(e) => (e.currentTarget.style.display = 'none')} />
              {isMining && !minedBlocks[y][x] && <div className="absolute inset-0 bg-white/10 animate-pulse flex items-center justify-center"><Zap size={12} className="text-yellow-400" /></div>}
            </motion.div>
          )))}
        </section>

        <section className="flex gap-6 xs:gap-10 justify-center items-center py-2 xs:py-4">
          <button className="group relative active:scale-90 transition-all focus:outline-none" onClick={() => setShowFurnace(!showFurnace)} style={{ filter: 'drop-shadow(0 0 12px rgba(148, 163, 184, 0.6))' }}>
             <img src="/assets/mining/ui/furnace.png" className="w-12 h-12 xs:w-16 xs:h-16 object-contain pixel-art" onError={(e) => (e.currentTarget.style.display = 'none')} />
             {miningState.furnace.output && <div className="absolute -top-1 -right-1 w-3 h-3 xs:w-4 xs:h-4 bg-green-500 rounded-full animate-ping" />}
          </button>

          <button className="group relative active:scale-90 transition-all focus:outline-none" onClick={() => { if(selectedSlot !== null) { const item = miningState.inventory[selectedSlot!]; if(item && item.type === 'pickaxe' && !confirm('Destroy?')) return; const ni = [...miningState.inventory]; ni[selectedSlot!] = null; setMiningState(p => ({...p, inventory: ni})); setSelectedSlot(null); } }} style={{ filter: 'drop-shadow(0 0 12px rgba(249, 115, 22, 0.6))' }}>
             <img src="/assets/mining/ui/lava.png" className="w-12 h-12 xs:w-16 xs:h-16 object-contain pixel-art" onError={(e) => (e.currentTarget.style.display = 'none')} />
          </button>

          <button className="group relative active:scale-90 transition-all focus:outline-none" onClick={() => setShowShop(true)} style={{ filter: 'drop-shadow(0 0 12px rgba(168, 85, 247, 0.6))' }}>
             <img src="/assets/mining/ui/shop.png" className="w-12 h-12 xs:w-16 xs:h-16 object-contain pixel-art" onError={(e) => (e.currentTarget.style.display = 'none')} />
          </button>
        </section>

        <AnimatePresence>
          {showFurnace && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="w-full max-w-[280px] xs:max-w-sm mx-auto flex flex-col items-center gap-4 xs:gap-6 py-4 xs:py-6"
            >
              <div className="flex items-center gap-4 xs:gap-8">
                <div className="flex flex-col gap-4 xs:gap-6">
                  {/* Input Slot */}
                  <div
                    ref={furnaceInputRef}
                    className="w-12 h-12 xs:w-16 xs:h-16 bg-[#373737] border-4 border-[#1e1e1e] flex items-center justify-center relative cursor-pointer active:scale-95 transition-all shadow-inner"
                    onClick={() => removeFromFurnace('input')}
                  >
                    {miningState.furnace.input ? (
                      <div className="flex flex-col items-center">
                        <img src={getItemTexture(miningState.furnace.input.material!, false)} className="w-8 h-8 xs:w-10 xs:h-10 pixel-art" />
                        <span className="absolute bottom-1 right-1 text-[8px] xs:text-[10px] font-black text-white drop-shadow-md">{miningState.furnace.input.count}</span>
                      </div>
                    ) : <span className="text-[8px] xs:text-[10px] text-white/10 font-black uppercase tracking-tighter">In</span>}
                  </div>

                  {/* Fuel Slot */}
                  <div
                    ref={furnaceFuelRef}
                    className="w-12 h-12 xs:w-16 xs:h-16 bg-[#373737] border-4 border-[#1e1e1e] flex items-center justify-center relative cursor-pointer active:scale-95 transition-all shadow-inner"
                    onClick={() => removeFromFurnace('fuel')}
                  >
                    {miningState.furnace.fuel ? (
                      <div className="flex flex-col items-center">
                        <img src={getItemTexture('coal', true)} className="w-8 h-8 xs:w-10 xs:h-10 pixel-art" />
                        <span className="absolute bottom-1 right-1 text-[8px] xs:text-[10px] font-black text-white drop-shadow-md">{miningState.furnace.fuel.count}</span>
                      </div>
                    ) : (
                      <>
                        <Flame size={20} className="text-white/5 xs:hidden" />
                        <Flame size={24} className="text-white/5 hidden xs:block" />
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-center">
                   <ArrowRight size={32} className={miningState.furnace.cookingStartTime ? "text-orange-500 animate-pulse xs:hidden" : "text-white/5 xs:hidden"} />
                   <ArrowRight size={40} className={miningState.furnace.cookingStartTime ? "text-orange-500 animate-pulse hidden xs:block" : "text-white/5 hidden xs:block"} />
                </div>

                {/* Output Slot */}
                <div
                  className="w-16 h-16 xs:w-20 xs:h-20 bg-[#373737] border-4 border-[#1e1e1e] flex items-center justify-center relative cursor-pointer active:scale-95 transition-all shadow-inner"
                  onClick={collectFurnace}
                >
                  {miningState.furnace.output ? (
                    <div className="flex flex-col items-center">
                      <img src={getItemTexture(miningState.furnace.output.material!, true)} className="w-10 h-10 xs:w-12 xs:h-12 pixel-art" />
                      <span className="absolute bottom-1 right-1 text-[10px] xs:text-xs font-black text-green-400 drop-shadow-md">{miningState.furnace.output.count}</span>
                    </div>
                  ) : <span className="text-[8px] xs:text-[10px] text-white/10 font-black uppercase tracking-tighter">Out</span>}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="fixed bottom-0 left-0 right-0 z-[200] bg-black/80 backdrop-blur-md p-6 xs:p-8 pt-4 border-t border-white/5">
          <section className="grid grid-cols-9 gap-2 xs:gap-3 w-full max-w-xl mx-auto">
            {miningState.inventory.map((item, i) => (
              <motion.div
                key={`inv-slot-${i}`}
                drag={item?.type === 'material'}
                dragSnapToOrigin
                onDragEnd={(e, info) => handleDragEnd(e, info, i)}
                onClick={() => { if (item?.type === 'material' && item.isSmelted) sellItem(i); else setSelectedSlot(i); }}
                className={inventorySlotClass(i)}
                style={{ touchAction: 'none' }}
              >
                {item?.type === 'pickaxe' && (
                  <div className="flex flex-col items-center w-full h-full p-1.5 pointer-events-none">
                    <Pickaxe size={22} className={item.pickaxeType === 'wood' ? 'text-orange-800' : item.pickaxeType === 'stone' ? 'text-slate-400' : item.pickaxeType === 'iron' ? 'text-slate-200' : item.pickaxeType === 'gold' ? 'text-yellow-400' : item.pickaxeType === 'redstone' ? 'text-red-500' : 'text-cyan-400'} />
                    {item.pickaxeType !== 'wood' && (
                      <div className="absolute bottom-1.5 left-1.5 right-1.5 h-1 bg-black/60 rounded-none overflow-hidden">
                        <div className="h-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.8)]" style={{ width: `${((item.durability || 0) / PICKAXES[item.pickaxeType!].durability) * 100}%` }} />
                      </div>
                    )}
                  </div>
                )}
                {item?.type === 'material' && (
                  <div className="flex flex-col items-center pointer-events-none">
                    <div className="w-6 h-6 relative overflow-hidden">
                       <img src={getItemTexture(item.material!, item.isSmelted || false)} className="absolute inset-0 w-full h-full object-cover pixel-art" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    </div>
                    <span className="text-[10px] font-black mt-1 tabular-nums text-slate-200">{item.count}</span>
                    {item.isSmelted && item.material !== 'coal' && <Zap size={8} className="absolute top-1 right-1 text-yellow-400 fill-yellow-400 animate-pulse" />}
                  </div>
                )}
              </motion.div>
            ))}
          </section>
        </footer>
      </main>

      {/* Shop Modal with 7 Pages and Swiping */}
      <AnimatePresence>
        {showShop && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black flex flex-col touch-none"
          >
            {/* Custom Background per Page */}
            <div className="absolute inset-0 z-0 overflow-hidden">
               <motion.img
                 key={shopPage}
                 initial={{ scale: 1.1, opacity: 0 }}
                 animate={{ scale: 1, opacity: 0.7 }}
                 src={`/assets/mining/bg/shop${shopPage + 1}.png`}
                 className="w-full h-full object-cover"
                 onError={(e) => { e.currentTarget.src = '/assets/mining/bg/background.png'; }}
               />
               <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
            </div>

            <header className="relative z-10 w-full flex items-center justify-between px-6 py-6">
              <div className="flex flex-col">
                <h2 className="text-3xl font-black uppercase italic tracking-tighter text-blue-500 leading-none drop-shadow-glow-blue">Blacksmith</h2>
              </div>
              <button onClick={() => setShowShop(false)} className="p-3 bg-white/5 border border-white/10 rounded-2xl text-white/50 hover:text-white transition-all active:scale-90 shadow-2xl"><X size={28}/></button>
            </header>

            <motion.div
              className="flex-1 relative z-10 overflow-hidden flex flex-col"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={(e, info) => {
                if (info.offset.x < -100 && shopPage < totalShopPages - 1) {
                  setShopDirection(1);
                  setShopPage(p => p + 1);
                }
                if (info.offset.x > 100) {
                   if (shopPage > 0) {
                     setShopDirection(-1);
                     setShopPage(p => p - 1);
                   }
                   else setShowShop(false);
                }
              }}
            >
              <div className="flex-1 relative flex flex-col justify-center px-6 py-8">
                <AnimatePresence initial={false} custom={shopDirection}>
                  <motion.div
                    key={shopPage}
                    custom={shopDirection}
                    variants={{
                      enter: (direction: number) => ({ x: direction > 0 ? 500 : -500, opacity: 0 }),
                      center: { zIndex: 1, x: 0, opacity: 1 },
                      exit: (direction: number) => ({ zIndex: 0, x: direction < 0 ? 500 : -500, opacity: 0 })
                    }}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                      x: { type: "spring", stiffness: 300, damping: 30 },
                      opacity: { duration: 0.2 }
                    }}
                    className="absolute inset-x-6 flex flex-col items-center"
                  >
                    {shopPage === 0 ? (
                      <div className="grid gap-4 w-full max-w-md">
                        {(['stone', 'iron', 'gold', 'redstone', 'diamond'] as PickaxeType[]).map(type => {
                          const config = PICKAXES[type];
                          const unlocked = miningState.unlockedPickaxes.includes(type);
                          return (
                            <div key={type} className="bg-white/[0.03] border-2 border-white/5 rounded-3xl p-4 flex items-center justify-between group hover:bg-white/[0.07] hover:border-blue-500/30 transition-all shadow-2xl backdrop-blur-md">
                              <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-black/40 border border-white/10 rounded-2xl flex items-center justify-center shadow-inner relative overflow-hidden">
                                   <Pickaxe size={32} className={type === 'stone' ? 'text-slate-400' : type === 'iron' ? 'text-slate-200' : type === 'gold' ? 'text-yellow-400' : type === 'redstone' ? 'text-red-500' : 'text-cyan-400'} />
                                   {unlocked && <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-1 shadow-lg"><Zap size={10} className="text-black fill-black"/></div>}
                                </div>
                                <div className="flex flex-col">
                                  <div className="font-black uppercase text-base tracking-widest text-white">{type}</div>
                                  <div className="text-[10px] text-white/40 font-bold mt-1 uppercase flex items-center gap-2">
                                    <span className="text-blue-400/80">{config.cost?.count} {config.cost?.material}</span>
                                    {config.cost?.isSmelted && <span className="bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded-md text-[8px]">SMELTED</span>}
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => buyPickaxe(type)}
                                className={`px-6 py-3 rounded-2xl font-black uppercase text-xs transition-all ${unlocked ? 'bg-white/10 text-white/40' : 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:scale-105 active:scale-95'}`}
                              >
                                {unlocked ? 'OWNED' : 'BUY'}
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
                         <h3 className="text-3xl font-black text-white/60 uppercase italic tracking-tighter">Under Construction</h3>
                         <p className="text-sm text-white/30 font-bold max-w-[260px] mt-3">Check back later for more exotic items and trade routes.</p>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Navigation Indicators */}
              <div className="flex justify-center gap-2 mb-32">
                 {Array.from({ length: totalShopPages }).map((_, i) => (
                   <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${shopPage === i ? 'bg-blue-500 w-10' : 'bg-white/10 w-4'}`} />
                 ))}
              </div>
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
