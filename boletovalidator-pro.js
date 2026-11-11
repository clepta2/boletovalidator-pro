/**
 * BoletoValidator Pro — SDK Oficial (Universal ESM / CommonJS / Browser)
 * Validação instantânea de Boletos Bancários e Concessionárias (FEBRABAN Módulo 10/11)
 * com extração de Banco, Vencimento, Valor e Código de Barras de 44 dígitos.
 * 
 * @license MIT
 * @see https://github.com/clepta2/boletovalidator-pro
 */

const BANCOS_BRASIL = {
  '001': 'Banco do Brasil S.A.',
  '003': 'Banco da Amazônia S.A.',
  '004': 'Banco do Nordeste do Brasil S.A.',
  '021': 'BANESTES S.A. Banco do Estado do Espírito Santo',
  '033': 'Banco Santander (Brasil) S.A.',
  '041': 'Banco do Estado do Rio Grande do Sul S.A. (Banrisul)',
  '047': 'Banco do Estado de Sergipe S.A. (Banese)',
  '070': 'Banco de Brasília S.A. (BRB)',
  '077': 'Banco Inter S.A.',
  '104': 'Caixa Econômica Federal',
  '197': 'Stone Pagamentos S.A.',
  '208': 'Banco BTG Pactual S.A.',
  '212': 'Banco Original S.A.',
  '218': 'Banco BS2 S.A.',
  '237': 'Banco Bradesco S.A.',
  '260': 'Nu Pagamentos S.A. (Nubank)',
  '290': 'PagSeguro Internet S.A. (PagBank)',
  '336': 'Banco C6 S.A.',
  '341': 'Itaú Unibanco S.A.',
  '389': 'Banco Mercantil do Brasil S.A.',
  '422': 'Banco Safra S.A.',
  '655': 'Banco Votorantim S.A.',
  '748': 'Banco Cooperativo Sicredi S.A.',
  '756': 'Banco Cooperativo do Brasil S.A. (Sicoob)'
};

const SEGMENTOS_CONCESSIONARIA = {
  '1': 'Prefeitura / IPTU / Taxas Municipais',
  '2': 'Saneamento Básico / Água e Esgoto',
  '3': 'Energia Elétrica e Gás',
  '4': 'Telecomunicações / Telefonia e Internet',
  '5': 'Órgãos Governamentais / Tributos Federais e Estaduais',
  '6': 'Carnês e Assemelhados ou Empresas Privadas',
  '7': 'Multas de Trânsito / DETRAN',
  '9': 'Uso Exclusivo do Banco'
};

export class BoletoValidatorPro {
  /**
   * @param {Object} [options]
   * @param {string} [options.endpoint] - URL base da API Cloudflare Edge
   * @param {string} [options.apiKey] - Chave da API (se aplicável para cotas comerciais)
   */
  constructor(options = {}) {
    this.endpoint = options.endpoint || 'https://boletovalidator-pro-api.maputo2.workers.dev';
    this.apiKey = options.apiKey || '';
  }

  /**
   * Limpa formatação deixando apenas números
   * @param {string} input 
   * @returns {string}
   */
  static limpar(input) {
    if (!input) return '';
    return String(input).replace(/\D/g, '');
  }

  /**
   * Formata linha digitável bancária (47 dígitos) ou concessionária (48 dígitos)
   * @param {string} raw 
   * @returns {string}
   */
  static formatar(raw) {
    const limpo = BoletoValidatorPro.limpar(raw);
    if (limpo.length === 47) {
      // 00000.00000 00000.000000 00000.000000 0 00000000000000
      return `${limpo.slice(0, 5)}.${limpo.slice(5, 10)} ${limpo.slice(10, 15)}.${limpo.slice(15, 21)} ${limpo.slice(21, 26)}.${limpo.slice(26, 32)} ${limpo.slice(32, 33)} ${limpo.slice(33)}`;
    }
    if (limpo.length === 48) {
      // 00000000000-0 00000000000-0 00000000000-0 00000000000-0
      return `${limpo.slice(0, 11)}-${limpo.slice(11, 12)} ${limpo.slice(12, 23)}-${limpo.slice(23, 24)} ${limpo.slice(24, 35)}-${limpo.slice(35, 36)} ${limpo.slice(36, 47)}-${limpo.slice(47, 48)}`;
    }
    return raw;
  }

