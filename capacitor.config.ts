import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.app.dlist',
  appName: 'D List',
  webDir: 'www',
  bundledWebRuntime: false,

  server: {
    androidScheme: 'https'
  },

  plugins: {
    App: {
      scheme: 'dlist' // for deep linking
    },
    StatusBar: {
      overlaysWebView: true
    },
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      darkModeBackgroundColor: "#ffffff",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false
    },

    // ✅ Push Notifications plugin (iOS + Android)
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  },

  ios: {
    contentInset: 'automatic', // avoids layout issues on iOS
    scheme: 'dlist',
    backgroundColor: '#ffffff',
  },

  android: {
    allowMixedContent: true
  }
};

export default config;
