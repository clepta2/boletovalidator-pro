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
  validar(linhaOuCodigo: string): Promise<ResultadoValidacaoBoleto>;
}

export default BoletoValidatorPro;
