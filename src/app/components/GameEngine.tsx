'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  type GameStage, type StageResult, type Card, type Suit, type Stats,
  buildDeck, shuffleDeck, drawCard,
  evaluateRedBlack, evaluateHigherLower, evaluateInsideOutside, evaluateSuit, evaluateOverall,
  loadStats, updateStats, loadBalance, saveBalance,
  SUIT_SYMBOLS, SUIT_LABELS, getStageMultiplier,
} from '@/lib/gameLogic';
import { translations, Language } from '@/lib/translations';

import StageProgress from './StageProgress';
import CardArea from './CardArea';
import ActionButtons from './ActionButtons';
import GameOverOverlay from './GameOverOverlay';
import GameHeader from './GameHeader';

// ── Sound effects ────────────────────────────────────────────────────────────
function createAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    return new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  } catch { return null; }
}

function playTone(ctx: AudioContext, frequency: number, duration: number, type: OscillatorType = 'sine', gain = 0.15) {
  try {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    oscillator.type = type;
    gainNode.gain.setValueAtTime(gain, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch {}
}

function playWinSound(ctx: AudioContext) {
  playTone(ctx, 523, 0.15, 'sine', 0.15);
  setTimeout(() => playTone(ctx, 659, 0.15, 'sine', 0.15), 150);
  setTimeout(() => playTone(ctx, 784, 0.25, 'sine', 0.15), 300);
}

function playLossSound(ctx: AudioContext) {
  playTone(ctx, 330, 0.2, 'sawtooth', 0.1);
  setTimeout(() => playTone(ctx, 247, 0.3, 'sawtooth', 0.08), 200);
}

function playCardSound(ctx: AudioContext) {
  playTone(ctx, 800, 0.06, 'square', 0.05);
}

function playBigWinSound(ctx: AudioContext) {
  [523, 659, 784, 1047].forEach((freq, i) => {
    setTimeout(() => playTone(ctx, freq, 0.2, 'sine', 0.18), i * 120);
  });
}

function playMoneySound(ctx: AudioContext) {
  const frequencies = [800, 1000, 1200, 1400, 1600, 1800, 2000, 2200];
  frequencies.forEach((freq, i) => {
    setTimeout(() => playTone(ctx, freq, 0.12, 'triangle', 0.1), i * 40);
  });
}

// ── Bet Input Component ──────────────────────────────────────────────────────
interface BetInputProps {
  balance: number;
  onStartGame: (bet: number) => void;
}

function BetInput({ balance, onStartGame }: BetInputProps) {
  const [betStr, setBetStr] = useState('50');
  const [error, setError] = useState('');
  const [lang, setLang] = useState<Language>('en');

  useEffect(() => {
    const savedLang = (localStorage.getItem('rtb-lang') as Language) || 'en';
    setLang(savedLang);

    const savedBet = localStorage.getItem('rtb-last-bet');
    const effectiveBalance = Math.max(0, balance);
    if (savedBet) {
      const betVal = parseInt(savedBet, 10);
      if (!isNaN(betVal) && betVal <= effectiveBalance && betVal >= 5) {
        setBetStr(savedBet);
      } else {
        setBetStr(String(Math.min(effectiveBalance, 50) || 5));
      }
    } else {
      setBetStr(String(Math.min(effectiveBalance, 50) || 5));
    }
  }, [balance]);

  const t = translations[lang] || translations.en;
  const maxBet = Math.max(5, Math.min(500, balance));
  const percentage = maxBet > 5 ? ((Number(betStr) - 5) / (maxBet - 5)) * 100 : 0;

  const handleSubmit = () => {
    const bet = parseInt(betStr, 10);
    if (isNaN(bet) || bet < 5) { setError(t.minBet); return; }
    if (bet > 500) { setError(t.maxBet); return; }
    if (bet > balance) { setError(t.noCoins); return; }
    setError('');
    localStorage.setItem('rtb-last-bet', betStr);
    onStartGame(bet);
  };

  return (
    <div className="flex flex-col items-center justify-center flex-1 w-full gap-4 px-6 md:px-12 lg:px-24 py-10">
      <div className="w-full max-w-3xl rounded-[2.5rem] p-10 md:p-16 relative" style={{ background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(59,130,246,0.5)', boxShadow: '0 0 120px rgba(59, 130, 246, 0.5), inset 0 0 60px rgba(59, 130, 246, 0.2)', animation: 'pulse-glow 8s infinite ease-in-out', willChange: 'transform, box-shadow', transform: 'translateZ(0)' }}>
        <p className="text-center text-sm md:text-xl uppercase tracking-[0.5em] mb-12 font-black" style={{ color: '#60a5fa', textShadow: '0 0 20px rgba(59,130,246,0.7)' }}>{t.placeYourBet}</p>
        <div className="space-y-12 mb-10">
          <div className="flex flex-col gap-10">
            <div className="flex flex-col items-center">
              <span className="text-6xl md:text-9xl font-black text-green-500 tabular-nums" style={{ textShadow: '0 0 30px rgba(34,197,94,0.6)' }}>
                ${balance === 0 ? '0' : betStr}
              </span>
            </div>
            <input type="range" min={5} max={maxBet} step={5} value={balance === 0 ? 5 : betStr} disabled={balance === 0} onChange={e => { setBetStr(e.target.value); setError(''); }} className={`w-full h-4 md:h-8 bg-slate-800 rounded-2xl appearance-none cursor-pointer accent-green-500 ${balance === 0 ? 'opacity-20' : ''}`} style={{ background: balance === 0 ? '#1e293b' : `linear-gradient(to right, #22c55e 0%, #22c55e ${percentage}%, #1e293b ${percentage}%, #1e293b 100%)` }} />
            <div className="flex justify-between px-2 text-sm md:text-xl font-bold text-slate-500"><span>$5</span><span>${maxBet}</span></div>
          </div>
        </div>
        {error && <p className="text-center text-base md:text-lg mb-6 font-bold" style={{ color: '#ef4444' }}>{error}</p>}
        <button className="w-full py-6 md:py-10 rounded-[1.5rem] md:rounded-[2rem] font-black text-xl md:text-4xl uppercase tracking-[0.3em] transition-all duration-300 focus:outline-none active:scale-95 shadow-2xl" style={{ background: 'linear-gradient(135deg, #fb923c, #f97316, #ea580c)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.3)', boxShadow: '0 0 50px rgba(249,115,22,0.5)', letterSpacing: '0.2em' }} onClick={handleSubmit}>{t.play}</button>
      </div>
    </div>
  );
}

export default function GameEngine() {
  const [stage, setStage] = useState<GameStage>('idle');
  const [deck, setDeck] = useState<Card[]>([]);
  const [drawnCards, setDrawnCards] = useState<(Card | null)[]>([null, null, null, null]);
  const [revealedCards, setRevealedCards] = useState<boolean[]>([false, false, false, false]);
  const [stageResults, setStageResults] = useState<StageResult[]>([]);
  const [overallResult, setOverallResult] = useState<'win' | 'loss' | null>(null);
  const [currentGuess, setCurrentGuess] = useState<string | null>(null);
  const [newCardIndex, setNewCardIndex] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [stats, setStats] = useState<Stats>(() => ({ gamesPlayed: 0, wins: 0, losses: 0, currentStreak: 0, bestStreak: 0, winHistory: [] }));
  const [showGameOver, setShowGameOver] = useState(false);
  const [lang, setLang] = useState<Language>('en');
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [currentBet, setCurrentBet] = useState<number>(0);
  const [balance, setBalance] = useState<number>(1000);
  const [stagesWon, setStagesWon] = useState<number>(0);

  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    setStats(loadStats());
    setBalance(loadBalance());
    setLang((localStorage.getItem('rtb-lang') as Language) || 'en');
    setSoundEnabled(localStorage.getItem('rtb-sound') !== 'false');

    const handleExternalBalanceUpdate = (e: any) => {
      const newBal = e.detail;
      setBalance(newBal);
      saveBalance(newBal);
    };

    const handleStorageChange = () => {
      setLang((localStorage.getItem('rtb-lang') as Language) || 'en');
      setSoundEnabled(localStorage.getItem('rtb-sound') !== 'false');
    };

    window.addEventListener('rtb-update-balance', handleExternalBalanceUpdate);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('rtb-update-balance', handleExternalBalanceUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const getAudioCtx = useCallback((): AudioContext | null => {
    if (!audioCtxRef.current) audioCtxRef.current = createAudioContext();
    if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume().catch(() => {});
    return audioCtxRef.current;
  }, []);

  const sound = useCallback((fn: (ctx: AudioContext) => void) => {
    if (!soundEnabled) return;
    const ctx = getAudioCtx();
    if (ctx) fn(ctx);
  }, [getAudioCtx, soundEnabled]);

  const getCurrentPayout = useCallback((stagesWonCount: number): number => {
    if (stagesWonCount === 0) return 0;
    return currentBet * getStageMultiplier(stagesWonCount - 1);
  }, [currentBet]);

  const startGame = useCallback((bet: number) => {
    const freshDeck = shuffleDeck(buildDeck());
    setDeck(freshDeck);
    setDrawnCards([null, null, null, null]);
    setRevealedCards([false, false, false, false]);
    setStageResults([]);
    setOverallResult(null);
    setCurrentGuess(null);
    setNewCardIndex(null);
    setIsAnimating(false);
    setShowGameOver(false);
    setCurrentBet(bet);
    setStagesWon(0);

    const newBalance = balance - bet;
    setBalance(newBalance);
    saveBalance(newBalance);
    setStage('stage1-choose');
  }, [balance]);

  const handleForfeit = useCallback(() => {
    if (stagesWon === 0) return;
    sound(playMoneySound);
    const payout = getCurrentPayout(stagesWon);
    const newBalance = balance + payout;
    setBalance(newBalance);
    saveBalance(newBalance);
    setStage('idle');
    setShowGameOver(false);
  }, [stagesWon, getCurrentPayout, balance, sound]);

  const drawAndReveal = useCallback(
    (currentDeck: Card[], cardIndex: number, onDrawn: (card: Card, remainingDeck: Card[]) => void) => {
      setIsAnimating(true);
      const [card, remaining] = drawCard(currentDeck);
      sound(playCardSound);
      setDrawnCards((prev) => { const next = [...prev]; next[cardIndex] = card; return next; });
      setNewCardIndex(cardIndex);
      setDeck(remaining);
      setTimeout(() => {
        setRevealedCards((prev) => { const next = [...prev]; next[cardIndex] = true; return next; });
        setTimeout(() => { setNewCardIndex(null); setIsAnimating(false); onDrawn(card, remaining); }, 650);
      }, 400);
    },
    [sound]
  );

  const handleRedBlack = useCallback((guess: 'red' | 'black') => {
    if (isAnimating || stage !== 'stage1-choose') return;
    setCurrentGuess(guess); setStage('stage1-reveal');
    drawAndReveal(deck, 0, (card) => {
      const result = evaluateRedBlack(guess, card); setStageResults([result]);
      if (result === 'win') { sound(playWinSound); setStagesWon(1); setTimeout(() => setStage('stage2-choose'), 1200); }
      else { sound(playLossSound); setStats(updateStats(stats, false)); setTimeout(() => setStage('idle'), 1500); }
    });
  }, [isAnimating, stage, deck, drawAndReveal, sound, stats]);

  const handleHigherLower = useCallback((guess: 'higher' | 'lower') => {
    if (isAnimating || stage !== 'stage2-choose') return;
    const card1 = drawnCards[0]; if (!card1) return;
    setCurrentGuess(guess); setStage('stage2-reveal');
    drawAndReveal(deck, 1, (card2) => {
      const result = evaluateHigherLower(guess, card1, card2); setStageResults((prev) => [...prev, result]);
      if (result === 'win') { sound(playWinSound); setStagesWon(2); setTimeout(() => setStage('stage3-choose'), 1200); }
      else { sound(playLossSound); setStats(updateStats(stats, false)); setTimeout(() => setStage('idle'), 1500); }
    });
  }, [isAnimating, stage, deck, drawnCards, drawAndReveal, sound, stats]);

  const handleInsideOutside = useCallback((guess: 'inside' | 'outside') => {
    if (isAnimating || stage !== 'stage3-choose') return;
    const card1 = drawnCards[0]; const card2 = drawnCards[1]; if (!card1 || !card2) return;
    setCurrentGuess(guess); setStage('stage3-reveal');
    drawAndReveal(deck, 2, (card3) => {
      const result = evaluateInsideOutside(guess, card1, card2, card3); setStageResults((prev) => [...prev, result]);
      if (result === 'win') { sound(playWinSound); setStagesWon(3); setTimeout(() => setStage('stage4-choose'), 1200); }
      else { sound(playLossSound); setStats(updateStats(stats, false)); setTimeout(() => setStage('idle'), 1500); }
    });
  }, [isAnimating, stage, deck, drawnCards, drawAndReveal, sound, stats]);

  const handleSuit = useCallback((guess: Suit) => {
    if (isAnimating || stage !== 'stage4-choose') return;
    setCurrentGuess(`${SUIT_SYMBOLS[guess]} ${SUIT_LABELS[guess]}`); setStage('stage4-reveal');
    drawAndReveal(deck, 3, (card4) => {
      const result = evaluateSuit(guess, card4); const newResults = [...stageResults, result]; setStageResults(newResults);
      const overall = evaluateOverall(newResults); setOverallResult(overall);
      if (result === 'win') {
        sound(playBigWinSound); sound(playMoneySound); setStagesWon(4);
        const payout = currentBet * 20; const newBalance = balance + payout; setBalance(newBalance); saveBalance(newBalance);
      } else {
        sound(playLossSound); setStats(updateStats(stats, false)); setTimeout(() => setStage('idle'), 1500); return;
      }
      setStats(updateStats(stats, overall === 'win'));
      setTimeout(() => { setStage('game-over'); setShowGameOver(true); }, 1800);
    });
  }, [isAnimating, stage, deck, stageResults, stats, drawAndReveal, sound, currentBet, balance]);

  const stageIndex = stage.startsWith('stage1') ? 0 : stage.startsWith('stage2') ? 1 : stage.startsWith('stage3') ? 2 : stage.startsWith('stage4') ? 3 : 0;
  const canForfeit = stagesWon >= 1 && (stage === 'stage2-choose' || stage === 'stage3-choose' || stage === 'stage4-choose');
  const forfeitAmount = canForfeit ? getCurrentPayout(stagesWon) : 0;
  const potentialPayout = currentBet > 0 ? currentBet * getStageMultiplier(stageIndex) : 0;

  return (
    <div className="flex flex-col felt-bg relative" style={{ height: '100dvh', maxHeight: '100dvh' }}>
      {showGameOver && overallResult && (
        <GameOverOverlay result={overallResult} drawnCards={drawnCards} stageResults={stageResults} stats={stats} payout={currentBet * 20} onPlayAgain={() => { setShowGameOver(false); setStage('idle'); }} />
      )}
      <GameHeader balance={balance} />
      <main className="flex flex-col items-center justify-center px-4 pb-12 pt-4 max-w-full md:max-w-[90%] lg:max-w-[80%] mx-auto w-full relative" style={{ flex: 1, minHeight: 0 }}>
        {stage === 'idle' ? (
          <BetInput balance={balance} onStartGame={startGame} />
        ) : (
          <div className="flex flex-col gap-2 w-full h-full">
            <div className="flex items-center justify-between flex-shrink-0">
              <StageProgress currentStageIndex={stageIndex} results={stageResults} />
              {currentBet > 0 && <div className="flex items-center gap-1 text-xs tabular-nums flex-shrink-0 ml-2"><span style={{ color: 'rgba(100,116,139,0.7)' }}>→</span><span style={{ color: '#4ade80', fontWeight: 700 }}>{potentialPayout}</span></div>}
            </div>
            <div className="flex items-center justify-center" style={{ flex: 1, minHeight: 0 }}>
              <CardArea drawnCards={drawnCards} revealedCards={revealedCards} stage={stage} stageResults={stageResults} newCardIndex={newCardIndex} />
            </div>
            <div className="w-full flex-shrink-0 space-y-2">
              <ActionButtons stage={stage} card1={drawnCards[0]} card2={drawnCards[1]} disabled={isAnimating} onRedBlack={handleRedBlack} onHigherLower={handleHigherLower} onInsideOutside={handleInsideOutside} onSuit={handleSuit} onForfeit={handleForfeit} canForfeit={canForfeit} forfeitAmount={forfeitAmount} />
            </div>
          </div>
        )}

        {/* Zero Balance Purple Box */}
        {balance === 0 && stage === 'idle' && (
          <div
            className="absolute bottom-10 left-4 right-4 md:left-20 md:right-20 bg-purple-900/80 rounded-3xl p-8 md:p-12 flex flex-col items-center justify-center border-4 border-purple-500 overflow-hidden"
            style={{
              animation: 'pulse-glow-purple 4s infinite ease-in-out',
              boxShadow: '0 0 80px rgba(168, 85, 247, 0.6), inset 0 0 40px rgba(168, 85, 247, 0.3)'
            }}
          >
            <span className="text-white font-black text-3xl md:text-5xl uppercase tracking-[0.2em] text-center" style={{ textShadow: '0 0 15px rgba(168, 85, 247, 0.8)' }}>
              Tens $0
            </span>
          </div>
        )}
      </main>
    </div>
  );
}
