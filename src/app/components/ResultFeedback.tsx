'use client';

import React from 'react';
import { CheckCircleIcon, XCircleIcon } from 'lucide-react';
import { type StageResult, type Card, SUIT_SYMBOLS } from '@/lib/gameLogic';

interface ResultFeedbackProps {
  stage: 'stage1-reveal' | 'stage2-reveal' | 'stage3-reveal' | 'stage4-reveal' | null;
  result: StageResult;
  card: Card | null;
  guess: string | null;
  onContinue: () => void;
  isLastStage?: boolean;
}

export default function ResultFeedback({
  stage,
  result,
  card,
  guess,
  onContinue,
  isLastStage = false,
}: ResultFeedbackProps) {
  if (!stage || !result || !card) return null;

  const isWin = result === 'win';

  return (
    <div
      className="w-full rounded-xl px-4 py-3 slide-up flex items-center justify-between gap-3"
      style={{
        background: isWin ? 'rgba(59,130,246,0.06)' : 'rgba(239,68,68,0.06)',
        border: `1px solid ${isWin ? 'rgba(59,130,246,0.3)' : 'rgba(239,68,68,0.3)'}`,
      }}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 min-w-0">
        {isWin ? (
          <CheckCircleIcon size={20} style={{ color: '#3b82f6', flexShrink: 0 }} />
        ) : (
          <XCircleIcon size={20} style={{ color: '#ef4444', flexShrink: 0 }} />
        )}
        <span
          className="font-bold text-sm"
          style={{ color: card.color === 'red' ? '#fca5a5' : '#e2e8f0' }}
        >
          {card.rankLabel}{SUIT_SYMBOLS[card.suit]}
        </span>
      </div>

      {!isLastStage && isWin && (
        <button
          className="flex-shrink-0 px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-150 focus:outline-none uppercase tracking-wider"
          style={{
            background: 'rgba(59,130,246,0.15)',
            border: '1px solid rgba(59,130,246,0.4)',
            color: '#93c5fd',
          }}
          onClick={onContinue}
          aria-label="Continue to next stage"
        >
          Next →
        </button>
      )}
    </div>
  );
}