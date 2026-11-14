export interface BancoBoleto {
  codigo: string;
  nome: string;
}

export interface VencimentoBoleto {
  iso: string;
  formatada: string;
}

export interface SegmentoConcessionaria {
  codigo: string;
  descricao: string;
}

export interface StatusVencimento {
  estaVencido: boolean;
  diasAtraso: number;
  diasParaVencer: number;
  situacao: string;
}

export interface ResultadoValidacaoBoleto {
  valido: boolean;
  tipo?: string;
  linhaDigitavel?: string;
  linhaDigitavelLimpa?: string;
  linhaDigitavelConvertida?: string | null;
  codigoBarras?: string;
  barcodeSvg?: string | null;
  banco?: BancoBoleto;
  moeda?: string;
  vencimento?: VencimentoBoleto | null;
  statusVencimento?: StatusVencimento | null;
  fatorVencimento?: string;
  valor?: number;
  valorFormatado?: string;
  segmento?: SegmentoConcessionaria;
  blocoComErro?: number;
  informado?: string;
  motivo?: string;
}

export interface BoletoGerado {
  linhaFormatada: string;
  linhaLimpa: string;
  codigoBarras: string;
  banco: string;
  nomeBanco: string;
  valor: number;
  valorFormatado: string;
  vencimento: string;
  fatorVencimento: string;
  barcodeSvg: string | null;
  aviso: string;
}

export interface SimulacaoAtraso {
  diasAtraso: number;
  percentualMulta: string;
  valorMulta: number;
  taxaJurosMensal: string;
  valorJurosMora: number;
  valorTotalAtualizado: number;
  valorTotalFormatado: string;
  observacao: string;
}

export interface BoletoValidatorOptions {
  endpoint?: string;
  apiKey?: string;
}

export interface ResultadoPromptInjection {
  seguro: boolean;
  detectado: boolean;
  severidade?: 'BAIXA' | 'MEDIA' | 'CRITICA';
  codigo?: string;
  motivo?: string;
  padraoSuspeito?: string;
  trecho?: string;
}

export interface ResultadoPixDecodificado {
  ok: boolean;
  valido: boolean;
  crcValido?: boolean;
  chavePix?: string;
  nomeRecebedor?: string;
  cidade?: string;
  valor?: number | null;
  valorFormatado?: string;
  infoAdicional?: string;
  txid?: string;
  erro?: string;
}

export interface ResultadoComparacaoPix {
  compativel: boolean;
  scoreHarmonia?: number;
  divergencias: string[];
  pix?: {
    nomeRecebedor: string;
    cidade: string;
    valor: number | null;
    valorFormatado: string;
    chavePix: string;
    crcValido: boolean;
  };
}

export interface ParametrosAuditoriaBoleto {
  boleto?: string;
  linhaDigitavel?: string;
  codigoBarras?: string;
  textoDocumento?: string;
  beneficiarioImpresso?: string;
  beneficiarioCnpjCpf?: string;
  pagadorImpresso?: string;
  valorImpresso?: number;
  vencimentoImpresso?: string;
  payloadPix?: string;
  codigoBarrasVisual?: string;
}

export interface ChecagensAuditoria {
  modulo10e11Validos: boolean;
  codigoBarrasBateComLinha: boolean;
  valorConsistente: boolean;
  vencimentoConsistente: boolean;
  pixConsistenteComBoleto: boolean | null;
  semInjecaoDetectada: boolean;
  cnpjBeneficiarioValido: boolean | null;
}

export interface LaudoAuditoriaBoleto {
  ok: boolean;
  valido: boolean;
  status: 'INTEGRO_SEM_ADULTERACAO' | 'ATENCAO_DIVERGENCIA' | 'ALERTA_FRAUDE' | 'ALERTA_DE_SEGURANCA';
  scoreSeguranca: number;
  scoreRisco: number;
  seguro: boolean;
  codigo?: string;
  motivo?: string;
  tipo?: string;
  banco?: BancoBoleto;
  valor?: number;
  valorFormatado?: string;
  vencimento?: VencimentoBoleto | null;
  statusVencimento?: StatusVencimento | null;
  linhaDigitavel?: string;
  linhaDigitavelLimpa?: string;
  codigoBarras?: string;
  barcodeSvg?: string | null;
  dadosBancarios?: any;
  dadosExtraidos?: {
    beneficiarioImpresso?: string | null;
    beneficiarioCnpjCpf?: string | null;
    pagadorImpresso?: string | null;
    pix?: any;
  };
  checagens?: ChecagensAuditoria;
  alertas?: string[];
  detalhesSeguranca?: ResultadoPromptInjection;
  timestamp?: string;
}

