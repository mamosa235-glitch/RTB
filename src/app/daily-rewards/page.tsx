'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, PanInfo } from 'framer-motion';
import { ArrowLeftIcon, CheckCircle2Icon, LockIcon, TrophyIcon } from 'lucide-react';
import { DAILY_REWARDS, loadRewardState, claimDailyReward, getDayStatuses, getNextClaimDay, isMonthComplete, getDaysUntilNextMonth, type RewardState, type DayStatus,  } from '@/lib/dailyRewards';
import { loadBalance, saveBalance, formatBalance } from '@/lib/gameLogic';
import { translations, Language } from '@/lib/translations';

function CoinBurst({ active }: { active: boolean }) {
  const [particles, setParticles] = useState<any[]>([]);
  useEffect(() => {
    if (!active) return;
    const colors = ['#f59e0b', '#fcd34d', '#fbbf24', '#d97706', '#4ade80'];
    const newParticles = Array.from({ length: 14 }, (_, i) => ({
      id: i,
      vx: (Math.random() - 0.5) * 100,
      vy: -(Math.random() * 70 + 30),
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    setParticles(newParticles);
    const timer = setTimeout(() => setParticles([]), 1100);
    return () => clearTimeout(timer);
  }, [active]);
  if (!particles.length) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" aria-hidden>
      {particles.map((p) => (
        <div key={p.id} className="absolute w-2 h-2 rounded-full" style={{ left: '50%', top: '50%', backgroundColor: p.color, transform: `translate(${p.vx}px, ${p.vy}px)`, animation: `coinBurst 1s ease-out forwards`, animationDelay: `${p.id * 0.03}s` }} />
      ))}
    </div>
  );
}

function DayCard({ day, coins, status, isNextClaim, onClaim, isClaiming, t }: any) {
  const isClaimed = status === 'claimed';
  const isAvailable = status === 'available';
  const isLast = day === 14;
  return (
    <div className="relative flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-300" style={{ background: isClaimed ? 'rgba(59,130,246,0.08)' : isAvailable ? 'rgba(34,197,94,0.08)' : 'rgba(0,0,0,0.5)', borderColor: isClaimed ? 'rgba(59,130,246,0.3)' : isAvailable ? 'rgba(34,197,94,0.4)' : 'rgba(30,41,59,0.6)', transform: isAvailable ? 'scale(1.03)' : 'scale(1)', boxShadow: isAvailable ? '0 0 15px rgba(34,197,94,0.15)' : 'none' }}>
      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: isClaimed ? '#60a5fa' : isAvailable ? '#4ade80' : 'rgba(100,116,139,0.6)' }}>{t.dayLabel} {day}</span>
      <div className="flex items-center justify-center w-9 h-9 rounded-full" style={{ background: isClaimed ? 'rgba(59,130,246,0.15)' : isAvailable ? 'rgba(34,197,94,0.15)' : 'rgba(0,0,0,0.4)' }}>
        {isClaimed ? <CheckCircle2Icon size={18} style={{ color: '#60a5fa' }} /> : isAvailable && isLast ? <TrophyIcon size={18} style={{ color: '#4ade80' }} /> : isAvailable ? <span className="text-xl font-bold" style={{ color: '#4ade80' }}>$</span> : <LockIcon size={16} style={{ color: 'rgba(100,116,139,0.5)' }} />}
      </div>
      <span className="font-bold text-sm tabular-nums" style={{ color: isClaimed ? '#60a5fa' : isAvailable ? '#4ade80' : 'rgba(100,116,139,0.5)' }}>{coins}</span>
      {isAvailable && isNextClaim && <button onClick={onClaim} disabled={isClaiming} className="w-full py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-150 focus:outline-none disabled:opacity-50" style={{ background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.4)', color: '#4ade80' }}>{isClaiming ? '...' : t.claim}</button>}
      {isClaimed && <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(59,130,246,0.6)' }}>✓ {t.done}</span>}
    </div>
  );
}

export default function DailyRewardsPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Language>('en');
  const [rewardState, setRewardState] = useState<RewardState>({ claimedDays: [], lastClaimDate: null, lastClaimMonth: null, claimedToday: false, totalClaimed: 0 });
  const [dayStatuses, setDayStatuses] = useState<DayStatus[]>(DAILY_REWARDS.map(() => 'upcoming'));
  const [nextClaimDay, setNextClaimDay] = useState<number | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [lastClaimedCoins, setLastClaimedCoins] = useState<number | null>(null);
  const [burstActive, setBurstActive] = useState(false);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    const savedLang = (localStorage.getItem('rtb-lang') as Language) || 'en';
    setLang(savedLang);
    const state = loadRewardState();
    setRewardState(state);
    setDayStatuses(getDayStatuses(state));
    setNextClaimDay(getNextClaimDay(state));
    setBalance(loadBalance());
  }, []);

  const t = translations[lang] || translations.en;

  const handleClaim = useCallback(() => {
    if (isClaiming || rewardState.claimedToday) return;
    setIsClaiming(true);
    setTimeout(() => {
      try {
        const { newState, coinsAwarded } = claimDailyReward(rewardState);
        setRewardState(newState); setDayStatuses(getDayStatuses(newState)); setNextClaimDay(getNextClaimDay(newState)); setLastClaimedCoins(coinsAwarded); setBurstActive(true);
        setTimeout(() => setBurstActive(false), 1100);
        const newBalance = loadBalance() + coinsAwarded;
        saveBalance(newBalance); setBalance(newBalance);
      } catch {} finally { setIsClaiming(false); }
    }, 300);
  }, [isClaiming, rewardState]);

  const handleDragEnd = (event: any, info: PanInfo) => { if (info.offset.x > 80 && info.velocity.x > 10) router.push('/'); };

  const monthComplete = isMonthComplete(rewardState);
  const daysLeft = getDaysUntilNextMonth();
  const claimedCount = rewardState.claimedDays.length;

  return (
    <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'tween', ease: 'easeOut', duration: 0.25 }} drag="x" dragConstraints={{ left: 0, right: 0 }} onDragEnd={handleDragEnd} className="min-h-screen felt-bg flex flex-col touch-pan-y will-change-transform">
      <header className="w-full flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(59,130,246,0.2)', background: 'rgba(0,0,0,0.9)' }}>
        <div className="w-1/4"><button onClick={() => router.push('/')} className="flex items-center gap-1 transition-colors duration-150 rounded-lg px-1 py-1 w-fit" style={{ color: 'rgba(100,116,139,0.8)' }}><ArrowLeftIcon size={18} /><span className="text-xs font-medium">{t.back}</span></button></div>
        <div className="w-2/4 flex justify-center text-center"><span className="font-bold text-[10px] sm:text-xs uppercase tracking-tighter" style={{ color: '#f97316' }}>{t.dailyRewards}</span></div>
        <div className="w-1/4 flex justify-end"><div className="flex items-center gap-1 px-2 py-1 rounded-lg font-bold text-xs tabular-nums whitespace-nowrap" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.4)', color: '#4ade80' }}><span>$</span><span>{formatBalance(balance)}</span></div></div>
      </header>
      <main className="flex-1 flex flex-col px-4 py-4 max-w-lg mx-auto w-full gap-4">
        <div className="rounded-xl p-4" style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(59,130,246,0.15)' }}>
          <div className="flex items-center justify-between mb-2"><span className="text-xs uppercase tracking-widest font-medium" style={{ color: 'rgba(59,130,246,0.7)' }}>{t.monthlyProgress}</span><span className="text-sm font-bold tabular-nums" style={{ color: '#f97316' }}>{claimedCount} / 14</span></div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(30,41,59,0.8)' }}><div className="h-full rounded-full transition-all duration-500" style={{ width: `${(claimedCount / 14) * 100}%`, background: 'linear-gradient(90deg, #3b82f6, #4ade80)' }} /></div>
          {monthComplete ? <p className="text-xs mt-2 text-center" style={{ color: '#4ade80' }}>🎉 {t.allClaimed} {daysLeft} {daysLeft !== 1 ? t.days : t.daySingle}</p> : <p className="text-xs mt-2 text-center" style={{ color: 'rgba(100,116,139,0.7)' }}>{14 - claimedCount} {14 - claimedCount !== 1 ? t.remainingMonth : t.remainingMonthSingle}</p>}
        </div>
        {lastClaimedCoins !== null && (<div className="relative rounded-xl p-3 text-center overflow-hidden" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)' }}><CoinBurst active={burstActive} /><p className="font-bold text-base" style={{ color: '#4ade80' }}>+{lastClaimedCoins} {t.coinsClaimed}</p></div>)}
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {DAILY_REWARDS.map((reward, i) => (<DayCard key={reward.day} day={reward.day} coins={reward.coins} status={dayStatuses[i] ?? 'upcoming'} isNextClaim={nextClaimDay === reward.day} onClaim={handleClaim} isClaiming={isClaiming} t={t} />))}
        </div>
        <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(30,41,59,0.6)' }}><p className="text-xs" style={{ color: 'rgba(100,116,139,0.7)' }}>{t.infoNote}</p></div>
      </main>
      <p className="pb-6 text-slate-600 text-xs font-medium tracking-widest uppercase text-center">{t.swipeRight}</p>
    </motion.div>
  );
}
