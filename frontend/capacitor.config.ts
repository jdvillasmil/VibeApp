import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vibe.app',
  appName: 'VIBE',
  webDir: 'www',
  server: {
    androidScheme: 'http',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      showSpinner: false,
    },
  },
};

export default config;
