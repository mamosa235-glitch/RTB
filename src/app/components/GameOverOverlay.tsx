'use client';

import React, { useEffect, useState } from 'react';
import { TrophyIcon, RefreshCwIcon } from 'lucide-react';
import { type StageResult, type Stats, SUIT_SYMBOLS, type Card } from '@/lib/gameLogic';

interface GameOverOverlayProps {
  result: 'win' | 'loss';
  drawnCards: (Card | null)[];
  stageResults: StageResult[];
  stats: Stats;
  payout?: number;
  onPlayAgain: () => void;
}

interface ConfettiPiece {
  id: string;
  left: number;
  color: string;
  delay: number;
  duration: number;
  size: number;
}

export default function GameOverOverlay({
  result,
  drawnCards,
  stageResults,
  stats,
  payout = 0,
  onPlayAgain,
}: GameOverOverlayProps) {
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const isWin = result === 'win';

  useEffect(() => {
    if (isWin) {
      const colors = ['#f97316', '#3b82f6', '#fb923c', '#60a5fa', '#fdba74', '#93c5fd'];
      const pieces: ConfettiPiece[] = Array.from({ length: 30 }, (_, i) => ({
        id: `confetti-${i}`,
        left: (i / 30) * 100,
        color: colors[i % colors.length],
        delay: i * 0.08,
        duration: 2 + (i % 3) * 0.5,
        size: 6 + (i % 4) * 2,
      }));
      setConfetti(pieces);
    }
  }, [isWin]);

  const STAGE_LABELS = ['R/B', 'H/L', 'I/O', 'Suit'];

  return (
    <div
      className="fixed inset-0 overlay-backdrop z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={isWin ? 'You won!' : 'Game over'}
    >
      {confetti.map((piece) => (
        <div
          key={piece.id}
          className="fixed top-0 pointer-events-none confetti-piece"
          style={{
            left: `${piece.left}%`,
            width: `${piece.size}px`,
            height: `${piece.size}px`,
            background: piece.color,
            borderRadius: '2px',
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
          }}
        />
      ))}

      <div
        className="w-full max-w-sm mx-auto rounded-2xl p-5 bounce-in relative"
        style={{
          background: isWin
            ? 'linear-gradient(180deg, rgba(59,130,246,0.08) 0%, rgba(0,0,0,0.97) 100%)'
            : 'linear-gradient(180deg, rgba(239,68,68,0.06) 0%, rgba(0,0,0,0.97) 100%)',
          border: `1px solid ${isWin ? 'rgba(59,130,246,0.3)' : 'rgba(239,68,68,0.3)'}`,
          boxShadow: isWin
            ? '0 0 40px rgba(59,130,246,0.15)'
            : '0 0 40px rgba(239,68,68,0.1)',
        }}
      >
        {/* Icon + title */}
        <div className="text-center mb-4">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-2"
            style={{
              background: isWin ? 'rgba(59,130,246,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${isWin ? 'rgba(59,130,246,0.3)' : 'rgba(239,68,68,0.3)'}`,
            }}
          >
            <TrophyIcon size={28} style={{ color: isWin ? '#f97316' : '#ef4444', filter: isWin ? 'drop-shadow(0 0 8px rgba(249,115,22,0.6))' : 'none' }} />
          </div>
          <h2
            className="text-2xl font-bold uppercase tracking-widest"
            style={{ color: isWin ? '#f97316' : '#ef4444', letterSpacing: '0.1em' }}
          >
            {isWin ? '🎉 Winner!' : 'Game Over'}
          </h2>
          {isWin && payout > 0 && (
            <p className="text-lg font-bold mt-1" style={{ color: '#4ade80' }}>
              +{payout.toLocaleString()} coins
            </p>
          )}
        </div>

        {/* Stage results */}
        <div className="mb-4 grid grid-cols-4 gap-1.5">
          {STAGE_LABELS.map((label, i) => {
            const stageResult = stageResults[i];
            const card = drawnCards[i];
            return (
              <div
                key={`result-row-${i}`}
                className="flex flex-col items-center rounded-lg px-2 py-2 text-center"
                style={{
                  background: stageResult === 'win' ? 'rgba(59,130,246,0.08)' : stageResult === 'loss' ? 'rgba(239,68,68,0.08)' : 'rgba(0,0,0,0.4)',
                  border: `1px solid ${stageResult === 'win' ? 'rgba(59,130,246,0.2)' : stageResult === 'loss' ? 'rgba(239,68,68,0.2)' : 'rgba(30,41,59,0.6)'}`,
                }}
              >
                <span className="text-[10px] font-medium mb-1" style={{ color: 'rgba(100,116,139,0.8)' }}>{label}</span>
                {card && (
                  <span className="text-xs font-bold" style={{ color: card.color === 'red' ? '#fca5a5' : '#e2e8f0' }}>
                    {card.rankLabel}{SUIT_SYMBOLS[card.suit]}
                  </span>
                )}
                <span className="text-sm font-bold mt-0.5" style={{ color: stageResult === 'win' ? '#60a5fa' : stageResult === 'loss' ? '#fca5a5' : 'rgba(100,116,139,0.6)' }}>
                  {stageResult === 'win' ? '✓' : stageResult === 'loss' ? '✕' : '–'}
                </span>
              </div>
            );
          })}
        </div>

        {/* Play again */}
        <button
          className="w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 focus:outline-none uppercase tracking-widest transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: '#ffffff',
            border: '1px solid rgba(59,130,246,0.4)',
            boxShadow: '0 0 20px rgba(59,130,246,0.3)',
            letterSpacing: '0.15em',
          }}
          onClick={onPlayAgain}
          autoFocus
          aria-label="Play Again"
        >
          <RefreshCwIcon size={18} />
          Play Again
        </button>
      </div>
    </div>
  );
}