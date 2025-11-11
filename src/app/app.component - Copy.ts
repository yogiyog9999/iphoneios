import { Component } from '@angular/core';
import { Platform, NavController } from '@ionic/angular';
import { supabase } from './services/supabase.client';
import { PushService } from './services/push.service';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Device } from '@capacitor/device';
import { App as CapacitorApp } from '@capacitor/app';

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
  }

  async initializeApp() {
    await this.platform.ready();

    await StatusBar.setOverlaysWebView({ overlay: true });

    // Use light icons on dark header background
    await StatusBar.setStyle({ style: Style.Light });

    // Set transparent background to blend with header color
    await StatusBar.setBackgroundColor({ color: 'transparent' });

    // ✅ Initialize PushNotifications
    this.pushService.init();

    // ✅ Supabase auth check
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      console.log('User not logged in');
      this.navCtrl.navigateRoot('/auth/login');
    } else {
      this.navCtrl.navigateRoot('/tabs/dashboard');
    }

    // ✅ Listen for deep links
    this.handleDeepLinks();
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
