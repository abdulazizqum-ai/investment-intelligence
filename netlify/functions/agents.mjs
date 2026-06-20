// =============================================================================
// agents.mjs — fast reader (v2 function). Returns the latest agent result from
// Netlify Blobs. If none yet, kicks off the background run (debounced) and
// returns a "building" status so the frontend shows mock data meanwhile.
// =============================================================================

import { getStore } from '@netlify/blobs';

const H = { 'cache-control': 'no-store', 'access-control-allow-origin': '*' };

export default async () => {
  try {
    const store = getStore('agents');
    const data = await store.get('latest', { type: 'json' });
    if (data && Array.isArray(data.recommendations)) {
      return Response.json(data, { headers: H });
    }

    // No data yet — trigger a background build, debounced to once per 2 min.
    const base = process.env.URL || process.env.DEPLOY_URL || '';
    const lock = await store.get('lock');
    const now = Date.now();
    if (base && (!lock || now - Number(lock) > 120000)) {
      await store.set('lock', String(now));
      fetch(`${base}/.netlify/functions/agents-run-background`).catch(() => {});
    }
    return Response.json({ status: 'building' }, { headers: H });
  } catch (e) {
    return Response.json({ status: 'error', detail: String(e).slice(0, 200) }, { headers: H });
  }
};
