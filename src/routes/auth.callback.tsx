import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { keycloakTokenUrl, parseIdToken } from "@/lib/sutra/oidc";
import { saveUser } from "@/lib/sutra/identity";

export const Route = createFileRoute("/auth/callback")({ component: Callback });

function Callback() {
  const navigate = useNavigate();
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const state = params.get("state");
      const raw = sessionStorage.getItem("sutra.pkce");
      if (!code || !raw) {
        setErr("Missing authorization code. Start again from Settings → Identity.");
        return;
      }
      const pkce = JSON.parse(raw) as {
        verifier: string;
        state: string;
        issuer: string;
        realm: string;
        clientId: string;
      };
      if (pkce.state !== state) {
        setErr("State mismatch.");
        return;
      }
      const body = new URLSearchParams({
        grant_type: "authorization_code",
        client_id: pkce.clientId,
        code,
        redirect_uri: `${window.location.origin}/auth/callback`,
        code_verifier: pkce.verifier,
      });
      const res = await fetch(keycloakTokenUrl(pkce.issuer, pkce.realm), {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      if (!res.ok) {
        setErr(`Token exchange failed (${res.status}). Check Keycloak client and redirect URI.`);
        return;
      }
      const tokens = (await res.json()) as { id_token?: string };
      const user = tokens.id_token ? parseIdToken(tokens.id_token) : null;
      if (!user) {
        setErr("No id_token in the response.");
        return;
      }
      saveUser(user);
      sessionStorage.removeItem("sutra.pkce");
      await navigate({ to: "/settings" });
    })();
  }, [navigate]);

  return (
    <main className="grid min-h-dvh place-items-center bg-bg text-fg">
      <p className="text-sm text-muted">{err ?? "Signing you in…"}</p>
    </main>
  );
}
