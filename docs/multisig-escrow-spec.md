# Merka Escrow — Especificação Técnica de Multisig
**Data:** 2026-03-24
**Status:** Especificação aprovada — implementação futura
**Decisão:** Bitcoin P2WSH 2-de-3 (Fase 1) → Bitcoin P2TR Taproot (Fase 2)

---

## 1. Decisão de Tecnologia

### Comparação final

| Opção | Privacidade | Complexidade | Arbitragem | Timelock | Adequação ao Merka |
|---|---|---|---|---|---|
| Lightning hold invoice | Alta | Baixa | ✗ Sem árbitro | HTLC automático | Apenas bens digitais |
| **Bitcoin P2WSH 2-de-3** | **Média** | **Média** | **✓ 3 partes** | **CLTV/CSV** | **✓ Fase 1** |
| Bitcoin P2TR Taproot | Alta | Alta | ✓ 3 partes | CSV | ✓ Fase 2 |
| DLC + oráculo | Muito alta | Muito alta | Automático | - | Fase 4 futura |

### Escolha: Duas fases

**Fase 1 — P2WSH 2-de-3 (implementar primeiro)**
Multisig clássico, compatível com Sparrow/Electrum, sem necessidade de MuSig2 interativo. Endereços `bc1q...`. Script `OP_2 <A> <B> <C> OP_3 OP_CHECKMULTISIG`.

**Fase 2 — P2TR Taproot (migrar quando Fase 1 estiver estável)**
Usa o mesmo modelo 2-de-3, mas a resolução cooperativa fica invisível on-chain via MuSig2. Endereços `bc1p...`. Menor fee, maior privacidade.

---

## 2. Insight Fundamental: Chaves Nostr = Chaves Bitcoin

Esta é a decisão arquitetural mais importante do Merka Escrow.

```
nsec (Nostr private key)  =  Chave privada Bitcoin secp256k1 (32 bytes)
npub (Nostr public key)   =  Chave pública x-only Bitcoin (32 bytes, formato BIP-340)
```

A chave privada Nostr (`nsec`) e a chave privada Bitcoin são o **mesmo primitivo criptográfico** — um escalar de 32 bytes na curva secp256k1. O formato x-only da chave pública Nostr é exatamente o formato que o Bitcoin Taproot (BIP-340) exige.

**Consequência prática:**
- Nenhum usuário do Merka precisa de uma carteira Bitcoin separada
- O npub do usuário deriva diretamente o endereço P2TR (`bc1p...`)
- A mesma chave que assina eventos Nostr assina transações Bitcoin
- `@scure/btc-signer` aceita x-only pubkeys nativamente

> **Atenção de segurança:** A chave Nostr assina tanto mensagens Nostr quanto transações Bitcoin. Jamais reutilize a mesma chave para os dois contextos em produção. A implementação deve derivar uma chave Bitcoin via BIP-32 a partir do nsec (ex: `m/44'/0'/0'/0/0`), preservando o nsec original exclusivamente para o Nostr. Isso mantém a separação de segurança sem exigir uma segunda frase-semente do usuário.

---

## 3. Participantes e Papéis

| Papel | Quem | Chave relevante | Responsabilidade |
|---|---|---|---|
| **Comprador** | Usuário que compra | `buyer_npub` → `buyer_btc_pubkey` | Deposita os fundos no escrow |
| **Vendedor** | Usuário que vende | `seller_npub` → `seller_btc_pubkey` | Entrega o produto/serviço |
| **Árbitro** | Terceiro neutro registrado | `arbiter_npub` → `arbiter_btc_pubkey` | Age somente em disputas |

**Regra de ouro:** Nenhum participante sozinho pode mover os fundos. São sempre necessárias **2 de 3 assinaturas**.

---

## 4. Estrutura do Script Bitcoin

### Fase 1 — P2WSH 2-de-3

```
Script de resgate:
OP_2
  <buyer_btc_pubkey>
  <seller_btc_pubkey>
  <arbiter_btc_pubkey>
OP_3
OP_CHECKMULTISIG
```

O endereço P2WSH é o SHA256 desse script, wrapped em `OP_0 <32-byte-hash>`.

