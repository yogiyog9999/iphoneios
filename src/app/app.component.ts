import { Component } from '@angular/core';
import { supabase } from './services/supabase.client';
import { PushService } from './services/push.service';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Platform, NavController } from '@ionic/angular';  
import { Device } from '@capacitor/device';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { FirebaseMessaging } from '@capacitor-firebase/messaging'; // ✅ New

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
      // ✅ Initialize Firebase Messaging for iOS safely
      if (Capacitor.getPlatform() === 'ios') {
        console.log('Initializing Firebase Messaging for iOS...');
        await this.initFirebaseMessagingIOS();
      } else {
        console.log('Skipping Firebase init for Android...');
      }
    } catch (err) {
      console.error('❌ Firebase init error:', err);
    }

    // ✅ Start push service after platform + Firebase ready
    this.pushService.init();

    // ✅ Status bar overlay ON
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: '#4267B2' });

    // ✅ Safe area
    document.documentElement.style.setProperty('--status-bar-height', 'env(safe-area-inset-top)');

    // ✅ Auth check
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

  /**
   * ✅ Initialize Firebase Messaging (for iOS only)
   */
  private async initFirebaseMessagingIOS() {
    try {
      // Request permission (iOS only)
      const perm = await FirebaseMessaging.requestPermissions();
      console.log('📲 iOS Push permission:', perm);

      // Get FCM token (for notifications)
      const token = await FirebaseMessaging.getToken();
      console.log('✅ FCM Token (iOS):', token.token);

      // Optional: save token to Supabase or your backend
      // await this.pushService.saveToken(token.token);

      // Listen for notifications
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
