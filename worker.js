/**
 * boletovalidator-worker.js
 * Standalone Cloudflare Worker para boletovalidator-pro-api em maputo3.workers.dev
 * Rate limiter local por isolate; não define cota diária global. Lotes reduzem chamadas.
 */

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

const BANCOS_BRASIL = {
  '001': 'Banco do Brasil S.A.',
  '003': 'Banco da AmazÃ´nia S.A.',
  '004': 'Banco do Nordeste do Brasil S.A.',
  '021': 'BANESTES S.A. Banco do Estado do EspÃ­rito Santo',
  '033': 'Banco Santander (Brasil) S.A.',
  '041': 'Banco do Estado do Rio Grande do Sul S.A. (Banrisul)',
  '047': 'Banco do Estado de Sergipe S.A. (Banese)',
  '070': 'Banco de BrasÃ­lia S.A. (BRB)',
  '077': 'Banco Inter S.A.',
  '104': 'Caixa EconÃ´mica Federal',
  '197': 'Stone Pagamentos S.A.',
  '208': 'Banco BTG Pactual S.A.',
  '212': 'Banco Original S.A.',
  '218': 'Banco BS2 S.A.',
  '237': 'Banco Bradesco S.A.',
  '260': 'Nu Pagamentos S.A. (Nubank)',
  '290': 'PagSeguro Internet S.A. (PagBank)',
  '336': 'Banco C6 S.A.',
  '341': 'ItaÃº Unibanco S.A.',
  '389': 'Banco Mercantil do Brasil S.A.',
  '422': 'Banco Safra S.A.',
  '655': 'Banco Votorantim S.A.',
  '748': 'Banco Cooperativo Sicredi S.A.',
  '756': 'Banco Cooperativo do Brasil S.A. (Sicoob)'
};

const SEGMENTOS_CONCESSIONARIA = {
  '1': 'Prefeitura / IPTU / Taxas Municipais',
  '2': 'Saneamento BÃ¡sico / Ãgua e Esgoto',
  '3': 'Energia ElÃ©trica e GÃ¡s',
  '4': 'TelecomunicaÃ§Ãµes / Telefonia e Internet',
  '5': 'ÃrgÃ£os Governamentais / Tributos Federais e Estaduais',
  '6': 'CarnÃªs e Assemelhados ou Empresas Privadas',
  '7': 'Multas de TrÃ¢nsito / DETRAN',
  '9': 'Uso Exclusivo do Banco'
};

function modulo10(bloco) {
  let soma = 0;
  let peso = 2;
  for (let i = bloco.length - 1; i >= 0; i--) {
    let res = parseInt(bloco.charAt(i), 10) * peso;
    if (res > 9) res = Math.floor(res / 10) + (res % 10);
    soma += res;
    peso = peso === 2 ? 1 : 2;
  }
  const dezenaSuperior = Math.ceil(soma / 10) * 10;
  return (dezenaSuperior - soma) % 10;
}

function modulo11Bancario(bloco) {
  let soma = 0;
  let peso = 2;
  for (let i = bloco.length - 1; i >= 0; i--) {
    soma += parseInt(bloco.charAt(i), 10) * peso;
    peso = peso < 9 ? peso + 1 : 2;
  }
  const resto = soma % 11;
  const dv = 11 - resto;
  if (dv === 0 || dv === 10 || dv === 11) return 1;
  return dv;
}

function modulo11Concessionaria(bloco) {
  let soma = 0;
  let peso = 2;
  for (let i = bloco.length - 1; i >= 0; i--) {
    soma += parseInt(bloco.charAt(i), 10) * peso;
    peso = peso < 9 ? peso + 1 : 2;
  }
  const resto = soma % 11;
  if (resto === 0 || resto === 1) return 0;
  if (resto === 10) return 1;
  return 11 - resto;
}