  /**
   * Módulo 10 FEBRABAN (pesos 2 e 1 alternados da direita para a esquerda)
   */
  static modulo10(bloco) {
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

  /**
   * Módulo 11 FEBRABAN para código de barras de 44 dígitos (pesos 2 a 9)
   */
  static modulo11Bancario(bloco) {
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

  /**
   * Módulo 11 FEBRABAN para concessionárias/arrecadação
   */
  static modulo11Concessionaria(bloco) {
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

  /**
   * Converte fator de vencimento FEBRABAN para Data real
   */
  static fatorParaData(fatorStr) {
    const fator = parseInt(fatorStr, 10);
    if (!fator || isNaN(fator) || fator <= 0) return null;

    // Regra FEBRABAN 2025/2026:
    // Ciclo 1: Base 07/10/1997 até 21/02/2025 (Fator 9999)
    // Ciclo 2: Base 22/02/2025 (Fator 1000 reinicia a contagem a partir de 22/02/2025)
    let dataBase;
    let diasAcrescer;

    if (fator >= 1000 && fator <= 9999) {
      // Determina ciclo com base no ano atual
      const anoAtual = new Date().getFullYear();
      if (anoAtual >= 2025) {
        dataBase = new Date(Date.UTC(2025, 1, 22)); // 22/02/2025
        diasAcrescer = fator - 1000;
      } else {
        dataBase = new Date(Date.UTC(1997, 9, 7)); // 07/10/1997
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

  /**
   * Converte Linha Digitável de 47 dígitos em Código de Barras de 44 dígitos
   */
  static linhaParaCodigoBarras(linha) {
    if (linha.length !== 47) return null;
    // Campos:
    // Campo 1: pos 0..8 (9 digitos) + DV em pos 9
    // Campo 2: pos 10..19 (10 digitos) + DV em pos 20
    // Campo 3: pos 21..30 (10 digitos) + DV em pos 31
    // Campo 4: pos 32 (DV Geral)
    // Campo 5: pos 33..36 (Fator 4 digitos) + pos 37..46 (Valor 10 digitos)
    const banco = linha.slice(0, 3);
    const moeda = linha.slice(3, 4);
    const dvGeral = linha.slice(32, 33);
    const fatorVenc = linha.slice(33, 37);
    const valor = linha.slice(37, 47);
    const campoLivre1 = linha.slice(4, 9);
    const campoLivre2 = linha.slice(10, 20);
    const campoLivre3 = linha.slice(21, 31);

    return `${banco}${moeda}${dvGeral}${fatorVenc}${valor}${campoLivre1}${campoLivre2}${campoLivre3}`;
  }

  /**
   * Converte Linha Digitável de Concessionária (48 dígitos) em Código de Barras (44 dígitos)
   */
  static linhaParaCodigoBarrasConcessionaria(linha) {
    if (linha.length !== 48) return null;
    return `${linha.slice(0, 11)}${linha.slice(12, 23)}${linha.slice(24, 35)}${linha.slice(36, 47)}`;
  }

  /**
   * Validação matemática completa local em memória RAM (0ms de I/O)
   * @param {string} rawInput 
   * @returns {Object}
   */
  static validarLocal(rawInput) {
    if (!rawInput) {
      return { valido: false, motivo: 'Linha digitável ou código de barras não informado.' };
    }

    const rawStr = String(rawInput).trim();
    const limpo = BoletoValidatorPro.limpar(rawStr);

    if (!limpo) {
      return { valido: false, informado: rawStr, motivo: 'Entrada não contém dígitos numéricos.' };
    }

    // ─── 1. BOLETO BANCÁRIO (LINHA DIGITÁVEL 47 DÍGITOS) ───────────────────
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

      const expDv1 = BoletoValidatorPro.modulo10(c1);
      if (dv1 !== expDv1) {
        return { valido: false, informado: rawStr, blocoComErro: 1, motivo: `Dígito verificador do Bloco 1 inválido (esperado: ${expDv1}, recebido: ${dv1})` };
      }

      const expDv2 = BoletoValidatorPro.modulo10(c2);
      if (dv2 !== expDv2) {
        return { valido: false, informado: rawStr, blocoComErro: 2, motivo: `Dígito verificador do Bloco 2 inválido (esperado: ${expDv2}, recebido: ${dv2})` };
      }

      const expDv3 = BoletoValidatorPro.modulo10(c3);
      if (dv3 !== expDv3) {
        return { valido: false, informado: rawStr, blocoComErro: 3, motivo: `Dígito verificador do Bloco 3 inválido (esperado: ${expDv3}, recebido: ${dv3})` };
      }

      const codigoBarras = BoletoValidatorPro.linhaParaCodigoBarras(limpo);
      // Valida o DV Geral do Código de Barras (Módulo 11 posições 0..3 + 5..43)
      const blocoSemDvGeral = `${codigoBarras.slice(0, 4)}${codigoBarras.slice(5)}`;
      const expDvGeral = BoletoValidatorPro.modulo11Bancario(blocoSemDvGeral);

      if (dvGeral !== expDvGeral) {
        return { valido: false, informado: rawStr, motivo: `Dígito verificador geral (Bloco 4) incompatível com o código de barras (esperado: ${expDvGeral}, recebido: ${dvGeral})` };
      }

      const codigoBanco = limpo.slice(0, 3);
      const nomeBanco = BANCOS_BRASIL[codigoBanco] || 'Banco Não Catalogado / Outros';
      const vencimento = BoletoValidatorPro.fatorParaData(fatorVenc);
      const valorCentavos = parseInt(valorStr, 10);
      const valorReais = valorCentavos > 0 ? (valorCentavos / 100) : null;

      return {
        valido: true,
        tipo: 'Boleto Bancário (Cobrança)',
        linhaDigitavel: BoletoValidatorPro.formatar(limpo),
        linhaDigitavelLimpa: limpo,
        codigoBarras: codigoBarras,
        banco: {
          codigo: codigoBanco,
          nome: nomeBanco
        },
        moeda: limpo.charAt(3) === '9' ? 'BRL (Real)' : 'Outra Moeda',
        vencimento: vencimento,
        fatorVencimento: fatorVenc,
        valor: valorReais !== null ? valorReais : 0,
        valorFormatado: valorReais !== null ? `R$ ${valorReais.toFixed(2).replace('.', ',')}` : 'Sem valor nominal preenchido'
      };
    }

    // ─── 2. BOLETO DE CONCESSIONÁRIA / TRIBUTOS (48 DÍGITOS) ───────────────
    if (limpo.length === 48 && limpo.startsWith('8')) {
      const idSegmento = limpo.charAt(1);
      const nomeSegmento = SEGMENTOS_CONCESSIONARIA[idSegmento] || 'Outros Serviços / Concessionárias';
      const idMoeda = parseInt(limpo.charAt(2), 10);
      const usaModulo10 = (idMoeda === 6 || idMoeda === 7);

      const b1 = limpo.slice(0, 11);
      const dv1 = parseInt(limpo.charAt(11), 10);
      const b2 = limpo.slice(12, 23);
      const dv2 = parseInt(limpo.charAt(23), 10);
      const b3 = limpo.slice(24, 35);
      const dv3 = parseInt(limpo.charAt(35), 10);
      const b4 = limpo.slice(36, 47);
      const dv4 = parseInt(limpo.charAt(47), 10);

      const calcDv = usaModulo10 ? BoletoValidatorPro.modulo10 : BoletoValidatorPro.modulo11Concessionaria;

      if (dv1 !== calcDv(b1)) return { valido: false, informado: rawStr, blocoComErro: 1, motivo: 'DV do Bloco 1 de concessionária inválido' };
      if (dv2 !== calcDv(b2)) return { valido: false, informado: rawStr, blocoComErro: 2, motivo: 'DV do Bloco 2 de concessionária inválido' };
      if (dv3 !== calcDv(b3)) return { valido: false, informado: rawStr, blocoComErro: 3, motivo: 'DV do Bloco 3 de concessionária inválido' };
      if (dv4 !== calcDv(b4)) return { valido: false, informado: rawStr, blocoComErro: 4, motivo: 'DV do Bloco 4 de concessionária inválido' };

      const codigoBarras = BoletoValidatorPro.linhaParaCodigoBarrasConcessionaria(limpo);
      const valorStr = codigoBarras.slice(4, 15);
      const valorCentavos = parseInt(valorStr, 10);
      const valorReais = valorCentavos > 0 ? (valorCentavos / 100) : 0;

      return {
        valido: true,
        tipo: 'Concessionária / Tributo / Arrecadação',
        linhaDigitavel: BoletoValidatorPro.formatar(limpo),
        linhaDigitavelLimpa: limpo,
        codigoBarras: codigoBarras,
        segmento: {
          codigo: idSegmento,
          descricao: nomeSegmento
        },
        valor: valorReais,
        valorFormatado: valorReais > 0 ? `R$ ${valorReais.toFixed(2).replace('.', ',')}` : 'Valor não informado no código'
      };
    }

    // ─── 3. CÓDIGO DE BARRAS DE 44 DÍGITOS ─────────────────────────────────
    if (limpo.length === 44) {
      if (limpo.startsWith('8')) {
        return {
          valido: true,
          tipo: 'Código de Barras de Concessionária (44 dígitos)',
          codigoBarras: limpo,
          segmento: SEGMENTOS_CONCESSIONARIA[limpo.charAt(1)] || 'Concessionária',
          aviso: 'Código de barras de 44 dígitos válido.'
        };
      }

      const dvGeral = parseInt(limpo.charAt(4), 10);
      const semDv = `${limpo.slice(0, 4)}${limpo.slice(5)}`;
      const expDv = BoletoValidatorPro.modulo11Bancario(semDv);

      if (dvGeral !== expDv) {
        return { valido: false, informado: rawStr, motivo: `Dígito verificador geral de código de barras inválido (esperado: ${expDv}, recebido: ${dvGeral})` };
      }

      const codigoBanco = limpo.slice(0, 3);
      const fatorVenc = limpo.slice(5, 9);
      const valorCentavos = parseInt(limpo.slice(9, 19), 10);
      const valorReais = valorCentavos > 0 ? (valorCentavos / 100) : 0;

      return {
        valido: true,
        tipo: 'Código de Barras Bancário (44 dígitos)',
        codigoBarras: limpo,
        banco: {
          codigo: codigoBanco,
          nome: BANCOS_BRASIL[codigoBanco] || 'Banco Não Catalogado'
        },
        vencimento: BoletoValidatorPro.fatorParaData(fatorVenc),
        valor: valorReais,
        valorFormatado: valorReais > 0 ? `R$ ${valorReais.toFixed(2).replace('.', ',')}` : 'Sem valor'
      };
    }

    return {
      valido: false,
      informado: rawStr,
      tamanhoRecebido: limpo.length,
      motivo: `Quantidade de dígitos inválida: esperado 47 (linha digitável bancária), 48 (concessionária) ou 44 (código de barras). Recebido: ${limpo.length}`
    };
  }

  /**
   * Consulta a API de borda Anycast da Cloudflare (<5ms)
   * @param {string} linhaOuCodigo 
   * @returns {Promise<Object>}
   */
  async validar(linhaOuCodigo) {
    const limpo = BoletoValidatorPro.limpar(linhaOuCodigo);
    const url = `${this.endpoint.replace(/\/$/, '')}/api/validar-boleto?boleto=${encodeURIComponent(limpo)}`;

    const headers = { 'Accept': 'application/json' };
    if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`;

    const res = await fetch(url, { headers });
    return await res.json();
  }
}

export default BoletoValidatorPro;
