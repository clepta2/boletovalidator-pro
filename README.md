# ?? BoletoValidator Pro ? SDK & Documenta??o de Integra??o

> **Cliente SDK e Documenta??o Oficial de Integra??o da API BoletoValidator Pro.**  
> ?? **Aten??o:** Este reposit?rio destina-se exclusivamente ? visualiza??o de documenta??o t?cnica e integra??o do cliente SDK. O servi?o de API em nuvem ? operado atrav?s do nosso **Site de APIs (em breve)**. O acesso aos endpoints na borda requer obrigatoriamente uma **Chave de API (`x-api-key`)** ativa.

[![Status](https://img.shields.io/badge/Status-Cloudflare%20Edge%20API-success.svg)](#)
[![Padr?o](https://img.shields.io/badge/Padr?o-FEBRABAN%20Oficial-orange.svg)](#)
[![Algoritmo](https://img.shields.io/badge/Algoritmos-M?dulo%2010%20%26%2011-blue.svg)](#)
[![Autentica??o](https://img.shields.io/badge/Autentica??o-x--api--key%20Obrigat?ria-orange.svg)](#)
[![License: Proprietary](https://img.shields.io/badge/License-Propriet?ria%20%2F%20Portal%20de%20APIs-red.svg)](LICENSE)

---

> ?? **Acesso Oficial & Chaves de API**:  
> O acesso em produ??o a este microsservi?o ? disponibilizado e monitorado exclusivamente atrav?s do nosso **Site de APIs (em breve no ar)**.  
> Para obter sua chave de acesso (`x-api-key`), contratar cotas de requisi??es e testar ao vivo, realize o cadastro em nossa plataforma de APIs.

---

## ? O que ? o BoletoValidator Pro?

O **BoletoValidator Pro** ? uma solu??o de infraestrutura leve desenvolvida para processamento, preven??o de fraudes e captura de boletos banc?rios e arrecada??es em:
- **Sistemas de Contas a Pagar & ERPs**
- **Plataformas de Concilia??o Financeira**
- **Checkouts de Pagamento & Cobran?as**
- **Bots de Atendimento & OCR de Boletos via WhatsApp**

A valida??o pode rodar **100% no cliente em mem?ria RAM (0ms I/O)** ou via **API Oficial na nuvem**.

---

## ?? Como Integrar em seu Projeto

### 1. Instala??o

```bash
npm install boletovalidator-pro
```

*(Ou utilize o arquivo `boletovalidator-pro.js` diretamente no navegador ou Node.js)*.

### 2. Uso R?pido com o SDK (Local em RAM - 0ms de Rede)

```javascript
import { BoletoValidatorPro } from 'boletovalidator-pro';

// Valida??o instant?nea em RAM de boleto banc?rio (47 d?gitos)
const resultado = BoletoValidatorPro.validarLocal('34191.09008 00000.283101 09257.470006 4 96450000012500');

console.log(resultado.valido); // true
console.log(resultado.banco.nome); // 'Ita? Unibanco S.A.'
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
# Valida??o oficial (Requer x-api-key)
curl -X GET "https://boletovalidator-pro-api.maputo3.workers.dev/api/validar-boleto?boleto=34191090080000028310109257470006496450000012500" \
  -H "x-api-key: SUA_CHAVE_DO_PORTAL"

# Gerador de Boleto Matem?tico para Testes e Homologa??o
curl -X GET "https://boletovalidator-pro-api.maputo3.workers.dev/api/gerar?valor=489.90&banco=341&vencimento=2026-11-28" \
  -H "x-api-key: SUA_CHAVE_DO_PORTAL"
```

---

## ?? Licen?a

Distribu?do sob termos propriet?rios. Veja `LICENSE` para mais detalhes.

Copyright (c) 2026 clepta2
