'use client';

import React from 'react';
import {
  ArrowUpIcon,
  ArrowDownIcon,
  TrendingUpIcon,
  TrendingDownIcon,
} from 'lucide-react';
import {
  type Suit,
  type GameStage,
  SUIT_SYMBOLS,
  type Card,
  canBeInside,
} from '@/lib/gameLogic';

interface ActionButtonsProps {
  stage: GameStage;
  card1: Card | null;
  card2: Card | null;
  disabled: boolean;
  onRedBlack: (choice: 'red' | 'black') => void;
  onHigherLower: (choice: 'higher' | 'lower') => void;
  onInsideOutside: (choice: 'inside' | 'outside') => void;
  onSuit: (suit: Suit) => void;
  onForfeit?: () => void;
  canForfeit?: boolean;
  forfeitAmount?: number;
}

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

const baseBtn = `
  flex-1 py-5 md:py-10 px-6 md:px-12 rounded-2xl md:rounded-[2.5rem] font-black text-lg md:text-3xl border-2 transition-all duration-150
  focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-black
  disabled:opacity-40 disabled:cursor-not-allowed
  uppercase tracking-[0.2em]
`;

export default function ActionButtons({
  stage,
  card1,
  card2,
  disabled,
  onRedBlack,
  onHigherLower,
  onInsideOutside,
  onSuit,
  onForfeit,
  canForfeit,
  forfeitAmount,
}: ActionButtonsProps) {

  if (stage === 'stage1-choose') {
    return (
      <div className="w-full flex gap-3" role="group" aria-label="Red or Black choice">
        <button
          className={baseBtn}
          style={{
            background: 'rgba(239,68,68,0.1)',
            borderColor: 'rgba(239,68,68,0.4)',
            color: '#fca5a5',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.2)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 20px rgba(239,68,68,0.3)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.1)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
          }}
          onClick={() => onRedBlack('red')}
          disabled={disabled}
          aria-label="Guess Red"
        >
          ♥ Red
        </button>
        <button
          className={baseBtn}
          style={{
            background: 'rgba(30,41,59,0.5)',
            borderColor: 'rgba(100,116,139,0.35)',
            color: '#cbd5e1',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(30,41,59,0.8)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 20px rgba(100,116,139,0.2)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(30,41,59,0.5)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
          }}
          onClick={() => onRedBlack('black')}
          disabled={disabled}
          aria-label="Guess Black"
        >
          ♠ Black
        </button>
      </div>
    );
  }

  if (stage === 'stage2-choose') {
    return (
      <div className="w-full flex flex-col gap-2" role="group" aria-label="Higher or Lower choice">
        <div className="flex gap-3">
          <button
            className={baseBtn}
            style={{
              background: 'rgba(59,130,246,0.1)',
              borderColor: 'rgba(59,130,246,0.4)',
              color: '#93c5fd',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(59,130,246,0.2)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 20px rgba(59,130,246,0.3)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(59,130,246,0.1)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
            }}
            onClick={() => onHigherLower('higher')}
            disabled={disabled}
            aria-label="Guess Higher"
          >
            <ArrowUpIcon size={16} className="inline mr-1" />
            Higher
          </button>
          <button
            className={baseBtn}
            style={{
              background: 'rgba(249,115,22,0.1)',
              borderColor: 'rgba(249,115,22,0.4)',
              color: '#fdba74',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(249,115,22,0.2)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 20px rgba(249,115,22,0.3)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(249,115,22,0.1)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
            }}
            onClick={() => onHigherLower('lower')}
            disabled={disabled}
            aria-label="Guess Lower"
          >
            <ArrowDownIcon size={16} className="inline mr-1" />
            Lower
          </button>
        </div>
        {canForfeit && onForfeit && forfeitAmount !== undefined && (
          <button
            className="w-full py-2.5 rounded-xl font-semibold text-sm border transition-all duration-150 focus:outline-none uppercase tracking-wider"
            style={{
              background: 'rgba(34,197,94,0.08)',
              borderColor: 'rgba(34,197,94,0.35)',
              color: '#4ade80',
            }}
            onClick={onForfeit}
            disabled={disabled}
            aria-label={`Forfeit and collect ${forfeitAmount} coins`}
          >
            💰 Forfeit +{forfeitAmount.toLocaleString()}
          </button>
        )}
      </div>
    );
  }

  if (stage === 'stage3-choose') {
    return (
      <div className="w-full flex flex-col gap-2" role="group" aria-label="Inside or Outside choice">
        <div className="flex gap-3">
          <button
            className={baseBtn}
            style={{
              background: 'rgba(59,130,246,0.1)',
              borderColor: 'rgba(59,130,246,0.4)',
              color: '#93c5fd',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(59,130,246,0.2)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 20px rgba(59,130,246,0.3)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(59,130,246,0.1)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
            }}
            onClick={() => onInsideOutside('inside')}
            disabled={disabled}
            aria-label="Guess Inside"
          >
            <TrendingUpIcon size={16} className="inline mr-1" />
            Inside
          </button>
          <button
            className={baseBtn}
            style={{
              background: 'rgba(249,115,22,0.1)',
              borderColor: 'rgba(249,115,22,0.4)',
              color: '#fdba74',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(249,115,22,0.2)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 20px rgba(249,115,22,0.3)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(249,115,22,0.1)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
            }}
            onClick={() => onInsideOutside('outside')}
            disabled={disabled}
            aria-label="Guess Outside"
          >
            <TrendingDownIcon size={16} className="inline mr-1" />
            Outside
          </button>
        </div>
        {canForfeit && onForfeit && forfeitAmount !== undefined && (
          <button
            className="w-full py-2.5 rounded-xl font-semibold text-sm border transition-all duration-150 focus:outline-none uppercase tracking-wider"
            style={{
              background: 'rgba(34,197,94,0.08)',
              borderColor: 'rgba(34,197,94,0.35)',
              color: '#4ade80',
            }}
            onClick={onForfeit}
            disabled={disabled}
            aria-label={`Forfeit and collect ${forfeitAmount} coins`}
          >
            💰 Forfeit +{forfeitAmount.toLocaleString()}
          </button>
        )}
      </div>
    );
  }

  if (stage === 'stage4-choose') {
    const suitStyles: Record<Suit, { bg: string; border: string; color: string }> = {
      hearts: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.4)', color: '#fca5a5' },
      diamonds: { bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.4)', color: '#fdba74' },
      clubs: { bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.4)', color: '#93c5fd' },
      spades: { bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.4)', color: '#cbd5e1' },
    };

    return (
      <div className="w-full flex flex-col gap-2" role="group" aria-label="Suit choice">
        <div className="grid grid-cols-2 gap-2">
          {SUITS.map((suit) => {
            const s = suitStyles[suit];
            return (
              <button
                key={suit}
                className="py-4 px-3 rounded-xl font-bold text-lg border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-black disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: s.bg, borderColor: s.border, color: s.color }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = s.bg.replace('0.1', '0.2');
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 20px ${s.border}`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = s.bg;
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
                }}
                onClick={() => onSuit(suit)}
                disabled={disabled}
                aria-label={`Guess ${suit}`}
              >
                {SUIT_SYMBOLS[suit]}
              </button>
            );
          })}
        </div>
        {canForfeit && onForfeit && forfeitAmount !== undefined && (
          <button
            className="w-full py-2.5 rounded-xl font-semibold text-sm border transition-all duration-150 focus:outline-none uppercase tracking-wider"
            style={{
              background: 'rgba(34,197,94,0.08)',
              borderColor: 'rgba(34,197,94,0.35)',
              color: '#4ade80',
            }}
            onClick={onForfeit}
            disabled={disabled}
            aria-label={`Forfeit and collect ${forfeitAmount} coins`}
          >
            💰 Forfeit +{forfeitAmount.toLocaleString()}
          </button>
        )}
      </div>
    );
  }

  return null;
}