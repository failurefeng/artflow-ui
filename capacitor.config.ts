import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.storyboard.copilot',
  appName: '分镜助手',
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
  },
};

export default config;
