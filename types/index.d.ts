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
  static codigoBarrasParaLinhaDigitavel(barcode: string): string | null;
  static calcularStatusVencimento(isoDateStr: string): StatusVencimento | null;
  static gerarBarcodeSvg(code44: string, height?: number): string | null;
  static extrairDeTexto(texto: string): ResultadoValidacaoBoleto[];
  static validarLocal(rawInput: string): ResultadoValidacaoBoleto;
  validar(linhaOuCodigo: string): Promise<ResultadoValidacaoBoleto>;
}
  static linhaParaCodigoBarras(linha: string): string | null;
  static validarLocal(rawInput: string): ResultadoValidacaoBoleto;
  validar(linhaOuCodigo: string): Promise<ResultadoValidacaoBoleto>;
}

export default BoletoValidatorPro;
