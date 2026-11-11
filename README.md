# 📄 BoletoValidator Pro — SDK & API de Validação e Conversão de Boletos

> **API REST e SDK de alta performance em Cloudflare Edge para validação algorítmica (FEBRABAN Módulo 10 e Módulo 11), conversão de linha digitável para código de barras de 44 dígitos e extração de vencimento/valor nominal (<5ms de latência).**

[![Status](https://img.shields.io/badge/Status-Cloudflare%20Edge%20API-success.svg)](#)
[![Padrão](https://img.shields.io/badge/Padrão-FEBRABAN%20Oficial-orange.svg)](#)
[![Algoritmo](https://img.shields.io/badge/Algoritmos-Módulo%2010%20%26%2011-blue.svg)](#)
[![Latency](https://img.shields.io/badge/Latência-<5ms-cyan.svg)](#)
[![License](https://img.shields.io/badge/License-MIT%20SDK-purple.svg)](LICENSE)

---

## ⚡ O que é o BoletoValidator Pro?

O **BoletoValidator Pro** é uma solução de infraestrutura leve desenvolvida pela OZPro Enterprise para processamento, prevenção de fraudes e captura de boletos bancários e arrecadações em:
- **Sistemas de Contas a Pagar & ERPs**
- **Plataformas de Conciliação Financeira**
- **Checkouts de Pagamento & Cobranças**
- **Bots de Atendimento & OCR de Boletos via WhatsApp**

A validação pode rodar **100% no cliente em memória RAM (0ms I/O)** ou via **API Anycast global da Cloudflare**.

---

## 🚀 Como Integrar em seu Projeto

### 1. Instalação

```bash
npm install boletovalidator-pro
```

*(Ou utilize o arquivo `boletovalidator-pro.js` diretamente no navegador ou Node.js)*.

### 2. Uso Rápido com o SDK (Local em RAM - 0ms de Rede)

```javascript
import { BoletoValidatorPro } from 'boletovalidator-pro';

// Validação instantânea em RAM de boleto bancário (47 dígitos)
const resultado = BoletoValidatorPro.validarLocal('34191.09008 00000.283101 09257.470006 4 96450000012500');

console.log(resultado.valido); // true
console.log(resultado.banco.nome); // 'Itaú Unibanco S.A.'
console.log(resultado.valorFormatado); // 'R$ 125,00'
console.log(resultado.codigoBarras); // '34194964500000125001090000000283100925747000'
console.log(resultado.vencimento.formatada); // Data de vencimento calculada pelo fator
```

### 3. Chamada via Edge API Cloudflare

```javascript
const api = new BoletoValidatorPro();
const res = await api.validar('34191090080000028310109257470006496450000012500');
console.log(res);
```

### 4. Exemplos de Chamadas HTTP Diretas (Curl / Fetch)

```bash
# Via Query Param
curl -X GET "https://boletovalidator-pro-api.maputo2.workers.dev/api/validar-boleto?boleto=34191.09008+00000.283101+09257.470006+4+96450000012500"

# Via Path Parameter
curl -X GET "https://boletovalidator-pro-api.maputo2.workers.dev/api/boleto/34191090080000028310109257470006496450000012500"

# Via POST JSON
curl -X POST "https://boletovalidator-pro-api.maputo2.workers.dev/api/validar-boleto" \
  -H "Content-Type: application/json" \
  -d '{"boleto": "34191090080000028310109257470006496450000012500"}'
```

---

## 💡 Casos de Uso Recomendados (Exemplos Práticos de Integração)

### 1. Prevenção de Fraudes de Boleto Adulterado no Contas a Pagar
Fraudes comuns de boletos trocam o código do banco ou o valor para desviar o pagamento. O `BoletoValidatorPro` valida a consistência de cada um dos 4 blocos e o DV Geral do código de barras:

```javascript
import { BoletoValidatorPro } from 'boletovalidator-pro';

const res = BoletoValidatorPro.validarLocal(linhaDigitadaPeloUsuario);
if (!res.valido) {
  alert(`Linha digitável suspeita ou inválida: ${res.motivo}`);
  return;
}
```

### 2. Preenchimento Automático de Vencimento e Valor em Formulários
Ao colar a linha digitável, preencha automaticamente os campos de Vencimento, Valor e Banco da tela:

```javascript
document.querySelector('#linhaDigitavelInput').addEventListener('input', (e) => {
  const dados = BoletoValidatorPro.validarLocal(e.target.value);
  if (dados.valido) {
    if (dados.valor) document.querySelector('#valorInput').value = dados.valor;
    if (dados.vencimento) document.querySelector('#dataVencimentoInput').value = dados.vencimento.iso;
    if (dados.banco) document.querySelector('#bancoEmissorBadge').innerText = dados.banco.nome;
  }
});
```

### 3. Suporte Completo a Boletos de Concessionárias (Água, Luz, Gás e Tributos)
Linhas de 48 dígitos iniciadas com `8` são automaticamente identificadas pelo segmento (Prefeitura, Saneamento, Energia, Telecomunicações).

---

## 🔒 Marketplace de APIs & Ecossistema

Este projeto faz parte do ecossistema de APIs de alta performance OZPro Enterprise:
👉 **[Acessar Ponte API Marketplace](https://ponte.ozpro.com.br)**
