import { Injectable } from '@angular/core';
import { supabase } from './supabase.client';

@Injectable({ providedIn: 'root' })
export class PushService {
  constructor() {}

  // ✅ Initialize (now only logs for reference)
  async init() {
    console.log('PushService initialized (Firebase removed)');
  }

  // ✅ Optional: keep token methods in case you want to use other push systems later
  async saveToken(userId: string, token: string) {
    try {
      const { error } = await supabase
        .from('user_tokens')
        .upsert(
          {
            user_id: userId,
            token,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (error) {
        console.error('❌ Error saving token:', error);
      } else {
        console.log('✅ Token saved successfully (placeholder)');
      }
    } catch (e) {
      console.error('❌ Token save exception:', e);
    }
  }

  async deleteTokens(userId: string) {
    try {
      const { error } = await supabase
        .from('user_tokens')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Error deleting tokens:', error);
      } else {
        console.log('🗑️ Tokens deleted for user:', userId);
      }
    } catch (e) {
      console.error('❌ Token delete exception:', e);
    }
  }
}
