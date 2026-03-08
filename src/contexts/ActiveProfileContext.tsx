import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

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
  tags: string[];
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

const ActiveProfileContext = createContext<ActiveProfileContextValue | undefined>(undefined);

const STORAGE_KEY = "active_profile";

export function ActiveProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [organiserProfiles, setOrganiserProfiles] = useState<OrganiserProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<ActiveProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrganiserProfiles = useCallback(async () => {
    if (!user) {
      setOrganiserProfiles([]);
      return;
    }

    // Fetch owned profiles
    const { data: ownedData } = await supabase
      .from("organiser_profiles")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true });

    const owned = (ownedData || []).map((r: any) => ({
      id: r.id,
      ownerId: r.owner_id,
      displayName: r.display_name,
      username: r.username,
      avatarUrl: r.avatar_url,
      bio: r.bio,
      city: r.city,
      instagramHandle: r.instagram_handle,
      category: r.category,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    // Fetch accepted memberships
    const { data: memberData } = await supabase
      .from("organiser_members")
      .select("organiser_profile_id")
      .eq("user_id", user.id)
      .eq("status", "accepted");

    let memberProfiles: OrganiserProfile[] = [];
    if (memberData && memberData.length > 0) {
      const memberOrgIds = memberData.map((m: any) => m.organiser_profile_id);
      const ownedIds = new Set(owned.map((o) => o.id));
      const newIds = memberOrgIds.filter((id: string) => !ownedIds.has(id));

      if (newIds.length > 0) {
        const { data: orgData } = await supabase
          .from("organiser_profiles")
          .select("*")
          .in("id", newIds);

        memberProfiles = (orgData || []).map((r: any) => ({
          id: r.id,
          ownerId: r.owner_id,
          displayName: r.display_name,
          username: r.username,
          avatarUrl: r.avatar_url,
          bio: r.bio,
          city: r.city,
          instagramHandle: r.instagram_handle,
          category: r.category,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));
      }
    }

    setOrganiserProfiles([...owned, ...memberProfiles]);
  }, [user]);

  // Initialise active profile from localStorage or default to personal
  useEffect(() => {
    if (!user) {
      setActiveProfile(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    setIsLoading(true);
    fetchOrganiserProfiles().then(() => {
      if (cancelled) return;

      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as ActiveProfile;
          // Verify it still belongs to this user
          if (parsed.type === "personal" && parsed.id === user.id) {
            setActiveProfile(parsed);
            setIsLoading(false);
            return;
          }
        } catch {
          // ignore invalid stored data
        }
      }

      // Default to personal
      const personal: ActiveProfile = {
        id: user.id,
        type: "personal",
        displayName: user.user_metadata?.display_name || user.email?.split("@")[0] || "User",
        avatarUrl: null,
      };
      setActiveProfile(personal);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(personal));
      setIsLoading(false);
    });

    return () => { cancelled = true; };
  }, [user, fetchOrganiserProfiles]);

  // Validate organiser profile selection after profiles are loaded
  useEffect(() => {
    if (isLoading || !user || organiserProfiles.length === 0) return;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as ActiveProfile;
      if (parsed.type !== "organiser") return;

      const found = organiserProfiles.find((o) => o.id === parsed.id);
      if (found) {
        // Valid organiser profile — set it with fresh data
        const synced: ActiveProfile = {
          id: found.id,
          type: "organiser",
          displayName: found.displayName,
          avatarUrl: found.avatarUrl,
        };
        setActiveProfile(synced);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(synced));
      } else {
        // Organiser profile no longer accessible — fall back to personal
        const personal: ActiveProfile = {
          id: user.id,
          type: "personal",
          displayName: user.user_metadata?.display_name || user.email?.split("@")[0] || "User",
          avatarUrl: null,
        };
        setActiveProfile(personal);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(personal));
      }
    } catch {
      // ignore
    }
  }, [organiserProfiles, isLoading, user]);

  const switchProfile = useCallback(
    (id: string, type: "personal" | "organiser") => {
      let profile: ActiveProfile;
      if (type === "personal" && user) {
        profile = {
          id: user.id,
          type: "personal",
          displayName: user.user_metadata?.display_name || user.email?.split("@")[0] || "User",
          avatarUrl: null,
        };
      } else {
        const org = organiserProfiles.find((o) => o.id === id);
        if (!org) return;
        profile = {
          id: org.id,
          type: "organiser",
          displayName: org.displayName,
          avatarUrl: org.avatarUrl,
        };
      }
      setActiveProfile(profile);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    },
    [user, organiserProfiles]
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
