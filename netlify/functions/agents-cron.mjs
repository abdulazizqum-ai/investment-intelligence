// =============================================================================
// agents-cron.mjs — SCHEDULED function. Every 30 minutes it triggers a fresh
// background market scan so the platform stays current 24/7.
// =============================================================================

export default async () => {
  const base = process.env.URL || process.env.DEPLOY_URL || '';
  if (base) {
    try {
      await fetch(`${base}/.netlify/functions/agents-scan-background`);
    } catch {
      /* ignore */
    }
  }
  return new Response('scan triggered');
};

export const config = { schedule: '*/30 * * * *' };
