import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { supabase } from './supabase.client';

@Injectable({ providedIn: 'root' })
export class PushService {
  constructor() {}

  async init() {
    console.log('📲 Initializing Push Service...');

    try {
      // ✅ Request permission
      const perm = await FirebaseMessaging.requestPermissions();
      if (perm.receive !== 'granted') {
        console.warn('⚠️ Push permission not granted:', perm);
        return;
      }

      // ✅ Get FCM token
      const token = await FirebaseMessaging.getToken();
      console.log('✅ Got FCM token:', token.token);

      // ✅ Save to Supabase
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        await this.saveToken(data.user.id, token.token);
      } else {
        console.log('⚠️ User not logged in — token not saved yet');
      }

      // ✅ Listen for notifications
      this.setupListeners();
    } catch (err) {
      console.error('❌ Push init failed:', err);
    }
  }

  private setupListeners() {
    // When a notification is received in foreground
    FirebaseMessaging.addListener('notificationReceived', (event) => {
      console.log('📩 Notification received:', event.notification);
    });

    // When user taps a notification
    FirebaseMessaging.addListener('notificationActionPerformed', (event) => {
      console.log('🟢 Notification action tapped:', event.notification);
      // Optional: Handle navigation or actions
    });

    // Token refresh listener
    FirebaseMessaging.addListener('tokenReceived', async (token) => {
      console.log('🔁 New FCM token:', token.token);
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        await this.saveToken(data.user.id, token.token);
      }
    });
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
      console.error('❌ Error saving token:', error.message);
    } else {
      console.log('✅ Token saved successfully to Supabase');
    }
  }

  async deleteTokens(userId: string) {
    const { error } = await supabase
      .from('user_tokens')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Error deleting tokens:', error.message);
    } else {
      console.log('🗑️ Token deleted from Supabase');
    }
  }
}
