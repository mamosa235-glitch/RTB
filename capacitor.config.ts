import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.maxms.app',
  appName: 'RTB',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    iosScheme: 'https'
  }
};

export default config;
