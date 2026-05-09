import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.storyboard.copilot',
  appName: 'Storyboard Copilot',
  webDir: 'dist',
  android: {
    backgroundColor: '#111227',
    allowMixedContent: true,
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#111227',
    },
    Filesystem: {
      ios: {
        backup: true,
      },
    },
    App: {
      launchAutoHide: true,
      backgroundColor: '#111227',
    },
  },
};

export default config;
