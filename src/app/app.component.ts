import { Component } from '@angular/core';
import { supabase } from './services/supabase.client';
import { PushService } from './services/push.service';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Platform, NavController, ToastController } from '@ionic/angular';
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
    private navCtrl: NavController,
    private toastCtrl: ToastController
  ) {
    this.initializeApp();
    this.handleDeepLinks();
  }

  async showToast(message: string) {
    console.log('Toast:', message);
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'top',
      color: 'primary'
    });
    await toast.present();
  }

  async initializeApp() {
    await this.platform.ready();
    await this.showToast('✅ Platform ready');
    if (this.platform.is('ios')) {
  await StatusBar.setOverlaysWebView({ overlay: false });
} else {
  await StatusBar.setOverlaysWebView({ overlay: true });
}

    try {
      console.log('Initializing Push Service...');
      await this.pushService.init();
      await this.showToast('🔔 Push service initialized');
    } catch (err) {
      console.error('❌ Push init error:', err);
      await this.showToast('❌ Push init error');
    }

    // ✅ Status bar setup
    try {
      await StatusBar.setOverlaysWebView({ overlay: true });
      await StatusBar.setStyle({ style: Style.Light });
      await StatusBar.setBackgroundColor({ color: '#4267B2' });
      document.documentElement.style.setProperty('--status-bar-height', 'env(safe-area-inset-top)');
      await this.showToast('🎨 Safe area + status bar set');
    } catch (e) {
      console.error('StatusBar error:', e);
      await this.showToast('⚠️ StatusBar error');
    }

    // ✅ Check Supabase session
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      console.error('Auth check failed:', error.message);
      await this.showToast('🔐 Auth check failed');
      this.navCtrl.navigateRoot('/auth/login');
      return;
    }

    if (user) {
      console.log('User logged in:', user.email);
      await this.showToast(`👋 Welcome ${user.email}`);
      this.navCtrl.navigateRoot('/tabs/dashboard');
    } else {
      await this.showToast('👤 No user found, redirecting to login');
      this.navCtrl.navigateRoot('/auth/login');
    }
  }

  handleDeepLinks() {
    CapacitorApp.addListener('appUrlOpen', (data: any) => {
      console.log('Deep link opened:', data.url);
      alert('Deep link opened: ' + data.url);

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
          alert('🔑 Password reset session set!');
        }
      }
    });
  }
}
