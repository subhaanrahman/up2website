import { supabase } from '@/infrastructure/supabase';
import { createLogger } from '@/infrastructure/logger';

const log = createLogger('notifications.repository');

export const notificationsRepository = {
  async deleteNotification(notificationId: string) {
    log.info('deleteNotification', { notificationId });
    const { error } = await supabase.from('notifications').delete().eq('id', notificationId);
    if (error) throw error;
  },
};
