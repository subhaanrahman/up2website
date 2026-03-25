import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfileQuery";
import ProfileQrModal from "@/components/ProfileQrModal";

type DigitalIdSheetContextValue = {
  openDigitalIdSheet: () => void;
};

const DigitalIdSheetContext = createContext<DigitalIdSheetContextValue | null>(null);

export function DigitalIdSheetProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const [open, setOpen] = useState(false);

  const openDigitalIdSheet = useCallback(() => setOpen(true), []);

  const value = useMemo(
    () => ({ openDigitalIdSheet }),
    [openDigitalIdSheet],
  );

  const profileUrl =
    typeof window !== "undefined" && user
      ? `${window.location.origin}/user/${user.id}`
      : "";

  const displayName = profile?.displayName || "";
  const username =
    profile?.username ||
    displayName ||
    user?.phone ||
    user?.email?.split("@")[0] ||
    "User";

  return (
    <DigitalIdSheetContext.Provider value={value}>
      {children}
      <ProfileQrModal
        open={open}
        onOpenChange={setOpen}
        displayName={displayName}
        username={username}
        avatarUrl={profile?.avatarUrl || undefined}
        profileUrl={profileUrl}
        digitalIdQrPayload={profile?.qrCode ?? null}
      />
    </DigitalIdSheetContext.Provider>
  );
}

export function useDigitalIdSheet(): DigitalIdSheetContextValue {
  const ctx = useContext(DigitalIdSheetContext);
  if (!ctx) {
    throw new Error("useDigitalIdSheet must be used within DigitalIdSheetProvider");
  }
  return ctx;
}
