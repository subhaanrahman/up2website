import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/infrastructure/supabase';

// ─── Report submission ───
export type ReportTargetType = 'post' | 'user' | 'organiser_profile' | 'event' | 'message';

interface ReportInput {
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  description?: string;
}

export function useSubmitReport() {
  return useMutation({
    mutationFn: async (input: ReportInput) => {
      const { data, error } = await supabase.functions.invoke('report-create', {
        body: {
          target_type: input.targetType,
          target_id: input.targetId,
          reason: input.reason,
          description: input.description,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
  });
}

// ─── Support / feedback submission ───
export type SupportCategory = 'general' | 'bug' | 'feature_request' | 'account' | 'billing' | 'safety' | 'other';

interface SupportRequestInput {
  category?: SupportCategory;
  subject: string;
  message: string;
  contextMetadata?: Record<string, unknown>;
}

export function useSubmitSupportRequest() {
  return useMutation({
    mutationFn: async (input: SupportRequestInput) => {
      const { data, error } = await supabase.functions.invoke('support-request-create', {
        body: {
          category: input.category,
          subject: input.subject,
          message: input.message,
          context_metadata: input.contextMetadata,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
  });
}
