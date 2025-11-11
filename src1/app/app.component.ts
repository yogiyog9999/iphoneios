import { Component } from '@angular/core';
import { supabase } from './services/supabase.client';
import { PushService } from './services/push.service';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Platform, NavController } from '@ionic/angular';
import { Device } from '@capacitor/device';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { initializeApp } from 'firebase/app';  // ✅ Add this

const firebaseConfig = {
  apiKey: "AIzaSyDI-Y8SUlPpj0495_preN5h4P4zZgaL1qU",
  authDomain: "dlist-app.firebaseapp.com",
  projectId: "dlist-app",
  storageBucket: "dlist-app.firebasestorage.app",
  messagingSenderId: "702713496290",
  appId: "1:702713496290:web:e94eb6ad12a0c07cec14bb",
  measurementId: "G-555MDXLZSL"
};

// ✅ Initialize Firebase
initializeApp(firebaseConfig);

@Component({
  standalone: false,
  selector: 'app-root',
  template: `
    <ion-app>
      <ion-router-outlet></ion-router-outlet>
    </ion-app>
  `
})
export class AppComponent {
  constructor(
    private pushService: PushService,
    private platform: Platform,
    private navCtrl: NavController
  ) {
    this.initializeApp();
    this.handleDeepLinks();
  }

  async initializeApp() {
    await this.platform.ready();

    try {
      if (Capacitor.getPlatform() === 'ios') {
        console.log('Initializing Firebase Messaging for iOS...');
        await this.initFirebaseMessagingIOS();
      } else {
        console.log('Initializing Firebase Messaging for Android...');
      }
    } catch (err) {
      console.error('❌ Firebase init error:', err);
    }

    this.pushService.init();

    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: '#4267B2' });

    document.documentElement.style.setProperty('--status-bar-height', 'env(safe-area-inset-top)');

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      console.error('Auth check failed:', error.message);
      this.navCtrl.navigateRoot('/auth/login');
      return;
    }

    if (user) {
      this.navCtrl.navigateRoot('/tabs/dashboard');
    } else {
      this.navCtrl.navigateRoot('/auth/login');
    }
  }

  private async initFirebaseMessagingIOS() {
    try {
      const perm = await FirebaseMessaging.requestPermissions();
      console.log('📲 iOS Push permission:', perm);

      const token = await FirebaseMessaging.getToken();
      console.log('✅ FCM Token (iOS):', token.token);

      FirebaseMessaging.addListener('notificationReceived', (event) => {
        console.log('📩 Notification received (iOS):', event.notification);
      });

      FirebaseMessaging.addListener('notificationActionPerformed', (event) => {
        console.log('🟢 Notification tapped (iOS):', event.notification);
      });
    } catch (error) {
      console.error('🔥 FirebaseMessaging iOS error:', error);
    }
  }

  handleDeepLinks() {
    CapacitorApp.addListener('appUrlOpen', (data: any) => {
      console.log('Deep link opened:', data.url);
      const url = new URL(data.url.replace('dlist://', 'https://dummy.com/'));
      const hash = url.hash;

      if (url.pathname === '/reset-password' && hash) {
        const queryParams = new URLSearchParams(hash.substring(1));
        const accessToken = queryParams.get('access_token');
        const type = queryParams.get('type');

        if (type === 'recovery' && accessToken) {
          supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: queryParams.get('refresh_token') || ''
          });

          this.navCtrl.navigateForward('/reset-password');
        }
      }
    });
  }
}
