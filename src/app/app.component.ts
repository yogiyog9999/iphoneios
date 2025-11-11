import { Component } from '@angular/core';
import { supabase } from './services/supabase.client';
import { PushService } from './services/push.service';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Platform, NavController } from '@ionic/angular';
import { Device } from '@capacitor/device';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

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
      console.log('Initializing Push Service...');
      this.pushService.init(); // 🔔 Use your custom push service
    } catch (err) {
      console.error('❌ Push init error:', err);
    }

    // ✅ Configure Status Bar
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: '#4267B2' });

    document.documentElement.style.setProperty('--status-bar-height', 'env(safe-area-inset-top)');

    // ✅ Check user session via Supabase
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

  // ✅ Handle deep links (Supabase password recovery, etc.)
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
