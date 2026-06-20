// =============================================================================
// agents.mjs — fast reader (<1s). Returns the latest agent result from Netlify
// Blobs. If none yet, it kicks off the background run (debounced) and returns a
// "building" status so the frontend shows mock data until the run completes.
// =============================================================================

import { getStore } from '@netlify/blobs';

const headers = {
  'content-type': 'application/json',
  'cache-control': 'no-store',
  'access-control-allow-origin': '*',
};

export async function handler() {
  try {
    const store = getStore('agents');
    const data = await store.get('latest', { type: 'json' });
    if (data && Array.isArray(data.recommendations)) {
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    // No data yet — trigger a background build, debounced to once per 2 min.
    const base = process.env.URL || process.env.DEPLOY_URL || '';
    const lock = await store.get('lock');
    const now = Date.now();
    if (base && (!lock || now - Number(lock) > 120000)) {
      await store.set('lock', String(now));
      // fire-and-forget
      fetch(`${base}/.netlify/functions/agents-run-background`).catch(() => {});
    }
    return { statusCode: 200, headers, body: JSON.stringify({ status: 'building' }) };
  } catch (e) {
    return { statusCode: 200, headers, body: JSON.stringify({ status: 'error', detail: String(e).slice(0, 200) }) };
  }
}
