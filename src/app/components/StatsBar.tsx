'use client';

import React from 'react';
import { FlameIcon, TrophyIcon, BarChart2Icon, HashIcon } from 'lucide-react';
import { type Stats, getWinRate } from '@/lib/gameLogic';

interface StatsBarProps {
  stats: Stats;
}

export default function StatsBar({ stats }: StatsBarProps) {
  const winRate = getWinRate(stats);

  const items = [
    {
      id: 'stat-played',
      icon: <HashIcon size={13} style={{ color: 'rgba(100,116,139,0.7)' }} />,
      label: 'Played',
      value: stats.gamesPlayed,
      color: '#e2e8f0',
    },
    {
      id: 'stat-wins',
      icon: <TrophyIcon size={13} style={{ color: '#f97316' }} />,
      label: 'Wins',
      value: stats.wins,
      color: '#f97316',
    },
    {
      id: 'stat-losses',
      icon: <BarChart2Icon size={13} style={{ color: 'rgba(100,116,139,0.7)' }} />,
      label: 'Losses',
      value: stats.losses,
      color: '#ef4444',
    },
    {
      id: 'stat-winrate',
      icon: <BarChart2Icon size={13} style={{ color: 'rgba(59,130,246,0.7)' }} />,
      label: 'Win Rate',
      value: `${winRate}%`,
      color: winRate >= 50 ? '#3b82f6' : winRate >= 30 ? '#f97316' : '#ef4444',
    },
    {
      id: 'stat-streak',
      icon: <FlameIcon size={13} style={{ color: stats.currentStreak >= 3 ? '#f97316' : 'rgba(100,116,139,0.7)' }} />,
      label: 'Streak',
      value: stats.currentStreak,
      color: stats.currentStreak >= 3 ? '#f97316' : '#e2e8f0',
    },
  ];

  return (
    <div
      className="stats-bar w-full px-4 py-3"
      role="complementary"
      aria-label="Player statistics"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {items.map((item) => (
          <div key={item.id} className="flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-1">
              {item.icon}
              <span className="text-base font-bold tabular-nums" style={{ color: item.color }}>
                {item.value}
              </span>
            </div>
            <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'rgba(100,116,139,0.6)', letterSpacing: '0.12em' }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {stats.winHistory.length > 0 && (
        <div className="flex items-center justify-center gap-1 mt-2">
          {stats.winHistory.slice(-10).map((won, i) => (
            <div
              key={`history-dot-${i}`}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: won ? '#3b82f6' : 'rgba(239,68,68,0.5)' }}
              title={won ? 'Win' : 'Loss'}
              aria-hidden="true"
            />
          ))}
          {stats.winHistory.length > 0 && (
            <span className="text-[10px] ml-1" style={{ color: 'rgba(100,116,139,0.5)' }}>
              last {Math.min(stats.winHistory.length, 10)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}