'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const GameEngine = dynamic(() => import('./components/GameEngine'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen felt-bg flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-16 h-24 rounded-xl animate-pulse shimmer"
          style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}
        />
        <div className="space-y-2 text-center">
          <div
            className="h-4 w-32 rounded animate-pulse mx-auto"
            style={{ background: 'rgba(249,115,22,0.15)' }}
          />
          <div
            className="h-3 w-24 rounded animate-pulse mx-auto"
            style={{ background: 'rgba(59,130,246,0.1)' }}
          />
        </div>
      </div>
    </div>
  ),
});

export default function GamePage() {
  return <GameEngine />;
}
