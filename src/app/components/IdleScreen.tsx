'use client';

import React from 'react';
import { PlayIcon } from 'lucide-react';
import { type Stats, getWinRate } from '@/lib/gameLogic';

interface IdleScreenProps {
  stats: Stats;
  onStartGame: () => void;
}

const STAGES_INFO = [
  { step: 1, label: 'Red or Black', desc: 'Guess the color of the first drawn card', icon: '♥', color: 'rgba(239,68,68,0.8)' },
  { step: 2, label: 'Higher or Lower', desc: 'Will the next card rank higher or lower?', icon: '↑↓', color: 'rgba(59,130,246,0.8)' },
  { step: 3, label: 'Inside or Outside', desc: 'Will card 3 fall between cards 1 and 2?', icon: '⟨⟩', color: 'rgba(249,115,22,0.8)' },
  { step: 4, label: 'Suit Guess', desc: 'Name the exact suit of the final card', icon: '♣', color: 'rgba(59,130,246,0.8)' },
];

export default function IdleScreen({ stats, onStartGame }: IdleScreenProps) {
  const winRate = getWinRate(stats);
  const hasPlayed = stats.gamesPlayed > 0;

  return (
    <div className="flex flex-col items-center justify-center gap-6 w-full max-w-sm mx-auto py-4 fade-in">
      {/* Title */}
      <div className="text-center">
        <div
          className="text-5xl mb-3 select-none"
          style={{ filter: 'drop-shadow(0 0 12px rgba(59,130,246,0.6))' }}
        >
          🃏
        </div>
        <h1
          className="text-4xl font-bold tracking-widest uppercase"
          style={{
            color: '#f97316',
            textShadow: '0 0 15px rgba(249,115,22,0.7), 0 0 30px rgba(249,115,22,0.3)',
            letterSpacing: '0.12em',
          }}
        >
          Ride the Bus
        </h1>
        <p
          className="text-xs mt-1 tracking-widest uppercase"
          style={{ color: 'rgba(59,130,246,0.7)', letterSpacing: '0.25em' }}
        >
          4-Stage Card Challenge
        </p>
        <p className="text-sm mt-3" style={{ color: 'rgba(100,116,139,0.9)' }}>
          Predict your way through 4 stages. Nail all 4 to win.
        </p>
      </div>

      {/* Stages overview */}
      <div className="w-full space-y-2">
        {STAGES_INFO.map((s) => (
          <div
            key={`idle-stage-${s.step}`}
            className="flex items-center gap-3 rounded-xl px-4 py-3 relative overflow-hidden"
            style={{
              background: 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(59,130,246,0.15)',
              boxShadow: 'inset 0 0 20px rgba(59,130,246,0.03)',
            }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{
                background: 'rgba(0,0,0,0.8)',
                border: `1px solid ${s.color}`,
                color: s.color,
                boxShadow: `0 0 8px ${s.color}40`,
              }}
            >
              {s.step}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>{s.label}</p>
              <p className="text-xs" style={{ color: 'rgba(100,116,139,0.8)' }}>{s.desc}</p>
            </div>
            <span className="text-base flex-shrink-0" style={{ color: s.color }}>{s.icon}</span>
          </div>
        ))}
      </div>

      {/* Previous stats */}
      {hasPlayed && (
        <div
          className="w-full rounded-xl p-4"
          style={{
            background: 'rgba(0,0,0,0.6)',
            border: '1px solid rgba(59,130,246,0.15)',
          }}
        >
          <p
            className="text-xs uppercase tracking-widest mb-3 font-medium"
            style={{ color: 'rgba(59,130,246,0.6)', letterSpacing: '0.2em' }}
          >
            Your Record
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Games', value: stats.gamesPlayed },
              { label: 'Win Rate', value: `${winRate}%` },
              { label: 'Best Streak', value: stats.bestStreak },
            ].map((stat) => (
              <div key={`idle-stat-${stat.label}`} className="text-center">
                <p
                  className="text-xl font-bold tabular-nums"
                  style={{ color: '#f97316', textShadow: '0 0 8px rgba(249,115,22,0.4)' }}
                >
                  {stat.value}
                </p>
                <p className="text-xs" style={{ color: 'rgba(100,116,139,0.8)' }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Start button */}
      <button
        className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 focus:outline-none uppercase tracking-widest transition-all duration-200"
        style={{
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          color: '#ffffff',
          border: '1px solid rgba(59,130,246,0.5)',
          boxShadow: '0 0 20px rgba(59,130,246,0.3), 0 0 40px rgba(59,130,246,0.1)',
          letterSpacing: '0.15em',
        }}
        onClick={onStartGame}
        aria-label="Start a new game of Ride the Bus"
        autoFocus
      >
        <PlayIcon size={20} />
        {hasPlayed ? 'Play Again' : 'Start Game'}
      </button>
    </div>
  );
}