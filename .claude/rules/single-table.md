---
globs: src/infra/database/dynamo/**
---

# Single-table design

Convenções de modelagem da `MainTable`. Valem para toda entidade nova — o Item mapper e o
repositório derivam daqui. Referência completa: [artifact do single-table](https://claude.ai/code/artifact/8a57201b-f6a8-4bf6-8f92-e132102dd037).

## Partições

- Tudo que **pertence ao usuário** mora em `ACCOUNT#{accountId}`, separado por prefixo de SK
  (`PURCHASE#`, `RECEIPT#`, `MERCHANT#`, `PRODUCT#`, `SCAN#`, `ACCESS_KEY#`).
- Tudo que é **global** tem chave natural própria: `MERCHANT#{cnpj}`, `PRODUCT#{gtin}`.
- Partição derivada quando o volume justifica: `ACCOUNT#{accountId}#PRODUCT#{productKey}` para série
  temporal de preço — mantém a partição principal do usuário enxuta.

Nunca crie uma partição única que recebe todo write de uma entidade (`'PRODUCTS'`, `'PURCHASES'`):
ela cresce sem limite e disputa throughput. Partição fixa só para coleção de volume baixo e conhecido.

## Chave natural é exceção consciente ao ULID

O CLAUDE.md manda usar ULID — isso vale para **id gerado por nós**. Identificador externo imutável
que já vem no dado (CNPJ, GTIN, chave de acesso da NFC-e) **é a própria chave**, sem ULID:

- `MERCHANT#{cnpj}` — traduzir CNPJ→ULID exigiria um read no GSI a cada importação e abriria corrida
  de duplicata quando dois usuários importam notas da mesma loja.
- `PRODUCT#{gtin}`, `ACCESS_KEY#{chave44}` — mesmo raciocínio.

Não "corrija" essas chaves para ULID.

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
- **Opcional é `| null`, não `| undefined`** — `dynamoClient` não remove undefined no marshalling.

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
