import React from 'react';
import type { Metadata, Viewport } from 'next';
import { DM_Sans } from 'next/font/google';
import '../styles/tailwind.css';
import { Toaster } from 'sonner';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'Ride the Bus — The Classic Card Prediction Game',
  description:
    'Play Ride the Bus — a 4-stage card prediction game. Guess Red/Black, Higher/Lower, Inside/Outside, and the Suit to win.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Ride the Bus',
  },
  icons: {
    icon: [{ url: '/favicon.ico', type: 'image/x-icon' }],
    apple: [{ url: '/icon.png' }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={dmSans.variable}>
      <body className={dmSans.className}>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#0f2744',
              border: '1px solid #1e3a5f',
              color: '#f1f5f9',
              fontFamily: 'var(--font-sans)',
            },
          }}
        />

        {/*
        <script type="module" async src="https://static.rocket.new/rocket-web.js?_cfg=https%3A%2F%2Fredorblack5835back.builtwithrocket.new&_be=https%3A%2F%2Fappanalytics.rocket.new&_v=0.1.19" />
        <script type="module" defer src="https://static.rocket.new/rocket-shot.js?v=0.0.2" />
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if ('serviceWorker' in navigator) {
                  function register() {
                    navigator.serviceWorker.register('/sw.js').then(function(reg) {
                      console.log('SW Registered');
                      reg.onupdatefound = function() {
                        var sw = reg.installing;
                        sw.onstatechange = function() {
                          if (sw.state === 'installed') {
                            var div = document.createElement('div');
                            div.style.position = 'fixed';
                            div.style.top = '0';
                            div.style.left = '0';
                            div.style.width = '100%';
                            div.style.background = '#4ade80';
                            div.style.color = 'black';
                            div.style.textAlign = 'center';
                            div.style.padding = '10px';
                            div.style.zIndex = '9999';
                            div.style.fontWeight = 'bold';
                            div.innerText = '✅ JOC BAIXAT! JA POTS JUGAR SENSE WIFI';
                            document.body.appendChild(div);
                            setTimeout(function() { div.remove(); }, 5000);
                          }
                        };
                      };
                    });
                  }
                  if (document.readyState === 'complete') {
                    register();
                  } else {
                    window.addEventListener('load', register);
                  }
                }
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}