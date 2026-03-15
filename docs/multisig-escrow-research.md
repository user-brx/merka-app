# Multisig Escrow para Proteção de Vendas — Merka App

**Data:** 2026-03-14
**Tipo:** Pesquisa de arquitetura — sem código-fonte
**Contexto:** Como proteger transações peer-to-peer no Merka usando assinaturas múltiplas, garantindo que o pagamento só seja liberado após entrega confirmada.

---

## O Problema Central

No Merka, um vendedor publica uma oferta (compra/venda) via Nostr. Um comprador manifesta interesse via DM. Mas como garantir que:
- O comprador **paga** e não some após receber o produto?
- O vendedor **entrega** e não some após receber o pagamento?
- Nenhuma das duas partes precisa confiar cegamente na outra?

A resposta é **escrow com multisig** — os fundos ficam trancados em um endereço que exige múltiplas assinaturas para ser gasto.

---

## O Modelo 2-de-3 (Padrão Ouro)

### Participantes

| Papel | Quem é | Responsabilidade |
|---|---|---|
| **Comprador** | Usuário que quer comprar | Deposita os fundos no escrow |
| **Vendedor** | Usuário que oferta | Entrega o produto/serviço |
| **Árbitro** | Terceiro neutro | Só age em caso de disputa |

### Como funciona o Bitcoin 2-de-3

1. As três partes geram um **endereço multisig P2WSH** (Pay-to-Witness-Script-Hash) usando as três chaves públicas.
2. O comprador envia os fundos para esse endereço. **Ninguém sozinho consegue gastar** — são necessárias 2 das 3 assinaturas.
3. **Caso normal (sem disputa):** Vendedor entrega → Comprador confirma → Ambos assinam a transação de liberação para o vendedor. Árbitro nunca é envolvido.
4. **Caso de disputa:** Se comprador ou vendedor não cooperar, o árbitro analisa as evidências e assina junto com a parte que tiver razão. 2 assinaturas → fundos liberados.

### Transações possíveis

```
[Comprador + Vendedor]  → Liberação normal (produto entregue, todos satisfeitos)
[Comprador + Árbitro]   → Árbitro deu razão ao comprador (devolução)
[Vendedor + Árbitro]    → Árbitro deu razão ao vendedor (liberação forçada)
```

### Timelock como segurança adicional (CLTV/CSV)

O script multisig pode incluir um **timelock**: se nenhuma das combinações assinar em X dias (ex: 14 dias), os fundos retornam automaticamente ao comprador. Isso protege contra abandono total da negociação ou árbitro desaparecido.

---

## Precisa de Oráculo?

**Depende da definição de "oráculo".**

### O árbitro humano = oráculo manual
Na maioria dos casos, o árbitro é uma pessoa (ou organização) que lê as evidências — prints, DMs, fotos da entrega — e assina a transação a favor de uma das partes. **Não há automação aqui.** É confiança delegada a um terceiro, mas de forma minimizada: o árbitro nunca tem os fundos sozinho (seria apenas 1 de 3).

### DLC (Discreet Log Contracts) = oráculo criptográfico
Para casos onde a entrega é verificável por dados externos (ex: "pacote rastreado como entregue pelos Correios"), é possível usar **DLCs**:
- Um oráculo externo (ex: API dos Correios + adaptador DLC) publica um **attestation** assinado com chave Schnorr quando o evento ocorre ("pacote X entregue em Y data").
- O contrato Bitcoin usa essa attestation para liberar os fundos **automaticamente**, sem árbitro humano.
- **Vantagem:** sem confiança humana. **Desvantagem:** complexidade alta, só funciona para eventos verificáveis externamente.

### Conclusão sobre oráculo
Para o Merka hoje, **árbitro humano 2-de-3 é suficiente e muito mais simples**. DLC é uma evolução futura para categorias com rastreabilidade (entregas físicas com código de rastreio, etc.).

---

## O Que Acontece Se Alguém Recusar Assinar?

### Cenário 1: Vendedor entregou, comprador se recusa a liberar (má-fé)
→ Vendedor abre disputa → Árbitro analisa evidências (fotos, DMs no Nostr) → Árbitro + Vendedor assinam → Vendedor recebe os fundos.

### Cenário 2: Comprador pagou, vendedor some ou não entrega
→ Comprador abre disputa → Árbitro analisa → Árbitro + Comprador assinam → Devolução ao comprador.

### Cenário 3: Árbitro some ou recusa agir
→ **Timelock** resolve: após o período definido (ex: 30 dias), os fundos retornam ao comprador automaticamente. O script Bitcoin é executado pela rede — nenhum terceiro pode bloquear isso.

### Cenário 4: Árbitro age de má-fé (cumplicidade com uma parte)
→ Risco real em sistemas com árbitro único. Mitiga com:
- **Reputação pública do árbitro** via Nostr (NIP-01 eventos publicados com histórico de disputas).
- **Multi-árbitro:** usar 3-de-5 em vez de 2-de-3, com múltiplos árbitros independentes.
- **Federação de árbitros:** uma DAO ou conjunto de entidades conhecidas que devem atingir maioria.

---

## Alternativa para Micropagamentos: Lightning Hold Invoice

Para valores pequenos e entregas digitais (e-books, serviços online, arquivos), a Lightning Network oferece uma alternativa mais rápida via **hold invoices**:

1. Vendedor gera uma **hold invoice** (fatura "em espera") — o pagamento é roteado mas não liquidado.
2. Comprador paga a fatura. Fundos ficam retidos no canal Lightning.
3. Após confirmar entrega, o vendedor revela o **preimage** (segredo criptográfico) → pagamento liquidado.
4. Se o vendedor não revelar o preimage em X horas → pagamento retorna ao comprador automaticamente (HTLC expira).

