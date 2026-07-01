'use client';

import React from 'react';
import { type Card, type GameStage } from '@/lib/gameLogic';
import PlayingCard from './PlayingCard';

interface CardAreaProps {
  drawnCards: (Card | null)[];
  revealedCards: boolean[];
  stage: GameStage;
  stageResults: ('win' | 'loss' | null)[];
  newCardIndex: number | null;
}

export default function CardArea({
  drawnCards,
  revealedCards,
  stage,
  stageResults,
  newCardIndex,
}: CardAreaProps) {
  const slotsToShow = (() => {
    if (stage === 'stage1-choose' || stage === 'stage1-reveal') return 1;
    if (stage === 'stage2-choose' || stage === 'stage2-reveal') return 2;
    if (stage === 'stage3-choose' || stage === 'stage3-reveal') return 3;
    if (stage === 'stage4-choose' || stage === 'stage4-reveal') return 4;
    if (stage === 'game-over') return 4;
    return 0;
  })();

  if (slotsToShow === 0) return null;

  return (
    <div
      className="flex items-end justify-center gap-2 w-full"
      role="region"
      aria-label="Drawn cards"
    >
      {Array.from({ length: slotsToShow }, (_, i) => {
        const card = drawnCards[i] ?? null;
        const isRevealed = revealedCards[i] ?? false;
        const result = stageResults[i] ?? null;
        const isNew = i === newCardIndex;

        return (
          <div key={`card-slot-${i}`} className="flex flex-col items-center">
            <PlayingCard
              card={card}
              revealed={isRevealed}
              isNew={isNew}
              size={slotsToShow <= 2 ? 'lg' : slotsToShow === 3 ? 'md' : 'sm'}
              highlight={isRevealed && result ? result : null}
              className={isNew ? 'dealing' : ''}
            />
          </div>
        );
      })}
    </div>
  );
}