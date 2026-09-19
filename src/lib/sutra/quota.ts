export type QuotaState = {
  userId: string;
  used: number;
  limit: number;
  month: string;
};

const monthKey = () => new Date().toISOString().slice(0, 7);

function store(): Map<string, QuotaState> {
  const g = globalThis as typeof globalThis & { __sutraQuota?: Map<string, QuotaState> };
  g.__sutraQuota ??= new Map();
  return g.__sutraQuota;
}

export function getQuota(userId: string, limit: number): QuotaState {
  const month = monthKey();
  const key = `${userId}:${month}`;
  const cur = store().get(key);
  if (cur && cur.month === month) return { ...cur, limit };
  const fresh = { userId, used: 0, limit, month };
  store().set(key, fresh);
  return fresh;
}

export function addUsage(userId: string, tokens: number, limit: number): QuotaState {
  const cur = getQuota(userId, limit);
  cur.used += Math.max(0, tokens);
  store().set(`${userId}:${cur.month}`, cur);
  return cur;
}

export function assertQuota(userId: string, limit: number, upcoming: number): { ok: true } | { ok: false; error: string; quota: QuotaState } {
  const q = getQuota(userId, limit);
  if (q.used + upcoming > limit) {
    return {
      ok: false,
      quota: q,
      error: `Monthly token limit reached (${q.used.toLocaleString()} / ${limit.toLocaleString()}). Raise the cap in Settings or wait until next month.`,
    };
  }
  return { ok: true };
}
