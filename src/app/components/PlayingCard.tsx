'use client';

import React, { useEffect, useState } from 'react';
import { type Card, SUIT_SYMBOLS } from '@/lib/gameLogic';

interface PlayingCardProps {
  card: Card | null;
  revealed: boolean;
  isNew?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  highlight?: 'win' | 'loss' | 'neutral' | null;
}

const SIZE_MAP = {
  sm: { outer: 'w-16 h-24 md:w-20 md:h-28', rank: 'text-lg', suit: 'text-base', center: 'text-3xl' },
  md: { outer: 'w-24 h-36 md:w-28 md:h-40', rank: 'text-xl', suit: 'text-base', center: 'text-4xl' },
  lg: { outer: 'w-28 h-44 md:w-36 md:h-52', rank: 'text-2xl', suit: 'text-xl', center: 'text-5xl' },
};

export default function PlayingCard({
  card,
  revealed,
  isNew = false,
  size = 'lg',
  className = '',
  highlight = null,
}: PlayingCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isDealing, setIsDealing] = useState(false);
  const [prevCard, setPrevCard] = useState<Card | null>(null);

  const sz = SIZE_MAP[size];

  // Trigger deal animation when a new card appears
  useEffect(() => {
    if (isNew && card) {
      setIsDealing(true);
      const t = setTimeout(() => setIsDealing(false), 400);
      return () => clearTimeout(t);
    }
  }, [isNew, card]);

  // Trigger flip when revealed changes
  useEffect(() => {
    if (revealed && card) {
      const t = setTimeout(() => setIsFlipped(true), 50);
      return () => clearTimeout(t);
    } else {
      setIsFlipped(false);
    }
  }, [revealed, card]);

  // Track card changes
  useEffect(() => {
    setPrevCard(card);
  }, [card]);

  const isRed = card?.color === 'red';

  const highlightClass =
    highlight === 'win' ?'ring-2 ring-success shadow-green-glow'
      : highlight === 'loss' ?'ring-2 ring-danger shadow-red-glow' :'';

  if (!card) {
    // Empty card placeholder
    return (
      <div
        className={`${sz.outer} rounded-card border-2 border-dashed border-border flex items-center justify-center bg-muted/30 ${className}`}
        role="img"
        aria-label="Empty card slot"
      >
        <span className="text-muted-foreground text-2xl opacity-40">?</span>
      </div>
    );
  }

  return (
    <div
      className={`${sz.outer} perspective-1000 ${isDealing ? 'dealing' : ''} ${className}`}
      style={{ transitionDelay: isNew ? '0ms' : undefined }}
    >
      <div
        className={`relative w-full h-full preserve-3d transition-transform duration-500 ease-in-out ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Card Back */}
        <div
          className="absolute inset-0 rounded-card card-shadow backface-hidden"
          style={{ backfaceVisibility: 'hidden' }}
          aria-hidden="true"
        >
          <div className="w-full h-full rounded-card bg-gradient-to-br from-blue-900 to-blue-950 border border-blue-700/50 flex items-center justify-center overflow-hidden">
            <div className="w-[85%] h-[85%] border-2 border-blue-600/40 rounded-lg flex items-center justify-center">
              <div
                className="w-full h-full rounded"
                style={{
                  background:
                    'repeating-linear-gradient(45deg, rgba(59,130,246,0.15) 0px, rgba(59,130,246,0.15) 2px, transparent 2px, transparent 8px)',
                }}
              />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-blue-400/30 text-4xl font-bold select-none">♦</span>
            </div>
          </div>
        </div>

        {/* Card Face */}
        <div
          className={`absolute inset-0 rounded-card card-shadow backface-hidden rotate-y-180 ${highlightClass}`}
          style={{ backfaceVisibility: 'hidden' }}
          role="img"
          aria-label={`${card.rankLabel} of ${card.suit}`}
        >
          <div className="w-full h-full rounded-card bg-card-white flex flex-col relative overflow-hidden border border-gray-200">
            {/* Top-left rank + suit */}
            <div className={`absolute top-1.5 left-2 flex flex-col items-center leading-none ${isRed ? 'text-card-red' : 'text-gray-900'}`}>
              <span className={`${sz.rank} font-bold leading-none tabular-nums`}>{card.rankLabel}</span>
              <span className={`${sz.suit} leading-none`}>{SUIT_SYMBOLS[card.suit]}</span>
            </div>

            {/* Bottom-right rank + suit (rotated) */}
            <div
              className={`absolute bottom-1.5 right-2 flex flex-col items-center leading-none rotate-180 ${isRed ? 'text-card-red' : 'text-gray-900'}`}
            >
              <span className={`${sz.rank} font-bold leading-none tabular-nums`}>{card.rankLabel}</span>
              <span className={`${sz.suit} leading-none`}>{SUIT_SYMBOLS[card.suit]}</span>
            </div>

            {/* Center suit */}
            <div className="flex-1 flex items-center justify-center">
              <span className={`${sz.center} select-none ${isRed ? 'text-card-red' : 'text-gray-900'}`}>
                {SUIT_SYMBOLS[card.suit]}
              </span>
            </div>

            {/* Highlight overlay */}
            {highlight === 'win' && (
              <div className="absolute inset-0 rounded-card bg-success/10 pointer-events-none" />
            )}
            {highlight === 'loss' && (
              <div className="absolute inset-0 rounded-card bg-danger/10 pointer-events-none" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}