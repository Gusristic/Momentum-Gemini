import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { FundISIN } from '../types';
import { INITIAL_FUNDS } from '../data/defaultFunds';

const STORAGE_KEY_FUNDS = 'antonacci_dual_momentum_funds_v5';
const STORAGE_KEY_CONFIG = 'antonacci_supabase_config_v1';
const STORAGE_KEY_ACTIVE_FUND = 'antonacci_active_fund_id_v1';

// Legacy keys to clean up
const LEGACY_STORAGE_KEYS = [
  'antonacci_dual_momentum_funds_v1',
  'antonacci_dual_momentum_funds_v2',
  'antonacci_dual_momentum_funds_v3',
  'antonacci_dual_momentum_funds_v4',
];

export interface SupabaseSettings {
  url: string;
  anonKey: string;
}

export function getSavedSupabaseSettings(): SupabaseSettings {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  try {
    const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        url: parsed.url || envUrl,
        anonKey: parsed.anonKey || envKey,
      };
    }
  } catch (e) {
    console.error('Error reading Supabase settings:', e);
  }

  return { url: envUrl, anonKey: envKey };
}

export function saveSupabaseSettings(settings: SupabaseSettings) {
  try {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving Supabase settings:', e);
  }
}

export function getSupabaseClient(settings?: SupabaseSettings): SupabaseClient | null {
  const { url, anonKey } = settings || getSavedSupabaseSettings();
  if (!url || !anonKey || url === 'https://your-project.supabase.co' || anonKey === 'your-anon-key') {
    return null;
  }
  try {
    return createClient(url, anonKey);
  } catch (err) {
    console.warn('Could not initialize Supabase client:', err);
    return null;
  }
}

