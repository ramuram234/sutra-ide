/** PKCE + Keycloak authorization-code helpers (public client, no secret in the browser). */

function b64url(bytes: Uint8Array) {
  let s = "";
  bytes.forEach((b) => {
    s += String.fromCharCode(b);
  });
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function pkcePair() {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  const challenge = b64url(new Uint8Array(digest));
  return { verifier, challenge };
}

export function keycloakAuthUrl(opts: {
  issuer: string;
  realm: string;
  clientId: string;
  redirectUri: string;
  challenge: string;
  state: string;
}) {
  const base = `${opts.issuer.replace(/\/$/, "")}/realms/${opts.realm}/protocol/openid-connect/auth`;
  const q = new URLSearchParams({
    client_id: opts.clientId,
    redirect_uri: opts.redirectUri,
    response_type: "code",
    scope: "openid profile email",
    code_challenge: opts.challenge,
    code_challenge_method: "S256",
    state: opts.state,
  });
  return `${base}?${q.toString()}`;
}

export function keycloakTokenUrl(issuer: string, realm: string) {
  return `${issuer.replace(/\/$/, "")}/realms/${realm}/protocol/openid-connect/token`;
}

export type OidcUser = {
  sub: string;
  email?: string;
  name?: string;
  preferred_username?: string;
};

export function parseIdToken(idToken: string): OidcUser | null {
  try {
    const payload = idToken.split(".")[1];
    if (!payload) return null;
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as OidcUser;
    return json.sub ? json : null;
  } catch {
    return null;
  }
}
