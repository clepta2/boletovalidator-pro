import BoletoValidatorPro, {
  validarLocal,
  decodificarCampoLivre,
  detectarPromptInjection,
  decodificarPix,
  compararBoletoPix,
  auditarBoleto,
  gerarBarcodeSvg,
  gerarBoleto,
  formatar,
  limpar
} from './boletovalidator-pro.js';

/**
 * worker.js ? BoletoValidator Pro API na Borda Cloudflare Anycast
 * Arquitetura Modular: Micro-fun??es At?micas (<1ms) + Rota Orquestradora de Auditoria Forense
 * 
 * @license MIT
 * @see https://github.com/clepta2/boletovalidator-pro
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
  'Access-Control-Max-Age': '86400'
};

const ipBuckets = new Map();

function checkRateLimit(ipOrKey, limit = 60, windowMs = 60000) {
  const now = Date.now();
  let entry = ipBuckets.get(ipOrKey);
  if (!entry || now > entry.resetAt) {
    entry = { count: 1, resetAt: now + windowMs };
    ipBuckets.set(ipOrKey, entry);
    if (ipBuckets.size > 10000) {
      for (const [k, v] of ipBuckets) {
        if (now > v.resetAt) ipBuckets.delete(k);
      }
    }
    return { ok: true, remaining: limit - 1, resetAt: entry.resetAt };
  }
  entry.count++;
  if (entry.count > limit) {
    return { ok: false, remaining: 0, resetAt: entry.resetAt };
  }
  return { ok: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS_HEADERS,
      ...extraHeaders
    }
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/$/, '') || '/';

    // 1. Preflight CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // 2. Blindagem de M?todos HTTP
    if (request.method !== 'GET' && request.method !== 'POST') {
      return jsonResponse({ ok: false, error: 'M?todo n?o permitido. Utilize GET ou POST.' }, 405);
    }

    let bodyJson = null;
    if (request.method === 'POST') {
      try {
        bodyJson = await request.json();
      } catch (_) {}
    }

    // 3. Autentica??o e Rate Limit
    const apiKey = request.headers.get('x-api-key') ||
                   request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ||
                   url.searchParams.get('api_key') ||
                   url.searchParams.get('key') || '';
    const cleanKey = String(apiKey).trim();
    const isDemo = url.searchParams.get('demo') === 'true' || cleanKey.toLowerCase() === 'demo' || cleanKey.toLowerCase() === 'sandbox';
    const isCommercial = Boolean(
      cleanKey && (
        cleanKey.startsWith('bol_live_') || 
        cleanKey.startsWith('bol_pro_') || 
        cleanKey.startsWith('bol_master_') || 
        cleanKey.startsWith('pnt_live_') ||
        (env && (env.API_KEY === cleanKey || env.PRO_KEY === cleanKey))
      ) && cleanKey.length >= 16
    );

    const clientIp = request.headers.get('CF-Connecting-IP') || request.headers.get('x-real-ip') || '127.0.0.1';
    const maxReqs = isCommercial ? 300 : 60;
    const rl = checkRateLimit(isCommercial ? cleanKey : clientIp, maxReqs, 60000);

    if (!rl.ok && pathname !== '/health' && pathname !== '/status' && pathname !== '/') {
      return jsonResponse({
        ok: false,
        error: 'Limite tempor?rio de requisi??es excedido. Aguarde o per?odo indicado em Retry-After.',
        retryAfterSeconds: Math.ceil((rl.resetAt - Date.now()) / 1000)
      }, 429, {
        'Retry-After': String(Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000))),
        'X-RateLimit-Limit': String(maxReqs),
        'X-RateLimit-Remaining': String(rl.remaining)
      });
    }

    // 4. Healthcheck e Cat?logo de Rotas
    if (pathname === '/health' || pathname === '/status' || pathname === '/') {
      return jsonResponse({
        ok: true,
        service: 'BoletoValidator Pro API',
        version: '2.5.0',
        cluster: 'Cloudflare Edge Anycast (maputo3.workers.dev)',
        status: 'online',
        autenticado: isCommercial,
        plano: isCommercial ? 'Pro Anycast' : (isDemo ? 'Sandbox / Demo' : 'Gratuito Limitado'),
        arquitetura: 'Micro-fun??es At?micas (<1ms) + Auditoria Forense com Prote??o Anti-Injection',
        rotas: {
          auditar: 'POST /api/auditar (Laudo Pericial Forense Completo: Linha x Barras x Pix x Valores x Anti-Injection)',
          validar: 'GET ou POST /api/validar?boleto=... (M?dulo 10 e 11 FEBRABAN para 44, 47 e 48 d?gitos)',
          campoLivre: 'GET ou POST /api/campo-livre?boleto=... (Extra??o de Banco, Ag?ncia, Conta e Nosso N?mero)',
          antiInjection: 'POST /api/seguranca/anti-injection (Varredura can?ria anti-jailbreak em documentos/textos)',
          compararPix: 'POST /api/pix/comparar (Cruzamento entre dados do Boleto e QR Code Pix)',
          barcodeSvg: 'GET /api/barcode?boleto=...&format=svg (Renderizador oficial ITF FEBRABAN em SVG puro)',
          lote: 'POST /api/boleto/lote (Valida??o em Lote at? 50 itens Pro ou 5 gratuitos)',
          gerar: 'GET ou POST /api/gerar?banco=341&valor=125.00 (Gerador de boletos v?lidos para homologa??o)'
        },
        github: 'https://github.com/clepta2/boletovalidator-pro'
      });
    }

    // ??? ROTA 1: AUDITORIA FORENSE COMPLETA (ORQUESTRADOR) ?????????????????????
    if (pathname === '/api/auditar' || pathname === '/api/boleto/auditar') {
      if (request.method !== 'POST') {
        return jsonResponse({ ok: false, error: 'Utilize o m?todo POST para a rota de auditoria forense.' }, 405);
      }

      const params = bodyJson || {};
      const resultado = auditarBoleto(params);

      // Tratamento de Erro de Seguran?a Especial: Prompt Injection
      if (!resultado.ok && resultado.codigo === 'PROMPT_INJECTION_DETECTADO') {
        return jsonResponse(resultado, 422);
      }

      const statusCode = resultado.valido ? 200 : 422;
      return jsonResponse(resultado, statusCode, {
        'Cache-Control': 'public, max-age=120'
      });
    }

    // ??? ROTA 2: VALIDA??O AT?MICA FEBRABAN ??????????????????????????????????
    if (pathname === '/api/validar' || pathname === '/api/validar-boleto' || pathname === '/api/boleto/validar') {
      let boletoInput = url.searchParams.get('boleto') || url.searchParams.get('linha') || url.searchParams.get('codigo') || '';
      if (!boletoInput && bodyJson) {
        boletoInput = bodyJson.boleto || bodyJson.linha || bodyJson.codigo || '';
      }

      if (!boletoInput) {
        return jsonResponse({
          ok: false,
          valido: false,
          erro: 'Informe o par?metro ?boleto=LINHA_DIGITAVEL_OU_CODIGO_BARRAS ou no corpo JSON.'
        }, 400);
      }

      const resultado = validarLocal(boletoInput);
      return jsonResponse({
        ok: resultado.valido,
        ...resultado,
        edge: 'maputo3.workers.dev',
        audit: { timestamp: new Date().toISOString() }
      }, resultado.valido ? 200 : 422, {
        'Cache-Control': 'public, max-age=300'
      });
    }

    // ??? ROTA 3: DECODIFICA??O DE CAMPO LIVRE (AG?NCIA / CONTA) ??????????????
    if (pathname === '/api/campo-livre' || pathname === '/api/boleto/campo-livre') {
      let banco = url.searchParams.get('banco') || '';
      let campoLivre = url.searchParams.get('campoLivre') || '';
      let boletoInput = url.searchParams.get('boleto') || '';

      if (bodyJson) {
        banco = banco || bodyJson.banco || '';
        campoLivre = campoLivre || bodyJson.campoLivre || '';
        boletoInput = boletoInput || bodyJson.boleto || '';
      }

      if (boletoInput && (!banco || !campoLivre)) {
        const resVal = validarLocal(boletoInput);
        if (resVal.valido && resVal.codigoBarras && resVal.banco) {
          banco = resVal.banco.codigo;
          campoLivre = resVal.codigoBarras.slice(19, 44);
        }
      }

      if (!banco || !campoLivre) {
        return jsonResponse({
          ok: false,
          erro: 'Informe ?boleto=... ou os par?metros ?banco=XXX&campoLivre=YYYYYYYYYYYYYYYYYYYYYYYYY (25 d?gitos).'
        }, 400);
      }

      const decodificado = decodificarCampoLivre(banco, campoLivre);
      return jsonResponse({
        ok: Boolean(decodificado),
        banco,
        campoLivre,
        dadosBancarios: decodificado
      }, 200, { 'Cache-Control': 'public, max-age=600' });
    }

    // ??? ROTA 4: SEGURAN?A / ANTI-PROMPT INJECTION ???????????????????????????
    if (pathname === '/api/seguranca/anti-injection' || pathname === '/api/anti-injection') {
      let texto = url.searchParams.get('texto') || '';
      if (bodyJson) texto = texto || bodyJson.texto || bodyJson.documento || '';

      if (!texto) {
        return jsonResponse({ ok: false, erro: 'Envie o campo "texto" no corpo JSON ou via query param.' }, 400);
      }

      const resShield = detectarPromptInjection(texto);
      if (!resShield.seguro) {
        return jsonResponse({
          ok: false,
          status: 'ALERTA_DE_SEGURANCA',
          ...resShield
        }, 422);
      }

      return jsonResponse({
        ok: true,
        status: 'SEGURO',
        ...resShield
      });
    }

    // ??? ROTA 5: COMPARADOR BOLETO vs PIX ????????????????????????????????????
    if (pathname === '/api/pix/comparar' || pathname === '/api/boleto/pix-comparar') {
      const p = bodyJson || {};
      const boletoInput = p.boleto || url.searchParams.get('boleto') || '';
      const payloadPix = p.payloadPix || p.pix || url.searchParams.get('pix') || '';
      const beneficiario = p.beneficiario || url.searchParams.get('beneficiario') || '';

      if (!payloadPix) {
        return jsonResponse({ ok: false, erro: 'Informe o campo "payloadPix" (C?digo Pix Copia e Cola / EMVCo).' }, 400);
      }

      let dadosBoleto = null;
      if (boletoInput) {
        dadosBoleto = validarLocal(boletoInput);
      }

      const comp = compararBoletoPix(dadosBoleto, payloadPix, beneficiario);
      return jsonResponse({
        ok: comp.compativel,
        ...comp
      });
    }

    // ??? ROTA 6: RENDERIZADOR DE C?DIGO DE BARRAS SVG (ITF FEBRABAN) ??????????
    if (pathname === '/api/barcode' || pathname === '/api/boleto/barcode') {
      let boletoInput = url.searchParams.get('boleto') || url.searchParams.get('codigo') || '';
      const height = parseInt(url.searchParams.get('height') || '65', 10);
      const wantsSvgDirect = url.searchParams.get('format') === 'svg' ||
        (request.headers.get('Accept') && request.headers.get('Accept').includes('image/svg+xml'));

      if (!boletoInput && bodyJson) {
        boletoInput = bodyJson.boleto || bodyJson.codigo || '';
      }

      const limpo = limpar(boletoInput);
      let code44 = limpo;
      if (limpo.length === 47 || limpo.length === 48) {
        const val = validarLocal(limpo);
        if (val.valido && val.codigoBarras) {
          code44 = val.codigoBarras;
        }
      }

      const svg = gerarBarcodeSvg(code44, height);
      if (!svg) {
        return jsonResponse({ ok: false, erro: 'C?digo inv?lido para gera??o de c?digo de barras FEBRABAN.' }, 400);
      }

      if (wantsSvgDirect) {
        return new Response(svg, {
          status: 200,
          headers: {
            'Content-Type': 'image/svg+xml; charset=utf-8',
            ...CORS_HEADERS,
            'Cache-Control': 'public, max-age=86400'
          }
        });
      }

      return jsonResponse({
        ok: true,
        codigoBarras: code44,
        barcodeSvg: svg
      });
    }

    // ??? ROTA 7: VALIDA??O EM LOTE ???????????????????????????????????????????
    if (pathname === '/api/boleto/lote' || pathname === '/api/validar-boleto/lote') {
      if (request.method !== 'POST') {
        return jsonResponse({ ok: false, error: 'Use POST com um array "boletos".' }, 405);
      }

      const lista = bodyJson && Array.isArray(bodyJson.boletos) ? bodyJson.boletos : null;
      if (!lista || lista.length === 0) {
        return jsonResponse({ ok: false, error: 'Envie um array n?o vazio "boletos" no corpo JSON.' }, 400);
      }

      const maxItems = isCommercial ? 50 : 5;
      if (lista.length > maxItems) {
        return jsonResponse({
          ok: false,
          error: `O lote aceita at? ${maxItems} boletos por requisi??o neste plano.`,
          maxItems
        }, 413);
      }

      const resultados = lista.map((item) => {
        const res = validarLocal(item);
        return {
          boletoInformado: String(item),
          ok: res.valido,
          ...res
        };
      });

      return jsonResponse({
        ok: true,
        totalSolicitado: lista.length,
        totalValidos: resultados.filter((item) => item.valido).length,
        totalInvalidos: resultados.filter((item) => !item.valido).length,
        resultados
      });
    }

    // ??? ROTA 8: GERADOR DE BOLETOS V?LIDOS ??????????????????????????????????
    if (pathname === '/api/gerar' || pathname === '/api/boleto/gerar') {
      let params = {};
      if (bodyJson) {
        params = bodyJson;
      } else {
        params = {
          banco: url.searchParams.get('banco') || '341',
          valor: parseFloat(url.searchParams.get('valor') || '125.00'),
          vencimento: url.searchParams.get('vencimento') || ''
        };
      }
      const gerado = gerarBoleto(params);
      return jsonResponse({
        ok: true,
        boletoGerado: gerado
      });
    }

    return jsonResponse({ ok: false, error: 'Endpoint n?o encontrado. Acesse / para visualizar o cat?logo de rotas.' }, 404);
  }
};