### Fase 2 — P2TR com Taproot

```
Internal key (key path):
  MuSig2_aggregate(buyer_btc_pubkey, seller_btc_pubkey)
  → Resolução cooperativa: 1 assinatura agregada, invisível on-chain

Script tree:
  Leaf A — Disputa 2-de-3:
    OP_2
    <buyer_btc_pubkey> OP_CHECKSIGADD
    <seller_btc_pubkey> OP_CHECKSIGADD
    <arbiter_btc_pubkey> OP_CHECKSIGADD
    OP_2 OP_EQUAL

  Leaf B — Timelock de abandono (devolução ao comprador):
    <delivery_deadline_blocks> OP_CHECKSEQUENCEVERIFY OP_DROP
    <buyer_btc_pubkey> OP_CHECKSIG
```

**Leitura das 3 saídas possíveis:**

| Quem assina | Script path | Destinatário | Quando |
|---|---|---|---|
| Comprador + Vendedor | Key path (MuSig2) | Vendedor | Entrega confirmada sem disputa |
| Comprador + Árbitro | Leaf A | Comprador | Árbitro deu razão ao comprador |
| Vendedor + Árbitro | Leaf A | Vendedor | Árbitro deu razão ao vendedor |
| Comprador (sozinho) | Leaf B | Comprador | Timelock expirou (abandono) |

---

## 5. Máquina de Estados do Escrow

```
[LISTING_CREATED]
       │  Vendedor publica NIP-99 com preço, prazo e btc_pubkey
       ▼
[NEGOTIATING]
       │  Comprador contata via NIP-17 DM
       │  Acordo: valor, prazo entrega, árbitro escolhido
       │  ⏱ SLA: vendedor responde em 48h ou contrato é cancelado
       ▼
[CONTRACT_AGREED]
       │  App constrói endereço P2WSH/P2TR com 3 chaves
       │  Endereço e txid registrados via NIP-17 DM criptografado entre as partes
       ▼
[AWAITING_FUNDING]
       │  Comprador envia Bitcoin para o endereço escrow
       │  ⏱ Prazo: 24h para financiar (senão volta a NEGOTIATING)
       ▼
[FUNDED]  ← monitorado via mempool.space API / electrum
       │  ≥1 confirmação na blockchain
       │  ⏱ Prazo de entrega: definido no contrato (ex: 3d digital / 30d físico)
       ▼
[AWAITING_DELIVERY]
       │
       ├─ [Caminho A — Normal] ──────────────────────────────────────────────►
       │    Vendedor entrega → anuncia entrega via NIP-17                      │
       │    Comprador confirma → ⏱ janela de confirmação: 72h                  │
       │    Ambos assinam PSBT via NIP-17                                       │
       │                                                                        ▼
       │                                                               [COMPLETED]
       │                                                          Fundos para vendedor
       │
       ├─ [Caminho B — Disputa] ─────────────────────────────────────────────►
       │    Qualquer parte abre disputa via NIP-17 ao árbitro                  │
       │    ⏱ Janela: 7 dias após deadline de entrega                          │
       │    ⏱ Árbitro responde em 7 dias ou timelock avança                    │
       │    Árbitro decide + assina PSBT com parte vencedora                   │
       │                                                                        ▼
       │                                                               [RESOLVED]
       │                                                       Fundos para parte certa
       │
       └─ [Caminho C — Abandono] ────────────────────────────────────────────►
            Nenhuma ação após N blocos (ex: ~60 dias)                          │
            Timelock Bitcoin expira (CSV/CLTV)                                 │
            Comprador transmite tx unilateralmente                             │
                                                                               ▼
                                                                     [REFUNDED]
                                                                  Fundos de volta ao comprador
```

### Tempos por tipo de negociação

| Tipo | Prazo de entrega | Janela confirmação | Janela disputa | Timelock absoluto |
|---|---|---|---|---|
| Bem digital (arquivo, acesso) | 24h | 48h | 72h | 14 dias |
| Serviço remoto | 7 dias | 72h | 7 dias | 30 dias |
| Produto físico nacional | 21 dias | 7 dias | 14 dias | 60 dias |
| Produto físico internacional | 45 dias | 10 dias | 20 dias | 90 dias |

