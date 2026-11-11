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

export interface ResultadoValidacaoBoleto {
  valido: boolean;
  tipo?: string;
  linhaDigitavel?: string;
  linhaDigitavelLimpa?: string;
  codigoBarras?: string;
  banco?: BancoBoleto;
  moeda?: string;
  vencimento?: VencimentoBoleto | null;
  fatorVencimento?: string;
  valor?: number;
  valorFormatado?: string;
  segmento?: SegmentoConcessionaria;
  blocoComErro?: number;
  informado?: string;
  motivo?: string;
}

export interface BoletoValidatorOptions {
  endpoint?: string;
  apiKey?: string;
}

export declare class BoletoValidatorPro {
  constructor(options?: BoletoValidatorOptions);
  static limpar(input: string): string;
  static formatar(raw: string): string;
  static modulo10(bloco: string): number;
  static modulo11Bancario(bloco: string): number;
  static modulo11Concessionaria(bloco: string): number;
  static linhaParaCodigoBarras(linha: string): string | null;
  static validarLocal(rawInput: string): ResultadoValidacaoBoleto;
  validar(linhaOuCodigo: string): Promise<ResultadoValidacaoBoleto>;
}

export default BoletoValidatorPro;
