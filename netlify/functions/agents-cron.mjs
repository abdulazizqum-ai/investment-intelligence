// =============================================================================
// agents-cron.mjs — Netlify SCHEDULED function. Runs every 20 minutes and
// triggers a fresh background agent run so the data stays current 24/7.
// =============================================================================

export default async () => {
  const base = process.env.URL || process.env.DEPLOY_URL || '';
  if (base) {
    try {
      await fetch(`${base}/.netlify/functions/agents-run-background`);
    } catch {
      /* ignore */
    }
  }
  return new Response('agents refresh triggered');
};

export const config = { schedule: '*/20 * * * *' };