export const KNOWN_AUDITED_METRICS: Record<string, Partial<FundISIN>> = {
  'IE00BYX5N771': {
    name: 'Fidelity Japan Index Fund P-ACC-EUR',
    category: 'JAPAN_EQUITY',
    categoryLabel: 'Renta Variable Japón (Topix / MSCI Japan Index)',
    isSafeHaven: false,
    currentNAV: 10.614,
    lastUpdated: '2026-09-18',
    return12M: 28.49,
    morningstarReturn12M: 28.49,
    ftReturn12M: 28.17,
    investingReturn12M: 29.50,
    return6M: 16.28,
    return3M: 3.40,
    return1M: 0.96,
    return12Minus1M: 27.27,
    return3YAnnualized: 15.97,
    volatility1Y: 14.2,
    sharpeRatio: 1.75,
    jensenAlpha: 14.84,
    sortinoRatio: 2.15,
    beta: 0.98,
    maxDrawdown: -14.20,
    morningstarUrl: 'https://www.morningstar.es/es/funds/snapshot/snapshot.aspx?id=F00000X66F',
    ftUrl: 'https://markets.ft.com/data/funds/tearsheet/summary?s=IE00BYX5N771:EUR',
    investingUrl: 'https://es.investing.com/search/?q=IE00BYX5N771',
    sourceNotes: 'Morningstar: 28.49% (18/09) | FT: 28.17% (17/09) | Investing: 29.50%',
  },
  'IE00B03HCZ61': {
    name: 'Vanguard Japan Stock Index Fund EUR Acc',
    category: 'JAPAN_EQUITY',
    categoryLabel: 'Renta Variable Japón (Topix / MSCI Japan Index)',
    isSafeHaven: false,
    currentNAV: 32.40,
    lastUpdated: '2026-09-18',
    return12M: 28.49,
    morningstarReturn12M: 28.49,
    ftReturn12M: 28.17,
    investingReturn12M: 29.50,
    return6M: 16.28,
    return3M: 3.40,
    return1M: 0.96,
    return12Minus1M: 27.27,
    return3YAnnualized: 15.97,
    volatility1Y: 14.2,
    sharpeRatio: 1.75,
  },
  'IE00BYX5MX67': {
    name: 'Fidelity S&P 500 Index EUR P Acc',
    category: 'US_EQUITY',
    categoryLabel: 'Renta Variable EE.UU. (S&P 500 / Nasdaq)',
    isSafeHaven: false,
    currentNAV: 16.44,
    lastUpdated: '2026-09-18',
    return12M: 17.73,
    morningstarReturn12M: 17.73,
    ftReturn12M: 17.65,
    investingReturn12M: 17.80,
    return6M: 17.77,
    return3M: 1.54,
    return1M: 0.55,
    return12Minus1M: 17.09,
    return3YAnnualized: 14.80,
    volatility1Y: 11.07,
    sharpeRatio: 1.27,
  },
  'IE00BYWYCC39': {
    name: 'iShares EmergMkts Idx (IE) D Acc EUR',
    category: 'EMERGING_EQUITY',
    categoryLabel: 'Renta Variable Mercados Emergentes',
    isSafeHaven: false,
    currentNAV: 14.85,
    lastUpdated: '2026-09-18',
    return12M: 30.95,
    morningstarReturn12M: 30.95,
    ftReturn12M: 30.70,
    investingReturn12M: 31.10,
    return6M: 22.64,
    return3M: 8.95,
    return1M: -0.67,
    return12Minus1M: 31.83,
    volatility1Y: 16.8,
    sharpeRatio: 1.62,
  },
  'IE0031786142': {
    name: 'Vanguard Emerging Markets Stock Index EUR',
    category: 'EMERGING_EQUITY',
    categoryLabel: 'Renta Variable Mercados Emergentes',
    isSafeHaven: false,
    currentNAV: 78.60,
    lastUpdated: '2026-09-18',
    return12M: 31.47,
    morningstarReturn12M: 31.47,
    ftReturn12M: 31.02,
    investingReturn12M: 31.50,
    return6M: 22.64,
    return3M: 8.95,
    return1M: -0.67,
    return12Minus1M: 32.36,
    return3YAnnualized: 19.17,
    volatility1Y: 16.8,
    sharpeRatio: 1.65,
    jensenAlpha: 4.80,
    beta: 1.15,
    sortinoRatio: 2.10,
    maxDrawdown: -16.5,
    morningstarUrl: 'https://www.morningstar.es/es/funds/snapshot/snapshot.aspx?id=F0GBR04U5D',
    ftUrl: 'https://markets.ft.com/data/funds/tearsheet/summary?s=IE0031786142:EUR',
    investingUrl: 'https://es.investing.com/funds/vanguard-emerging-markets-stock-eur',
    sourceNotes: 'Morningstar: 31.47% (18/09) | FT: 31.02% | Investing: 31.50%',
  },
  'IE0031442068': {
    name: 'Vanguard Emerging Markets Stock Index Fund EUR',
    category: 'EMERGING_EQUITY',
    categoryLabel: 'Renta Variable Mercados Emergentes',
    isSafeHaven: false,
    currentNAV: 78.60,
    lastUpdated: '2026-09-18',
    return12M: 31.47,
    morningstarReturn12M: 31.47,
    ftReturn12M: 31.02,
    investingReturn12M: 31.50,
    return6M: 22.64,
    return3M: 8.95,
    return1M: -0.67,
    return12Minus1M: 32.36,
    return3YAnnualized: 19.17,
    volatility1Y: 16.8,
    sharpeRatio: 1.65,
  },
  'LU1578889864': {
    name: 'Ninety One GSF Glb Gold A Acc EUR H',
    category: 'WORLD_EQUITY',
    categoryLabel: 'Renta Variable Sectorial Oro (Global Gold)',
    isSafeHaven: false,
    currentNAV: 34.20,
    lastUpdated: '2026-09-18',
    return12M: 28.57,
    morningstarReturn12M: 28.57,
    ftReturn12M: 28.30,
    investingReturn12M: 28.90,
    return6M: 4.80,
    return3M: 24.39,
    return1M: -6.50,
    return12Minus1M: 37.51,
    volatility1Y: 28.4,
    sharpeRatio: 0.88,
  },
  'LU1278917452': {
    name: 'DWS Invest CROCI Sectors Plus LC',
    category: 'US_EQUITY',
    categoryLabel: 'Renta Variable Sectores Valor CROCI',
    isSafeHaven: false,
    currentNAV: 245.10,
    lastUpdated: '2026-09-18',
    return12M: 22.76,
    morningstarReturn12M: 22.76,
    ftReturn12M: 22.76,
    investingReturn12M: 22.76,
    return6M: 2.23,
    return3M: 4.37,
    return1M: -0.57,
    return12Minus1M: 23.33,
    return3YAnnualized: 6.28,
    volatility1Y: 13.8,
    sharpeRatio: 1.44,
  },
  'IE00B42W3S00': {
    name: 'Vanguard Global Small-Cap Index Fund EUR Acc',
    category: 'GLOBAL_SMALL_CAP',
    categoryLabel: 'Small Caps Globales Indexadas',
    isSafeHaven: false,
    currentNAV: 348.60,
    lastUpdated: '2026-09-18',
    return12M: 20.44,
    morningstarReturn12M: 20.44,
    ftReturn12M: 20.15,
    investingReturn12M: 20.70,
    return6M: 13.33,
    return3M: -2.30,
    return1M: -1.16,
    return12Minus1M: 21.85,
    volatility1Y: 17.2,
    sharpeRatio: 0.98,
  },
  'ES0165265002': {
    name: 'Myinvestor Nasdaq 100 FI',
    category: 'US_EQUITY',
    categoryLabel: 'Renta Variable EE.UU. (Nasdaq 100)',
    isSafeHaven: false,
    currentNAV: 15.22,
    lastUpdated: '2026-09-18',
    return12M: 20.02,
    morningstarReturn12M: 20.02,
    ftReturn12M: 19.85,
    investingReturn12M: 20.30,
    return6M: 24.28,
    return3M: -3.96,
    return1M: -0.19,
    return12Minus1M: 20.25,
    volatility1Y: 19.5,
    sharpeRatio: 0.84,
  },
  'IE00BYX5MD61': {
    name: 'Fidelity MSCI Europe Indx EUR P Acc',
    category: 'EUROPE_EQUITY',
    categoryLabel: 'Renta Variable Europa (MSCI Europe)',
    isSafeHaven: false,
    currentNAV: 17.85,
    lastUpdated: '2026-09-18',
    return12M: 18.04,
    morningstarReturn12M: 18.04,
    ftReturn12M: 17.90,
    investingReturn12M: 18.20,
    return6M: 12.12,
    return3M: 0.13,
    return1M: -1.27,
    return12Minus1M: 19.56,
    volatility1Y: 12.8,
    sharpeRatio: 1.12,
  },
  'IE00BDRK7R97': {
    name: 'iShares Pacific Index (IE) D Acc EUR',
    category: 'PACIFIC_EQUITY',
    categoryLabel: 'Renta Variable Pacífico Ex-Japón Indexado',
    isSafeHaven: false,
    currentNAV: 18.90,
    lastUpdated: '2026-09-18',
    return12M: 15.19,
    morningstarReturn12M: 15.19,
    ftReturn12M: 15.05,
    investingReturn12M: 15.40,
    return6M: 9.85,
    return3M: 5.09,
    return1M: -2.26,
    return12Minus1M: 17.85,
    volatility1Y: 14.5,
    sharpeRatio: 0.80,
  },
};

