# 📄 BoletoValidator Pro — SDK & Documentação de Integração

> **Cliente SDK e Documentação Oficial de Integração da API BoletoValidator Pro.**  
> 🔒 **Atenção:** Este repositório destina-se exclusivamente à visualização de documentação técnica e integração do cliente SDK. O serviço de API em nuvem é operado através do nosso **Site de APIs (em breve)**. O acesso aos endpoints na borda requer obrigatoriamente uma **Chave de API (`x-api-key`)** ativa.

[![Status](https://img.shields.io/badge/Status-Cloudflare%20Edge%20API-success.svg)](#)
[![CI/CD Tests](https://github.com/clepta2/boletovalidator-pro/actions/workflows/test.yml/badge.svg)](https://github.com/clepta2/boletovalidator-pro/actions)
[![Padrão](https://img.shields.io/badge/Padrão-FEBRABAN%20Oficial-orange.svg)](#)
[![Algoritmo](https://img.shields.io/badge/Algoritmos-Módulo%2010%20%26%2011-blue.svg)](#)
[![Autenticação](https://img.shields.io/badge/Autenticação-x--api--key%20Obrigatória-orange.svg)](#)
[![License: Proprietary](https://img.shields.io/badge/License-Proprietária%20%2F%20Portal%20de%20APIs-red.svg)](LICENSE)

---

> 🔒 **Acesso Oficial & Chaves de API**:  
> O acesso em produção a este microsserviço é disponibilizado e monitorado exclusivamente através do nosso **Site de APIs (em breve no ar)**.  
> Para obter sua chave de acesso (`x-api-key`), contratar cotas de requisições e testar ao vivo, realize o cadastro em nossa plataforma de APIs.

---

## ⚡ O que é o BoletoValidator Pro?

O **BoletoValidator Pro** é uma solução de infraestrutura leve desenvolvida para processamento, prevenção de fraudes e captura de boletos bancários e arrecadações em:
- **Sistemas de Contas a Pagar & ERPs**
- **Plataformas de Conciliação Financeira**
- **Checkouts de Pagamento & Cobranças**
- **Bots de Atendimento & OCR de Boletos via WhatsApp**

A validação pode rodar **100% no cliente em memória RAM (0ms I/O)** ou via **API Oficial na nuvem**.

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

### 3. Chamada via Edge API Oficial (Requer x-api-key)

```javascript
const api = new BoletoValidatorPro({
  apiKey: 'SUA_CHAVE_DO_PORTAL' // Obtenha no Site de APIs
});
const res = await api.validar('34191090080000028310109257470006496450000012500');
console.log(res);
```

### 4. Exemplos de Chamadas HTTP Diretas (Curl)

```bash
# Validação oficial (Requer x-api-key)
curl -X GET "https://boletovalidator-pro-api.maputo3.workers.dev/api/validar-boleto?boleto=34191090080000028310109257470006496450000012500" \
  -H "x-api-key: SUA_CHAVE_DO_PORTAL"

# Gerador de Boleto Matemático para Testes e Homologação
curl -X GET "https://boletovalidator-pro-api.maputo3.workers.dev/api/gerar?valor=489.90&banco=341&vencimento=2026-11-28" \
  -H "x-api-key: SUA_CHAVE_DO_PORTAL"
```

---

## 📄 Licença

Distribuído sob termos proprietários. Veja `LICENSE` para mais detalhes.

Copyright (c) 2026 clepta2
