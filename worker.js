/**
 * BoletoValidator Pro — Cloudflare Edge API Gateway
 *
 * Responsável por:
 * 1. Validação matemática FEBRABAN (Módulo 10 e Módulo 11) na borda Anycast (<5ms)
 * 2. Conversão instantânea de Linha Digitável para Código de Barras (44 dígitos)
 * 3. Extração de Instituição Bancária, Fator de Vencimento e Valor Nominal
 * 4. Rate Limiting por IP e Chave Comercial
 *
 * @license MIT
 * @see https://github.com/clepta2/boletovalidator-pro
 */

import { BoletoValidatorPro } from './boletovalidator-pro.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
  'Access-Control-Max-Age': '86400'
};

const ipBuckets = new Map();

function checkRateLimit(ip, limit = 60, windowMs = 60000) {
  const now = Date.now();
  let entry = ipBuckets.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = { count: 1, resetAt: now + windowMs };
    ipBuckets.set(ip, entry);
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

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, '') || '/';

    // 1. Preflight CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // 2. Blindagem de Métodos: API estritamente de consulta/validação (Read-only)
    if (request.method !== 'GET' && request.method !== 'POST') {
      return new Response(JSON.stringify({
        ok: false,
        error: 'Método não permitido. Esta API é estritamente de consulta e validação pública.'
      }), {
        status: 405,
        headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS }
      });
    }

    // 3. Controle de Rate Limit por IP / Chave comercial
    const clientIp = request.headers.get('CF-Connecting-IP') || request.headers.get('x-real-ip') || '127.0.0.1';
    const authHeader = request.headers.get('Authorization') || request.headers.get('x-api-key') || '';
    const isCommercial = authHeader.length > 10;
    const maxReqs = isCommercial ? 300 : 60;
    const rl = checkRateLimit(clientIp, maxReqs, 60000);

    if (!rl.ok && path !== '/' && path !== '/health' && path !== '/demo') {
      return new Response(JSON.stringify({
        ok: false,
        valido: false,
        error: 'Limite de requisições excedido. Limite gratuito: 60 requisições/minuto. Para cotas ampliadas, use Ponte APIs (https://ponte.ozpro.com.br).',
        retryAfterSeconds: Math.ceil((rl.resetAt - Date.now()) / 1000)
      }, null, 2), {
        status: 429,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          ...CORS_HEADERS,
          'Retry-After': String(Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000))),
          'X-RateLimit-Limit': String(maxReqs),
          'X-RateLimit-Remaining': String(rl.remaining)
        }
      });
    }

    // 4. Healthcheck
    if (path === '/health' || path === '/status') {
      return new Response(JSON.stringify({
        ok: true,
        service: 'BoletoValidator Pro — Cloudflare Edge API Gateway',
        status: 'operational',
        version: env.API_VERSION || '1.0.0',
        latency: 'edge-sub-5ms',
        padrao: 'FEBRABAN Módulo 10 e Módulo 11',
        edgeLocation: request.cf ? request.cf.colo : 'Edge',
        docs: 'https://github.com/clepta2/boletovalidator-pro',
        marketplace: env.MARKETPLACE_URL || 'https://ponte.ozpro.com.br'
      }, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          ...CORS_HEADERS
        }
      });
    }

    // 5. Validação de Boleto (/api/validar-boleto, /api/boleto/validar, /validar, /api/boleto/:linha)
    if (path === '/api/validar-boleto' || path === '/api/boleto/validar' || path === '/validar' || path.startsWith('/api/boleto/')) {
      let boletoInput = null;

      if (request.method === 'GET') {
        boletoInput = url.searchParams.get('boleto') || url.searchParams.get('linha') || url.searchParams.get('codigo') || url.searchParams.get('q');
        if (!boletoInput && path.startsWith('/api/boleto/')) {
          const parts = path.split('/').filter(Boolean);
          boletoInput = parts[parts.length - 1];
        }
      } else if (request.method === 'POST') {
        try {
          const body = await request.json();
          boletoInput = body.boleto || body.linha || body.codigo || body.linhaDigitavel;
        } catch (_) {
          return new Response(JSON.stringify({ ok: false, error: 'JSON inválido no corpo da requisição.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS }
          });
        }
      }

      if (!boletoInput) {
        return new Response(JSON.stringify({
          ok: false,
          error: 'Parâmetro de linha digitável ou código de barras não informado. Use: GET /api/validar-boleto?boleto=... ou POST com {"boleto": "..."}'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS }
        });
      }

      const res = BoletoValidatorPro.validarLocal(boletoInput);

      return new Response(JSON.stringify({
        ok: true,
        ...res,
        timestamp: new Date().toISOString()
      }, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          ...CORS_HEADERS,
          'Cache-Control': res.valido ? 'public, max-age=604800, s-maxage=604800' : 'no-cache'
        }
      });
    }

    // 6. Landing / Playground (Root ou /demo)
    if (path === '/' || path === '/demo' || path === '/index.html') {
      return new Response(getHtmlDemo(), {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    return new Response(JSON.stringify({ ok: false, error: 'Endpoint não encontrado.' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS }
    });
  }
};

function getHtmlDemo() {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BoletoValidator Pro — API e SDK na Cloudflare Edge</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #090d16;
      --card: #111827;
      --accent: #f59e0b;
      --accent-glow: rgba(245, 158, 11, 0.25);
      --text: #f9fafb;
      --text-muted: #94a3b8;
      --border: rgba(255,255,255,0.08);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: 'Plus Jakarta Sans', sans-serif;
      padding: 30px 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
    }
    .container { max-width: 820px; width: 100%; }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 99px;
      background: rgba(245,158,11,0.12);
      border: 1px solid rgba(245,158,11,0.3);
      color: var(--accent);
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 16px;
    }
    h1 { font-size: 32px; font-weight: 800; margin-bottom: 8px; letter-spacing: -0.5px; }
    p.lead { color: var(--text-muted); font-size: 15px; margin-bottom: 28px; line-height: 1.6; }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.4);
    }
    .input-group { display: flex; gap: 12px; margin-bottom: 16px; }
    input {
      flex: 1;
      background: #040711;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 14px 16px;
      color: #fff;
      font-size: 14px;
      font-family: 'JetBrains Mono', monospace;
      outline: none;
      transition: all 0.2s;
    }
    input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-glow); }
    button {
      background: var(--accent);
      color: #040711;
      font-weight: 700;
      font-size: 14px;
      padding: 0 24px;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s;
    }
    button:hover { opacity: 0.9; transform: translateY(-1px); }
    .actions { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
    .btn-secondary {
      background: rgba(255,255,255,0.06);
      color: var(--text);
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 12px;
    }
    .output-box {
      background: #040711;
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 18px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      color: #38bdf8;
      white-space: pre-wrap;
      word-break: break-all;
      min-height: 150px;
      line-height: 1.5;
    }
    footer { text-align: center; color: var(--text-muted); font-size: 13px; margin-top: auto; padding-top: 40px; }
    footer a { color: var(--accent); text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="badge">⚡ FEBRABAN Módulo 10 &amp; 11 &bull; Latência sub-5ms</div>
    <h1>BoletoValidator Pro — API &amp; SDK</h1>
    <p class="lead">Validação matemática, cálculo de DVs, conversão para código de barras de 44 dígitos e extração automática de banco, vencimento e valor nominal.</p>

    <div class="card">
      <div class="input-group">
        <input type="text" id="boletoInput" placeholder="Cole a linha digitável ou código de barras" value="34191.09008 00000.283103 09257.470000 8 96450000012500">
        <button onclick="validar()">Validar Agora</button>
      </div>
      <div class="actions">
        <button class="btn-secondary" onclick="exemploBancario()">🏦 Exemplo Itaú (R$ 125,00)</button>
        <button class="btn-secondary" onclick="exemploBradesco()">🏦 Exemplo Bradesco</button>
        <button class="btn-secondary" onclick="exemploConcessionaria()">💡 Exemplo Concessionária (Energia)</button>
      </div>
      <div class="output-box" id="resultOutput">Aguardando validação...</div>
    </div>

    <footer>
      Parte oficial do <a href="https://ponte.ozpro.com.br" target="_blank">Ponte API Marketplace</a> &bull; Código aberto no <a href="https://github.com/clepta2/boletovalidator-pro" target="_blank">GitHub</a>
    </footer>
  </div>

  <script>
    async function validar() {
      const val = document.getElementById('boletoInput').value;
      const out = document.getElementById('resultOutput');
      out.innerText = 'Processando na borda...';
      try {
        const res = await fetch('/api/validar-boleto?boleto=' + encodeURIComponent(val));
        const data = await res.json();
        out.innerText = JSON.stringify(data, null, 2);
      } catch (err) {
        out.innerText = 'Erro: ' + err.message;
      }
    }

    function exemploBancario() {
      document.getElementById('boletoInput').value = '34191.09008 00000.283103 09257.470000 8 96450000012500';
      validar();
    }

    function exemploBradesco() {
      document.getElementById('boletoInput').value = '23793.38128 60000.000003 01000.655008 9 96450000050000';
      validar();
    }

    function exemploConcessionaria() {
      document.getElementById('boletoInput').value = '83620000001-2 50000053800-4 00000000000-0 00000000000-0';
      validar();
    }

    window.onload = validar;
  </script>
</body>
</html>`;
}
