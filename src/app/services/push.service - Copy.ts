import { Injectable } from '@angular/core';
import { PushNotifications, Token, PushNotificationSchema } from '@capacitor/push-notifications';
import { supabase } from './supabase.client';

@Injectable({ providedIn: 'root' })
export class PushService {
  constructor() {}

  async init() {
    console.log('🔔 Initializing PushNotifications...');
    try {
      // Request permission
      let permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.warn('Push permission not granted');
        return;
      }

      // Register with FCM/APNs
      await PushNotifications.register();

      // Device token received
      PushNotifications.addListener('registration', async (token: Token) => {
        console.log('✅ Got push token:', token.value);

        const { data } = await supabase.auth.getUser();
        if (data.user) {
          await this.saveToken(data.user.id, token.value);
        }
      });

      PushNotifications.addListener('registrationError', (error) => {
        console.error('❌ Push registration error:', error);
      });

      // Foreground notifications
      PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
        console.log('📩 Notification received:', notification);
      });

      // Tapped notifications
      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('📲 Notification action performed:', notification);
      });
    } catch (err) {
      console.error('Push initialization failed:', err);
    }
  }

  async saveToken(userId: string, fcmToken: string) {
    const { error } = await supabase
      .from('user_tokens')
      .upsert(
        {
          user_id: userId,
          fcm_token: fcmToken,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (error) {
      console.error('❌ Error saving token:', error);
    } else {
      console.log('✅ Token saved for user:', userId);
    }
  }

  async deleteTokens(userId: string) {
    const { error } = await supabase
      .from('user_tokens')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Error deleting tokens:', error);
    } else {
      console.log('🗑️ Push token deleted');
    }
  }
}