Os prazos são **codificados no contrato** no momento do acordo (Fase NEGOTIATING) e registrados via NIP-17 criptografado. O timelock absoluto é o único que é **enforced on-chain** (via CSV no Leaf B do Tapscript). Os outros são acordos sociais que o árbitro considera ao julgar.

---

## 6. Coordenação via Nostr (Protocolo de Mensagens)

Toda coordenação off-chain usa **NIP-17 (Private Direct Messages)** — criptografia ponta-a-ponta com chave efêmera por mensagem.

### Tipos de evento custom (Kind range reservado: 38380–38389)

```typescript
// Proposta de contrato — enviada pelo comprador ao vendedor
Kind 38380: {
  escrow_id: string;           // UUID v4 gerado localmente
  type: "contract_proposal";
  buyer_npub: string;
  seller_npub: string;
  arbiter_npub: string;
  amount_sats: number;
  delivery_type: "digital" | "service" | "physical_local" | "physical_intl";
  delivery_deadline_hours: number;
  product_description: string;
  btc_address: string;         // endereço P2WSH/P2TR construído pelo app
  script_hex: string;          // redeem script serializado (para verificação independente)
  created_at: number;
}

// Aceite do contrato
Kind 38381: {
  escrow_id: string;
  type: "contract_accepted";
  seller_signature: string;    // assinatura Nostr sobre o escrow_id
}

// PSBT compartilhado para assinatura
Kind 38382: {
  escrow_id: string;
  type: "psbt_share";
  psbt_base64: string;         // PSBT parcialmente assinado
  signing_request: "release" | "refund" | "dispute_resolution";
  destination_npub: string;    // quem recebe os fundos
}

// Abertura de disputa
Kind 38383: {
  escrow_id: string;
  type: "dispute_opened";
  opened_by: "buyer" | "seller";
  reason: string;
  evidence_event_ids: string[]; // IDs de eventos NIP-17 como evidência
}

// Decisão do árbitro
Kind 38384: {
  escrow_id: string;
  type: "arbiter_decision";
  decision: "buyer_wins" | "seller_wins" | "split";
  rationale: string;
  psbt_base64: string;         // PSBT com assinatura do árbitro incluída
}
```

Todos esses eventos são enviados como conteúdo criptografado NIP-17 — nunca expostos publicamente. O `escrow_id` é o elo entre as mensagens privadas.

### Reputação pública (opt-in)

Após resolução, as partes podem publicar um **Kind 1** público assinando pelo seu nsec:

```
"Escrow #<escrow_id_short> concluído com @<npub>. Transação: <txid>.
#merka-escrow #merka-app-9f8a2b3c"
```

Isso cria um histórico público verificável de árbitros e traders sem revelar valores ou identidades das conversas privadas.

---

## 7. Fluxo de Assinatura PSBT Passo a Passo

```
1. CONSTRUÇÃO (app do comprador):
   ├── Coleta: buyer_btc_pubkey, seller_btc_pubkey, arbiter_btc_pubkey
   ├── Constrói redeem script P2WSH (ou P2TR Taproot)
   ├── Deriva endereço Bitcoin
   └── Gera PSBT vazio com output para o endereço escrow

2. FINANCIAMENTO (comprador):
   ├── Comprador usa sua carteira para enviar para o endereço escrow
   └── UTXO confirmado on-chain

3. PSBT DE LIBERAÇÃO (quando entrega confirmada):
   ├── Qualquer parte constrói PSBT de gasto:
   │     inputs: [UTXO do escrow]
   │     outputs: [valor - fee → seller_btc_address]
   ├── Assina com sua chave (1 de 2 assinaturas necessárias)
   ├── Serializa PSBT como base64
   └── Envia via Kind 38382 (NIP-17 criptografado) para o outro

4. CO-ASSINATURA (outra parte):
   ├── Recebe PSBT via NIP-17
   ├── Verifica: valor correto? destino correto? inputs corretos?
   ├── Adiciona sua assinatura
   └── Transmite tx finalizada via mempool.space API

5. DISPUTA (se necessário):
   ├── Parte abre disputa via Kind 38383
   ├── Árbitro recebe os DMs de evidência
   ├── Árbitro constrói PSBT com destino ao vencedor
   ├── Árbitro assina + envia via Kind 38384
   ├── Parte vencedora adiciona sua assinatura
   └── Transmite tx finalizada

6. TIMELOCK (último recurso):
   ├── Após N blocos sem resolução
   ├── Comprador constrói tx usando Leaf B do script (somente CSV)
   ├── Assina sozinho (Leaf B exige apenas buyer_btc_pubkey)
   └── Transmite — ninguém pode bloquear
```

