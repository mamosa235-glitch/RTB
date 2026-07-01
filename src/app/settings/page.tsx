'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Volume2, Shield, Info, Languages, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, PanInfo } from 'framer-motion';
import { translations, Language } from '@/lib/translations';

const LANGUAGES = [
  { id: 'en', name: 'English' },
  { id: 'ca', name: 'Català' },
  { id: 'eu', name: 'Euskera' },
  { id: 'es', name: 'Castellà' },
];

export default function SettingsPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Language>('en');
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    const savedLang = (localStorage.getItem('rtb-lang') as Language) || 'en';
    const savedSound = localStorage.getItem('rtb-sound') !== 'false';
    setLang(savedLang);
    setSoundEnabled(savedSound);
  }, []);

  const t = translations[lang] || translations.en;

  const handleLangChange = (id: string) => {
    setLang(id as Language);
    localStorage.setItem('rtb-lang', id);
    window.dispatchEvent(new Event('storage'));
  };

  const toggleSound = () => {
    const newVal = !soundEnabled;
    setSoundEnabled(newVal);
    localStorage.setItem('rtb-sound', String(newVal));
  };

  const handleDragEnd = (event: any, info: PanInfo) => {
    if (info.offset.x > 80 && info.velocity.x > 10) {
      router.push('/');
    }
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'tween', ease: 'easeOut', duration: 0.25 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      className="min-h-screen felt-bg flex flex-col items-center p-4 touch-pan-y will-change-transform"
    >
      <div className="w-full max-w-md flex items-center gap-4 mb-8 pt-4">
        <button
          onClick={() => router.push('/')}
          className="p-2 rounded-xl bg-slate-900/50 border border-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold tracking-tight text-white">{t.settings}</h1>
      </div>

      <div className="w-full max-w-md space-y-4 pb-10">
        <section className="bg-black/60 border border-slate-800/50 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800/50 flex items-center gap-3">
            <Languages size={20} className="text-purple-500" />
            <h2 className="font-semibold text-slate-200">{t.language}</h2>
          </div>
          <div className="p-2">
            {LANGUAGES.map((l) => (
              <button
                key={l.id}
                onClick={() => handleLangChange(l.id)}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-800/30 transition-colors"
              >
                <span className={lang === l.id ? 'text-white font-medium' : 'text-slate-400'}>
                  {l.name}
                </span>
                {lang === l.id && <Check size={18} className="text-purple-500" />}
              </button>
            ))}
          </div>
        </section>

        <section className="bg-black/60 border border-slate-800/50 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800/50 flex items-center gap-3">
            <Volume2 size={20} className="text-blue-500" />
            <h2 className="font-semibold text-slate-200">{t.audio}</h2>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">{t.gameSounds}</span>
              <button
                onClick={toggleSound}
                className={`w-12 h-6 rounded-full transition-colors relative ${soundEnabled ? 'bg-blue-600' : 'bg-slate-700'}`}
              >
                <motion.div
                  animate={{ x: soundEnabled ? 24 : 4 }}
                  transition={{ type: 'tween', duration: 0.15 }}
                  className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
                />
              </button>
            </div>
          </div>
        </section>

        <section className="bg-black/60 border border-slate-800/50 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800/50 flex items-center gap-3">
            <Shield size={20} className="text-green-500" />
            <h2 className="font-semibold text-slate-200">{t.privacy}</h2>
          </div>
          <div className="p-4">
            <button
              onClick={() => {
                if(confirm(t.confirmReset)) {
                  localStorage.clear();
                  window.location.reload();
                }
              }}
              className="w-full text-left text-red-400 py-2 hover:text-red-300 transition-colors"
            >
              {t.resetProgress}
            </button>
          </div>
        </section>

        <section className="bg-black/60 border border-slate-800/50 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800/50 flex items-center gap-3">
            <Info size={20} className="text-slate-400" />
            <h2 className="font-semibold text-slate-200">{t.about}</h2>
          </div>
          <div className="p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">{t.version}</span>
              <span className="text-slate-300">1.0.0</span>
            </div>
          </div>
        </section>
      </div>

      <p className="mt-auto pb-4 text-slate-600 text-xs font-medium tracking-widest uppercase text-center">
        {t.swipeRight}
      </p>
    </motion.div>
  );
}
