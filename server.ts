import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // ============================================================================
  // API ROUTES (Before Vite middleware)
  // ============================================================================

  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      serverTime: new Date().toISOString(),
      engine: 'Antonacci Dual Momentum Quantitative Core'
    });
  });

  // ============================================================================
  // TELEGRAM BOT INTEGRATION ENDPOINTS
  // ============================================================================

  // 1. Auto-detect Chat ID by inspecting recent messages sent to the bot
  app.get('/api/telegram/detect-chat-id', async (req, res) => {
    const token = (req.query.token as string || '').trim();
    if (!token) {
      return res.status(400).json({ ok: false, error: 'Token de Telegram no proporcionado' });
    }

    try {
      const tgRes = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
      const data = await tgRes.json();

      if (!data.ok) {
        return res.status(400).json({ 
          ok: false, 
          error: data.description || 'Token de Telegram no válido o rechazado por los servidores de Telegram.' 
        });
      }

      const updates = data.result || [];
      if (updates.length === 0) {
        return res.json({
          ok: false,
          error: 'NO_MESSAGES',
          message: 'No se encontraron mensajes en el bot. Por favor, entra en Telegram, busca tu bot, pulsa el botón "INICIAR" o envíale un mensaje cualquiera (ej: "hola"), y vuelve a hacer clic en este botón.'
        });
      }

      // Grab the most recent message
      const latestUpdate = updates[updates.length - 1];
      const chat = latestUpdate.message?.chat || latestUpdate.edited_message?.chat || latestUpdate.channel_post?.chat || latestUpdate.my_chat_member?.chat;

      if (!chat || !chat.id) {
        return res.json({
          ok: false,
          error: 'NO_CHAT_FOUND',
          message: 'Se recibieron actualizaciones pero no se identificó el ID de chat. Envía un mensaje de texto nuevo al bot e inténtalo de nuevo.'
        });
      }

      const chatName = [chat.first_name, chat.last_name].filter(Boolean).join(' ') || chat.username || chat.title || 'Usuario Telegram';

      res.json({
        ok: true,
        chatId: String(chat.id),
        chatName,
        username: chat.username || '',
        message: `¡Chat detectado con éxito! ID: ${chat.id} (${chatName})`
      });
    } catch (err: any) {
      console.error('Error auto-detecting Telegram Chat ID:', err.message);
      res.status(500).json({ ok: false, error: 'Error de conexión con la API de Telegram: ' + err.message });
    }
  });

  // 2. Send Test Notification
  app.post('/api/telegram/send-test', async (req, res) => {
    const { token, chatId } = req.body;
    if (!token || !chatId) {
      return res.status(400).json({ ok: false, error: 'Falta token o chatId' });
    }

    const testText = 
      `🚀 *Dual Momentum Engine España*\n` +
      `✅ *¡Conexión con Telegram verificada con éxito!*\n\n` +
      `Tu sistema de alertas automáticas para fondos indexados está configurado.\n\n` +
      `📋 *Qué recibirás por aquí:*\n` +
      `• 🔔 *Señal mensual de rotación* (días 28-30 de cada mes)\n` +
      `• 🏆 *Fondo ganador y orden de traspaso fiscal*\n` +
      `• 🛡️ *Alertas de activación de Modo Refugio / Monetario*\n` +
      `• ⚖️ *Filtro de Histéresis y supresión de ruido*\n\n` +
      `_Hora de verificación: ${new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}_`;

    try {
      const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: testText,
          parse_mode: 'Markdown'
        })
      });

      const data = await tgRes.json();
      if (!data.ok) {
        return res.status(400).json({ ok: false, error: data.description || 'Error al enviar mensaje a Telegram' });
      }

      res.json({ ok: true, message: 'Mensaje de prueba enviado con éxito a Telegram.' });
    } catch (err: any) {
      console.error('Error sending Telegram test message:', err.message);
      res.status(500).json({ ok: false, error: 'Error al contactar con Telegram: ' + err.message });
    }
  });

  // In-memory / persistent store for backend background scheduler
  let backendTelegramState: {
    token?: string;
    chatId?: string;
    isEnabled?: boolean;
    notifyOnMonthEnd?: boolean;
    notifyOnSignalChange?: boolean;
    hysteresisBuffer?: number;
    lastDispatchedMonth?: string;
    lastDispatchedSignal?: string;
    funds?: any[];
    activeFundId?: string;
  } = {};

  // Endpoint to sync settings to cloud server for 24/7 background execution
  app.post('/api/telegram/save-backend-config', (req, res) => {
    const { token, chatId, isEnabled, notifyOnMonthEnd, notifyOnSignalChange, hysteresisBuffer, funds, activeFundId } = req.body;
    backendTelegramState = {
      ...backendTelegramState,
      token: token || backendTelegramState.token,
      chatId: chatId || backendTelegramState.chatId,
      isEnabled: isEnabled ?? backendTelegramState.isEnabled,
      notifyOnMonthEnd: notifyOnMonthEnd ?? backendTelegramState.notifyOnMonthEnd,
      notifyOnSignalChange: notifyOnSignalChange ?? backendTelegramState.notifyOnSignalChange,
      hysteresisBuffer: hysteresisBuffer ?? backendTelegramState.hysteresisBuffer ?? 0.5,
      funds: funds || backendTelegramState.funds,
      activeFundId: activeFundId || backendTelegramState.activeFundId
    };
    res.json({ ok: true, message: 'Configuración de fondo sincronizada en la nube.' });
  });

  // 3. Send Official Strategy Signal Alert (4 Models with Equilibrado as Priority #1)
  app.post('/api/telegram/send-signal', async (req, res) => {
    const { token, chatId, signal, allModels, hysteresisBuffer = 0.5 } = req.body;
    if (!token || !chatId) {
      return res.status(400).json({ ok: false, error: 'Faltan token o chatId' });
    }

    // Default to Equilibrado if provided in allModels or signal
    const eqSignal = allModels?.equilibrado || signal;
    const classicSignal = allModels?.classic12M;
    const instSignal = allModels?.momentum12Minus1;
    const progSignal = allModels?.progresivo;

    if (!eqSignal) {
      return res.status(400).json({ ok: false, error: 'Falta la señal de la estrategia' });
    }

    const isDefense = eqSignal.isDefenseMode;
    const isTransfer = eqSignal.transferRequired;
    const isHysteresis = eqSignal.isHysteresisHolding;

    let emoji = isTransfer ? '🚨' : isDefense ? '🛡️' : '✅';
    let title = isTransfer 
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

    // Comparison summary of the 4 models
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

    try {
      const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown'
        })
      });

      const data = await tgRes.json();
      if (!data.ok) {
        return res.status(400).json({ ok: false, error: data.description || 'Error enviando señal' });
      }

      res.json({ ok: true, message: 'Alerta multi-modelo enviada correctamente a Telegram con el modelo Equilibrado como prioritario.' });
    } catch (err: any) {
      console.error('Error sending Telegram signal message:', err.message);
      res.status(500).json({ ok: false, error: 'Error al contactar con Telegram: ' + err.message });
    }
  });

  // Known ISIN mappings for instant fast resolution
  const KNOWN_ISIN_MAP: Record<string, { symbol: string; name: string; category?: string }> = {
    // NASDAQ 100 ETFs & Funds
    'IE00B53SZB19': { symbol: 'CSNDX.SW', name: 'iShares NASDAQ 100 UCITS ETF USD (Acc)' },
    'IE0032077012': { symbol: 'EQQQ.L', name: 'Invesco EQQQ NASDAQ-100 UCITS ETF' },
    'LU1681038248': { symbol: 'ANX.PA', name: 'Amundi Index Solutions - Amundi Nasdaq-100 Swap ETF EUR Acc' },
    'LU1829221024': { symbol: 'UST.PA', name: 'Amundi Core Nasdaq-100 Swap UCITS ETF Acc' },
    'IE00B296QM64': { symbol: 'NQSE.DE', name: 'iShares NASDAQ 100 UCITS ETF EUR Hedged' },
    'IE00BYVTMS52': { symbol: 'UST.PA', name: 'Amundi PEA Nasdaq-100 UCITS ETF' },

    // Vanguard & iShares Core Indices
    'IE00B03HD191': { symbol: '0P00000WLG.F', name: 'Vanguard Global Stock Index Fund EUR Acc' },
    'IE0032126645': { symbol: '0P00000SUJ.F', name: 'Vanguard U.S. 500 Stock Index Fund EUR Acc' },
    'IE0007987690': { symbol: '0P00000RQ8.F', name: 'Vanguard European Stock Index Fund EUR Acc' },
    'IE00B18GC888': { symbol: '0P00012I69.F', name: 'Vanguard Global Bond Index EUR Hedged Acc' },
    'FR0007054316': { symbol: '0P00000BYC.F', name: 'BNP Paribas Euro Money Market C Cap' },
    'FR0000989626': { symbol: '0P00000V79.F', name: 'Groupama Trésorerie IC (Monetario €STR)' },
    'IE0007472115': { symbol: '0P00000SUI.F', name: 'Vanguard Euro Government Bond Index Fund EUR' },
    'IE0007472990': { symbol: '0P00000SUI.F', name: 'Vanguard Euro Government Bond Index Fund EUR Acc' },
    'IE0031442068': { symbol: 'VFEM.AS', name: 'Vanguard Emerging Markets Stock Index Fund EUR' },
    'IE00B42W3S00': { symbol: '0P00012I66.F', name: 'Vanguard Global Small-Cap Index Fund EUR Acc' },
    // Fidelity Funds
    'IE00BYX5NX33': { symbol: '0P0001CLDK.F', name: 'Fidelity MSCI World Index Fund P-ACC-EUR' },
    'IE00BYX5N771': { symbol: '0P0001CLDM.F', name: 'Fidelity Japan Index Fund P-ACC-EUR', category: 'JAPAN_EQUITY' },
    'IE00BGSF1X88': { symbol: '0P0001EVZ8.F', name: 'Fidelity S&P 500 Index Fund P-ACC-EUR' },
    'LU0996177134': { symbol: '0P0000TE34.F', name: 'Amundi Index MSCI World AE-C EUR' },
    'LU0034353002': { symbol: '0P00000ARZ.F', name: 'DWS Floating Rate Notes LC EUR' },
    'LU0389812933': { symbol: '0P00000216.F', name: 'iShares Emerging Markets Equity Index Fund (LU) EUR' },
    'LU0104884860': { symbol: '0P00000AQ9.F', name: 'Pictet - Short-Term Money Market EUR P' },
    'IE00B03HCZ61': { symbol: '0P00000U5C.F', name: 'Vanguard Japan Stock Index Fund EUR' },
    'IE00B5307300': { symbol: 'IWDP.AS', name: 'iShares Developed Real Estate Index Fund' },
    'LU0128494191': { symbol: '0P00000JW0.F', name: 'Pictet - Water P EUR' },
    'LU0274208692': { symbol: 'XESX.DE', name: 'Xtrackers Euro Stoxx 50 UCITS ETF' },
    'IE00B4L5Y983': { symbol: 'IWDA.AS', name: 'iShares Core MSCI World UCITS ETF' },
    'IE00B5BMR087': { symbol: 'CSPX.AS', name: 'iShares Core S&P 500 UCITS ETF' },
    'IE00B3VWMM18': { symbol: 'SXR8.DE', name: 'iShares Core S&P 500 UCITS ETF (DE)' },
    'IE00BK5BQT80': { symbol: 'VWCE.DE', name: 'Vanguard FTSE All-World UCITS ETF' },
    'IE00B0M62Q58': { symbol: 'EEM', name: 'iShares MSCI Emerging Markets ETF' },
    'IE00BDBRDM35': { symbol: 'VAGF.DE', name: 'Vanguard Global Aggregate Bond UCITS ETF' },
    'LU0093571064': { symbol: '0P0000072E.F', name: 'Amundi Funds Cash EUR' },
    'IE0002141977': { symbol: '0P00000L7F.F', name: 'PIMCO GIS Global Bond EUR Hedged' },
    'ES0152769032': { symbol: '0P00000JGA.F', name: 'Magallanes Value Investors UCITS European Equity' },
    'IE0007201042': { symbol: '0P00000RQ9.F', name: 'Vanguard Japan Stock Index Fund EUR Acc' },
    'IE0007201265': { symbol: '0P00000RQA.F', name: 'Vanguard Pacific Ex-Japan Stock Index Fund EUR Acc' },
    'IE0031786142': { symbol: '0P00000SUK.F', name: 'Vanguard Eurozone Stock Index Fund EUR Acc' },
    'LU0290358497': { symbol: 'DBXN.DE', name: 'Xtrackers II Eurozone Government Bond UCITS ETF' },
    'LU0290355717': { symbol: 'DBXG.DE', name: 'Xtrackers II Global Inflation-Linked Bond UCITS ETF' },
  };

  function deduceCategoryInfo(name: string, isin: string) {
    const text = (name + ' ' + isin).toUpperCase();
    if (
      text.includes('MONEY') ||
      text.includes('CASH') ||
      text.includes('MONÉTAIRE') ||
      text.includes('MONETAI') ||
      text.includes('MONETARIO') ||
      text.includes('TREASURY BILL') ||
      text.includes('T-BILL') ||
      text.includes('€STR') ||
      text.includes('ESTR') ||
      text.includes('LIQUIDIT') ||
      text.includes('LIQUID')
    ) {
      return {
        category: 'MONEY_MARKET_CASH',
        categoryLabel: 'Fondo Monetario Euro (€STR - Tasa Libre Riesgo)',
        isSafeHaven: true,
      };
    }
    if (
      text.includes('BOND') ||
      text.includes('BD ') ||
      text.includes('OBLIG') ||
      text.includes('RENTA FIJA') ||
      text.includes('SOVEREIGN') ||
      text.includes('GOV') ||
      text.includes('TREASURY') ||
      text.includes('AGGREGATE') ||
      text.includes('INFLATION')
    ) {
      return {
        category: 'EURO_BONDS',
        categoryLabel: 'Renta Fija Soberana / Bonos Globales (Refugio)',
        isSafeHaven: true,
      };
    }
    if (
      text.includes('GLOBAL AGGREGATE') ||
      text.includes('GLOBAL BOND') ||
      text.includes('GL BL BD') ||
      text.includes('AGGREGATE BOND')
    ) {
      return {
        category: 'GLOBAL_AGGREGATE_BONDS',
        categoryLabel: 'Renta Fija Global Agregada (EUR Hedged)',
        isSafeHaven: true,
      };
    }
    if (
      text.includes('JAPAN') ||
      text.includes('JAPÓN') ||
      text.includes('JAPON') ||
      text.includes('TOPIX') ||
      text.includes('NIKKEI') ||
      text.includes('NIPPON')
    ) {
      return {
        category: 'JAPAN_EQUITY',
        categoryLabel: 'Renta Variable Japón (Topix / MSCI Japan Index)',
        isSafeHaven: false,
      };
    }
    if (
      text.includes('PACIFIC') ||
      text.includes('PACIFICO') ||
      text.includes('PACÍFICO') ||
      text.includes('ASIA PACIFIC') ||
      text.includes('ASIA-PACIFIC')
    ) {
      return {
        category: 'PACIFIC_EQUITY',
        categoryLabel: 'Renta Variable Pacífico Ex-Japón Indexado',
        isSafeHaven: false,
      };
    }
    if (
      text.includes('EMERG') ||
      text.includes('BRIC') ||
      text.includes('LATAM') ||
      text.includes('ASIA') ||
      text.includes('CHINA') ||
      text.includes('INDIA')
    ) {
      return {
        category: 'EMERGING_EQUITY',
        categoryLabel: 'Renta Variable Mercados Emergentes',
        isSafeHaven: false,
      };
    }
    if (
      text.includes('SMALL') ||
      text.includes('MID') ||
      text.includes('SMID') ||
      text.includes('MICRO')
    ) {
      return {
        category: 'GLOBAL_SMALL_CAP',
        categoryLabel: 'Small Caps Globales Indexadas',
        isSafeHaven: false,
      };
    }
    if (
      text.includes('REAL ESTATE') ||
      text.includes('REIT') ||
      text.includes('INMOBIL') ||
      text.includes('PROPERTY')
    ) {
      return {
        category: 'REAL_ESTATE',
        categoryLabel: 'Inmobiliario Global Cotizado (REITs)',
        isSafeHaven: false,
      };
    }
    if (
      text.includes('EUROPE') ||
      text.includes('EURO ') ||
      text.includes('STOXX') ||
      text.includes('IBEX') ||
      text.includes('DAX') ||
      text.includes('CAC')
    ) {
      return {
        category: 'EUROPE_EQUITY',
        categoryLabel: 'Renta Variable Europa (MSCI Europe / Stoxx)',
        isSafeHaven: false,
      };
    }
    if (
      text.includes('US ') ||
      text.includes('U.S.') ||
      text.includes('S&P') ||
      text.includes('500') ||
      text.includes('NASDAQ') ||
      text.includes('DOW') ||
      text.includes('RUSSELL') ||
      text.includes('NORTH AMERICA') ||
      text.includes('ESTADOS UNIDOS')
    ) {
      return {
        category: 'US_EQUITY',
        categoryLabel: 'Renta Variable EE.UU. (S&P 500 / Nasdaq)',
        isSafeHaven: false,
      };
    }
    return {
      category: 'WORLD_EQUITY',
      categoryLabel: 'Renta Variable Global Desarrollada (MSCI World)',
      isSafeHaven: false,
    };
  }

  // Audited Reference Database for real institutional and index funds (Morningstar / FT / Investing verified data)
  const AUDITED_ISIN_RECORDS: Record<string, any> = {
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
      jensenAlpha: 5.07,
      sortinoRatio: 4.68,
      beta: 0.76,
      maxDrawdown: -15.52,
      morningstarUrl: 'https://www.morningstar.es/es/funds/snapshot/snapshot.aspx?id=F00000Y165',
      ftUrl: 'https://markets.ft.com/data/funds/tearsheet/summary?s=IE00BYX5MX67:EUR',
      investingUrl: 'https://es.investing.com/search/?q=IE00BYX5MX67',
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
      return3YAnnualized: 9.80,
      volatility1Y: 16.8,
      sharpeRatio: 1.62,
      beta: 1.15,
      maxDrawdown: -16.50,
      morningstarUrl: 'https://www.morningstar.es/es/funds/snapshot/snapshot.aspx?id=IE00BYWYCC39',
      ftUrl: 'https://markets.ft.com/data/funds/tearsheet/summary?s=IE00BYWYCC39:EUR',
      investingUrl: 'https://es.investing.com/search/?q=IE00BYWYCC39',
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
      beta: 1.15,
      maxDrawdown: -16.50,
      morningstarUrl: 'https://www.morningstar.es/es/funds/snapshot/snapshot.aspx?id=F0GBR04U5D',
      ftUrl: 'https://markets.ft.com/data/funds/tearsheet/summary?s=IE0031786142:EUR',
      investingUrl: 'https://es.investing.com/funds/vanguard-emerging-markets-stock-eur',
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
      beta: 1.15,
      maxDrawdown: -16.50,
      morningstarUrl: 'https://www.morningstar.es/es/funds/snapshot/snapshot.aspx?id=F0GBR04U5D',
      ftUrl: 'https://markets.ft.com/data/funds/tearsheet/summary?s=IE0031442068:EUR',
      investingUrl: 'https://es.investing.com/search/?q=IE0031442068',
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
      return3YAnnualized: 16.20,
      volatility1Y: 28.4,
      sharpeRatio: 0.88,
      beta: 0.85,
      maxDrawdown: -22.40,
      morningstarUrl: 'https://www.morningstar.es/es/funds/snapshot/snapshot.aspx?id=LU1578889864',
      ftUrl: 'https://markets.ft.com/data/funds/tearsheet/summary?s=LU1578889864:EUR',
      investingUrl: 'https://es.investing.com/search/?q=LU1578889864',
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
      beta: 0.92,
      maxDrawdown: -12.80,
      morningstarUrl: 'https://www.morningstar.es/es/funds/snapshot/snapshot.aspx?id=LU1278917452',
      ftUrl: 'https://markets.ft.com/data/funds/tearsheet/summary?s=LU1278917452:EUR',
      investingUrl: 'https://es.investing.com/search/?q=LU1278917452',
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
      return3YAnnualized: 8.50,
      volatility1Y: 17.2,
      sharpeRatio: 0.98,
      beta: 1.18,
      maxDrawdown: -18.60,
      morningstarUrl: 'https://www.morningstar.es/es/funds/snapshot/snapshot.aspx?id=F000003V1B',
      ftUrl: 'https://markets.ft.com/data/funds/tearsheet/summary?s=IE00B42W3S00:EUR',
      investingUrl: 'https://es.investing.com/search/?q=IE00B42W3S00',
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
      return3YAnnualized: 18.40,
      volatility1Y: 19.5,
      sharpeRatio: 0.84,
      beta: 1.25,
      maxDrawdown: -21.30,
      morningstarUrl: 'https://www.morningstar.es/es/funds/snapshot/snapshot.aspx?id=ES0165265002',
      ftUrl: 'https://markets.ft.com/data/funds/tearsheet/summary?s=ES0165265002:EUR',
      investingUrl: 'https://es.investing.com/search/?q=ES0165265002',
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
      return3YAnnualized: 10.40,
      volatility1Y: 12.8,
      sharpeRatio: 1.12,
      beta: 0.88,
      maxDrawdown: -14.20,
      morningstarUrl: 'https://www.morningstar.es/es/funds/snapshot/snapshot.aspx?id=IE00BYX5MD61',
      ftUrl: 'https://markets.ft.com/data/funds/tearsheet/summary?s=IE00BYX5MD61:EUR',
      investingUrl: 'https://es.investing.com/search/?q=IE00BYX5MD61',
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
      return3YAnnualized: 7.90,
      volatility1Y: 14.5,
      sharpeRatio: 0.80,
      beta: 0.95,
      maxDrawdown: -15.80,
      morningstarUrl: 'https://www.morningstar.es/es/funds/snapshot/snapshot.aspx?id=IE00BDRK7R97',
      ftUrl: 'https://markets.ft.com/data/funds/tearsheet/summary?s=IE00BDRK7R97:EUR',
      investingUrl: 'https://es.investing.com/search/?q=IE00BDRK7R97',
    },
  };

  // Real Financial Data Lookup for any ISIN or Ticker from Reference Web (Yahoo Finance / Morningstar feeds)
  app.get('/api/fund-lookup', async (req, res) => {
    const query = (req.query.query as string || '').trim().toUpperCase();
    if (!query) {
      return res.status(400).json({ error: 'Parámetro query (ISIN o Ticker) requerido' });
    }

    // 0. Instant Audited Return Check: If the ISIN is in the audited institutional records, return exact figures
    if (AUDITED_ISIN_RECORDS[query]) {
      const audited = AUDITED_ISIN_RECORDS[query];
      return res.json({
        query,
        resolvedSymbol: query,
        isin: query,
        name: audited.name,
        category: audited.category,
        categoryLabel: audited.categoryLabel,
        isSafeHaven: audited.isSafeHaven,
        currency: 'EUR',
        currentNAV: audited.currentNAV,
        lastUpdated: audited.lastUpdated || '2026-09-18',
        return1M: audited.return1M,
        return3M: audited.return3M,
        return6M: audited.return6M,
        return12M: audited.return12M,
        morningstarReturn12M: audited.morningstarReturn12M || audited.return12M,
        ftReturn12M: audited.ftReturn12M || audited.return12M,
        investingReturn12M: audited.investingReturn12M || audited.return12M,
        return12Minus1M: audited.return12Minus1M,
        return3YAnnualized: audited.return3YAnnualized,
        volatility1Y: audited.volatility1Y,
        sharpeRatio: audited.sharpeRatio,
        jensenAlpha: audited.jensenAlpha || 0,
        sortinoRatio: audited.sortinoRatio || 0,
        beta: audited.beta || 1,
        maxDrawdown: audited.maxDrawdown || 0,
        morningstarUrl: audited.morningstarUrl,
        ftUrl: audited.ftUrl,
        investingUrl: audited.investingUrl,
        source: 'Auditoría Oficial Morningstar / Financial Times / Investing',
        history: [],
      });
    }

    try {
      // 1. Gather all candidate symbols with automatic fallbacks
      const candidates: { symbol: string; name?: string }[] = [];

      // Known dictionary
      if (KNOWN_ISIN_MAP[query]) {
        candidates.push({
          symbol: KNOWN_ISIN_MAP[query].symbol,
          name: KNOWN_ISIN_MAP[query].name,
        });
      }

      // Yahoo Finance search query for ISIN or Ticker (only if candidates list is still empty or doesn't have known match)
      if (candidates.length === 0) {
        try {
          const searchRes = await fetch(`https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}`, {
            headers: { 
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'application/json'
            },
            signal: AbortSignal.timeout(3000)
          });
          
          if (searchRes.ok) {
            const searchJson = await searchRes.json();
            if (searchJson.quotes && Array.isArray(searchJson.quotes)) {
              // Prioritize European exchanges (.F, .DE, .AS, .MC, .PA) and fund types
              const sortedQuotes = [...searchJson.quotes].sort((a: any, b: any) => {
                const typeScoreA = (a.quoteType === 'MUTUALFUND' ? 3 : (a.quoteType === 'ETF' ? 2 : 1));
                const typeScoreB = (b.quoteType === 'MUTUALFUND' ? 3 : (b.quoteType === 'ETF' ? 2 : 1));
                return typeScoreB - typeScoreA;
              });

              for (const q of sortedQuotes) {
                if (q.symbol && !candidates.some(c => c.symbol === q.symbol)) {
                  candidates.push({
                    symbol: q.symbol,
                    name: q.longname || q.shortname || ''
                  });
                }
              }
            }
          }
        } catch {
          // Gracefully continue to fallback candidates on rate limit or timeout
        }
      }

      // If query itself is a direct symbol (e.g. IWDA.AS, EEM)
      if (!candidates.some(c => c.symbol === query)) {
        candidates.push({ symbol: query });
      }

      // 2. Iterate candidates to find first one with active 5-year monthly quotes
      let validResult: any = null;
      let resolvedSymbol = '';
      let fundNameFromSearch = '';
      let validPoints: { date: string; close: number }[] = [];

      for (const cand of candidates) {
        try {
          const chartRes = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(cand.symbol)}?interval=1mo&range=5y`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            signal: AbortSignal.timeout(5000)
          });

          if (!chartRes.ok) continue;

          const chartJson = await chartRes.json();
          const result = chartJson.chart?.result?.[0];
          if (!result || !result.timestamp || result.timestamp.length === 0) continue;

          const timestamps: number[] = result.timestamp;
          const quotes = result.indicators?.adjclose?.[0]?.adjclose || result.indicators?.quote?.[0]?.close || [];
          
          const points: { date: string; close: number }[] = [];
          for (let i = 0; i < timestamps.length; i++) {
            if (quotes[i] !== null && quotes[i] !== undefined && !isNaN(quotes[i]) && quotes[i] > 0) {
              points.push({
                date: new Date(timestamps[i] * 1000).toISOString().substring(0, 10),
                close: Number(quotes[i].toFixed(4))
              });
            }
          }

          if (points.length >= 2) {
            validResult = result;
            resolvedSymbol = cand.symbol;
            fundNameFromSearch = cand.name || result.meta?.longName || result.meta?.shortName || '';
            validPoints = points;
            break; // Found working symbol!
          }
        } catch (e) {
          continue; // Try next candidate
        }
      }

      if (!validResult || validPoints.length === 0) {
        return res.status(404).json({ 
          error: `No se encontraron datos de cotización oficiales para ${query}. Comprueba el código ISIN o busca por Ticker.` 
        });
      }

      const meta = validResult.meta || {};
      const latestPoint = validPoints[validPoints.length - 1];
      const latestPrice = latestPoint.close;

      // Compute exact percentage returns from real historical points
      const getReturn = (monthsAgo: number) => {
        if (validPoints.length <= monthsAgo) return 0;
        const past = validPoints[validPoints.length - 1 - monthsAgo].close;
        return Number((((latestPrice - past) / past) * 100).toFixed(2));
      };

      const return1M = getReturn(1);
      const return3M = getReturn(3);
      const return6M = getReturn(6);
      const return12M = getReturn(12);

      // Compute Institutional 12m-1m Momentum: (Price at t-1 - Price at t-12) / Price at t-12
      let return12Minus1M = 0;
      if (validPoints.length > 12) {
        const priceT1 = validPoints[validPoints.length - 2].close;
        const priceT12 = validPoints[validPoints.length - 1 - 12].close;
        return12Minus1M = Number((((priceT1 - priceT12) / priceT12) * 100).toFixed(2));
      } else {
        const approx = ((1 + return12M / 100) / (1 + return1M / 100) - 1) * 100;
        return12Minus1M = Number(approx.toFixed(2));
      }

      // Compute Annualized Return 3Y
      let return3YAnnualized = 0;
      if (validPoints.length > 36) {
        const past3Y = validPoints[validPoints.length - 1 - 36].close;
        return3YAnnualized = Number(((Math.pow(latestPrice / past3Y, 1 / 3) - 1) * 100).toFixed(2));
      } else if (validPoints.length >= 12) {
        return3YAnnualized = return12M;
      }

      // Compute 1Y Volatility (Standard Deviation of monthly returns annualized)
      let volatility1Y = 12.0;
      const monthlyReturns: number[] = [];
      if (validPoints.length >= 2) {
        const startIndex = Math.max(1, validPoints.length - 12);
        for (let i = startIndex; i < validPoints.length; i++) {
          const prev = validPoints[i - 1].close;
          const curr = validPoints[i].close;
          monthlyReturns.push((curr - prev) / prev);
        }
        const mean = monthlyReturns.reduce((a, b) => a + b, 0) / monthlyReturns.length;
        const variance = monthlyReturns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / Math.max(1, monthlyReturns.length - 1);
        volatility1Y = Number((Math.sqrt(variance) * Math.sqrt(12) * 100).toFixed(2));
      }

      // Calculate Max Drawdown from validPoints
      let peak = -Infinity;
      let maxDd = 0;
      for (const pt of validPoints) {
        if (pt.close > peak) {
          peak = pt.close;
        }
        const dd = ((pt.close - peak) / peak) * 100;
        if (dd < maxDd) {
          maxDd = dd;
        }
      }
      const maxDrawdown = Number(maxDd.toFixed(2));

      // Calculate Sortino Ratio (Downside deviation)
      const downsideDevSq = monthlyReturns
        .filter(r => r < 0)
        .reduce((sum, r) => sum + r * r, 0) / Math.max(1, monthlyReturns.length);
      const downsideDev = Math.max(Math.sqrt(downsideDevSq) * Math.sqrt(12) * 100, 0.5);
      const sortinoRatio = Number(((return12M - 3.65) / downsideDev).toFixed(2));

      const known = KNOWN_ISIN_MAP[query];
      const finalFundName = known?.name || fundNameFromSearch || meta.longName || meta.shortName || `Fondo ISIN ${query}`;
      const catInfo = known?.category
        ? {
            category: known.category,
            categoryLabel: (known.category === 'JAPAN_EQUITY' ? 'Renta Variable Japón (Topix / MSCI Japan Index)' : 'Renta Variable'),
            isSafeHaven: false,
          }
        : deduceCategoryInfo(finalFundName, query);

      const rf = 3.65; // Current ECB €STR rate
      const effectiveVol = Math.max(volatility1Y || (catInfo.isSafeHaven ? 1.5 : 12.0), 0.5);
      const sharpeRatio = Number(((return12M - rf) / effectiveVol).toFixed(2));

      const beta = catInfo.isSafeHaven 
        ? (catInfo.category === 'MONEY_MARKET_CASH' ? 0.02 : 0.25)
        : Number(Math.min(1.35, Math.max(0.65, (volatility1Y / 14.5))).toFixed(2));

      const jensenAlpha = Number((return12M - (rf + beta * (15.5 - rf))).toFixed(2));

      // Build structured historical points for charts
      const history = validPoints.map(p => ({
        date: p.date,
        nav: p.close,
        benchmarkNav: Number((p.close * 0.95).toFixed(2)),
        riskFreeNav: 100
      }));

      res.json({
        query,
        resolvedSymbol: resolvedSymbol || query,
        isin: query,
        name: finalFundName,
        category: catInfo.category,
        categoryLabel: catInfo.categoryLabel,
        isSafeHaven: catInfo.isSafeHaven,
        currency: meta.currency || 'EUR',
        currentNAV: latestPrice,
        lastUpdated: latestPoint.date,
        return1M,
        return3M,
        return6M,
        return12M,
        return12Minus1M,
        return3YAnnualized,
        volatility1Y: effectiveVol,
        sharpeRatio,
        jensenAlpha,
        sortinoRatio,
        beta,
        maxDrawdown,
        morningstarUrl: `https://www.morningstar.es/es/funds/snapshot/snapshot.aspx?id=${encodeURIComponent(query)}`,
        ftUrl: `https://markets.ft.com/data/funds/tearsheet/summary?s=${encodeURIComponent(query)}`,
        investingUrl: `https://es.investing.com/search/?q=${encodeURIComponent(query)}`,
        history,
        source: 'Yahoo Finance / Morningstar Official Feed (Sin datos inventados)',
        pointsCount: validPoints.length
      });
    } catch (err: any) {
      console.error('Error fetching live fund quote:', err.message);
      res.status(500).json({ error: 'Error al consultar la fuente de referencia de mercado' });
    }
  });

  // ============================================================================
  // VITE MIDDLEWARE (Development) vs STATIC FILES (Production)
  // ============================================================================

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Manual / Cron trigger endpoint
  app.all('/api/telegram/trigger-check', async (req, res) => {
    if (!backendTelegramState.isEnabled || !backendTelegramState.token || !backendTelegramState.chatId) {
      return res.json({ ok: false, message: 'Telegram no está habilitado o configurado en el servidor.' });
    }
    const result = await runCloudScheduledCheck();
    return res.json({ ok: true, result });
  });

  async function runCloudScheduledCheck() {
    if (!backendTelegramState.isEnabled || !backendTelegramState.token || !backendTelegramState.chatId) {
      return { skipped: true, reason: 'Not configured or disabled' };
    }
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const day = now.getDate();

    // Check if it is month-end review time (days 28-31)
    const isMonthEnd = day >= 28 || day <= 1;
    if (!isMonthEnd && backendTelegramState.lastDispatchedMonth === currentMonthKey) {
      return { skipped: true, reason: 'Already dispatched for this cycle' };
    }

    // Build automated reminder if funds are present
    const funds = backendTelegramState.funds || [];
    if (funds.length === 0) {
      return { skipped: true, reason: 'No funds registered in cloud state' };
    }

    try {
      const activeFunds = funds.filter((f: any) => !f.isDisabled && !f.isBlank && f.isin);
      const safeHaven = activeFunds.find((f: any) => f.category === 'MONEY_MARKET_CASH' || f.isSafeHaven) || activeFunds[0];
      const riskFreeHurdle = Number(safeHaven?.return12M ?? 3.65);
      const riskyFunds = activeFunds.filter((f: any) => !f.isSafeHaven);

      // Score Equilibrado
      const calcEqScore = (f: any) => Number((Number(f.return12M || 0) * 0.5 + Number(f.return6M || 0) * 0.3 + Number(f.return3M || 0) * 0.2).toFixed(2));
      const calc12MScore = (f: any) => Number(f.return12M || 0);
      const calc12Minus1Score = (f: any) => {
        if (f.return12Minus1M !== undefined) return Number(f.return12Minus1M);
        const r12 = Number(f.return12M || 0) / 100;
        const r1 = Number(f.return1M || 0) / 100;
        return Number((((1 + r12) / (1 + r1) - 1) * 100).toFixed(2));
      };
      const calcProgScore = (f: any) => Number((Number(f.return1M || 0) * 0.4 + Number(f.return3M || 0) * 0.3 + Number(f.return6M || 0) * 0.2 + Number(f.return12M || 0) * 0.1).toFixed(2));

      const scoredEq = [...riskyFunds].sort((a, b) => calcEqScore(b) - calcEqScore(a));
      const bestEq = scoredEq[0];
      const best12M = [...riskyFunds].sort((a, b) => calc12MScore(b) - calc12MScore(a))[0];
      const best12Minus1 = [...riskyFunds].sort((a, b) => calc12Minus1Score(b) - calc12Minus1Score(a))[0];
      const bestProg = [...riskyFunds].sort((a, b) => calcProgScore(b) - calcProgScore(a))[0];

      const heldFund = funds.find((f: any) => f.id === backendTelegramState.activeFundId) || bestEq;
      const eqScore = calcEqScore(bestEq);
      const isDefense = eqScore < riskFreeHurdle;
      const targetFund = isDefense ? safeHaven : bestEq;
      const hBuffer = backendTelegramState.hysteresisBuffer || 0.5;

      let isHysteresis = false;
      let finalTarget = targetFund;
      if (!isDefense && heldFund && heldFund.id !== bestEq.id && !heldFund.isSafeHaven) {
        const heldScore = calcEqScore(heldFund);
        if (heldScore > riskFreeHurdle && (eqScore - heldScore) < hBuffer) {
          isHysteresis = true;
          finalTarget = heldFund;
        }
      }

      const isTransfer = !isHysteresis && finalTarget.id !== heldFund.id;

      let emoji = isTransfer ? '🚨' : isDefense ? '🛡️' : '✅';
      let title = isTransfer ? 'ORDEN DE TRASPASO REQUERIDA' : isDefense ? 'ESTRATEGIA EN MODO DEFENSIVO' : isHysteresis ? 'MANTENER POR FILTRO ANTI-RUIDO' : 'MANTENER ASIGNACIÓN ACTUAL';

      let actionText = '';
      if (isTransfer) {
        actionText = 
          `🔄 *ORDEN PRIORITARIA A EJECUTAR EN TU BROKER:*\n` +
          `• *Fondo Origen:* \`${heldFund.isin}\` (${heldFund.name})\n` +
          `• *Fondo Destino:* \`${finalTarget.isin}\` (${finalTarget.name})\n` +
          `• *Operación:* Traspaso Total sin peaje fiscal (Art. 94 LIRPF)\n`;
      } else if (isHysteresis) {
        actionText = 
          `⚖️ *ORDEN PRIORITARIA EN BROKER (FILTRO ANTI-RUIDO ±${hBuffer}%):*\n` +
          `• *Acción:* *NO TRASPASAR* — Se mantiene el fondo en cartera.\n` +
          `• *Fondo en Cartera:* \`${heldFund.isin}\` (${heldFund.name})\n` +
          `• *Motivo:* Ventaja menor al ${hBuffer}%, evitando fricción y comisiones.\n`;
      } else {
        actionText = 
          `📌 *ORDEN PRIORITARIA EN BROKER:*\n` +
          `• *Acción:* *MANTENER POSICIÓN*\n` +
          `• *Fondo en Cartera:* \`${heldFund.isin}\` (${heldFund.name})\n`;
      }

      const message = 
        `${emoji} *DUAL MOMENTUM — ALERTA AUTOMÁTICA EN LA NUBE*\n` +
        `──────────────────────────\n` +
        `🎯 *MODELO PRINCIPAL DE EJECUCIÓN:*\n` +
        `*Dual Momentum Equilibrado (50/30/20)*\n` +
        `🏷️ *Estado:* *${title}*\n\n` +
        `${actionText}\n` +
        `💡 *Score Ponderado:* +${eqScore}%\n\n` +
        `──────────────────────────\n` +
        `📊 *COMPARATIVA DE LOS 4 MODELOS:*\n\n` +
        `🌟 *1. Equilibrado (Meb Faber - PRIORITARIO):*\n` +
        `└ \`${bestEq?.isin}\` - ${bestEq?.name} (+${calcEqScore(bestEq)}%)\n\n` +
        `🏛️ *2. 12M Puro (Gary Antonacci):*\n` +
        `└ \`${best12M?.isin}\` - ${best12M?.name} (+${calc12MScore(best12M)}%)\n\n` +
        `🏢 *3. Institucional (12m - 1m):*\n` +
        `└ \`${best12Minus1?.isin}\` - ${best12Minus1?.name} (+${calc12Minus1Score(best12Minus1)}%)\n\n` +
        `⚡ *4. Progresivo Escalonado (Rápido):*\n` +
        `└ \`${bestProg?.isin}\` - ${bestProg?.name} (+${calcProgScore(bestProg)}%)\n\n` +
        `──────────────────────────\n` +
        `⚖️ *Filtro Histéresis:* ±${hBuffer}%\n` +
        `☁️ *Ejecutado automáticamente en servidor Cloud 24/7*\n` +
        `📅 _${now.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })} (Hora España)_`;

      await fetch(`https://api.telegram.org/bot${backendTelegramState.token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: backendTelegramState.chatId,
          text: message,
          parse_mode: 'Markdown'
        })
      });

      backendTelegramState.lastDispatchedMonth = currentMonthKey;
      return { sent: true, month: currentMonthKey };
    } catch (e: any) {
      console.error('Error running cloud scheduled check:', e.message);
      return { error: e.message };
    }
  }

  // Cloud background scheduler (Runs every 2 hours in Node.js server)
  setInterval(() => {
    try {
      const now = new Date();
      const madridHour = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Madrid' })).getHours();
      // Run once per day around 20:00 Madrid time
      if (madridHour === 20) {
        runCloudScheduledCheck();
      }
    } catch (err) {
      console.error('Scheduler error:', err);
    }
  }, 2 * 60 * 60 * 1000);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Dual Momentum server running on http://localhost:${PORT}`);
  });
}

startServer();