// Local storage fallback handlers
export function getLocalFunds(): FundISIN[] {
  try {
    // Clean up older legacy storage keys to avoid lingering stale cached metrics
    for (const legacyKey of LEGACY_STORAGE_KEYS) {
      if (localStorage.getItem(legacyKey)) {
        localStorage.removeItem(legacyKey);
      }
    }

    const data = localStorage.getItem(STORAGE_KEY_FUNDS);
    if (data !== null) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        // Return user's exact array if they have saved funds (even if empty or fewer slots)
        if (parsed.length === 0) {
          return [];
        }

        const seenIds = new Set<string>();
        const sanitized: FundISIN[] = parsed.map((f: FundISIN, index: number) => {
          const rawIsin = (f.isin || '').trim().toUpperCase();
          const slotNum = index + 1;
          
          let uniqueId = f.id;
          if (!uniqueId || seenIds.has(uniqueId)) {
            uniqueId = `fund-${slotNum}`;
          }
          seenIds.add(uniqueId);

          const cleanIsin = rawIsin;
          const hasIsin = cleanIsin.length > 0;
          const auditedData = KNOWN_AUDITED_METRICS[cleanIsin];

          return {
            ...(auditedData ? auditedData : {}),
            ...f,
            id: uniqueId,
            slotNumber: slotNum,
            isin: cleanIsin,
            name: f.name && !f.name.includes('(Vacío)') && !f.name.includes('Slot #')
              ? f.name 
              : (auditedData?.name || (hasIsin ? `Fondo ISIN ${cleanIsin}` : `Slot #${slotNum} (Vacío)`)),
            isBlank: !hasIsin || Boolean(f.isBlank),
            isDisabled: Boolean(f.isDisabled),
            sharesHeld: f.sharesHeld !== undefined ? f.sharesHeld : 0,
            purchasePriceAvg: f.purchasePriceAvg !== undefined ? f.purchasePriceAvg : 0,
          };
        });

        localStorage.setItem(STORAGE_KEY_FUNDS, JSON.stringify(sanitized));
        return sanitized;
      }
    }
  } catch (e) {
    console.error('Failed to load funds from localStorage', e);
  }
  return INITIAL_FUNDS;
}

