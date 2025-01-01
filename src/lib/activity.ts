import { supabase } from './supabase';

export type ActivityAction = 
  | 'login'
  | 'logout'
  | 'upload_design'
  | 'create_matching'
  | 'download_matching'
  | 'delete_design'
  | 'delete_matching'
  | 'update_design';

export const activity = {
  async log(action: ActivityAction, details: Record<string, any> = {}) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('activity_log')
        .insert({
          user_id: user.id,
          action,
          details
        });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }
};
