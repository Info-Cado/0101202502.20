import { supabase } from './supabase';
import { activity } from './activity';

export interface User {
  id: string;
  username: string;
}

export const auth = {
  async login(username: string, password: string) {
    try {
      // Handle login with email format
      const email = username.includes('@') ? username : `${username}@matchingmaster.com`;
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      // Update last login timestamp
      const { error: updateError } = await supabase
        .from('user_settings')
        .update({ last_login: new Date().toISOString() })
        .eq('id', data.user.id);

      if (updateError) {
        console.error('Failed to update last login:', updateError);
      }

      // Log login activity
      await activity.log('login');

      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  async logout() {
    const { error } = await supabase.auth.signOut();
    await activity.log('logout');
    if (error) throw error;
  },

  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: settings, error } = await supabase
        .from('user_settings')
        .select('username')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Failed to fetch user settings:', error);
        return null;
      }

      return settings ? {
        id: user.id,
        username: settings.username
      } : null;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  },

  onAuthStateChange(callback: (user: User | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          const { data: settings, error } = await supabase
            .from('user_settings')
            .select('username')
            .eq('id', session.user.id)
            .single();

          if (error) {
            console.error('Failed to fetch user settings:', error);
            callback(null);
            return;
          }

          callback(settings ? {
            id: session.user.id,
            username: settings.username
          } : null);
        } catch (error) {
          console.error('Auth state change error:', error);
          callback(null);
        }
      } else if (event === 'SIGNED_OUT') {
        callback(null);
      }
    });
  }
};
