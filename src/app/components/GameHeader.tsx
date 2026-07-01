'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CalendarDaysIcon, Settings, Download, CheckCircle2 } from 'lucide-react';
import { translations, Language } from '@/lib/translations';
import { formatBalance, saveBalance } from '@/lib/gameLogic';

interface GameHeaderProps {
  balance: number;
}

export default function GameHeader({ balance }: GameHeaderProps) {
  const [lang, setLang] = useState<Language>('en');
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  useEffect(() => {
    const updateLang = () => {
      const savedLang = (localStorage.getItem('rtb-lang') as Language) || 'en';
      setLang(savedLang);
    };
    updateLang();
    window.addEventListener('storage', updateLang);

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
      setDownloadStatus('success');
    }

    return () => window.removeEventListener('storage', updateLang);
  }, []);

  const handleDownloadOffline = () => {
    if (!('serviceWorker' in navigator)) {
      alert('Navegador no compatible.');
      return;
    }

    setDownloadStatus('loading');

    navigator.serviceWorker.register('/sw.js').then((reg) => {
      if (reg.active) {
        setTimeout(() => setDownloadStatus('success'), 2000);
      }
      reg.onupdatefound = () => {
        const sw = reg.installing;
        if (sw) {
          sw.onstatechange = () => {
            if (sw.state === 'installed') {
              setDownloadStatus('success');
            }
          };
        }
      };
    }).catch(() => {
      setDownloadStatus('idle');
    });
  };

  const t = translations[lang] || translations.en;

  const handleSecretBonus = () => {
    const lastBonus = localStorage.getItem('rtb-secret-bonus');
    const today = new Date().toDateString();

    if (lastBonus !== today) {
      const newBalance = balance + 100;
      saveBalance(newBalance);
      window.dispatchEvent(new CustomEvent('rtb-update-balance', { detail: newBalance }));
      localStorage.setItem('rtb-secret-bonus', today);

      const balanceEl = document.getElementById('balance-display');
      if (balanceEl) {
        balanceEl.style.transform = 'scale(1.1)';
        setTimeout(() => { balanceEl.style.transform = 'scale(1)'; }, 200);
      }
    }
  };

  return (
    <header
      className="w-full flex items-center justify-between px-4 py-2.5 relative flex-shrink-0"
      style={{ borderBottom: '1px solid rgba(59, 130, 246, 0.2)', background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)' }}
    >
      <div className="flex items-center gap-2 overflow-hidden min-w-0 flex-1 mr-2">
        <button
          onClick={handleSecretBonus}
          className="relative w-8 h-8 flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform focus:outline-none"
        >
          <div className="absolute inset-0 rounded-lg" style={{ background: 'linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(30,41,59,0.8) 100%)', border: '1px solid rgba(59,130,246,0.3)' }} />
          <div className="relative flex items-center justify-center font-black italic tracking-tighter leading-none select-none" style={{ fontSize: '11px' }}>
            <span style={{ color: '#3b82f6', textShadow: '0 0 8px rgba(59,130,246,0.8)', transform: 'translateY(-1px)' }}>M</span>
            <span style={{ color: '#f97316', textShadow: '0 0 8px rgba(249,115,22,0.8)', transform: 'translateY(1px)', marginLeft: '-2px' }}>S</span>
          </div>
        </button>
        <span
          className="font-bold uppercase leading-none"
          style={{
            color: '#f97316',
            textShadow: '0 0 10px rgba(249,115,22,0.6), 0 0 20px rgba(249,115,22,0.3)',
            letterSpacing: '0.02em',
            fontSize: 'clamp(0.6rem, 3.2vw, 0.9rem)',
            whiteSpace: 'nowrap',
          }}
        >
          {t.gameTitle}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <div
          id="balance-display"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-sm tabular-nums transition-transform duration-200"
          style={{
            background: 'rgba(34,197,94,0.1)',
            border: '1px solid rgba(34,197,94,0.4)',
            color: '#4ade80',
            boxShadow: '0 0 10px rgba(34,197,94,0.15)',
          }}
        >
          <span style={{ fontSize: '13px' }}>$</span>
          <span>{formatBalance(balance)}</span>
        </div>

        <Link
          href="/daily-rewards"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          style={{ color: 'rgba(59,130,246,0.9)', border: '1px solid rgba(59,130,246,0.25)', background: 'rgba(59,130,246,0.05)' }}
        >
          <CalendarDaysIcon size={14} />
        </Link>

        <button
          onClick={handleDownloadOffline}
          disabled={downloadStatus === 'loading'}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 focus:outline-none focus:ring-2"
          style={{
            color: downloadStatus === 'success' ? '#4ade80' : 'rgba(168,85,247,0.9)',
            border: `1px solid ${downloadStatus === 'success' ? 'rgba(34,197,94,0.4)' : 'rgba(168,85,247,0.25)'}`,
            background: downloadStatus === 'success' ? 'rgba(34,197,94,0.05)' : 'rgba(168,85,247,0.05)'
          }}
        >
          {downloadStatus === 'loading' ? (
            <div className="w-3.5 h-3.5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          ) : downloadStatus === 'success' ? (
            <CheckCircle2 size={14} />
          ) : (
            <Download size={14} />
          )}
        </button>

        <Link
          href="/settings"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-slate-500/40"
          style={{ color: 'rgba(148,163,184,0.9)', border: '1px solid rgba(148,163,184,0.25)', background: 'rgba(148,163,184,0.05)' }}
        >
          <Settings size={14} />
        </Link>
      </div>
    </header>
  );
}
