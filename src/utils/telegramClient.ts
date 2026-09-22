import { TelegramConfig, DualMomentumSignal } from '../types';

const STORAGE_KEY = 'dual_momentum_telegram_config';

export function getLocalTelegramConfig(): TelegramConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        botToken: parsed.botToken || '',
        chatId: parsed.chatId || '',
        isEnabled: parsed.isEnabled ?? false,
        notifyOnSignalChange: parsed.notifyOnSignalChange ?? true,
        notifyOnMonthEnd: parsed.notifyOnMonthEnd ?? true,
        chatName: parsed.chatName || '',
        lastNotifiedDate: parsed.lastNotifiedDate || '',
        lastNotifiedSignalText: parsed.lastNotifiedSignalText || '',
      };
    }
  } catch (e) {
    console.error('Error loading Telegram config:', e);
  }

  return {
    botToken: '',
    chatId: '',
    isEnabled: false,
    notifyOnSignalChange: true,
    notifyOnMonthEnd: true,
  };
}

export function saveLocalTelegramConfig(config: TelegramConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Error saving Telegram config:', e);
  }
}

export async function detectTelegramChatId(token: string): Promise<{ ok: boolean; chatId?: string; chatName?: string; error?: string; message?: string }> {
  try {
    const res = await fetch(`/api/telegram/detect-chat-id?token=${encodeURIComponent(token)}`);
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { ok: false, error: err.message || 'Error de conexión' };
  }
}

export async function sendTelegramTest(token: string, chatId: string): Promise<{ ok: boolean; error?: string; message?: string }> {
  try {
    const res = await fetch('/api/telegram/send-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, chatId }),
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { ok: false, error: err.message || 'Error de conexión' };
  }
}

export async function syncBackendTelegramConfig(config: TelegramConfig & { hysteresisBuffer?: number; funds?: any[]; activeFundId?: string }): Promise<void> {
  try {
    await fetch('/api/telegram/save-backend-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: config.botToken,
        chatId: config.chatId,
        isEnabled: config.isEnabled,
        notifyOnMonthEnd: config.notifyOnMonthEnd,
        notifyOnSignalChange: config.notifyOnSignalChange,
        hysteresisBuffer: config.hysteresisBuffer,
        funds: config.funds,
        activeFundId: config.activeFundId
      }),
    });
  } catch (err) {
    console.warn('Could not sync Telegram backend config:', err);
  }
}

export async function sendTelegramSignal(
  token: string, 
  chatId: string, 
  signal: DualMomentumSignal, 
  modelName: string,
  hysteresisBuffer: number = 0.5,
  allModels?: {
    equilibrado?: DualMomentumSignal;
    classic12M?: DualMomentumSignal;
    momentum12Minus1?: DualMomentumSignal;
    progresivo?: DualMomentumSignal;
  }
): Promise<{ ok: boolean; error?: string; message?: string }> {
  try {
    const res = await fetch('/api/telegram/send-signal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, chatId, signal, modelName, hysteresisBuffer, allModels }),
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { ok: false, error: err.message || 'Error de conexión' };
  }
}
