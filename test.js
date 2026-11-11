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

console.log('🎉 Todos os testes unitários passaram!');
