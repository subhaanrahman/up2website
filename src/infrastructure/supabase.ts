// Thin wrapper re-exporting the auto-generated Supabase client
// All repository files should import from here, NOT from @/integrations/supabase/client directly.
// This gives us a single seam to swap/mock the client in tests.

export { supabase } from '@/integrations/supabase/client';
export type { Database } from '@/integrations/supabase/types';
