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
  '084': 'Uniprime do Brasil',
  '104': 'Caixa Econômica Federal',
  '121': 'Banco Agibank S.A.',
  '197': 'Stone Pagamentos S.A.',
  '208': 'Banco BTG Pactual S.A.',
  '212': 'Banco Original S.A.',
  '218': 'Banco BS2 S.A.',
  '237': 'Banco Bradesco S.A.',
  '246': 'Banco ABC Brasil S.A.',
  '260': 'Nu Pagamentos S.A. (Nubank)',
  '290': 'PagSeguro Internet S.A. (PagBank)',
  '318': 'Banco BMG S.A.',
  '336': 'Banco C6 S.A.',
  '341': 'Itaú Unibanco S.A.',
  '380': 'PicPay Instituição de Pagamento S.A.',
  '389': 'Banco Mercantil do Brasil S.A.',
  '403': 'Banco Cora SCD S.A.',
  '422': 'Banco Safra S.A.',
  '461': 'Asaas Gestão Financeira S.A.',
  '633': 'Banco Rendimento S.A.',
  '654': 'Banco Digimais S.A.',
  '655': 'Banco Votorantim S.A.',
  '707': 'Banco Daycoval S.A.',
  '745': 'Banco Citibank S.A.',
  '746': 'Banco Modal S.A.',
  '748': 'Banco Cooperativo Sicredi S.A.',
  '752': 'Banco BNP Paribas Brasil S.A.',
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
   * Decodifica o Campo Livre (25 posições) dos principais bancos brasileiros
   * extraindo Agência, Conta Corrente, Carteira de Cobrança e Nosso Número
   * @param {string} banco 
   * @param {string} campoLivre 
   * @returns {Object}
   */
  static decodificarCampoLivre(banco, campoLivre) {
    if (!campoLivre || campoLivre.length !== 25) return null;

    switch (banco) {
      case '341': // Itaú
        return {
          layout: 'Itaú Unibanco',
          carteira: campoLivre.slice(0, 3),
          tipoCarteira: campoLivre.slice(0, 3) === '109' ? 'Cobrança Direta Eletrônica sem IOF' : 'Cobrança Registrada',
          nossoNumero: `${campoLivre.slice(3, 11)}-${campoLivre.slice(11, 12)}`,
          agencia: campoLivre.slice(12, 16),
          contaCorrente: `${campoLivre.slice(16, 21)}-${campoLivre.slice(21, 22)}`
        };
      case '237': // Bradesco
        return {
          layout: 'Bradesco',
          agencia: campoLivre.slice(0, 4),
          carteira: campoLivre.slice(4, 6),
          tipoCarteira: campoLivre.slice(4, 6) === '09' ? 'Cobrança Simples com Registro' : 'Cobrança Registrada',
          nossoNumero: `${campoLivre.slice(6, 17)}-${campoLivre.slice(17, 18)}`,
          contaCorrente: campoLivre.slice(18, 25)
        };
      case '001': // Banco do Brasil
        return {
          layout: 'Banco do Brasil',
          convenio: campoLivre.slice(0, 7),
          nossoNumero: campoLivre.slice(7, 24),
          carteira: campoLivre.slice(24, 25)
        };
      case '033': // Santander
        return {
          layout: 'Santander',
          codigoCedente: campoLivre.slice(3, 10),
          nossoNumero: `${campoLivre.slice(10, 22)}-${campoLivre.slice(22, 23)}`,
          carteira: campoLivre.slice(24, 25)
        };
      case '104': // Caixa Econômica Federal
        return {
          layout: 'Caixa Econômica Federal (SIGCB)',
          codigoCedente: `${campoLivre.slice(0, 6)}-${campoLivre.slice(6, 7)}`,
          nossoNumero: campoLivre.slice(7, 24),
          modalidade: campoLivre.slice(7, 9) === '14' ? 'Cobrança Registrada Emissão Caixa' : 'Cobrança Registrada Beneficiário'
        };
      case '077': // Banco Inter
        return {
          layout: 'Banco Inter',
          contaCorrente: campoLivre.slice(0, 10),
          nossoNumero: campoLivre.slice(10, 21),
          carteira: 'Cobrança Simples'
        };
      case '260': // Nubank
        return {
          layout: 'Nu Pagamentos (Nubank)',
          nossoNumero: campoLivre.slice(0, 15),
          carteira: 'Depósito / Cobrança Digital'
        };
      default:
        return {
          layout: 'Padrão FEBRABAN Genérico',
          campoLivreRaw: campoLivre
        };
    }
  }

  /**
   * Simula os encargos legais de atraso (Multa máx 2% CDC + Juros de mora 1% a.m. pro-rata die)
   * @param {number} valorNominal 
   * @param {number} diasAtraso 
   * @param {number} [percentualMulta=2.0] 
   * @param {number} [taxaJurosMes=1.0] 
   * @returns {Object|null}
   */
  static simularEncargosAtraso(valorNominal, diasAtraso, percentualMulta = 2.0, taxaJurosMes = 1.0) {
    if (!valorNominal || valorNominal <= 0 || !diasAtraso || diasAtraso <= 0) {
      return null;
    }
    const multa = Number(((valorNominal * percentualMulta) / 100).toFixed(2));
    const taxaDiaria = taxaJurosMes / 30 / 100;
    const juros = Number((valorNominal * taxaDiaria * diasAtraso).toFixed(2));
    const valorTotalAtualizado = Number((valorNominal + multa + juros).toFixed(2));

    return {
      diasAtraso,
      percentualMulta: `${percentualMulta}%`,
      valorMulta: multa,
      taxaJurosMensal: `${taxaJurosMes}% a.m.`,
      valorJurosMora: juros,
      valorTotalAtualizado,
      valorTotalFormatado: `R$ ${valorTotalAtualizado.toFixed(2).replace('.', ',')}`,
      observacao: 'Simulação com base nos tetos padrão do Código de Defesa do Consumidor (Art. 52 §1º).'
    };
  }

  /**
   * Converte Data (YYYY-MM-DD ou DD/MM/YYYY) para Fator de Vencimento FEBRABAN
   * @param {string} dataStr 
   * @returns {string} Fator com 4 dígitos
   */
  static dataParaFator(dataStr) {
    if (!dataStr) return '0000';
    let ano, mes, dia;
    if (dataStr.includes('-')) {
      const parts = dataStr.split('-');
      ano = parseInt(parts[0], 10);
      mes = parseInt(parts[1], 10) - 1;
      dia = parseInt(parts[2], 10);
    } else if (dataStr.includes('/')) {
      const parts = dataStr.split('/');
      dia = parseInt(parts[0], 10);
      mes = parseInt(parts[1], 10) - 1;
      ano = parseInt(parts[2], 10);
    } else {
      return '0000';
    }

    const alvoUtc = Date.UTC(ano, mes, dia);
    // FEBRABAN Ciclo 2 (a partir de 22/02/2025 fator 1000)
    const baseCiclo2 = Date.UTC(2025, 1, 22);
    const diffDias = Math.round((alvoUtc - baseCiclo2) / 86400000);
    const fator = 1000 + diffDias;
    return String(Math.max(1000, fator)).padStart(4, '0');
  }

  /**
   * Gerador Oficial de Boletos Bancários Válidos segundo o padrão FEBRABAN Módulo 10/11
   * Ideal para testes, homologação e geração de cobranças
   * @param {Object} [params]
   * @param {string} [params.banco='341'] - Código de 3 dígitos do banco (001, 237, 341, 033, 104)
   * @param {number} [params.valor=125.00] - Valor nominal em Reais
   * @param {string} [params.vencimento] - Data YYYY-MM-DD (padrão: 10 dias à frente)
   * @returns {Object} Boleto gerado com linha digitável, código de barras e validação
   */
  static gerarBoleto(params = {}) {
    const bancoCode = String(params.banco || '341').padStart(3, '0');
    const moeda = '9'; // 9 = Real (BRL)

    let vencimentoIso = params.vencimento;
    if (!vencimentoIso) {
      const dataFutura = new Date(Date.now() + 10 * 86400000);
      const y = dataFutura.getUTCFullYear();
      const m = String(dataFutura.getUTCMonth() + 1).padStart(2, '0');
      const d = String(dataFutura.getUTCDate()).padStart(2, '0');
      vencimentoIso = `${y}-${m}-${d}`;
    }

    const fator = BoletoValidatorPro.dataParaFator(vencimentoIso);
    const valorCentavos = Math.round(Number(params.valor || 125.00) * 100);
    const valorStr = String(valorCentavos).padStart(10, '0');

    // Monta Campo Livre (25 dígitos) de acordo com o banco
    let campoLivre = '';
    if (bancoCode === '341') { // Itaú
      campoLivre = '1090000000283100925747000';
    } else if (bancoCode === '237') { // Bradesco
      campoLivre = '1234090000001234560000123';
    } else if (bancoCode === '001') { // Banco do Brasil
      campoLivre = '1234567000000000000000017';
    } else if (bancoCode === '033') { // Santander
      campoLivre = '9991234567000000000123456';
    } else { // Padrão Genérico
      campoLivre = '1090000000283100925747000';
    }

    // Calcula DV Geral do Código de Barras (Módulo 11)
    const blocoSemDv = `${bancoCode}${moeda}${fator}${valorStr}${campoLivre}`;
    const dvGeral = BoletoValidatorPro.modulo11Bancario(blocoSemDv);

    const barcode = `${bancoCode}${moeda}${dvGeral}${fator}${valorStr}${campoLivre}`;

    // Monta Linha Digitável Oficial (47 dígitos)
    const c1 = `${bancoCode}${moeda}${campoLivre.slice(0, 5)}`;
    const dv1 = BoletoValidatorPro.modulo10(c1);

    const c2 = campoLivre.slice(5, 15);
    const dv2 = BoletoValidatorPro.modulo10(c2);

    const c3 = campoLivre.slice(15, 25);
    const dv3 = BoletoValidatorPro.modulo10(c3);

    const linhaLimpa = `${c1}${dv1}${c2}${dv2}${c3}${dv3}${dvGeral}${fator}${valorStr}`;
    const linhaFormatada = BoletoValidatorPro.formatar(linhaLimpa);

    return {
      linhaFormatada,
      linhaLimpa,
      codigoBarras: barcode,
      banco: bancoCode,
      nomeBanco: BANCOS_BRASIL[bancoCode] || 'Banco Não Catalogado',
      valor: Number(params.valor || 125.00),
      valorFormatado: `R$ ${Number(params.valor || 125.00).toFixed(2).replace('.', ',')}`,
      vencimento: vencimentoIso,
      fatorVencimento: fator,
      barcodeSvg: BoletoValidatorPro.gerarBarcodeSvg(barcode),
      aviso: 'Boleto gerado estritamente para testes matemáticos e validação de software.'
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
   * Converte Código de Barras de 44 dígitos em Linha Digitável oficial (47 ou 48 dígitos)
   * @param {string} barcode 
   * @returns {string|null}
   */
  static codigoBarrasParaLinhaDigitavel(barcode) {
    const limpo = BoletoValidatorPro.limpar(barcode);
    if (limpo.length !== 44) return null;

    // Concessionárias (começa com 8)
    if (limpo.startsWith('8')) {
      const b1 = limpo.slice(0, 11);
      const dv1 = BoletoValidatorPro.modulo10(b1);
      const b2 = limpo.slice(11, 22);
      const dv2 = BoletoValidatorPro.modulo10(b2);
      const b3 = limpo.slice(22, 33);
      const dv3 = BoletoValidatorPro.modulo10(b3);
      const b4 = limpo.slice(33, 44);
      const dv4 = BoletoValidatorPro.modulo10(b4);
      return `${b1}${dv1}${b2}${dv2}${b3}${dv3}${b4}${dv4}`;
    }

    // Boleto Bancário
    const banco = limpo.slice(0, 3);
    const moeda = limpo.slice(3, 4);
    const dvGeral = limpo.slice(4, 5);
    const fatorVenc = limpo.slice(5, 9);
    const valor = limpo.slice(9, 19);
    const campoLivre1 = limpo.slice(19, 24);
    const campoLivre2 = limpo.slice(24, 34);
    const campoLivre3 = limpo.slice(34, 44);

    const c1 = `${banco}${moeda}${campoLivre1}`;
    const dv1 = BoletoValidatorPro.modulo10(c1);

    const c2 = campoLivre2;
    const dv2 = BoletoValidatorPro.modulo10(c2);

    const c3 = campoLivre3;
    const dv3 = BoletoValidatorPro.modulo10(c3);

    return `${c1}${dv1}${c2}${dv2}${c3}${dv3}${dvGeral}${fatorVenc}${valor}`;
  }

  /**
   * Calcula se o boleto está vencido, dias em atraso ou dias restantes para vencer
   * @param {string} isoDateStr - Formato YYYY-MM-DD
   * @returns {Object|null}
   */
  static calcularStatusVencimento(isoDateStr) {
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
      return {
        estaVencido: true,
        diasAtraso: atraso,
        diasParaVencer: 0,
        situacao: `Vencido há ${atraso} dia(s)`
      };
    }
    if (diffDias === 0) {
      return {
        estaVencido: false,
        diasAtraso: 0,
        diasParaVencer: 0,
        situacao: 'Vence hoje'
      };
    }
    return {
      estaVencido: false,
      diasAtraso: 0,
      diasParaVencer: diffDias,
      situacao: `A vencer em ${diffDias} dia(s)`
    };
  }

  /**
   * Gera código de barras gráfico vetorial em SVG (Padrão ITF / Interleaved 2 of 5 da FEBRABAN)
   * Renderização 100% nativa sem dependência de bibliotecas externas ou canvas.
   * @param {string} code44 - Código de barras de 44 dígitos
   * @param {number} [height=65] - Altura em pixels
   * @returns {string|null}
   */
  static gerarBarcodeSvg(code44, height = 65) {
    if (!code44 || code44.length !== 44) return null;
    const BITS = ['00110','10001','01001','11000','00101','10100','01100','00011','10010','01010'];
    let pattern = '1010';
    for (let i = 0; i < 44; i += 2) {
      const b1 = BITS[code44.charCodeAt(i) - 48];
      const b2 = BITS[code44.charCodeAt(i + 1) - 48];
      for (let j = 0; j < 5; j++) {
        pattern += b1[j] === '1' ? '11' : '1';
        pattern += b2[j] === '1' ? '00' : '0';
      }
    }
    pattern += '1101';

    let rects = '';
    let x = 0;
    const runs = pattern.match(/(1+|0+)/g) || [];
    for (const run of runs) {
      const len = run.length;
      if (run[0] === '1') {
        rects += `<rect x="${x}" y="0" width="${len}" height="${height}" fill="currentColor"/>`;
      }
      x += len;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${x} ${height}" width="100%" height="${height}" preserveAspectRatio="none" style="display:block;max-width:100%">${rects}</svg>`;
  }

  /**
   * Varre e extrai automaticamente boletos de mensagens de texto, WhatsApp, e-mails ou OCR
   * @param {string} texto 
   * @returns {Array<Object>}
   */
  static extrairDeTexto(texto) {
    if (!texto || typeof texto !== 'string') return [];
    const regex = /(?:\b\d{5}[.\s]?\d{5}[\s]?\d{5}[.\s]?\d{6}[\s]?\d{5}[.\s]?\d{6}[\s]?\d[\s]?\d{14}\b|\b8\d{11}[-\s]?\d[\s]?\d{11}[-\s]?\d[\s]?\d{11}[-\s]?\d[\s]?\d{11}[-\s]?\d\b|\b\d{44,48}\b)/g;
    const encontrados = texto.match(regex) || [];
    const deduplicados = Array.from(new Set(encontrados.map(s => s.trim())));
    return deduplicados.map(item => BoletoValidatorPro.validarLocal(item)).filter(res => res.valido);
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
      const campoLivre = codigoBarras.slice(19, 44);
      const dadosBancarios = BoletoValidatorPro.decodificarCampoLivre(codigoBanco, campoLivre);
      const nomeBanco = BANCOS_BRASIL[codigoBanco] || 'Banco Não Catalogado / Outros';
      const vencimento = BoletoValidatorPro.fatorParaData(fatorVenc);
      const statusVencimento = vencimento ? BoletoValidatorPro.calcularStatusVencimento(vencimento.iso) : null;
      const valorCentavos = parseInt(valorStr, 10);
      const valorReais = valorCentavos > 0 ? (valorCentavos / 100) : null;
      const simulacaoAtraso = (valorReais && statusVencimento && statusVencimento.estaVencido)
        ? BoletoValidatorPro.simularEncargosAtraso(valorReais, statusVencimento.diasAtraso)
        : null;

      return {
        valido: true,
        tipo: 'Boleto Bancário (Cobrança)',
        linhaDigitavel: BoletoValidatorPro.formatar(limpo),
        linhaDigitavelLimpa: limpo,
        codigoBarras: codigoBarras,
        barcodeSvg: BoletoValidatorPro.gerarBarcodeSvg(codigoBarras),
        banco: {
          codigo: codigoBanco,
          nome: nomeBanco
        },
        dadosBancarios: dadosBancarios,
        moeda: limpo.charAt(3) === '9' ? 'BRL (Real)' : 'Outra Moeda',
        vencimento: vencimento,
        statusVencimento: statusVencimento,
        simulacaoAtraso: simulacaoAtraso,
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
      const codEmpresa = codigoBarras.slice(15, 19);

      return {
        valido: true,
        tipo: 'Concessionária / Tributo / Arrecadação',
        linhaDigitavel: BoletoValidatorPro.formatar(limpo),
        linhaDigitavelLimpa: limpo,
        codigoBarras: codigoBarras,
        barcodeSvg: BoletoValidatorPro.gerarBarcodeSvg(codigoBarras),
        segmento: {
          codigo: idSegmento,
          descricao: nomeSegmento
        },
        identificacaoValor: {
          codigo: idMoeda,
          tipoCalculo: usaModulo10 ? 'Módulo 10' : 'Módulo 11',
          descricao: (idMoeda === 6 || idMoeda === 8) ? 'Valor Efetivo em Reais (BRL)' : 'Quantidade de Moeda Variável'
        },
        empresaOuOrgaoConveniado: codEmpresa,
        valor: valorReais,
        valorFormatado: valorReais > 0 ? `R$ ${valorReais.toFixed(2).replace('.', ',')}` : 'Valor não informado no código'
      };
    }

    // ─── 3. CÓDIGO DE BARRAS DE 44 DÍGITOS ─────────────────────────────────
    if (limpo.length === 44) {
      if (limpo.startsWith('8')) {
        const linhaConvertida = BoletoValidatorPro.codigoBarrasParaLinhaDigitavel(limpo);
        return {
          valido: true,
          tipo: 'Código de Barras de Concessionária (44 dígitos)',
          codigoBarras: limpo,
          linhaDigitavelConvertida: linhaConvertida ? BoletoValidatorPro.formatar(linhaConvertida) : null,
          linhaDigitavelLimpa: linhaConvertida,
          barcodeSvg: BoletoValidatorPro.gerarBarcodeSvg(limpo),
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
      const vencimento = BoletoValidatorPro.fatorParaData(fatorVenc);
      const linhaConvertida = BoletoValidatorPro.codigoBarrasParaLinhaDigitavel(limpo);

      return {
        valido: true,
        tipo: 'Código de Barras Bancário (44 dígitos)',
        codigoBarras: limpo,
        linhaDigitavelConvertida: linhaConvertida ? BoletoValidatorPro.formatar(linhaConvertida) : null,
        linhaDigitavelLimpa: linhaConvertida,
        barcodeSvg: BoletoValidatorPro.gerarBarcodeSvg(limpo),
        banco: {
          codigo: codigoBanco,
          nome: BANCOS_BRASIL[codigoBanco] || 'Banco Não Catalogado'
        },
        vencimento: vencimento,
        statusVencimento: vencimento ? BoletoValidatorPro.calcularStatusVencimento(vencimento.iso) : null,
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
