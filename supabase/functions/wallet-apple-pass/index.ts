import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { Buffer } from "node:buffer";
import { PKPass } from "npm:passkit-generator@3.5.7";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse } from "../_shared/response.ts";

function requireEnv(name: string): string | null {
  const v = Deno.env.get(name);
  return v && v.trim() ? v.trim() : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = getRequestId(req);

  if (req.method !== "GET") {
    return errorResponse(405, "Method not allowed", { requestId });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse(401, "Not authenticated", { requestId });
    }

    const passTypeId = requireEnv("WALLET_APPLE_PASS_TYPE_IDENTIFIER");
    const teamId = requireEnv("WALLET_APPLE_TEAM_IDENTIFIER");
    const wwdrPem = requireEnv("WALLET_APPLE_WWDR_PEM");
    const signerCertPem = requireEnv("WALLET_APPLE_SIGNER_CERT_PEM");
    const signerKeyPem = requireEnv("WALLET_APPLE_SIGNER_KEY_PEM");
    const signerKeyPassphrase = Deno.env.get("WALLET_APPLE_SIGNER_KEY_PASSPHRASE") ?? "";

    if (!passTypeId || !teamId || !wwdrPem || !signerCertPem || !signerKeyPem) {
      edgeLog("warn", "wallet-apple-pass not configured", { requestId });
      return errorResponse(503, "Apple Wallet is not configured for this environment", {
        requestId,
        code: "WALLET_APPLE_UNAVAILABLE",
      });
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

    const allowed = await checkRateLimit("wallet-apple-pass", user.id, getClientIp(req));
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
      edgeLog("error", "wallet-apple-pass profile load failed", { requestId, error: String(profileErr) });
      return errorResponse(400, "Digital ID QR is not available yet", { requestId });
    }

    const orgName = requireEnv("WALLET_APPLE_ORGANIZATION_NAME") ?? "Up2";
    const displayName = (row.display_name as string) || (row.username as string) || "Member";
    const username = (row.username as string) || "user";
    const pid = row.qr_code as string;

    const passJson = {
      formatVersion: 1,
      passTypeIdentifier: passTypeId,
      teamIdentifier: teamId,
      serialNumber: `up2-digital-id-${user.id}`,
      organizationName: orgName,
      description: "Up2 Digital ID",
      logoText: "Up2",
      foregroundColor: "rgb(255,255,255)",
      backgroundColor: "rgb(17,24,39)",
      labelColor: "rgb(209,213,219)",
      generic: {
        primaryFields: [
          {
            key: "name",
            label: "NAME",
            value: displayName,
          },
        ],
        secondaryFields: [
          {
            key: "handle",
            label: "USERNAME",
            value: `@${username}`,
          },
        ],
        auxiliaryFields: [
          {
            key: "id",
            label: "ID",
            value: pid.length > 18 ? `${pid.slice(0, 10)}…${pid.slice(-6)}` : pid,
          },
        ],
      },
      barcodes: [
        {
          format: "PKBarcodeFormatQR",
          message: pid,
          messageEncoding: "iso-8859-1",
          altText: "Check-in code",
        },
      ],
    };

    const icon = await Deno.readFile(new URL("./assets/icon.png", import.meta.url));
    const icon2x = await Deno.readFile(new URL("./assets/icon@2x.png", import.meta.url));
    const logo = await Deno.readFile(new URL("./assets/logo.png", import.meta.url));
    const logo2x = await Deno.readFile(new URL("./assets/logo@2x.png", import.meta.url));

    const pass = new PKPass(
      {
        "pass.json": Buffer.from(JSON.stringify(passJson)),
        "icon.png": Buffer.from(icon),
        "icon@2x.png": Buffer.from(icon2x),
        "logo.png": Buffer.from(logo),
        "logo@2x.png": Buffer.from(logo2x),
      },
      {
        wwdr: Buffer.from(wwdrPem, "utf-8"),
        signerCert: Buffer.from(signerCertPem, "utf-8"),
        signerKey: Buffer.from(signerKeyPem, "utf-8"),
        signerKeyPassphrase: signerKeyPassphrase,
      },
    );

    const buf = pass.getAsBuffer();

    return new Response(buf, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": 'attachment; filename="up2-digital-id.pkpass"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    edgeLog("error", "wallet-apple-pass error", { requestId, error: String(err) });
    return errorResponse(500, "Failed to build Apple Wallet pass", { requestId });
  }
});