function fatorParaData(fatorStr) {
  const fator = parseInt(fatorStr, 10);
  if (!fator || isNaN(fator) || fator <= 0) return null;

  let dataBase;
  let diasAcrescer;

  if (fator >= 1000 && fator <= 9999) {
    const anoAtual = new Date().getFullYear();
    if (anoAtual >= 2025) {
      dataBase = new Date(Date.UTC(2025, 1, 22));
      diasAcrescer = fator - 1000;
    } else {
      dataBase = new Date(Date.UTC(1997, 9, 7));
      diasAcrescer = fator;
    }
  } else {
    dataBase = new Date(Date.UTC(1997, 9, 7));
    diasAcrescer = fator;
  }

  const dataVenc = new Date(dataBase.getTime() + diasAcrescer * 86400000);
  const ano = dataVenc.getUTCFullYear();
  const mes = String(dataVenc.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(dataVenc.getUTCDate()).padStart(2, '0');

  return {
    iso: `${ano}-${mes}-${dia}`,
    formatada: `${dia}/${mes}/${ano}`
  };
}

function calcularStatusVencimento(isoDateStr) {
  if (!isoDateStr) return null;
  const parts = isoDateStr.split('-');
  if (parts.length !== 3) return null;
  const ano = parseInt(parts[0], 10);
  const mes = parseInt(parts[1], 10) - 1;
  const dia = parseInt(parts[2], 10);

  const hoje = new Date();
  const hojeUtc = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const vencUtc = Date.UTC(ano, mes, dia);

  const diffMs = vencUtc - hojeUtc;
  const diffDias = Math.round(diffMs / 86400000);

  if (diffDias < 0) {
    const atraso = Math.abs(diffDias);
    return { estaVencido: true, diasAtraso: atraso, diasParaVencer: 0, situacao: `Vencido hÃ¡ ${atraso} dia(s)` };
  }
  if (diffDias === 0) {
    return { estaVencido: false, diasAtraso: 0, diasParaVencer: 0, situacao: 'Vence hoje' };
  }
  return { estaVencido: false, diasAtraso: 0, diasParaVencer: diffDias, situacao: `A vencer em ${diffDias} dia(s)` };
}

function gerarBarcodeSvg(codigoBarras) {
  if (!codigoBarras || codigoBarras.length !== 44) return null;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 80"><rect width="440" height="80" fill="#ffffff"/><text x="220" y="70" font-family="monospace" font-size="12" text-anchor="middle" fill="#000000">${codigoBarras}</text></svg>`;
}

function validarBoletoAlgoritmo(rawInput) {
  if (!rawInput) {
    return { valido: false, motivo: 'Linha digitÃ¡vel ou cÃ³digo de barras nÃ£o informado.' };
  }

  const rawStr = String(rawInput).trim();
  const limpo = rawStr.replace(/\D/g, '');

  if (!limpo) {
    return { valido: false, informado: rawStr, motivo: 'Entrada nÃ£o contÃ©m dÃ­gitos numÃ©ricos.' };
  }

  // 1. BOLETO BANCÃRIO (47 DÃGITOS)
  if (limpo.length === 47) {
    const c1 = limpo.slice(0, 9);
    const dv1 = parseInt(limpo.charAt(9), 10);
    const c2 = limpo.slice(10, 20);
    const dv2 = parseInt(limpo.charAt(20), 10);
    const c3 = limpo.slice(21, 31);
    const dv3 = parseInt(limpo.charAt(31), 10);
    const dvGeral = parseInt(limpo.charAt(32), 10);
    const fatorVenc = limpo.slice(33, 37);
    const valorStr = limpo.slice(37, 47);

    const expDv1 = modulo10(c1);
    if (dv1 !== expDv1) {
      return { valido: false, informado: rawStr, blocoComErro: 1, motivo: `DÃ­gito verificador do Bloco 1 invÃ¡lido (esperado: ${expDv1}, recebido: ${dv1})` };
    }

    const expDv2 = modulo10(c2);
    if (dv2 !== expDv2) {
      return { valido: false, informado: rawStr, blocoComErro: 2, motivo: `DÃ­gito verificador do Bloco 2 invÃ¡lido (esperado: ${expDv2}, recebido: ${dv2})` };
    }

    const expDv3 = modulo10(c3);
    if (dv3 !== expDv3) {
      return { valido: false, informado: rawStr, blocoComErro: 3, motivo: `DÃ­gito verificador do Bloco 3 invÃ¡lido (esperado: ${expDv3}, recebido: ${dv3})` };
    }

    const banco = limpo.slice(0, 3);
    const moeda = limpo.slice(3, 4);
    const campoLivre1 = limpo.slice(4, 9);
    const campoLivre2 = limpo.slice(10, 20);
    const campoLivre3 = limpo.slice(21, 31);
    const codigoBarras = `${banco}${moeda}${dvGeral}${fatorVenc}${valorStr}${campoLivre1}${campoLivre2}${campoLivre3}`;

    const blocoSemDvGeral = `${codigoBarras.slice(0, 4)}${codigoBarras.slice(5)}`;
    const expDvGeral = modulo11Bancario(blocoSemDvGeral);

    if (dvGeral !== expDvGeral) {
      return { valido: false, informado: rawStr, motivo: `DÃ­gito verificador geral incompatÃ­vel com cÃ³digo de barras (esperado: ${expDvGeral}, recebido: ${dvGeral})` };
    }

    const nomeBanco = BANCOS_BRASIL[banco] || 'Banco NÃ£o Catalogado / Outros';
    const vencimento = fatorParaData(fatorVenc);
    const statusVencimento = vencimento ? calcularStatusVencimento(vencimento.iso) : null;
    const valorCentavos = parseInt(valorStr, 10);
    const valorReais = valorCentavos > 0 ? (valorCentavos / 100) : 0;

    return {
      valido: true,
      tipo: 'Boleto BancÃ¡rio (CobranÃ§a)',
      linhaDigitavel: `${limpo.slice(0, 5)}.${limpo.slice(5, 10)} ${limpo.slice(10, 15)}.${limpo.slice(15, 21)} ${limpo.slice(21, 26)}.${limpo.slice(26, 32)} ${limpo.slice(32, 33)} ${limpo.slice(33)}`,
      linhaDigitavelLimpa: limpo,
      codigoBarras: codigoBarras,
      barcodeSvg: gerarBarcodeSvg(codigoBarras),
      banco: { codigo: banco, nome: nomeBanco },
      moeda: moeda === '9' ? 'BRL (Real)' : 'Outra Moeda',
      vencimento: vencimento,
      statusVencimento: statusVencimento,
      fatorVencimento: fatorVenc,
      valor: valorReais,
      valorFormatado: valorReais > 0 ? `R$ ${valorReais.toFixed(2).replace('.', ',')}` : 'Sem valor nominal preenchido'
    };
  }

  // 2. CONCESSIONÃRIA / TRIBUTOS (48 DÃGITOS)
  if (limpo.length === 48 && limpo.startsWith('8')) {
    const idSegmento = limpo.charAt(1);
    const nomeSegmento = SEGMENTOS_CONCESSIONARIA[idSegmento] || 'Outros ServiÃ§os / ConcessionÃ¡rias';
    const codigoBarras = `${limpo.slice(0, 11)}${limpo.slice(12, 23)}${limpo.slice(24, 35)}${limpo.slice(36, 47)}`;
    const valorCentavos = parseInt(codigoBarras.slice(4, 15), 10);
    const valorReais = valorCentavos > 0 ? (valorCentavos / 100) : 0;

    return {
      valido: true,
      tipo: 'ConcessionÃ¡ria / Tributo / ArrecadaÃ§Ã£o',
      linhaDigitavel: `${limpo.slice(0, 11)}-${limpo.slice(11, 12)} ${limpo.slice(12, 23)}-${limpo.slice(23, 24)} ${limpo.slice(24, 35)}-${limpo.slice(35, 36)} ${limpo.slice(36, 47)}-${limpo.slice(47, 48)}`,
      linhaDigitavelLimpa: limpo,
      codigoBarras: codigoBarras,
      barcodeSvg: gerarBarcodeSvg(codigoBarras),
      segmento: { codigo: idSegmento, descricao: nomeSegmento },
      valor: valorReais,
      valorFormatado: valorReais > 0 ? `R$ ${valorReais.toFixed(2).replace('.', ',')}` : 'Valor nÃ£o informado no cÃ³digo'
    };
  }

  // 3. CÃDIGO DE BARRAS DE 44 DÃGITOS
  if (limpo.length === 44) {
    const codigoBanco = limpo.slice(0, 3);
    const fatorVenc = limpo.slice(5, 9);
    const valorCentavos = parseInt(limpo.slice(9, 19), 10);
    const valorReais = valorCentavos > 0 ? (valorCentavos / 100) : 0;
    const vencimento = fatorParaData(fatorVenc);

    return {
      valido: true,
      tipo: 'CÃ³digo de Barras BancÃ¡rio (44 dÃ­gitos)',
      codigoBarras: limpo,
      barcodeSvg: gerarBarcodeSvg(limpo),
      banco: { codigo: codigoBanco, nome: BANCOS_BRASIL[codigoBanco] || 'Banco NÃ£o Catalogado' },
      vencimento: vencimento,
      valor: valorReais,
      valorFormatado: valorReais > 0 ? `R$ ${valorReais.toFixed(2).replace('.', ',')}` : 'Sem valor'
    };
  }

  return {
    valido: false,
    informado: rawStr,
    tamanhoRecebido: limpo.length,
    motivo: `Quantidade de dÃ­gitos invÃ¡lida: esperado 47 (bancÃ¡rio), 48 (concessionÃ¡ria) ou 44 (cÃ³digo de barras). Recebido: ${limpo.length}`
  };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/$/, '');

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
          'Access-Control-Max-Age': '86400'
        }
      });
    }

    // 1. Blindagem HTTP (Apenas GET e POST)
    if (request.method !== 'GET' && request.method !== 'POST') {
      return new Response(JSON.stringify({ ok: false, error: 'Método não permitido.' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
      });
    }

    let bodyJson = null;
    if (request.method === 'POST') {
      try {
        bodyJson = await request.json();
      } catch (_) {}
    }

    // 2. Rate Limiting: contador local por isolate
    const apiKey = request.headers.get('x-api-key') ||
                   request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ||
                   url.searchParams.get('api_key') ||
                   url.searchParams.get('key') || '';
    const isPro = String(apiKey).trim().length >= 16;
    const clientIp = request.headers.get('CF-Connecting-IP') || request.headers.get('x-real-ip') || '127.0.0.1';
    const maxReqs = isPro ? 300 : 60;
    const rl = checkRateLimit(isPro ? apiKey : clientIp, maxReqs, 60000);

    if (!rl.ok && pathname !== '/health' && pathname !== '/status' && pathname !== '') {
      return new Response(JSON.stringify({
        ok: false,
        error: 'Limite temporário de requisições excedido. Aguarde o período indicado em Retry-After.',
        retryAfterSeconds: Math.ceil((rl.resetAt - Date.now()) / 1000)
      }, null, 2), {
        status: 429,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Retry-After': String(Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000))),
          'X-RateLimit-Limit': String(maxReqs),
          'X-RateLimit-Remaining': String(rl.remaining)
        }
      });
    }

    if (pathname === '/health' || pathname === '/status' || pathname === '') {
      return new Response(JSON.stringify({
        ok: true,
        service: 'BoletoValidator Pro API',
        version: '2.0.0',
        cluster: 'Cloudflare Edge Anycast (maputo3.workers.dev)',
        status: 'online',
        rotas: {
          validar: 'GET ou POST /api/validar-boleto',
          lote: 'POST /api/boleto/lote (até 50 boletos Pro ou 5 gratuitos)'
        },
        github: 'https://github.com/clepta2/boletovalidator-pro',
        docs: 'https://ponte.ozpro.com.br'
      }, null, 2), {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Validação em Lote de Boletos (POST /api/boleto/lote ou /api/validar-boleto/lote)
    if (pathname === '/api/boleto/lote' || pathname === '/api/validar-boleto/lote') {
      if (request.method !== 'POST') {
        return new Response(JSON.stringify({ ok: false, error: 'Use POST com um array "boletos".' }), {
          status: 405,
          headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
        });
      }

      const lista = bodyJson && Array.isArray(bodyJson.boletos) ? bodyJson.boletos : null;
      if (!lista || lista.length === 0) {
        return new Response(JSON.stringify({ ok: false, error: 'Envie um array não vazio "boletos" no corpo JSON.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
        });
      }

      const maxItems = isPro ? 50 : 5;
      if (lista.length > maxItems) {
        return new Response(JSON.stringify({
          ok: false,
          error: `O lote aceita até ${maxItems} boletos por requisição neste plano.`,
          maxItems
        }), {
          status: 413,
          headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
        });
      }

      const resultados = lista.map((item) => {
        const res = validarBoletoAlgoritmo(item);
        return {
          boletoInformado: String(item),
          ok: res.valido,
          ...res
        };
      });

      return new Response(JSON.stringify({
        ok: true,
        totalSolicitado: lista.length,
        totalValidos: resultados.filter((item) => item.valido).length,
        totalInvalidos: resultados.filter((item) => !item.valido).length,
        resultados
      }, null, 2), {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
      });
    }

    if (pathname === '/api/gerar') {
      const demo = '34191090080000028310109257470006496450000012500';
      const val = validarBoletoAlgoritmo(demo);
      return new Response(JSON.stringify({
        ok: true,
        boletoGerado: {
          linhaDigitavel: val.linhaDigitavel,
          linhaFormatada: val.linhaDigitavel,
          linhaLimpa: demo,
          banco: val.banco,
          valor: val.valor,
          valorFormatado: val.valorFormatado,
          vencimento: val.vencimento
        }
      }, null, 2), {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
      });
    }

    if (pathname === '/api/validar-boleto' || pathname === '/api/boleto/validar') {
      const apiKey = request.headers.get('x-api-key') ||
                     request.headers.get('Authorization')?.replace(/^Bearer\\s+/i, '') ||
                     url.searchParams.get('api_key') ||
                     url.searchParams.get('key');

      if (!apiKey || String(apiKey).trim().length < 16) {
        return new Response(JSON.stringify({
          ok: false,
          error: 'Acesso n?o autorizado. Chave de API ausente ou inv?lida.',
          mensagem: 'O consumo deste microsservi?o requer uma Chave de API ativa. Obtenha sua chave no nosso Portal de APIs e envie via header "x-api-key" ou "Authorization: Bearer SUA_CHAVE".',
          status: 401
        }, null, 2), {
          status: 401,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      let boletoInput = url.searchParams.get('boleto') || url.searchParams.get('linha') || '';
      if (!boletoInput && request.method === 'POST') {
        try {
          const body = await request.json();
          boletoInput = body.boleto || body.linha || '';
        } catch (_) {}
      }

      if (!boletoInput) {
        return new Response(JSON.stringify({
          ok: false,
          valido: false,
          erro: 'Informe o parÃ¢metro ?boleto=LINHA_DIGITAVEL'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
        });
      }

      const resultado = validarBoletoAlgoritmo(boletoInput);
      return new Response(JSON.stringify({
        ok: resultado.valido,
        ...resultado,
        edge: 'maputo3.workers.dev',
        audit: { timestamp: new Date().toISOString() }
      }, null, 2), {
        status: resultado.valido ? 200 : 422,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=300'
        }
      });
    }

    return new Response(JSON.stringify({ ok: false, error: 'Endpoint nÃ£o encontrado. Use /api/validar-boleto' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
    });
  }
};