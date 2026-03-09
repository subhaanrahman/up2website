// Identity domain types

export interface UserProfile {
  id: string;
  userId: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  email: string | null;
  avatarUrl: string | null;
  bio: string | null;
  city: string | null;
  pageClassification: string | null;
  instagramHandle: string | null;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileInput {
  displayName?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  bio?: string;
  city?: string;
  pageClassification?: string;
  avatarUrl?: string;
  instagramHandle?: string | null;
}
