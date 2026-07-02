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
  const [timeToFreePick, setTimeToFreePick] = useState<string | null>(null);

  const furnaceInterval = useRef<any>(null);

  useEffect(() => {
    const savedLang = (localStorage.getItem('rtb-lang') as Language) || 'en';
    setLang(savedLang);
    const mState = loadMiningState();
    if (mState.firstTime) {
      mState.inventory[0] = { type: 'pickaxe', pickaxeType: 'wood', durability: PICKAXES.wood.durability };
      mState.firstTime = false;
    }
    setMiningState(mState);
    setGrid(generateGrid(mState.depth));
    setBalance(loadBalance());
  }, []);

  useEffect(() => {
    if (miningState.firstTime === false) {
      saveMiningState(miningState);
    }
  }, [miningState]);

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
      pick.durability = (pick.durability || 0) - 1;
      if (pick.durability <= 0) { nextInv[pickIdx!] = null; setSelectedSlot(null); }
      else { nextInv[pickIdx!] = pick; }
      const updatedInv = addToInventory(nextInv, { type: 'material', material, count: 1, isSmelted: material === 'coal' });
      const newMined = minedBlocks.map((row, ry) => row.map((b, rx) => (ry === y && rx === x ? true : b)));
      setMinedBlocks(newMined);
      setMiningState(prev => ({ ...prev, inventory: updatedInv }));
      setIsMining(false);
      const isCleared = newMined.every(row => row.every(b => b));
      if (isCleared) {
        const nextDepth = miningState.depth + 1;
        setMiningState(prev => ({ ...prev, depth: nextDepth }));
        setGrid(generateGrid(nextDepth));
        setMinedBlocks(Array(5).fill(null).map(() => Array(5).fill(false)));
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
    setMiningState({ ...INITIAL_MINING_STATE, lastDeathTime: Date.now() });
    setMinedBlocks(Array(5).fill(null).map(() => Array(5).fill(false)));
    setGrid(generateGrid(0));
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

  const getBlockTexture = (mat: Material) => `/assets/mining/blocks/${mat}.png`;
  const getItemTexture = (mat: Material, isSmelted: boolean) => isSmelted ? `/assets/mining/items/${mat}.png` : `/assets/mining/blocks/${mat}.png`;

  return (
    <div className="min-h-screen felt-bg text-white flex flex-col select-none overflow-hidden relative">
      <header className="w-full flex items-center justify-between px-4 py-2.5 bg-black/90 border-b border-blue-500/20 backdrop-blur-md z-50">
        <button onClick={() => router.push('/')} className="p-2 bg-slate-900/50 border border-slate-800 text-slate-400 rounded-xl active:scale-95 transition-all"><ArrowLeft size={20} /></button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] uppercase font-black tracking-[0.2em] text-blue-500/70">{t.mine}</span>
          <span className="text-lg font-black tracking-tighter text-orange-500 drop-shadow-[0_0_10px_rgba(249,115,22,0.5)]">{miningState.depth}m</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/40 rounded-lg font-bold text-sm text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.1)]">
          <span className="text-xs">$</span><span className="tabular-nums">{formatBalance(balance)}</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col p-4 gap-6 overflow-y-auto pb-28 pt-6">
        <section className="relative aspect-square w-full max-w-sm mx-auto bg-black/60 border-2 border-blue-500/30 rounded-2xl grid grid-cols-5 grid-rows-5 gap-1 p-2 shadow-[0_0_50px_rgba(59,130,246,0.15)] overflow-hidden">
          {grid.map((row, y) => row.map((mat, x) => (
            <motion.div key={`${x}-${y}`} whileTap={{ scale: 0.95 }} onClick={() => handleMineBlock(x, y)} className={`relative rounded-sm cursor-pointer transition-all duration-300 ${minedBlocks[y][x] ? 'opacity-0 scale-50 pointer-events-none' : 'opacity-100 scale-100'}`} style={{ backgroundColor: MATERIAL_COLORS[mat], boxShadow: 'inset -2px -2px 0 rgba(0,0,0,0.3), inset 2px 2px 0 rgba(255,255,255,0.1)' }}>
              <img src={getBlockTexture(mat)} alt={mat} className="absolute inset-0 w-full h-full object-cover opacity-80 pixel-art" onError={(e) => (e.currentTarget.style.display = 'none')} />
              {isMining && !minedBlocks[y][x] && <div className="absolute inset-0 bg-white/20 animate-pulse flex items-center justify-center"><Zap size={12} className="text-yellow-400" /></div>}
            </motion.div>
          )))}
        </section>

        <section className="flex gap-6 justify-center">
          <div className="flex flex-col items-center gap-2 group" onClick={() => setShowFurnace(true)}>
             <div className="w-16 h-16 bg-black/60 border border-blue-500/30 rounded-2xl flex flex-col items-center justify-center relative active:scale-95 transition-all shadow-lg hover:border-blue-500/60 overflow-hidden">
                <img src="/assets/mining/ui/furnace.png" className="absolute inset-0 w-full h-full object-cover opacity-40 pixel-art" onError={(e) => (e.currentTarget.style.display = 'none')} />
                <Flame className={miningState.furnace.cookingStartTime ? "text-orange-500 animate-pulse drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]" : "text-slate-600"} size={28} />
                {miningState.furnace.output && <div className="absolute top-1 right-1 w-3 h-3 bg-green-500 rounded-full animate-ping" />}
             </div>
             <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 group-hover:text-blue-400 transition-colors">{t.furnace}</span>
          </div>
          <div className="flex flex-col items-center gap-2 group" onClick={() => { if(selectedSlot !== null) { const item = miningState.inventory[selectedSlot!]; if(item && item.type === 'pickaxe' && !confirm('Destroy?')) return; const ni = [...miningState.inventory]; ni[selectedSlot!] = null; setMiningState(p => ({...p, inventory: ni})); setSelectedSlot(null); } }}>
             <div className="w-16 h-16 bg-black/60 border border-orange-500/30 rounded-2xl flex items-center justify-center relative active:scale-95 transition-all shadow-lg hover:border-orange-500/60 overflow-hidden">
                <img src="/assets/mining/ui/lava.png" className="absolute inset-0 w-full h-full object-cover opacity-40 pixel-art" onError={(e) => (e.currentTarget.style.display = 'none')} />
                <Trash2 className="text-orange-600 group-hover:text-orange-400 transition-colors" size={28} />
             </div>
             <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 group-hover:text-orange-500 transition-colors">LAVA</span>
          </div>
          <div className="flex flex-col items-center gap-2 group" onClick={() => setShowShop(true)}>
             <div className="w-16 h-16 bg-black/60 border border-blue-500/30 rounded-2xl flex items-center justify-center relative active:scale-95 transition-all shadow-lg hover:border-blue-500/60 overflow-hidden">
                <img src="/assets/mining/ui/shop.png" className="absolute inset-0 w-full h-full object-cover opacity-40 pixel-art" onError={(e) => (e.currentTarget.style.display = 'none')} />
                <ShoppingCart className="text-blue-500 group-hover:text-blue-400 transition-colors" size={28} />
             </div>
             <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 group-hover:text-blue-500 transition-colors">SHOP</span>
          </div>
        </section>

        <div className="mt-auto space-y-3">
          <div className="flex items-center justify-between px-1"><span className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-600">Inventory</span><span className="text-[10px] font-bold text-slate-700">9 SLOTS</span></div>
          <section className="grid grid-cols-9 gap-2 w-full max-w-md mx-auto">
            {miningState.inventory.map((item, i) => (
              <div key={`slot-${i}`} onClick={() => { if (item?.type === 'material' && item.isSmelted) sellItem(i); else setSelectedSlot(i); }} className={`aspect-square rounded-xl border-2 flex items-center justify-center relative cursor-pointer transition-all duration-200 ${selectedSlot === i ? 'border-blue-500 bg-blue-500/10 scale-110 shadow-[0_0_15px_rgba(59,130,246,0.3)] z-10' : 'border-slate-800 bg-black/40 hover:border-slate-700'}`}>
                {item?.type === 'pickaxe' && (
                  <div className="flex flex-col items-center w-full h-full p-1">
                    <Pickaxe size={18} className={item.pickaxeType === 'wood' ? 'text-orange-800' : item.pickaxeType === 'stone' ? 'text-slate-400' : item.pickaxeType === 'iron' ? 'text-slate-200' : item.pickaxeType === 'gold' ? 'text-yellow-400' : item.pickaxeType === 'redstone' ? 'text-red-500' : 'text-cyan-400'} />
                    <div className="absolute bottom-1.5 left-1.5 right-1.5 h-1 bg-black/60 rounded-full overflow-hidden"><div className="h-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.8)]" style={{ width: `${((item.durability || 0) / PICKAXES[item.pickaxeType!].durability) * 100}%` }} /></div>
                  </div>
                )}
                {item?.type === 'material' && (
                  <div className="flex flex-col items-center">
                    <div className="w-4 h-4 shadow-sm relative overflow-hidden" style={{ backgroundColor: MATERIAL_COLORS[item.material!] }}>
                       <img src={getItemTexture(item.material!, item.isSmelted || false)} className="absolute inset-0 w-full h-full object-cover opacity-80 pixel-art" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    </div>
                    <span className="text-[9px] font-black mt-1 tabular-nums text-slate-300">{item.count}</span>
                    {item.isSmelted && item.material !== 'coal' && <Zap size={8} className="absolute top-1 right-1 text-yellow-400 fill-yellow-400 animate-pulse" />}
                  </div>
                )}
              </div>
            ))}
          </section>
        </div>
      </main>

      {/* Furnace Modal - Minecraft Style */}
      <AnimatePresence>
        {showFurnace && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6">
            <div className="w-full max-w-sm bg-slate-900/60 border border-blue-500/20 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
              <img src="/assets/mining/ui/furnace_gui.png" className="absolute inset-0 w-full h-full object-contain opacity-20 pixel-art pointer-events-none" onError={(e) => (e.currentTarget.style.display = 'none')} />
              <button onClick={() => setShowFurnace(false)} className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white transition-colors z-10"><X size={20}/></button>
              <h2 className="text-xl font-black uppercase italic tracking-tighter text-blue-500 mb-8 text-center relative z-10">Furnace</h2>

              <div className="flex flex-col items-center gap-6 relative z-10">
                <div className="flex gap-10 items-center">
                  <div className="flex flex-col gap-6">
                    {/* Input Slot */}
                    <div className="w-16 h-16 bg-black/80 border-2 border-slate-700 rounded-lg flex items-center justify-center relative group">
                      {miningState.furnace.input ? (
                        <div className="flex flex-col items-center">
                          <img src={getItemTexture(miningState.furnace.input.material!, false)} className="w-8 h-8 pixel-art" />
                          <span className="text-[10px] font-black mt-1 text-slate-300">{miningState.furnace.input.count}</span>
                        </div>
                      ) : <span className="text-[8px] text-slate-800 uppercase font-black">Input</span>}
                    </div>
                    {/* Fuel Slot */}
                    <div className="w-16 h-16 bg-black/80 border-2 border-orange-900/40 rounded-lg flex items-center justify-center relative group">
                      {miningState.furnace.fuel ? (
                        <div className="flex flex-col items-center">
                          <img src={getItemTexture('coal', true)} className="w-8 h-8 pixel-art" />
                          <span className="text-[10px] font-black mt-1 text-orange-400">{miningState.furnace.fuel.count}</span>
                        </div>
                      ) : <Flame size={20} className="text-orange-900/30" />}
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-2">
                    <ArrowRight size={32} className={miningState.furnace.cookingStartTime ? "text-orange-500 animate-pulse" : "text-slate-800"} />
                  </div>

                  {/* Output Slot */}
                  <div className="w-20 h-20 bg-black/80 border-4 border-slate-700 rounded-xl flex items-center justify-center relative cursor-pointer active:scale-95 transition-all shadow-inner" onClick={collectFurnace}>
                    {miningState.furnace.output ? (
                      <div className="flex flex-col items-center">
                        <img src={getItemTexture(miningState.furnace.output.material!, true)} className="w-10 h-10 pixel-art" />
                        <span className="text-xs font-black mt-1 text-green-400">{miningState.furnace.output.count}</span>
                        <div className="absolute -top-3 -right-3 bg-green-500 text-[8px] px-2 py-1 rounded-full font-black text-black">COLLECT</div>
                      </div>
                    ) : <span className="text-[10px] text-slate-800 uppercase font-black">Result</span>}
                  </div>
                </div>

                <div className="w-full border-t border-slate-800 pt-4">
                  <div className="text-[9px] font-black uppercase text-slate-600 mb-3 tracking-widest text-center">Add from Inventory</div>
                  <div className="grid grid-cols-5 gap-2">
                    {miningState.inventory.map((item, i) => (item?.type === 'material' && (
                      <button key={i} onClick={() => addToFurnace(i, item.material === 'coal' ? 'fuel' : 'input')} className="aspect-square bg-black/40 border border-slate-800 rounded-lg flex flex-col items-center justify-center p-1 active:scale-90 transition-all hover:border-blue-500/30">
                        <img src={getItemTexture(item.material!, item.isSmelted || false)} className="w-4 h-4 pixel-art" />
                        <span className="text-[8px] font-bold mt-1 text-slate-400">{item.count}</span>
                      </button>
                    )))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shop Modal remains same layout but with pixel-art class on images if any */}
      <AnimatePresence>
        {showShop && (
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-xl flex flex-col p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-10 mt-4">
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-blue-500">Blacksmith</h2>
              <button onClick={() => setShowShop(false)} className="p-3 bg-slate-900 border border-slate-800 rounded-2xl text-slate-500 hover:text-white active:scale-95 transition-all"><X size={24}/></button>
            </div>
            <div className="grid gap-6 w-full max-w-md mx-auto pb-10">
              {miningState.inventory.every(s => s?.type !== 'pickaxe') && (
                <div className="bg-orange-500/5 border border-orange-500/20 rounded-3xl p-6 space-y-4 shadow-[0_0_30px_rgba(249,115,22,0.05)]">
                  <div className="flex items-center gap-3"><Zap size={20} className="text-orange-500" /><div className="text-lg font-black uppercase text-orange-500 tracking-tight">Pickaxe Required</div></div>
                  <div className="flex gap-3">
                    <button onClick={() => buyWoodPickaxe('money')} disabled={balance < 5} className="flex-1 py-4 bg-orange-600 rounded-2xl font-black text-xs text-white shadow-lg active:translate-y-1 transition-all disabled:opacity-30">BUY WOOD ($5)</button>
                    <button onClick={() => buyWoodPickaxe('free')} disabled={!!timeToFreePick} className="flex-1 py-4 bg-slate-800 rounded-2xl font-black text-xs text-slate-300 border border-slate-700 active:translate-y-1 transition-all disabled:opacity-30">
                      {timeToFreePick ? <div className="flex items-center gap-2 justify-center"><Clock size={14}/> {timeToFreePick}</div> : "FREE CLAIM"}
                    </button>
                  </div>
                </div>
              )}
              {(['stone', 'iron', 'gold', 'redstone', 'diamond'] as PickaxeType[]).map(type => {
                const config = PICKAXES[type];
                return (
                  <div key={type} className="bg-slate-900/40 border border-slate-800 rounded-3xl p-5 flex items-center justify-between group hover:border-blue-500/20 transition-all shadow-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-black/60 border border-slate-800 rounded-2xl flex items-center justify-center shadow-inner">
                         <Pickaxe size={24} className={type === 'stone' ? 'text-slate-400' : type === 'iron' ? 'text-slate-200' : type === 'gold' ? 'text-yellow-400' : type === 'redstone' ? 'text-red-500' : 'text-cyan-400'} />
                      </div>
                      <div><div className="font-black uppercase text-sm tracking-widest text-slate-200">{type} Pickaxe</div><div className="text-[10px] text-slate-500 font-bold mt-1 uppercase">COST: {config.cost?.count} {config.cost?.material}</div></div>
                    </div>
                    <button onClick={() => buyPickaxe(type)} className="px-6 py-3 bg-blue-600 rounded-2xl font-black uppercase text-xs text-white shadow-lg active:translate-y-1 transition-all">BUY</button>
                  </div>
                );
              })}
            </div>
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