---

## 8. Sistema de Árbitros

### Registro de árbitro

Árbitros são usuários Nostr com Kind 0 especial:
```json
{
  "name": "merka-arbiter-br",
  "about": "Árbitro certificado Merka. Taxa: 1% do valor disputado.",
  "website": "https://...",
  "merka_arbiter": {
    "active": true,
    "btc_pubkey": "<hex>",
    "languages": ["pt", "en"],
    "categories": ["physical", "digital", "service"],
    "fee_percent": 1,
    "max_value_sats": 10000000,
    "response_time_hours": 24,
    "disputes_resolved": 47,
    "disputes_won_buyer": 19,
    "disputes_won_seller": 28
  }
}
```

O Merka app lê esses perfis para oferecer uma **lista de árbitros aprovados** com reputação verificável. A reputação é construída por publicações Kind 1 referenciando `#merka-escrow`.

### Proteção contra árbitro desonesto

| Risco | Mitigação |
|---|---|
| Árbitro some | Timelock (Leaf B) devolve ao comprador após N dias — sem necessidade de árbitro |
| Árbitro é corrompido | Reputação pública on-Nostr; histórico de decisões verificável |
| Árbitro único comprometido | Evolução futura: multi-árbitro 3-de-5 (2 árbitros + 3 partes) |
| Colisão árbitro + parte | Timelock protege a parte inocente de ficarem sem os fundos indefinidamente |

---

## 9. Bibliotecas e Dependências

```json
// A adicionar como devDependencies (bundled pelo Vite):
{
  "@scure/btc-signer": "^1.x",   // construção de P2WSH, P2TR, PSBT
  "@scure/base": "^1.x",          // encoding base64/hex (já transitivo)
  "@noble/curves": "^1.x"         // secp256k1, já em uso pelo nostr-tools
}
```

**Nota:** `@noble/curves` já é dependência transitiva do `nostr-tools` — provavelmente já presente no bundle. `@scure/btc-signer` é da mesma família (`paulmillr/scure-*`) e roda 100% em browser sem WASM.

### Derivação de chave Bitcoin a partir do nsec

```typescript
// Nunca usar o nsec diretamente como chave Bitcoin
// Derivar via HMAC-SHA256 com domínio separado

import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha256';

function deriveBitcoinKey(nostrPrivKey: Uint8Array): Uint8Array {
  // Separação de domínio: a chave Bitcoin é derivada, não idêntica ao nsec
  const domain = new TextEncoder().encode('merka-btc-escrow-v1');
  return hmac(sha256, nostrPrivKey, domain);
  // Resultado: 32 bytes, válido como chave privada secp256k1
}
```

Para Fase 2 (P2TR), usar BIP-32 derivation path `m/44'/0'/0'/0/0` a partir do nsec como seed.

---

## 10. Fases de Implementação

### Fase 1 — Coordenação Nostr + Escrow Manual (sem código Bitcoin no app)
**Objetivo:** Validar o protocolo de comunicação antes de integrar código Bitcoin.

- [ ] Publicar listagens com campo `btc_pubkey` no perfil (Kind 0 extension)
- [ ] NIP-15 / NIP-99 para ofertas de compra/venda estruturadas
- [ ] Kinds 38380–38384 implementados via NIP-17 para coordenação
- [ ] UI para exibir estado do escrow (máquina de estados)
- [ ] Instruções ao usuário para construir o endereço P2WSH externamente (Sparrow/Electrum)
- **Complexidade:** Baixa. Apenas Nostr — sem código Bitcoin.

