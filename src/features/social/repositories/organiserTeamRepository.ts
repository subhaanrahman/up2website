import { supabase } from '@/infrastructure/supabase';
import { createLogger } from '@/infrastructure/logger';

const log = createLogger('organiser-team.repository');

export const organiserTeamRepository = {
  async getMembers(organiserProfileId: string) {
    const { data, error } = await supabase
      .from('organiser_members')
      .select('*')
      .eq('organiser_profile_id', organiserProfileId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async inviteMember(params: {
    organiserProfileId: string;
    targetUserId: string;
    role: string;
    invitedBy: string;
  }) {
    log.info('inviteMember', { organiserProfileId: params.organiserProfileId, targetUserId: params.targetUserId, role: params.role });
    const { error } = await supabase.from('organiser_members').insert({
      organiser_profile_id: params.organiserProfileId,
      user_id: params.targetUserId,
      role: params.role,
      invited_by: params.invitedBy,
      status: 'pending',
    });
    if (error) throw error;
  },

  async removeMember(memberId: string) {
    log.info('removeMember', { memberId });
    const { error } = await supabase.from('organiser_members').delete().eq('id', memberId);
    if (error) throw error;
  },

  async updateRole(memberId: string, newRole: string) {
    log.info('updateRole', { memberId, newRole });
    const { error } = await supabase
      .from('organiser_members')
      .update({ role: newRole })
      .eq('id', memberId);
    if (error) throw error;
  },
};
