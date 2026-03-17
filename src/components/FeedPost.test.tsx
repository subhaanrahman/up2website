import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import FeedPost from './FeedPost';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}));

vi.mock('@/hooks/usePostInteractions', () => ({
  usePostInteractions: () => ({
    likeCount: 0,
    repostCount: 0,
    isLiked: false,
    isReposted: false,
    reactionType: null,
    reactionBreakdown: null,
    handleReact: vi.fn(),
    handleUnreact: vi.fn(),
    toggleRepost: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

vi.mock('@/features/social/repositories/postsRepository', () => ({
  postsRepository: {
    deletePost: vi.fn().mockResolvedValue(undefined),
    reportPost: vi.fn().mockResolvedValue(undefined),
    blockUser: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('FeedPost', () => {
  it('renders post content', () => {
    renderWithProviders(
      <FeedPost
        postId="p1"
        authorId="user1"
        displayName="John Doe"
        username="johndoe"
        avatarUrl={null}
        content="Hello world!"
        createdAt="2026-01-15T12:00:00Z"
      />,
    );

    expect(screen.getByText('Hello world!')).toBeInTheDocument();
    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText(/@johndoe/)).toBeInTheDocument();
  });

  it('renders event data when provided', () => {
    renderWithProviders(
      <FeedPost
        postId="p1"
        authorId="user1"
        displayName="Jane"
        username="jane"
        avatarUrl={null}
        content="Check out this event"
        createdAt="2026-01-15T12:00:00Z"
        eventData={{
          id: 'ev1',
          title: 'Concert Night',
          event_date: '2026-06-20T19:00:00Z',
          location: 'Sydney',
          cover_image: null,
        }}
      />,
    );

    expect(screen.getByText('Check out this event')).toBeInTheDocument();
    expect(screen.getByText('Concert Night')).toBeInTheDocument();
  });

  it('renders reposted by when provided', () => {
    renderWithProviders(
      <FeedPost
        postId="p1"
        authorId="user1"
        displayName="Alice"
        username="alice"
        avatarUrl={null}
        content="Reposted content"
        createdAt="2026-01-15T12:00:00Z"
        repostedBy="Bob"
      />,
    );

    expect(screen.getByText(/Bob reposted/)).toBeInTheDocument();
  });
});
