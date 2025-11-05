import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { ToastController, Platform } from '@ionic/angular';
import { PushNotifications, Token, PermissionStatus } from '@capacitor/push-notifications';

@Component({
  standalone: false,
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage implements OnInit {
  hideNameOnReviews = false;
  allowPushNotifications = false;
  isUpdating = false;

  constructor(
    private authService: AuthService,
    private toastCtrl: ToastController,
    private platform: Platform
  ) {}

  async ngOnInit() {
    await this.loadPreferences();
  }

  async loadPreferences() {
    const user = await this.authService.currentUser();
    if (!user) return;

    const prefs = await this.authService.getPreferences(user.id);
    if (prefs) {
      this.hideNameOnReviews = prefs.hide_name ?? false;
      this.allowPushNotifications = prefs.allow_push ?? false;
    }
  }

  async updatePreferences() {
    if (this.isUpdating) return;
    this.isUpdating = true;

    const user = await this.authService.currentUser();
    if (!user) {
      await this.showToast('User not logged in', 'danger');
      this.isUpdating = false;
      return;
    }

    try {
      // handle push notification permission
      if (this.allowPushNotifications) {
        await this.enablePushNotifications(user.id);
      } else {
        await this.disablePushNotifications(user.id);
      }

      // update DB preference
      await this.authService.updatePreferences(user.id, {
        hide_name: this.hideNameOnReviews,
        allow_push: this.allowPushNotifications,
      });

      await this.showToast('✅ Preferences updated successfully', 'success');
    } catch (error) {
      console.error('Error updating preferences:', error);
      await this.showToast('⚠️ Error updating preferences', 'danger');
    } finally {
      this.isUpdating = false;
    }
  }

  // 🔔 Enable Push Notifications
  async enablePushNotifications(userId: string) {
    if (!this.platform.is('capacitor')) {
      console.log('Push notifications not supported on web');
      return;
    }

    const permissionStatus: PermissionStatus = await PushNotifications.requestPermissions();
    if (permissionStatus.receive === 'granted') {
      await PushNotifications.register();

      PushNotifications.addListener('registration', async (token: Token) => {
        console.log('Push registration success:', token.value);
        // Save token in your DB for this user
        await this.authService.saveFcmToken(userId, token.value);
      });

      PushNotifications.addListener('registrationError', (error) => {
        console.error('Push registration error:', error);
      });

      await this.showToast('Push notifications enabled', 'success');
    } else {
      this.allowPushNotifications = false; // revert toggle
      await this.showToast('Permission denied for notifications', 'warning');
    }
  }

  // 🔕 Disable Push Notifications
  async disablePushNotifications(userId: string) {
    if (!this.platform.is('capacitor')) return;

    try {
      // Optionally remove token from backend
      await this.authService.removeFcmToken(userId);
      await this.showToast('Push notifications disabled', 'warning');
    } catch (err) {
      console.error('Error removing FCM token:', err);
    }
  }

  async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'bottom',
      cssClass: 'custom-toast',
      buttons: [{ text: 'OK', role: 'cancel' }],
    });
    await toast.present();
  }
}
