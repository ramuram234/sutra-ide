const USER_KEY = "sutra.identity.v1";

export type SutraUser = {
  sub: string;
  email?: string;
  name?: string;
  preferred_username?: string;
};

export function loadUser(): SutraUser | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = JSON.parse(sessionStorage.getItem(USER_KEY) ?? "null") as SutraUser | null;
    return raw?.sub ? raw : null;
  } catch {
    return null;
  }
}

export function saveUser(user: SutraUser | null) {
  if (typeof sessionStorage === "undefined") return;
  if (!user) sessionStorage.removeItem(USER_KEY);
  else sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function displayName(user: SutraUser | null) {
  if (!user) return "anonymous";
  return user.name || user.preferred_username || user.email || user.sub;
}
