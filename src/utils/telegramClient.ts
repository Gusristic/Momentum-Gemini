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
  const cleanToken = token.trim();
  if (!cleanToken) return { ok: false, error: 'Token no especificado' };

  // 1. Try Backend API first
  try {
    const res = await fetch(`/api/telegram/detect-chat-id?token=${encodeURIComponent(cleanToken)}`);
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch {
    // Continue to direct Telegram Bot API on GitHub Pages / Static Hosting
  }

  // 2. Direct Telegram Bot API (Works 100% on GitHub Pages / Browser)
  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${cleanToken}/getUpdates`);
    const tgData = await tgRes.json();

    if (!tgData.ok) {
      return {
        ok: false,
        error: tgData.description || 'Token inválido o error en la API de Telegram.',
      };
    }

    const updates = tgData.result || [];
    if (updates.length === 0) {
      return {
        ok: false,
        error: 'No se encontraron mensajes recientes en el bot. Por favor, abre tu bot en Telegram y envíale un mensaje cualquiera (ej. /start o "Hola") y vuelve a pulsar este botón.',
      };
    }

    // Find the latest message or channel post with a valid chat id
    for (let i = updates.length - 1; i >= 0; i--) {
      const u = updates[i];
      const msg = u.message || u.channel_post || u.edited_message || u.my_chat_member;
      if (msg && msg.chat && msg.chat.id) {
        const chat = msg.chat;
        const name = chat.title || [chat.first_name, chat.last_name].filter(Boolean).join(' ') || chat.username || 'Chat privado';
        return {
          ok: true,
          chatId: String(chat.id),
          chatName: name,
        };
      }
    }

    return {
      ok: false,
      error: 'No se pudo extraer el Chat ID de los mensajes. Envía un mensaje "/start" a tu bot e inténtalo de nuevo.',
    };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Error de conexión con la API de Telegram.' };
  }
}

export async function sendTelegramTest(token: string, chatId: string): Promise<{ ok: boolean; error?: string; message?: string }> {
  const cleanToken = token.trim();
  const cleanChatId = chatId.trim();
  if (!cleanToken || !cleanChatId) {
    return { ok: false, error: 'Token o Chat ID incompletos.' };
  }

  // 1. Try Backend API first
  try {
    const res = await fetch('/api/telegram/send-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: cleanToken, chatId: cleanChatId }),
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch {
    // Continue to direct Telegram Bot API on GitHub Pages / Static Hosting
  }

  // 2. Direct Telegram Bot API
  try {
    const text = 
      `🤖 *TEST DE CONEXIÓN CON ÉXITO*\n` +
      `──────────────────────────\n` +
      `¡Enhorabuena! Las alertas de *Dual Momentum España* están configuradas y listas para operar.\n\n` +
      `📢 *Notificaciones activadas:*\n` +
      `• Señales y cambios de fondo de inversión.\n` +
      `• Recordatorio mensual de rebalanceo (Fin de Mes).\n` +
      `• Protección anti-ruido (Histéresis).\n\n` +
      `📅 _${new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })} (Hora España)_`;

    const tgRes = await fetch(`https://api.telegram.org/bot${cleanToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text,
        parse_mode: 'Markdown',
      }),
    });

    const data = await tgRes.json();
    if (!data.ok) {
      return { ok: false, error: data.description || 'Error enviando mensaje a Telegram.' };
    }
    return { ok: true, message: 'Mensaje de prueba enviado con éxito a Telegram.' };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Error al conectar con Telegram.' };
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
  } catch {
    // Harmless on static sites
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
  const cleanToken = token.trim();
  const cleanChatId = chatId.trim();
  if (!cleanToken || !cleanChatId) {
    return { ok: false, error: 'Token o Chat ID incompletos.' };
  }

  // 1. Try Backend API first
  try {
    const res = await fetch('/api/telegram/send-signal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: cleanToken, chatId: cleanChatId, signal, modelName, hysteresisBuffer, allModels }),
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch {
    // Continue to direct Telegram Bot API on GitHub Pages / Static Hosting
  }

  // 2. Direct Telegram Bot API (Universal Markdown Message Formatter)
  try {
    const eqSignal = allModels?.equilibrado || signal;
    const classicSignal = allModels?.classic12M;
    const instSignal = allModels?.momentum12Minus1;
    const progSignal = allModels?.progresivo;

    const isDefense = eqSignal.isDefenseMode;
    const isTransfer = eqSignal.transferRequired;
    const isHysteresis = eqSignal.isHysteresisHolding;

    const emoji = isTransfer ? '🚨' : isDefense ? '🛡️' : '✅';
    const title = isTransfer 
      ? 'ORDEN DE TRASPASO REQUERIDA' 
      : isDefense 
      ? 'ESTRATEGIA EN MODO DEFENSIVO' 
      : isHysteresis 
      ? 'MANTENER POR FILTRO ANTI-RUIDO' 
      : 'MANTENER ASIGNACIÓN ACTUAL';

    let actionText = '';
    if (isTransfer) {
      actionText = 
        `🔄 *ORDEN PRIORITARIA A EJECUTAR EN TU BROKER:*\n` +
        `• *Fondo Origen:* \`${eqSignal.fromFund?.isin || 'En cartera'}\` (${eqSignal.fromFund?.name})\n` +
        `• *Fondo Destino:* \`${eqSignal.toFund?.isin || eqSignal.currentSelectedFund?.isin}\` (${eqSignal.toFund?.name || eqSignal.currentSelectedFund?.name})\n` +
        `• *Operación:* Traspaso Total sin impacto fiscal (Art. 94 LIRPF)\n`;
    } else if (isHysteresis) {
      actionText = 
        `⚖️ *ORDEN PRIORITARIA EN BROKER (FILTRO ANTI-RUIDO ±${hysteresisBuffer}%):*\n` +
        `• *Acción:* *NO TRASPASAR* — Se mantiene el fondo en cartera.\n` +
        `• *Fondo en Cartera:* \`${eqSignal.currentSelectedFund?.isin}\` (${eqSignal.currentSelectedFund?.name})\n` +
        `• *Justificación:* La ventaja del fondo competidor no supera el umbral de convicción del ${hysteresisBuffer}%.\n`;
    } else {
      actionText = 
        `📌 *ORDEN PRIORITARIA EN BROKER:*\n` +
        `• *Acción:* *MANTENER POSICIÓN* — Asignación óptima.\n` +
        `• *Fondo en Cartera:* \`${eqSignal.currentSelectedFund?.isin}\` (${eqSignal.currentSelectedFund?.name})\n`;
    }

    let comparisonBlock = '';
    if (allModels) {
      const getFundName = (s: any) => s?.currentSelectedFund?.name || s?.toFund?.name || 'No disponible';
      const getFundIsin = (s: any) => s?.currentSelectedFund?.isin || s?.toFund?.isin || 'N/A';
      const getScore = (s: any) => s?.currentSelectedFund?.momentumScore !== undefined ? `(+${s.currentSelectedFund.momentumScore}%)` : '';

      comparisonBlock = 
        `──────────────────────────\n` +
        `📊 *COMPARATIVA DE LOS 4 MODELOS:*\n\n` +
        `🌟 *1. Equilibrado (Meb Faber - PRIORITARIO):*\n` +
        `└ \`${getFundIsin(eqSignal)}\` - ${getFundName(eqSignal)} ${getScore(eqSignal)}\n` +
        `   _Pondera 50% 12M + 30% 6M + 20% 3M_\n\n` +
        `🏛️ *2. 12M Puro (Gary Antonacci):*\n` +
        `└ \`${getFundIsin(classicSignal)}\` - ${getFundName(classicSignal)} ${getScore(classicSignal)}\n` +
        `   _Inercia pura a 12 meses_\n\n` +
        `🏢 *3. Institucional (12m - 1m):*\n` +
        `└ \`${getFundIsin(instSignal)}\` - ${getFundName(instSignal)} ${getScore(instSignal)}\n` +
        `   _Excluye el mes t-1 (sin reversión)_\n\n` +
        `⚡ *4. Progresivo Escalonado (Rápido):*\n` +
        `└ \`${getFundIsin(progSignal)}\` - ${getFundName(progSignal)} ${getScore(progSignal)}\n` +
        `   _40% 1M + 30% 3M + 20% 6M + 10% 12M_\n`;
    }

    const message = 
      `${emoji} *DUAL MOMENTUM — SEÑAL MENSUAL*\n` +
      `──────────────────────────\n` +
      `🎯 *MODELO PRINCIPAL DE EJECUCIÓN:*\n` +
      `*Dual Momentum Equilibrado (50/30/20)*\n` +
      `🏷️ *Estado:* *${title}*\n\n` +
      `${actionText}\n` +
      `💡 *Motivo Cuantitativo:*\n` +
      `${eqSignal.transferReason || 'Evaluación de momentum completada.'}\n\n` +
      `${comparisonBlock}` +
      `──────────────────────────\n` +
      `⚖️ *Filtro Histéresis:* ±${hysteresisBuffer}%\n` +
      `⏳ *Próxima Revisión:* en ${eqSignal.daysUntilNextMonthlyReview || 30} días (Fin de mes)\n` +
      `📅 _${new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })} (Hora España)_`;

    const tgRes = await fetch(`https://api.telegram.org/bot${cleanToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    const data = await tgRes.json();
    if (!data.ok) {
      return { ok: false, error: data.description || 'Error enviando señal a Telegram.' };
    }
    return { ok: true, message: 'Señal enviada a Telegram con éxito.' };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Error al conectar con Telegram.' };
  }
}