### Fase 2 — P2WSH 2-de-3 Nativo no App
**Objetivo:** App gera endereço e coordena PSBTs automaticamente.

- [ ] Integrar `@scure/btc-signer`
- [ ] Derivação de chave Bitcoin a partir do nsec (com separação de domínio)
- [ ] Construção de endereço P2WSH no browser
- [ ] Geração de PSBT de liberação / devolução
- [ ] Assinatura de PSBT dentro do app
- [ ] Transmissão via mempool.space API
- [ ] Monitoramento de confirmação de funding
- **Complexidade:** Média.

### Fase 3 — P2TR Taproot (cooperativo invisível)
**Objetivo:** Migrar para Taproot para melhor privacidade e menor fee.

- [ ] MuSig2 interactive signing protocol para key path cooperativo
- [ ] Tapscript leaves: disputa (2-de-3) + timelock (CSV)
- [ ] Árbitros registrados com perfis verificáveis
- [ ] Sistema de reputação de árbitros via Nostr
- **Complexidade:** Alta.

### Fase 4 — DLC com Oráculo (entregas rastreáveis)
**Objetivo:** Resolução automática para categorias com rastreio (Correios, etc.).

- [ ] Integração DLC client
- [ ] Adaptador de oráculo para APIs de rastreio
- [ ] Attestation Schnorr do oráculo
- **Complexidade:** Muito alta — tecnologia ainda emergente.

---

## 11. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Usuário perde nsec → perde fundos do escrow | Média | Crítico | Escrow de curta duração; NIP-49 para proteção do nsec; timelock devolve ao comprador |
| Relay offline na hora de coordenar PSBT | Alta | Médio | PSBT pode ser compartilhado por qualquer canal (QR code, email) — protocolo é relay-agnostic |
| Árbitro some antes de resolver disputa | Baixa | Alto | Timelock absoluto (Leaf B) devolve ao comprador independentemente |
| Reorg da blockchain invalida funding | Muito baixa | Alto | Aguardar ≥3 confirmações antes de marcar como FUNDED |
| Fee estimativa errada → tx não confirma | Média | Baixo | RBF (Replace-By-Fee) habilitado nas transações de liberação; PSBT inclui campo fee_rate |
| Chave Bitcoin idêntica ao nsec Nostr | - | Crítico | **Sempre derivar com separação de domínio** — nunca usar nsec diretamente |

---

## 12. O Que Não Fazer (Anti-Padrões)

- **Não custodiar fundos no servidor/relay:** O Merka não tem backend — e não deve ter. Todo escrow é on-chain, não custodiado por terceiro.
- **Não usar nsec como chave Bitcoin diretamente:** Uma assinatura Bitcoin maliciosa poderia comprometer a chave Nostr do usuário.
- **Não armazenar PSBTs em relays públicos:** PSBTs revelam o endereço escrow e o valor. Sempre via NIP-17 criptografado.
- **Não omitir o timelock:** É a única garantia que funciona sem cooperação de ninguém. É obrigatório em todo contrato.
- **Não implementar sem UI clara dos estados:** Usuários precisam saber em que fase estão, quanto tempo resta e o que fazer.

---

## 13. Próximos Passos Concretos

1. **Definir NIP custom** para os Kinds 38380–38384 — submeter como NIP draft ou manter como extensão proprietária Merka
2. **Implementar Fase 1** — apenas coordenação Nostr, sem Bitcoin on-chain no app
3. **Criar UI do escrow state machine** — painel de controle da negociação
4. **Publicar lista de árbitros beta** — perfis Kind 0 com campo `merka_arbiter`
5. **Integrar `@scure/btc-signer`** para Fase 2 — a biblioteca já está escolhida
6. **Auditoria de segurança** antes do lançamento da Fase 2 (chaves + PSBT)

---

*Documento baseado em: `docs/multisig-escrow-research.md` (2026-03-14) + revisão técnica (2026-03-24)*
*Tecnologias de referência: BIP-174 (PSBT), BIP-340/341/342 (Taproot/Tapscript), NIP-15, NIP-17, NIP-99, @scure/btc-signer*
