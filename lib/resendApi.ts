export type DomainInfo = { name: string; status: string };

/** Authoritative provider check. Returns domains and their real verification status, or an error. */
export async function listResendDomains(apiKey: string): Promise<{ ok: true; domains: DomainInfo[] } | { ok: false; error: string }> {
  try {
    const r = await fetch('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(10000) });
    const j: any = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, error: `HTTP ${r.status}: ${String(j?.message ?? j?.name ?? 'error').slice(0, 160)}` };
    return { ok: true, domains: (j.data ?? []).map((d: any) => ({ name: String(d.name), status: String(d.status) })) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.name : 'network error' };
  }
}
