import { useEffect, useRef, useState } from 'react';
import { getQuotes, LIVE_ENABLED, type Quote } from './marketData';

/**
 * Polls live quotes for a set of symbols on an interval.
 * Returns the latest quotes keyed by symbol plus the live flag.
 * No-ops (and returns an empty map) when no API key is configured.
 */
export function useLiveQuotes(symbols: string[], intervalMs = 15_000) {
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [loading, setLoading] = useState(LIVE_ENABLED);
  const key = symbols.join(',');
  const symbolsRef = useRef(symbols);
  symbolsRef.current = symbols;

  useEffect(() => {
    if (!LIVE_ENABLED || symbols.length === 0) {
      setLoading(false);
      return;
    }
    let active = true;
    const run = async () => {
      const q = await getQuotes(symbolsRef.current);
      if (active) {
        setQuotes((prev) => ({ ...prev, ...q }));
        setLoading(false);
      }
    };
    run();
    const id = setInterval(run, intervalMs);
    return () => {
      active = false;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, intervalMs]);

  return { quotes, loading, live: LIVE_ENABLED };
}
