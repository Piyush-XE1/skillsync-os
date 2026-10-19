/**
 * Google Drive "stay signed in" helpers.
 *
 * Google only hands out long-lived refresh tokens to apps that hold a client
 * secret, and a secret cannot live in the browser. These two stateless
 * functions hold it on the server: they swap a one-time sign-in code for
 * tokens, and later swap the refresh token for a fresh access token. Nothing
 * is stored server-side — the refresh token stays on the person's device.
 */
import { createServerFn } from "@tanstack/react-start";

const TOKEN_URL = "https://oauth2.googleapis.com/token";

function creds() {
  const clientId = process.env["GOOGLE_CLIENT_ID"];
  const clientSecret = process.env["GOOGLE_CLIENT_SECRET"];
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

type TokenReply = { access_token: string; refresh_token?: string; expires_in?: number };

async function tokenCall(params: Record<string, string>): Promise<TokenReply> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  });
  const text = await response.text();
  if (!response.ok) {
    console.error(`Google token call failed [${response.status}]: ${text}`);
    throw new Error(`Google refused the sign-in [${response.status}]: ${text}`);
  }
  const json = JSON.parse(text) as Partial<TokenReply>;
  if (!json.access_token) throw new Error("Google did not return an access token.");
  return json as TokenReply;
}

/** Public: the client id (not secret) and whether hands-free mode is available. */
export const getGoogleDriveConfig = createServerFn({ method: "GET" }).handler(async () => {
  const c = creds();
  return { available: Boolean(c), clientId: c?.clientId ?? null };
});

export const exchangeGoogleCode = createServerFn({ method: "POST" })
  .inputValidator((input: { code: string }) => {
    if (typeof input?.code !== "string" || input.code.length < 10 || input.code.length > 2048)
      throw new Error("Invalid sign-in code.");
    return input;
  })
  .handler(async ({ data }) => {
    const c = creds();
    if (!c) throw new Error("Hands-free Google Drive is not set up on this server.");
    return tokenCall({
      code: data.code,
      client_id: c.clientId,
      client_secret: c.clientSecret,
      redirect_uri: "postmessage",
      grant_type: "authorization_code",
    });
  });

export const refreshGoogleToken = createServerFn({ method: "POST" })
  .inputValidator((input: { refreshToken: string }) => {
    if (
      typeof input?.refreshToken !== "string" ||
      input.refreshToken.length < 10 ||
      input.refreshToken.length > 2048
    )
      throw new Error("Invalid refresh token.");
    return input;
  })
  .handler(async ({ data }) => {
    const c = creds();
    if (!c) throw new Error("Hands-free Google Drive is not set up on this server.");
    const reply = await tokenCall({
      refresh_token: data.refreshToken,
      client_id: c.clientId,
      client_secret: c.clientSecret,
      grant_type: "refresh_token",
    });
    return { access_token: reply.access_token, expires_in: reply.expires_in };
  });
