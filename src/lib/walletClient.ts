import { supabase } from "@/infrastructure/supabase";
import { config } from "@/infrastructure/config";
import { parseApiError, AuthError } from "@/infrastructure/errors";

/** GET signed .pkpass from Edge Function and trigger browser download. */
export async function downloadAppleWalletPass(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    throw new AuthError("Not signed in");
  }

  const res = await fetch(`${config.functionsUrl}/wallet-apple-pass`, {
    method: "GET",
    headers: {
      apikey: config.supabase.anonKey,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw parseApiError(res.status, json);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "up2-digital-id.pkpass";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
