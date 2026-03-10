// Social module — friend recommendations, feed ranking, feed service
export { getSuggestedFriends } from './services/recommendationService';
export type { SuggestedProfile } from './services/recommendationService';
export { buildFeedContext, fetchFeedPage, fetchPublicFeedPage, fetchNearbyEvents } from './services/feedService';
export type { ScoredPost, FeedPage, FeedContext } from './services/feedService';
