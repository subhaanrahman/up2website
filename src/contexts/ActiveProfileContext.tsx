import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfileQuery";
import { supabase } from '@/infrastructure/supabase';

export interface OrganiserProfile {
  id: string;
  ownerId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  city: string | null;
  instagramHandle: string | null;
  category: string;
  openingHours: Record<string, string> | null;
  
  createdAt: string;
  updatedAt: string;
}

export interface ActiveProfile {
  id: string;
  type: "personal" | "organiser";
  displayName: string;
  avatarUrl: string | null;
}

interface ActiveProfileContextValue {
  activeProfile: ActiveProfile | null;
  switchProfile: (id: string, type: "personal" | "organiser") => void;
  organiserProfiles: OrganiserProfile[];
  isOrganiser: boolean;
  isLoading: boolean;
  refetchOrganiserProfiles: () => Promise<void>;
}

export const ActiveProfileContext = createContext<ActiveProfileContextValue | undefined>(undefined);

const STORAGE_KEY = "active_profile";

function mapOrgRow(r: any): OrganiserProfile {
  return {
    id: r.id,
    ownerId: r.owner_id,
    displayName: r.display_name,
    username: r.username,
    avatarUrl: r.avatar_url,
    bio: r.bio,
    city: r.city,
    instagramHandle: r.instagram_handle,
    category: r.category,
    openingHours: r.opening_hours || null,
    
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function personalProfileFromUserAndProfile(
  userId: string,
  user: { user_metadata?: { display_name?: string; username?: string }; email?: string },
  profile: { displayName?: string | null; avatarUrl?: string | null } | null | undefined
): ActiveProfile {
  const meta = user.user_metadata;
  return {
    id: userId,
    type: "personal",
    displayName:
      profile?.displayName ||
      meta?.display_name ||
      meta?.username ||
      user.email?.split("@")[0] ||
      "User",
    avatarUrl: profile?.avatarUrl ?? null,
  };
}

export function ActiveProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const [organiserProfiles, setOrganiserProfiles] = useState<OrganiserProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<ActiveProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const profileRef = useRef(profile);
  profileRef.current = profile;

  const lastFetchedUserId = useRef<string | null>(null);

  const fetchOrganiserProfiles = useCallback(async () => {
    if (!user) {
      setOrganiserProfiles([]);
      return;
    }

    // PARALLEL: fetch owned profiles AND accepted memberships simultaneously
    const [ownedResult, memberResult] = await Promise.all([
      supabase
        .from("organiser_profiles")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("organiser_members")
        .select("organiser_profile_id")
        .eq("user_id", user.id)
        .eq("status", "accepted"),
    ]);

    const owned = (ownedResult.data || []).map(mapOrgRow);
    const ownedIds = new Set(owned.map((o) => o.id));

    // Only fetch member org profiles if there are IDs not already in owned
    let memberProfiles: OrganiserProfile[] = [];
    const memberData = memberResult.data;
    if (memberData && memberData.length > 0) {
      const newIds = memberData
        .map((m: any) => m.organiser_profile_id)
        .filter((id: string) => !ownedIds.has(id));

      if (newIds.length > 0) {
        const { data: orgData } = await supabase
          .from("organiser_profiles")
          .select("*")
          .in("id", newIds);

        memberProfiles = (orgData || []).map(mapOrgRow);
      }
    }

    setOrganiserProfiles([...owned, ...memberProfiles]);
  }, [user?.id]);

  // Initialise active profile from localStorage or default to personal
  useEffect(() => {
    if (!user) {
      setActiveProfile(null);
      setIsLoading(false);
      lastFetchedUserId.current = null;
      return;
    }

    let cancelled = false;

    // Only show loading when fetching for a new user (avoids refresh loop on token refresh)
    if (lastFetchedUserId.current !== user.id) {
      setIsLoading(true);
    }
    lastFetchedUserId.current = user.id;

    fetchOrganiserProfiles().then(() => {
      if (cancelled) return;

      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as ActiveProfile;
          // Restore personal profile immediately
          if (parsed.type === "personal" && parsed.id === user.id) {
            setActiveProfile(parsed);
            setIsLoading(false);
            return;
          }
          // Restore organiser profile — will be validated/synced by the next effect
          if (parsed.type === "organiser") {
            setActiveProfile(parsed);
            setIsLoading(false);
            return;
          }
        } catch {
          // ignore invalid stored data
        }
      }

      // Default to personal (profile may not be loaded yet; effect will sync when it loads)
      const personal = personalProfileFromUserAndProfile(user.id, user, profileRef.current ?? null);
      setActiveProfile(personal);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(personal));
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [user?.id, fetchOrganiserProfiles]);

  // Sync personal activeProfile when profile data loads from profiles table
  useEffect(() => {
    if (!user) return;
    const personal = personalProfileFromUserAndProfile(user.id, user, profile ?? null);
    setActiveProfile((prev) => {
      if (!prev || prev.type !== "personal") return prev;
      if (prev.displayName === personal.displayName && prev.avatarUrl === personal.avatarUrl) return prev;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(personal));
      return personal;
    });
  }, [user, profile]);

  // Validate organiser profile selection after profiles are loaded
  useEffect(() => {
    if (isLoading || !user) return;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as ActiveProfile;
      if (parsed.type !== "organiser") return;

      const found = organiserProfiles.find((o) => o.id === parsed.id);
      if (found) {
        const synced: ActiveProfile = {
          id: found.id,
          type: "organiser",
          displayName: found.displayName,
          avatarUrl: found.avatarUrl,
        };
        setActiveProfile(synced);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(synced));
      } else {
        const personal = personalProfileFromUserAndProfile(user.id, user, profile ?? null);
        setActiveProfile(personal);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(personal));
      }
    } catch {
      // ignore
    }
  }, [organiserProfiles, isLoading, user, profile]);

  const switchProfile = useCallback(
    (id: string, type: "personal" | "organiser") => {
      let next: ActiveProfile;
      if (type === "personal" && user) {
        next = personalProfileFromUserAndProfile(user.id, user, profile ?? null);
      } else {
        const org = organiserProfiles.find((o) => o.id === id);
        if (!org) return;
        next = {
          id: org.id,
          type: "organiser",
          displayName: org.displayName,
          avatarUrl: org.avatarUrl,
        };
      }
      setActiveProfile(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    },
    [user, organiserProfiles, profile]
  );

  const refetchOrganiserProfiles = useCallback(async () => {
    await fetchOrganiserProfiles();
  }, [fetchOrganiserProfiles]);

  return (
    <ActiveProfileContext.Provider
      value={{
        activeProfile,
        switchProfile,
        organiserProfiles,
        isOrganiser: activeProfile?.type === "organiser",
        isLoading,
        refetchOrganiserProfiles,
      }}
    >
      {children}
    </ActiveProfileContext.Provider>
  );
}

export function useActiveProfile() {
  const ctx = useContext(ActiveProfileContext);
  if (!ctx) throw new Error("useActiveProfile must be used within ActiveProfileProvider");
  return ctx;
}
