---
globs: src/infra/database/dynamo/**
---

# Single-table design

Convenções de modelagem da `MainTable`. Valem para toda entidade nova — o Item mapper e o
repositório derivam daqui. Referência completa: [artifact do single-table](https://claude.ai/code/artifact/8a57201b-f6a8-4bf6-8f92-e132102dd037).

## Partições

- **Nada é global.** Toda entidade mora em `ACCOUNT#{accountId}`, separada por prefixo de SK
  (`PURCHASE#`, `RECEIPT#`, `MERCHANT#`, `PRODUCT#`, `SCAN#`, `ACCESS_KEY#`). O app é sobre os
  gastos do próprio usuário; não há catálogo compartilhado entre contas.
- Partição derivada quando o volume justifica: `ACCOUNT#{accountId}#PRODUCT#{productKey}` para série
  temporal de preço — mantém a partição principal do usuário enxuta.

Nunca crie uma partição única que recebe todo write de uma entidade (`'PRODUCTS'`, `'PURCHASES'`):
ela cresce sem limite e disputa throughput. Partição fixa só para coleção de volume baixo e conhecido.

## Identidade de Merchant e de produto

**Merchant é ULID**, criado pelo usuário antes da compra (`ACCOUNT#{accountId}` /
`MERCHANT#{ulid}`). O CNPJ é atributo opcional (`cnpj: string | null`), nunca chave — o usuário
escolhe a loja num select, não digita documento. `Merchant` acumula os contadores da conta
(`purchaseCount`, `totalSpentCents`, `firstPurchaseAt`, `lastPurchaseAt`); não existe entidade
`AccountMerchant` separada.

**`productKey` é `sha1(normalizedName)`** — 40 hex, formato único, **sem prefixo**. O
`normalizedName` vem do nome padronizado pela IA (`ImportPurchaseNormalizer.normalizeName` sobre o
`displayName`), não da descrição crua da nota. O GTIN continua como atributo e como âncora de
matching no `ScanExtractionNormalizer`, mas **não** é chave. Não reintroduza `GTIN#`,
`MERCHANT#…#PROD#` nem `NAME#`: chave sem `#` é o que mantém `productKey` utilizável em query param.

`ACCESS_KEY#{chave44}` continua chave natural — é o dedupe de nota fiscal e vem imutável do dado.

## Data no SK

Quando a entidade é consultada por período, a data que vai no SK é a **data do fato**
(`purchasedAt` — emissão da nota), nunca a de criação do registro. ISO 8601 em UTC: ordenação
lexicográfica = ordenação cronológica, e todo filtro de período vira um `BETWEEN` numa Query só.

```
SK: PURCHASE#{purchasedAt}#{purchaseId}
:from  PURCHASE#2026-02-19T03:00:00.000Z
:to    PURCHASE#2026-08-19T03:00:00.000Z#￿
```

O `#{id}` no fim garante unicidade e ordenação determinística; o `￿` no limite superior cobre
esse sufixo.

## Atributos

- **Dinheiro**: sufixo `...Cents`, inteiro, sempre. Quantidade fracionária: sufixo `...Milli`
  (inteiro em milésimos — `0,384 KG` → `384`) mais o campo `unit`. Nenhum float em nenhum dos dois.
- **Timestamps**: `Date` na entidade ↔ string ISO UTC no item. `updatedAt` só em entidade que de fato
  muda — item imutável (Receipt, PricePoint, GlobalPricePoint, dedupe) não carrega o campo.
- **Enum**: gravado como a string do enum (`'PENDING'`), nunca índice numérico. Declarado no
  namespace da entidade.
- **Snapshot**: campos copiados de outra entidade (`merchantName`, `category` na compra) são
  proposital — congelam o passado e evitam resolver referência na Query. Não são desnormalização a
  corrigir.
- **Opcional é `| null`, não `| undefined`** — `NULL` é gravado e consultável; atributo ausente não
  distingue "sem valor" de "campo novo". O `dynamoClient` tem `removeUndefinedValues: true`, então
  `undefined` não estoura o `PutCommand` — ele simplesmente some do item, que é o problema.

## Soft delete

Custa diferente aqui: `deletedAt` vira `FilterExpression`, que roda **depois** do `Limit`.

- Volume baixo (Account, Merchant): `deletedAt` é aceitável.
- Partição que cresce (Purchase, Receipt, PricePoint): delete real, dentro da transação que estorna
  os contadores derivados.
- Jobs (Scan): TTL nativo via atributo `ttl` (epoch em segundos), não `deletedAt`.

## GSIs

GSI1, GSI2 e GSI3 já estão provisionados em `sls/resources/MainTable.yml` com `ProjectionType: ALL`.
**Usar um GSI não exige mudança de infra.** GSI3 está livre.

Só projete uma entidade num GSI se houver access pattern que o exija — atributo de índice não usado
é byte pago em toda escrita. Ordenar dezenas de itens em memória é mais barato que manter um índice.

## Idempotência de contador

`ADD` não é idempotente e stream entrega ao menos uma vez. Item com contador denormalizado guarda
`lastAppliedPurchaseId` e condiciona o update nele.
