export interface EventMediaAuthContext {
  userId: string;
  hostId: string;
  organiserOwnerId?: string | null;
  isOrganiserMember?: boolean;
}

export function isEventMediaManager(ctx: EventMediaAuthContext): boolean {
  if (ctx.userId === ctx.hostId) return true;
  if (ctx.organiserOwnerId && ctx.userId === ctx.organiserOwnerId) return true;
  if (ctx.isOrganiserMember) return true;
  return false;
}