export function resetAllFundsToMarketDefaults(): FundISIN[] {
  try {
    for (const legacyKey of LEGACY_STORAGE_KEYS) {
      localStorage.removeItem(legacyKey);
    }
    localStorage.setItem(STORAGE_KEY_FUNDS, JSON.stringify(INITIAL_FUNDS));
  } catch (e) {
    console.error('Failed to reset funds to market defaults:', e);
  }
  return INITIAL_FUNDS;
}

export function saveLocalFunds(funds: FundISIN[]) {
  try {
    localStorage.setItem(STORAGE_KEY_FUNDS, JSON.stringify(funds));
  } catch (e) {
    console.error('Failed to save funds to localStorage', e);
  }
}

export function getActiveFundId(): string {
  try {
    const id = localStorage.getItem(STORAGE_KEY_ACTIVE_FUND);
    if (id) return id;
  } catch (e) {
    console.error(e);
  }
  return 'fund-1'; // Vanguard US 500 default
}

export function saveActiveFundId(id: string) {
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE_FUND, id);
  } catch (e) {
    console.error(e);
  }
}

// Supabase sync methods
export async function syncFundsToSupabase(funds: FundISIN[], settings?: SupabaseSettings): Promise<{ success: boolean; message: string }> {
  saveLocalFunds(funds);
  const client = getSupabaseClient(settings);
  if (!client) {
    return {
      success: true,
      message: 'Guardado localmente en almacenamiento seguro del navegador (Supabase no configurado).',
    };
  }

  try {
    const payload = funds.map(f => ({
      slot_number: f.slotNumber,
      isin: (f.isin || '').trim().toUpperCase(),
      name: f.name || `Slot #${f.slotNumber} (Vacío)`,
      ticker: f.ticker || '',
      category: f.category || 'WORLD_EQUITY',
      category_label: f.categoryLabel || 'Sin Asignar (En Blanco)',
      is_safe_haven: Boolean(f.isSafeHaven),
      current_nav: f.currentNAV || 100,
      shares_held: f.sharesHeld || 0,
      purchase_price_avg: f.purchasePriceAvg || 0,
      return_12m: f.return12M || 0,
      return_6m: f.return6M || 0,
      return_3m: f.return3M || 0,
      return_1m: f.return1M || 0,
      volatility_1y: f.volatility1Y || 0,
      sharpe_ratio: f.sharpeRatio || 0,
      jensen_alpha: f.jensenAlpha || 0,
      beta: f.beta || 1,
      sortino_ratio: f.sortinoRatio || 0,
      max_drawdown: f.maxDrawdown || 0,
      last_updated: new Date().toISOString(),
    }));

    const { error } = await client
      .from('antonacci_funds')
      .upsert(payload, { onConflict: 'slot_number' });

    if (error) {
      console.error('Supabase upsert error:', error);
      return { success: false, message: `Error Supabase: ${error.message}` };
    }

    // Clean up any old slots from Supabase that are no longer part of the user's portfolio
    const activeSlotNumbers = funds.map(f => f.slotNumber);
    if (activeSlotNumbers.length > 0) {
      const slotListStr = `(${activeSlotNumbers.join(',')})`;
      await client
        .from('antonacci_funds')
        .delete()
        .not('slot_number', 'in', slotListStr);
    }

    return { success: true, message: 'Sincronizado con éxito en tu base de datos Supabase.' };
  } catch (err: any) {
    return { success: false, message: `Excepción al conectar con Supabase: ${err.message || err}` };
  }
}

