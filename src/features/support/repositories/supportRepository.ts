import { supabase } from '@/infrastructure/supabase';
import { createLogger } from '@/infrastructure/logger';

const log = createLogger('support.repository');

export const supportRepository = {
  async submitContactMessage(params: { userId: string | null; subject: string; message: string }) {
    log.info('submitContactMessage', { userId: params.userId, subject: params.subject });
    const { error } = await supabase.from('contact_messages').insert({
      user_id: params.userId,
      subject: params.subject,
      message: params.message,
    });
    if (error) throw error;
  },
};
