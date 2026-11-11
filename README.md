# 📄 BoletoValidator Pro — SDK & Documentação de Integração

> **Cliente SDK e Documentação Oficial de Integração da API BoletoValidator Pro.**  
> Validação algorítmica matemática (FEBRABAN Módulo 10 e Módulo 11), conversão de linha digitável para código de barras de 44 dígitos e extração de vencimento/valor nominal na borda Anycast (<5ms).

[![Status](https://img.shields.io/badge/Status-Cloudflare%20Edge%20API-success.svg)](#)
[![Padrão](https://img.shields.io/badge/Padrão-FEBRABAN%20Oficial-orange.svg)](#)
[![Algoritmo](https://img.shields.io/badge/Algoritmos-Módulo%2010%20%26%2011-blue.svg)](#)
[![Latency](https://img.shields.io/badge/Latência-<5ms-cyan.svg)](#)
[![License](https://img.shields.io/badge/License-MIT%20SDK-purple.svg)](LICENSE)

---

> 🔒 **Acesso Oficial & Chaves de API**:  
> O acesso em produção a este microsserviço é disponibilizado e monitorado exclusivamente através do **[Ponte APIs Marketplace](https://ponte.ozpro.com.br)**.  
> Para obter sua chave de acesso (`ponte_live_...`), contratar cotas de requisições e testar ao vivo no playground interativo, acesse:  
> 👉 **[https://ponte.ozpro.com.br](https://ponte.ozpro.com.br)**

---

## ⚡ O que é o BoletoValidator Pro?

O **BoletoValidator Pro** é uma solução de infraestrutura leve desenvolvida para processamento, prevenção de fraudes e captura de boletos bancários e arrecadações em:
- **Sistemas de Contas a Pagar & ERPs**
- **Plataformas de Conciliação Financeira**
- **Checkouts de Pagamento & Cobranças**
- **Bots de Atendimento & OCR de Boletos via WhatsApp**

A validação pode rodar **100% no cliente em memória RAM (0ms I/O)** ou via **API Oficial da Ponte**.

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

### 3. Chamada via Edge API Oficial da Ponte

```javascript
const api = new BoletoValidatorPro({
  apiKey: 'ponte_live_SEU_TOKEN_AQUI' // Obtenha no Ponte APIs Marketplace
});
const res = await api.validar('34191090080000028310109257470006496450000012500');
console.log(res);
```

### 4. Exemplos de Chamadas HTTP Diretas (Curl / Fetch)

```bash
# Validação oficial na Ponte APIs
curl -X GET "https://ponte.ozpro.com.br/api/validar-boleto?boleto=34191.09008+00000.283101+09257.470006+4+96450000012500" \
  -H "Authorization: Bearer ponte_live_SUA_CHAVE_AQUI"

# Gerador de Boleto Matemático para Testes e Homologação
curl -X GET "https://ponte.ozpro.com.br/api/gerar?valor=489.90&banco=341&vencimento=2026-11-28" \
  -H "Authorization: Bearer ponte_live_SUA_CHAVE_AQUI"

# Via Path Parameter
curl -X GET "https://ponte.ozpro.com.br/api/boleto/34191090080000028310109257470006496450000012500" \
  -H "Authorization: Bearer ponte_live_SUA_CHAVE_AQUI"

# Via POST JSON
curl -X POST "https://ponte.ozpro.com.br/api/validar-boleto" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ponte_live_SUA_CHAVE_AQUI" \
  -d '{"boleto": "34191090080000028310109257470006496450000012500"}'
```

---

## 💻 Como Consultar a API em Qualquer Linguagem de Programação

Como a API é construída sobre HTTP/JSON universal com autenticação Bearer padrão, ela pode ser chamada por qualquer linguagem ou framework em 3 a 5 linhas de código:

### 🐍 Python
```python
import requests

headers = {"Authorization": "Bearer ponte_live_SUA_CHAVE_AQUI"}
url = "https://ponte.ozpro.com.br/api/validar-boleto"
res = requests.get(url, params={"boleto": "34191090080000028310109257470006496450000012500"}, headers=headers).json()

print("Banco:", res["banco"]["nome"])
print("Valor:", res["valorFormatado"])
print("Vencimento:", res["vencimento"]["formatada"])
```

### 🐘 PHP (Laravel, WordPress, WooCommerce, Legados)
```php
<?php
$linha = urlencode("34191090080000028310109257470006496450000012500");
$url = "https://ponte.ozpro.com.br/api/validar-boleto?boleto={$linha}";
$opcoes = [
  "http" => [
    "header" => "Authorization: Bearer ponte_live_SUA_CHAVE_AQUI\r\n"
  ]
];
$dados = json_decode(file_get_contents($url, false, stream_context_create($opcoes)), true);

echo "Banco: " . $dados['banco']['nome'] . PHP_EOL;
echo "Valor: " . $dados['valorFormatado'] . PHP_EOL;
?>
```

### 🔷 C# / .NET (Sistemas Desktop, Windows Forms, PDVs)
```csharp
using System;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;

using var client = new HttpClient();
string url = "https://boletovalidator-pro-api.maputo2.workers.dev/api/validar-boleto?boleto=34191090080000028310109257470006496450000012500";
string json = await client.GetStringAsync(url);
Console.WriteLine(json);
```

### ☕ Java / Kotlin (Android & Spring Boot)
```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

HttpClient client = HttpClient.newHttpClient();
HttpRequest req = HttpRequest.newBuilder()
    .uri(URI.create("https://boletovalidator-pro-api.maputo2.workers.dev/api/validar-boleto?boleto=34191090080000028310109257470006496450000012500"))
    .GET()
    .build();

HttpResponse<String> resp = client.send(req, HttpResponse.BodyHandlers.ofString());
System.out.println(resp.body());
```

### 💙 Flutter / Dart (Apps Mobile iOS & Android)
```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

final res = await http.get(Uri.parse('https://boletovalidator-pro-api.maputo2.workers.dev/api/validar-boleto?boleto=34191090080000028310109257470006496450000012500'));
if (res.statusCode == 200) {
  final dados = jsonDecode(res.body);
  print('Banco: ${dados['banco']['nome']}');
}
```

### 🐹 Go (Golang)
```go
package main

import (
	"fmt"
	"io"
	"net/http"
)

func main() {
	resp, _ := http.Get("https://boletovalidator-pro-api.maputo2.workers.dev/api/validar-boleto?boleto=34191090080000028310109257470006496450000012500")
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	fmt.Println(string(body))
}
```

### 🌐 JavaScript / TypeScript (Node.js, React, Vue, Svelte)
```javascript
const res = await fetch('https://boletovalidator-pro-api.maputo2.workers.dev/api/validar-boleto?boleto=34191090080000028310109257470006496450000012500');
const dados = await res.json();
console.log(dados.banco.nome, dados.valorFormatado);
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

### 4. Leitores de Código de Barras Físicos / Câmera (44 ➔ 47 Dígitos)
Leitores USB ou scanners de aplicativo leem os 44 dígitos impressos no papel. O SDK converte instantaneamente para a linha digitável com os DVs calculados:

```javascript
import { BoletoValidatorPro } from 'boletovalidator-pro';

const linhaDigitavel = BoletoValidatorPro.codigoBarrasParaLinhaDigitavel('34194964500000125001090000000283100925747000');
console.log(linhaDigitavel); // '34191090080000028310109257470006496450000012500'
```

### 5. Geração de Código de Barras Vetorial em SVG (Padrão ITF FEBRABAN)
Renderize o código de barras oficial na tela ou em impressoras térmicas (80mm/58mm) com 0 dependências:

```javascript
const res = BoletoValidatorPro.validarLocal(linha);
if (res.valido) {
  document.querySelector('#barcodeContainer').innerHTML = res.barcodeSvg;
}
```

### 6. Extrator de Boletos em Textos Livres / Mensagens de WhatsApp
Encontra e valida boletos dentro de mensagens ou transcrições de áudio:

```javascript
const mensagem = "Olá, segue o boleto de pagamento: 34191.09008 00000.283101 09257.470006 4 96450000012500 obrigado!";
const boletos = BoletoValidatorPro.extrairDeTexto(mensagem);
console.log(boletos[0].valorFormatado); // 'R$ 125,00'
```

---

## 🔗 Como Usar em Conjunto com as Outras APIs da Ponte

As APIs da Ponte foram projetadas para se conectarem como blocos de montar (Lego) em pipelines de automação e compliance:

### 🔄 Esteira Completa de Pagamento & Compliance (Boleto + CPF + CNPJ)
Em sistemas de Contas a Pagar e ERPs, encadeie a validação do boleto com a verificação cadastral do pagador/beneficiário:

```javascript
import { BoletoValidatorPro } from 'boletovalidator-pro';
import { CpfValidatorPro } from 'cpfvalidator-pro';
import CnpjPro from 'cnpj-pro';

async function processarPagamento({ linhaBoleto, documentoPagador }) {
  // 1. Valida integridade matemática do boleto (FEBRABAN Módulo 10/11)
  const boleto = BoletoValidatorPro.validarLocal(linhaBoleto);
  if (!boleto.valido) throw new Error(`Boleto rejeitado: ${boleto.motivo}`);

  // 2. Valida o documento do pagador
  const docLimpo = documentoPagador.replace(/\D/g, '');
  if (docLimpo.length === 11) {
    // Pessoa Física -> CpfValidator Pro
    const cpf = CpfValidatorPro.validarLocal(docLimpo);
    if (!cpf.valido) throw new Error(`CPF do pagador inválido: ${cpf.motivo}`);
  } else if (docLimpo.length === 14) {
    // Pessoa Jurídica -> CNPJ Pro
    const cnpj = new CnpjPro();
    const dadosEmpresa = await cnpj.consultar(docLimpo);
    if (dadosEmpresa.situacaoCadastral !== 'ATIVA') {
      throw new Error(`Empresa pagadora inapta na Receita: ${dadosEmpresa.situacaoCadastral}`);
    }
  }

  return {
    status: 'APROVADO_PARA_PAGAMENTO',
    banco: boleto.banco.nome,
    valor: boleto.valorFormatado,
    codigoBarras: boleto.codigoBarras
  };
}
```
