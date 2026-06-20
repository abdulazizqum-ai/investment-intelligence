// =============================================================================
// agents.mjs — fast reader (v2). Returns the latest scanner result from
// Supabase. If none yet (or stale), triggers the background scan (debounced)
// and returns "building" (with the scanner's last error, if any, for
// diagnostics). Falls back to mock on the client side.
// =============================================================================

const H = { 'content-type': 'application/json', 'cache-control': 'no-store', 'access-control-allow-origin': '*' };

export default async (req) => {
  const SB = process.env.SUPABASE_URL;
  const SK = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SB || !SK) return new Response(JSON.stringify({ status: 'error', detail: 'no supabase env' }), { headers: H });

  // Derive the site origin from the incoming request (reliable even when the
  // URL env var is absent at runtime).
  let origin = process.env.URL || process.env.DEPLOY_URL || '';
  try {
    origin = new URL(req.url).origin;
  } catch {
    /* keep env fallback */
  }

  const sbHeaders = { apikey: SK, authorization: `Bearer ${SK}` };
  const getRow = async (key) => {
    try {
      const r = await fetch(`${SB}/rest/v1/agent_cache?key=eq.${key}&select=data,updated_at`, { headers: sbHeaders });
      if (!r.ok) return null;
      const rows = await r.json();
      return rows[0] || null;
    } catch {
      return null;
    }
  };
  const setRow = async (key, data) => {
    await fetch(`${SB}/rest/v1/agent_cache?on_conflict=key`, {
      method: 'POST',
      headers: { ...sbHeaders, 'content-type': 'application/json', prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify([{ key, data, updated_at: new Date().toISOString() }]),
    }).catch(() => {});
  };
  const triggerScan = async () => {
    if (origin) fetch(`${origin}/.netlify/functions/agents-scan-background`).catch(() => {});
  };
  const maybeTrigger = async () => {
    const lock = await getRow('lock');
    if (!lock || Date.now() - Number(lock.data?.ts || 0) > 180000) {
      await setRow('lock', { ts: Date.now() });
      await triggerScan();
      return true;
    }
    return false;
  };

  try {
    const latest = await getRow('latest');
    if (latest?.data?.recommendations) {
      const ageMin = (Date.now() - new Date(latest.updated_at).getTime()) / 60000;
      if (ageMin > 30) await maybeTrigger();
      return new Response(JSON.stringify(latest.data), { headers: H });
    }

    const triggered = await maybeTrigger();
    const err = await getRow('error');
    return new Response(
      JSON.stringify({ status: 'building', triggered, origin, lastError: err?.data ?? null }),
      { headers: H },
    );
  } catch (e) {
    return new Response(JSON.stringify({ status: 'error', detail: String(e).slice(0, 200) }), { headers: H });
  }
};
