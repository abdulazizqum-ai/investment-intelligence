// =============================================================================
// marketSymbols.ts — Display instruments and the mapping from indices /
// commodities / FX to free-tier tradable ETF/FX proxies.
// =============================================================================

import type { Bilingual } from '@/types';

export interface MarketInstrument {
  label: Bilingual;
  /** Symbol actually queried from the data provider (a free-tier proxy). */
  symbol: string;
  /** Underlying it represents, shown as a hint (e.g. "S&P 500 via SPY"). */
  represents?: string;
  fallbackPrice: number;
  fallbackChange: number;
}

// Dashboard "Market Overview" tiles.
export const marketInstruments: MarketInstrument[] = [
  { label: { en: 'S&P 500', ar: 'إس آند بي 500' }, symbol: 'SPY', represents: 'S&P 500 (SPY)', fallbackPrice: 543.0, fallbackChange: -0.42 },
  { label: { en: 'NASDAQ 100', ar: 'ناسداك 100' }, symbol: 'QQQ', represents: 'NASDAQ 100 (QQQ)', fallbackPrice: 478.6, fallbackChange: -0.61 },
  { label: { en: 'Dow Jones', ar: 'داو جونز' }, symbol: 'DIA', represents: 'Dow Jones (DIA)', fallbackPrice: 391.2, fallbackChange: -0.18 },
  { label: { en: 'Russell 2000', ar: 'راسل 2000' }, symbol: 'IWM', represents: 'Russell 2000 (IWM)', fallbackPrice: 203.0, fallbackChange: 0.22 },
  { label: { en: 'Gold', ar: 'الذهب' }, symbol: 'GLD', represents: 'Gold (GLD)', fallbackPrice: 217.4, fallbackChange: 0.74 },
  { label: { en: 'WTI Crude', ar: 'خام غرب تكساس' }, symbol: 'USO', represents: 'WTI Crude (USO)', fallbackPrice: 78.2, fallbackChange: 3.1 },
  { label: { en: 'US Dollar', ar: 'الدولار الأمريكي' }, symbol: 'UUP', represents: 'US Dollar Index (UUP)', fallbackPrice: 28.7, fallbackChange: 0.35 },
  { label: { en: 'US Treasuries', ar: 'سندات الخزانة' }, symbol: 'IEF', represents: '7-10Y Treasuries (IEF)', fallbackPrice: 94.1, fallbackChange: 0.06 },
];

// Map the symbols used in mock asset-class data to a tradable free-tier proxy.
const PROXY: Record<string, string> = {
  // indices
  SPX: 'SPY', IXIC: 'QQQ', DJI: 'DIA', RUT: 'IWM',
  // metals
  XAU: 'GLD', XAG: 'SLV', HG: 'CPER',
  // energy
  CL: 'USO', NG: 'UNG',
  // agriculture
  ZW: 'WEAT', ZC: 'CORN', KC: 'JO',
  // currencies
  DXY: 'UUP', EURUSD: 'FXE', USDJPY: 'FXY', GBPUSD: 'FXB',
};

/** Resolve any ticker/symbol to the symbol we can actually fetch for free.
 *  Plain equities (NVDA, QBIT…) pass through unchanged. */
export function resolveSymbol(symbol: string): string {
  return PROXY[symbol] ?? symbol;
}
