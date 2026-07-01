'use client';

import React from 'react';
import { CheckIcon } from 'lucide-react';
import { type StageResult } from '@/lib/gameLogic';

interface StageProgressProps {
  currentStageIndex: number;
  results: StageResult[];
}

const STAGES = [
  { shortLabel: 'x2', step: 1 },
  { shortLabel: 'x3', step: 2 },
  { shortLabel: 'x4', step: 3 },
  { shortLabel: 'x20', step: 4 },
];

export default function StageProgress({ currentStageIndex, results }: StageProgressProps) {
  return (
    <div className="w-full flex items-center justify-center gap-1.5" role="navigation" aria-label="Game progress">
      {STAGES.map((stage, i) => {
        const isComplete = results[i] !== undefined && results[i] !== null;
        const isCurrent = i === currentStageIndex;
        const isWin = results[i] === 'win';
        const isLoss = results[i] === 'loss';

        return (
          <React.Fragment key={`stage-progress-${i}`}>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300"
              style={{
                ...(isCurrent ? {
                  background: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
                  boxShadow: '0 0 12px rgba(59,130,246,0.7)',
                  color: '#ffffff',
                  transform: 'scale(1.15)',
                } : isWin ? {
                  background: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
                  boxShadow: '0 0 8px rgba(249,115,22,0.5)',
                  color: '#000000',
                } : isLoss ? {
                  background: 'rgba(239,68,68,0.2)',
                  border: '1px solid rgba(239,68,68,0.5)',
                  color: '#fca5a5',
                } : {
                  background: 'rgba(0,0,0,0.6)',
                  border: '1px solid rgba(30,41,59,0.8)',
                  color: 'rgba(100,116,139,0.7)',
                }),
              }}
              aria-current={isCurrent ? 'step' : undefined}
            >
              {isComplete ? (
                isWin ? <CheckIcon size={14} strokeWidth={3} /> : <span>✕</span>
              ) : (
                <span>{stage.shortLabel}</span>
              )}
            </div>
            {i < STAGES.length - 1 && (
              <div
                className="h-px w-5 transition-all duration-500"
                style={{
                  background: i < currentStageIndex
                    ? 'linear-gradient(90deg, #f97316, rgba(59,130,246,0.4))'
                    : 'rgba(30,41,59,0.6)',
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}