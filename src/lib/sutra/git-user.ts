const KEY = "sutra.git.user";

export type GitUser = { name: string; email: string };

export function loadGitUser(): GitUser {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "{}") as GitUser;
    return { name: raw.name ?? "", email: raw.email ?? "" };
  } catch {
    return { name: "", email: "" };
  }
}

export function saveGitUser(user: GitUser) {
  localStorage.setItem(KEY, JSON.stringify(user));
}
