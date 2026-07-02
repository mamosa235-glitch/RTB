'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { translations, Language } from '@/lib/translations';

interface MiningEntranceProps {
  balance: number;
  stage: string;
}

export default function MiningEntrance({ balance, stage }: MiningEntranceProps) {
  const router = useRouter();
  const [lang, setLang] = useState<Language>('en');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const savedLang = (localStorage.getItem('rtb-lang') as Language) || 'en';
    setLang(savedLang);

    if (balance === 0 && stage === 'idle') {
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [balance, stage]);

  if (!visible) return null;

  const t = translations[lang] || translations.en;

  return (
    <div
      className="fixed bottom-6 left-4 right-4 z-50 bounce-in"
      style={{
        animation: 'slideUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
      }}
    >
      <div
        className="bg-purple-900/90 backdrop-blur-md border-2 border-purple-500 rounded-2xl p-4 flex items-center justify-between shadow-[0_0_30px_rgba(168,85,247,0.4)]"
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-white font-bold text-sm tracking-tight">
            {t.zeroBalanceWarning}
          </span>
        </div>
        <button
          onClick={() => router.push('/mining')}
          className="bg-purple-500 hover:bg-purple-400 text-white font-black px-6 py-2.5 rounded-xl transition-all active:scale-90 shadow-[0_0_15px_rgba(168,85,247,0.5)] uppercase text-xs tracking-widest"
        >
          {t.enter}
        </button>
      </div>
    </div>
  );
}
