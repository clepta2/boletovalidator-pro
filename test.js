import { BoletoValidatorPro } from './boletovalidator-pro.js';

console.log('🧪 Iniciando Bateria de Testes Unitários do BoletoValidator Pro...');

// 1. Boleto Bancário Real (Itaú - R$ 125,00)
const itau = '34191.09008 00000.283101 09257.470006 4 96450000012500';
const resItau = BoletoValidatorPro.validarLocal(itau);
console.assert(resItau.valido === true, 'Boleto Itaú deve ser válido');
console.assert(resItau.banco.codigo === '341', 'Banco deve ser 341');
console.assert(resItau.valor === 125.00, 'Valor deve ser 125.00');
console.log('✅ Boleto Bancário Itaú OK:', resItau.banco.nome, resItau.valorFormatado);

// 2. Boleto com DV de bloco incorreto (adulteração/fraude)
const fraudado = '34191.09009 00000.283101 09257.470006 4 96450000012500';
const resFraude = BoletoValidatorPro.validarLocal(fraudado);
console.assert(resFraude.valido === false, 'Boleto com DV adulterado deve ser inválido');
console.log('✅ Bloqueio de adulteração OK:', resFraude.motivo);

// 3. Concessionária (48 dígitos)
const contaLuz = '836200000013 500000538008 000000000000 000000000000';
const resLuz = BoletoValidatorPro.validarLocal(contaLuz);
console.assert(resLuz.valido === true, 'Conta de concessionária deve ser válida');
console.log('✅ Boleto Concessionária OK:', resLuz.tipo, resLuz.segmento?.descricao, resLuz.valorFormatado);

// 4. Conversão Bidirecional: Código de Barras (44) -> Linha Digitável (47)
const barrasItau = resItau.codigoBarras;
const linhaRecriada = BoletoValidatorPro.codigoBarrasParaLinhaDigitavel(barrasItau);
console.assert(linhaRecriada === resItau.linhaDigitavelLimpa, 'Linha recriada deve bater com a original');
console.log('✅ Conversão Bidirecional (44 -> 47 dígitos) OK:', linhaRecriada);

// 5. Geração de Código de Barras SVG (ITF FEBRABAN)
const svg = BoletoValidatorPro.gerarBarcodeSvg(barrasItau);
console.assert(svg && svg.startsWith('<svg') && svg.endsWith('</svg>'), 'SVG deve ser válido');
console.log('✅ Geração de Código de Barras SVG FEBRABAN OK! Tamanho:', svg.length, 'bytes');

// 6. Extrator de Boletos em Textos Livres / OCR
const msgZap = 'Prezados, segue o boleto de teste 34191.09008 00000.283101 09257.470006 4 96450000012500 para pagamento urgente!';
const extraidos = BoletoValidatorPro.extrairDeTexto(msgZap);
console.assert(extraidos.length === 1 && extraidos[0].valido === true, 'Deve extrair exatamente 1 boleto válido');
console.log('✅ Extrator Inteligente de Boletos em Textos/WhatsApp OK:', extraidos[0].banco.nome);

// 7. Status e Dias de Vencimento
const statusVenc = BoletoValidatorPro.calcularStatusVencimento('2026-11-20');
console.assert(statusVenc && typeof statusVenc.diasParaVencer === 'number', 'Status de vencimento deve calcular dias');
console.log('✅ Cálculo de Dias de Vencimento OK:', statusVenc.situacao);

// 8. Gerador de Boletos FEBRABAN e Auto-Validação
const gerado = BoletoValidatorPro.gerarBoleto({ banco: '341', valor: 380.50, vencimento: '2026-11-30' });
console.log('✅ Boleto Gerado:', gerado.linhaFormatada, gerado.valorFormatado, gerado.vencimento);
const validacaoDoGerado = BoletoValidatorPro.validarLocal(gerado.linhaLimpa);
console.assert(validacaoDoGerado.valido === true, 'Boleto gerado deve ser 100% matematicamente válido');
console.assert(validacaoDoGerado.valor === 380.50, 'Valor validado deve bater com o gerado');
console.assert(validacaoDoGerado.banco.codigo === '341', 'Banco validado deve bater com o gerado');
console.log('✅ Auto-Validação do Boleto Gerado OK! Válido:', validacaoDoGerado.valido, 'Valor:', validacaoDoGerado.valorFormatado);

console.log('🎉 Todos os testes unitários passaram!');