export async function fetchFundsFromSupabase(settings?: SupabaseSettings): Promise<FundISIN[] | null> {
  const client = getSupabaseClient(settings);
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('antonacci_funds')
      .select('*')
      .order('slot_number', { ascending: true });

    if (error || !data || data.length === 0) {
      return null;
    }

    // Map back and deduplicate duplicate ISINs
    const seenIsins = new Set<string>();
    const mapped: FundISIN[] = data.map((row: any, index: number) => {
      const rawIsin = (row.isin || '').trim().toUpperCase();
      const slotNum = row.slot_number || (index + 1);

      const isDuplicate = rawIsin.length > 0 && seenIsins.has(rawIsin);
      if (rawIsin.length > 0 && !isDuplicate) {
        seenIsins.add(rawIsin);
      }

      const cleanIsin = isDuplicate ? '' : rawIsin;
      const isBlank = cleanIsin.length === 0;

      // Audited fallback if database row has nulls
      const audited = KNOWN_AUDITED_METRICS[cleanIsin];

      return {
        id: `fund-${slotNum}`,
        slotNumber: slotNum,
        isin: cleanIsin,
        name: isBlank
          ? (row.name?.includes('Slot #') ? row.name : `Slot #${slotNum} (Vacío)`)
          : (row.name && !row.name.includes('(Vacío)') ? row.name : (audited?.name || `Fondo ISIN ${cleanIsin}`)),
        ticker: row.ticker || '',
        category: row.category || audited?.category || 'WORLD_EQUITY',
        categoryLabel: row.category_label || audited?.categoryLabel || (isBlank ? 'Sin Asignar (En Blanco)' : 'Renta Variable'),
        isSafeHaven: row.is_safe_haven !== null && row.is_safe_haven !== undefined ? Boolean(row.is_safe_haven) : (audited?.isSafeHaven !== undefined ? audited.isSafeHaven : false),
        isBlank,
        isDisabled: false,
        currentNAV: Number(row.current_nav !== null && row.current_nav !== undefined ? row.current_nav : (audited?.currentNAV ?? 100)),
        currency: 'EUR',
        morningstarUrl: cleanIsin ? (audited?.morningstarUrl || `https://www.morningstar.es/es/funds/snapshot/snapshot.aspx?q=${cleanIsin}`) : '',
        ftUrl: cleanIsin ? (audited?.ftUrl || `https://markets.ft.com/data/funds/tearsheet/summary?s=${cleanIsin}:EUR`) : '',
        investingUrl: cleanIsin ? (audited?.investingUrl || `https://es.investing.com/search/?q=${cleanIsin}`) : '',
        morningstarReturn12M: audited?.morningstarReturn12M,
        ftReturn12M: audited?.ftReturn12M,
        investingReturn12M: audited?.investingReturn12M,
        sharesHeld: Number(row.shares_held || 0),
        purchasePriceAvg: Number(row.purchase_price_avg || 0),
        lastUpdated: row.last_updated?.substring(0, 10) || audited?.lastUpdated || new Date().toISOString().substring(0, 10),
        return1M: Number(row.return_1m !== null && row.return_1m !== undefined ? row.return_1m : (audited?.return1M || 0)),
        return3M: Number(row.return_3m !== null && row.return_3m !== undefined ? row.return_3m : (audited?.return3M || 0)),
        return6M: Number(row.return_6m !== null && row.return_6m !== undefined ? row.return_6m : (audited?.return6M || 0)),
        return12M: Number(row.return_12m !== null && row.return_12m !== undefined ? row.return_12m : (audited?.return12M || 0)),
        return12Minus1M: Number(row.return_12_minus_1m !== null && row.return_12_minus_1m !== undefined ? row.return_12_minus_1m : (audited?.return12Minus1M ?? (row.return_12m || 0))),
        return3YAnnualized: Number(audited?.return3YAnnualized !== undefined ? audited.return3YAnnualized : (row.return_12m ? (row.return_12m * 0.7).toFixed(1) : 0)),
        volatility1Y: Number(row.volatility_1y !== null && row.volatility_1y !== undefined ? row.volatility_1y : (audited?.volatility1Y || 0)),
        sharpeRatio: Number(row.sharpe_ratio !== null && row.sharpe_ratio !== undefined ? row.sharpe_ratio : (audited?.sharpeRatio || 0)),
        jensenAlpha: Number(row.jensen_alpha !== null && row.jensen_alpha !== undefined ? row.jensen_alpha : (audited?.jensenAlpha || 0)),
        beta: Number(row.beta !== null && row.beta !== undefined ? row.beta : (audited?.beta || 1.0)),
        sortinoRatio: Number(row.sortino_ratio !== null && row.sortino_ratio !== undefined ? row.sortino_ratio : (audited?.sortinoRatio || 0)),
        maxDrawdown: Number(row.max_drawdown !== null && row.max_drawdown !== undefined ? row.max_drawdown : (audited?.maxDrawdown || 0)),
        history: [],
      };
    });

    // DO NOT append missing defaults! The user's saved slots are returned as-is.
    return mapped;
  } catch (err) {
    console.error('Error fetching from Supabase:', err);
    return null;
  }
}

