import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { SignJWT, importPKCS8 } from "npm:jose@5.9.6";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";

type ServiceAccount = {
  client_email: string;
  private_key: string;
};

function parseServiceAccount(): ServiceAccount | null {
  const raw = Deno.env.get("GOOGLE_WALLET_SERVICE_ACCOUNT_JSON");
  if (!raw?.trim()) return null;
  try {
    return JSON.parse(raw) as ServiceAccount;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = getRequestId(req);

  if (req.method !== "POST") {
    return errorResponse(405, "Method not allowed", { requestId });
  }

  try {
    const issuerId = Deno.env.get("GOOGLE_WALLET_ISSUER_ID")?.trim();
    const classIdFull = Deno.env.get("GOOGLE_WALLET_GENERIC_CLASS_ID")?.trim();
    const reqOrigin = req.headers.get("Origin")?.trim();
    const originAllow =
      Deno.env.get("GOOGLE_WALLET_ALLOWED_ORIGIN")?.trim()
      ?? Deno.env.get("WALLET_WEB_ORIGIN")?.trim()
      ?? reqOrigin;

    const sa = parseServiceAccount();
    if (!issuerId || !classIdFull || !sa?.client_email || !sa?.private_key) {
      edgeLog("warn", "wallet-google-save not configured", { requestId });
      return errorResponse(503, "Google Wallet is not configured for this environment", {
        requestId,
        code: "WALLET_GOOGLE_UNAVAILABLE",
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse(401, "Not authenticated", { requestId });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return errorResponse(401, "Invalid token", { requestId });
    }

    const allowed = await checkRateLimit("wallet-google-save", user.id, getClientIp(req));
    if (!allowed) return rateLimitResponse(corsHeaders);

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: row, error: profileErr } = await serviceClient
      .from("profiles")
      .select("qr_code, display_name, username")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileErr || !row?.qr_code) {
      edgeLog("error", "wallet-google-save profile load failed", { requestId, error: String(profileErr) });
      return errorResponse(400, "Digital ID QR is not available yet", { requestId });
    }

    const displayName = (row.display_name as string) || (row.username as string) || "Member";
    const username = (row.username as string) || "user";
    const pid = row.qr_code as string;

    const objectId = `${issuerId}.up2_digital_id_${user.id.replace(/-/g, "")}`;

    const genericObject = {
      id: objectId,
      classId: classIdFull,
      hexBackgroundColor: "#111827",
      cardTitle: {
        defaultValue: {
          language: "en-US",
          value: "Up2 Digital ID",
        },
      },
      subheader: {
        defaultValue: {
          language: "en-US",
          value: `@${username}`,
        },
      },
      header: {
        defaultValue: {
          language: "en-US",
          value: displayName,
        },
      },
      barcode: {
        type: "QR_CODE",
        value: pid,
        alternateText: "Check-in code",
      },
    };

    const origins = originAllow ? [originAllow] : [];

    const privateKey = await importPKCS8(sa.private_key, "RS256");

    // Google "Save to Google Wallet" JWT — claims per
    // https://developers.google.com/wallet/generic/web/prerequisites
    const jwt = await new SignJWT({
      typ: "savetowallet",
      origins,
      payload: {
        genericObjects: [genericObject],
      },
    })
      .setProtectedHeader({ alg: "RS256" })
      .setIssuer(sa.client_email)
      .setAudience("google")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(privateKey);

    const saveUrl = `https://pay.google.com/gp/v/save/${jwt}`;

    return successResponse({ saveUrl }, requestId);
  } catch (err) {
    edgeLog("error", "wallet-google-save error", { requestId, error: String(err) });
    return errorResponse(500, "Failed to create Google Wallet link", { requestId });
  }
});
