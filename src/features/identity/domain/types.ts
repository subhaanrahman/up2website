// Identity domain types

export interface UserProfile {
  id: string;
  userId: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  bio: string | null;
  city: string | null;
  pageClassification: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileInput {
  displayName?: string;
  username?: string;
  bio?: string;
  city?: string;
  pageClassification?: string;
  avatarUrl?: string;
}
