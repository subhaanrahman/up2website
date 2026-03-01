// Centralized authorization helpers for Edge Functions
// These are designed to be used server-side (Deno Edge Functions)
// Import pattern: copy/paste into edge functions or share via _shared/

/**
 * Extract and verify the authenticated user from a Supabase client.
 * Throws if not authenticated.
 */
export async function requireAuth(supabase: any): Promise<{ id: string; email: string }> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new AuthError('Not authenticated', 401);
  }
  return { id: user.id, email: user.email ?? '' };
}

/**
 * Require the user to have a specific role in their profile.
 * Checks the `page_classification` field (e.g., 'organizer', 'admin').
 */
export async function requireRole(
  supabase: any,
  userId: string,
  role: string,
): Promise<void> {
  const { data, error } = await supabase
    .from('profiles')
    .select('page_classification')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new AuthError('Failed to check role', 500);
  if (!data || data.page_classification !== role) {
    throw new AuthError(`Role '${role}' required`, 403);
  }
}

/**
 * Require the user to be the host/owner of a specific event.
 */
export async function requireEventOwner(
  supabase: any,
  userId: string,
  eventId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from('events')
    .select('host_id')
    .eq('id', eventId)
    .maybeSingle();

  if (error) throw new AuthError('Failed to check event ownership', 500);
  if (!data) throw new AuthError('Event not found', 404);
  if (data.host_id !== userId) {
    throw new AuthError('You are not the owner of this event', 403);
  }
}

/**
 * Typed authorization error with HTTP status code.
 */
export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

/**
 * Helper to create error responses from AuthError in edge functions.
 */
export function authErrorResponse(err: unknown, corsHeaders: Record<string, string>): Response {
  if (err instanceof AuthError) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: err.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  return new Response(JSON.stringify({ error: 'Internal server error' }), {
    status: 500,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