export declare class BoletoValidatorPro {
  constructor(options?: BoletoValidatorOptions);
  static limpar(input: string): string;
  static formatar(raw: string): string;
  static modulo10(bloco: string): number;
  static modulo11Bancario(bloco: string): number;
  static modulo11Concessionaria(bloco: string): number;
  static dataParaFator(dataStr: string): string;
  static gerarBoleto(params?: { banco?: string; valor?: number; vencimento?: string }): BoletoGerado;
  static linhaParaCodigoBarras(linha: string): string | null;
  static codigoBarrasParaLinhaDigitavel(barcode: string): string | null;
  static decodificarCampoLivre(banco: string, campoLivre: string): any;
  static simularEncargosAtraso(valorNominal: number, diasAtraso: number, percentualMulta?: number, taxaJurosMes?: number): SimulacaoAtraso | null;
  static calcularStatusVencimento(isoDateStr: string): StatusVencimento | null;
  static gerarBarcodeSvg(code44: string, height?: number): string | null;
  static extrairDeTexto(texto: string): ResultadoValidacaoBoleto[];
  static validarLocal(rawInput: string): ResultadoValidacaoBoleto;
  static validarCpf(cpf: string): boolean;
  static validarCnpj(cnpj: string): boolean;
  static detectarPromptInjection(texto: string): ResultadoPromptInjection;
  static decodificarPix(payload: string): ResultadoPixDecodificado;
  static compararBoletoPix(dadosBoleto: any, payloadPix: string, beneficiarioEsperado?: string): ResultadoComparacaoPix;
  static auditar(params: ParametrosAuditoriaBoleto | string): LaudoAuditoriaBoleto;
  static auditarBoleto(params: ParametrosAuditoriaBoleto | string): LaudoAuditoriaBoleto;
  validar(linhaOuCodigo: string): Promise<ResultadoValidacaoBoleto>;
}

export declare function limpar(input: string): string;
export declare function formatar(raw: string): string;
export declare function modulo10(bloco: string): number;
export declare function modulo11Bancario(bloco: string): number;
export declare function modulo11Concessionaria(bloco: string): number;
export declare function fatorParaData(fatorStr: string): VencimentoBoleto | null;
export declare function dataParaFator(dataStr: string): string;
export declare function decodificarCampoLivre(banco: string, campoLivre: string): any;
export declare function simularEncargosAtraso(valorNominal: number, diasAtraso: number, percentualMulta?: number, taxaJurosMes?: number): SimulacaoAtraso | null;
export declare function gerarBoleto(params?: { banco?: string; valor?: number; vencimento?: string }): BoletoGerado;
export declare function linhaParaCodigoBarras(linha: string): string | null;
export declare function linhaParaCodigoBarrasConcessionaria(linha: string): string | null;
export declare function codigoBarrasParaLinhaDigitavel(barcode: string): string | null;
export declare function calcularStatusVencimento(isoDateStr: string): StatusVencimento | null;
export declare function gerarBarcodeSvg(code44: string, height?: number): string | null;
export declare function extrairDeTexto(texto: string): ResultadoValidacaoBoleto[];
export declare function validarLocal(rawInput: string): ResultadoValidacaoBoleto;
export declare function validarBoleto(rawInput: string): ResultadoValidacaoBoleto;
export declare function validarCpf(cpf: string): boolean;
export declare function validarCnpj(cnpj: string): boolean;
export declare function detectarPromptInjection(texto: string): ResultadoPromptInjection;
export declare function decodificarPix(payload: string): ResultadoPixDecodificado;
export declare function compararBoletoPix(dadosBoleto: any, payloadPix: string, beneficiarioEsperado?: string): ResultadoComparacaoPix;
export declare function auditarBoleto(params: ParametrosAuditoriaBoleto | string): LaudoAuditoriaBoleto;

export default BoletoValidatorPro;