**Limitações:** não existe árbitro nesse fluxo — é estritamente 2-de-2 (comprador + vendedor). Se o vendedor alegar entrega e o comprador discordar, não há mecanismo nativo de disputa na Lightning. Para vendas de bens físicos, Bitcoin on-chain 2-de-3 é mais adequado.

---

## Como o Nostr se Encaixa

O Bitcoin/Lightning resolvem **o movimento do dinheiro**. O Nostr resolve **a coordenação e a comunicação**:

### 1. Publicação da oferta
Vendedor publica nota (Kind 1) com tag `#t: merka-app-9f8a2b3c` descrevendo o produto, preço, condições, e sua **chave pública Bitcoin** (para construção do endereço multisig).

### 2. Negociação via NIP-17 (DMs criptografados)
Comprador contata o vendedor pelo chat seguro do Merka. Ambos trocam:
- Chaves públicas Bitcoin para o multisig
- Qual árbitro usar (por npub público e reputado)
- Condições da entrega e prazo

### 3. Construção do endereço multisig off-app
As três chaves públicas (comprador, vendedor, árbitro) são combinadas para gerar o endereço P2WSH. Isso pode ser feito com ferramentas externas (Sparrow Wallet, Electrum multisig) ou futuramente integrado ao Merka.

### 4. Registro da transação no Nostr (auditoria pública)
A abertura e resolução do escrow podem ser publicadas como eventos Nostr (Kind 1 ou custom) para criar um histórico de reputação público — compradores e vendedores confiáveis ficam visíveis na rede.

### 5. Disputa: evidências via NIP-17
Toda comunicação relevante (confirmações de envio, fotos, recibo de rastreio) é trocada via DMs criptografados NIP-17. Em caso de disputa, ambas as partes encaminham os DMs ao árbitro, que pode verificar a autenticidade pela assinatura Nostr dos eventos.

---

## NIPs Relevantes Existentes

| NIP | Nome | Relevância |
|---|---|---|
| **NIP-15** | Nostr Marketplace | Define eventos Kind 30017/30018 para produtos e pedidos P2P |
| **NIP-99** | Classified Listings | Anúncios de compra/venda com preço e condições |
| **NIP-17** | Private Direct Messages | Coordenação segura entre partes |
| **NIP-57** | Lightning Zaps | Pagamentos rápidos para digitais/pequenos valores |

**NIP-15 é especialmente relevante**: define todo um protocolo de marketplace sobre Nostr, incluindo status de pedido (pending, paid, shipped, completed, disputed). O Merka poderia adotar esses kinds nativamente.

---

## O Que Seria Necessário para Implementar no Merka

### Fase 1 — Coordenação (só Nostr, sem on-chain)
- Publicar ofertas com metadata de escrow (preço, chave pública Bitcoin, árbitro preferido)
- Chat NIP-17 para negociação
- Sem integração on-chain — usuário usa Sparrow/Electrum externamente
- **Complexidade:** baixa

### Fase 2 — Integração Lightning (hold invoice)
- Integrar geração de hold invoices via um LSP (Lightning Service Provider) parceiro
- Adequado para bens digitais e serviços
- **Complexidade:** média — requer backend parceiro ou integração com LND/CLN

### Fase 3 — Bitcoin Multisig Nativo
- Integrar biblioteca Bitcoin (ex: `@scure/btc-signer`) no cliente para construir o endereço P2WSH
- Usuário assina PSBT (Partially Signed Bitcoin Transaction) localmente
- Árbitro tem npub Nostr e endereço Bitcoin registrados no perfil
- **Complexidade:** alta — requer gerenciamento de PSBT, chaves Bitcoin separadas das chaves Nostr

### Fase 4 — DLC com Oráculo Externo (futuro)
- Integrar cliente DLC (ex: `dlc-tools`) para contratos baseados em dados externos
- Árbitro substituído por oráculo Schnorr (rastreio, APIs externas)
- **Complexidade:** muito alta — tecnologia ainda emergente

---

## Resumo de Tecnologias Necessárias

| Camada | Tecnologia | Para que serve |
|---|---|---|
| **Comunicação** | Nostr NIP-17 | Negociação segura, evidências de disputa |
| **Publicação** | Nostr NIP-99 / NIP-15 | Ofertas de compra/venda |
| **Reputação** | Nostr Kind 1 (público) | Histórico de árbitros e traders |
| **Pagamento pequeno** | Lightning hold invoice | Bens digitais, micropagamentos |
| **Pagamento grande** | Bitcoin P2WSH multisig 2-de-3 | Bens físicos, alto valor |
| **Proteção contra abandono** | Bitcoin CLTV/CSV timelock | Devolução automática se sem resolução |
| **Automação futura** | DLC + oráculo Schnorr | Resolução automática por dados externos |
| **Assinatura offline** | PSBT (BIP-174) | Usuário assina sem expor chave privada |

---

## Conclusão

**Para o Merka hoje:** a abordagem mais viável é **Bitcoin 2-de-3 com árbitro humano + Nostr para coordenação**. Não requer alterações no protocolo — apenas o Merka publicar as chaves públicas Bitcoin nos perfis e padronizar os DMs de negociação.

**A necessidade de oráculo é opcional** — o árbitro humano cobre 95% dos casos com confiança mínima necessária (nunca tem acesso sozinho aos fundos).

**O timelock é não-opcional** — é a garantia final de que fundos nunca ficam presos para sempre, independente do comportamento dos participantes.

**O maior risco não é técnico:** é a reputação e honestidade dos árbitros. Por isso, um sistema de reputação público via Nostr (árbitros com histórico de disputas publicado na rede) é tão importante quanto o mecanismo de assinatura.
