import { supabase } from '@/infrastructure/supabase';
import { createLogger } from '@/infrastructure/logger';
import { callEdgeFunction } from '@/infrastructure/api-client';

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
    await callEdgeFunction('organiser-team-manage', {
      body: {
        action: 'invite',
        organiser_profile_id: params.organiserProfileId,
        target_user_id: params.targetUserId,
        role: params.role,
      },
    });
  },

  async removeMember(memberId: string) {
    log.info('removeMember', { memberId });
    await callEdgeFunction('organiser-team-manage', {
      body: { action: 'remove', member_id: memberId },
    });
  },

  async updateRole(memberId: string, newRole: string) {
    log.info('updateRole', { memberId, newRole });
    await callEdgeFunction('organiser-team-manage', {
      body: { action: 'update-role', member_id: memberId, role: newRole },
    });
  },
};