export const SUPABASE_SQL_SCHEMA = `-- Script SQL para crear la tabla en Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS public.antonacci_funds (
    slot_number INTEGER PRIMARY KEY,
    isin TEXT NOT NULL,
    name TEXT NOT NULL,
    ticker TEXT,
    category TEXT NOT NULL,
    category_label TEXT,
    is_safe_haven BOOLEAN DEFAULT false,
    current_nav NUMERIC,
    shares_held NUMERIC DEFAULT 0,
    purchase_price_avg NUMERIC DEFAULT 0,
    return_1m NUMERIC DEFAULT 0,
    return_3m NUMERIC DEFAULT 0,
    return_6m NUMERIC DEFAULT 0,
    return_12m NUMERIC DEFAULT 0,
    volatility_1y NUMERIC DEFAULT 0,
    sharpe_ratio NUMERIC DEFAULT 0,
    jensen_alpha NUMERIC DEFAULT 0,
    beta NUMERIC DEFAULT 1,
    sortino_ratio NUMERIC DEFAULT 0,
    max_drawdown NUMERIC DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Habilitar Row Level Security (RLS) público o anónimo
ALTER TABLE public.antonacci_funds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acceso público lectura y escritura" ON public.antonacci_funds
    FOR ALL USING (true) WITH CHECK (true);
`;
