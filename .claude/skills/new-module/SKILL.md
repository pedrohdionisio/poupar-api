---
name: new-module
description: Cria um módulo novo do single-table de ponta a ponta (entity + item + repository, e endpoints se declarados) a partir da linha da planilha de modelagem colada no prompt. Use quando o pedido for criar uma entidade nova do Poupar — Merchant, Purchase, Receipt, Scan, PricePoint, AccountProduct, AccountMerchant, GlobalPricePoint — ou qualquer entidade descrita por PK/SK/GSI + atributos.
---

# Novo módulo

Gera um módulo completo seguindo o molde de `accounts`, que é o único módulo full-stack do repo e a
**referência de formatação real** — as rules descrevem a regra, `accounts` mostra o formato.

Leia antes de gerar: `.claude/rules/single-table.md`, `entities.md`, `items.md`, `repositories.md`.

## Fase 1 — Parse do spec

O usuário cola a linha da planilha. Formato típico:

```
Purchase
PK ACCOUNT#{accountId} | SK PURCHASE#{purchasedAt}#{id} | GSI1 — | GSI2 — | GSI3 —
id string ULID | accountId string | purchasedAt Date | merchantCnpj string |
merchantName string snapshot | category Merchant.Category | totalCents number |
accessKey string|null | source Purchase.Source | createdAt Date | updatedAt Date
```

Extraia: nome da entidade, cada chave com seu template literal exato, cada atributo com tipo e
anotação (`ULID`, `snapshot`, `null`, `enum`), enums a declarar no namespace, e — se presentes —
access patterns e endpoints.

**Pergunte antes de gerar** quando faltar informação que muda o código:

- Tipo de um atributo ambíguo, ou se um campo é mutável (sem `readonly`) ou imutável.
- Access patterns, se o spec não os trouxer — eles definem quais métodos o repositório ganha.
- Se um enum referenciado (`Merchant.Category`) já existe em outra entidade ou precisa ser criado.

Não invente atributo, chave nem método que não esteja no spec.

## Fase 2 — Confirmar o plano de arquivos

Antes de escrever, liste os caminhos exatos que serão criados e os métodos do repositório derivados
de cada access pattern. Aguarde o OK — é mais barato abortar aqui.

## Fase 3 — Camada de dados

Sempre gerada, nesta ordem (cada uma depende da anterior):

1. `src/application/entities/<X>.ts` — `readonly id/createdAt`, `ulid()` como default, enums e
   `Attributes` no namespace. Entidade de chave natural (`Merchant`) usa o CNPJ como `readonly` e
   **não** gera ULID.
2. `src/infra/database/dynamo/items/<X>Item.ts` — `Keys` com template literals exatos do spec,
   `getPK`/`getSK`/`getGSI*`, `toItem`, `fromEntity`, `toEntity`. Só declare `GSI*` que o spec
   preencher — coluna com `—` não vira atributo.
3. `src/infra/database/dynamo/repositories/<X>Repository.ts` — `@Injectable()`, ctor recebendo
   `AppConfig`, um tipo de params por método no namespace.

## Fase 4 — Métodos do repositório

Um método por access pattern declarado, **e nenhum além disso**. Tradução:

| Access pattern | Comando |
|---|---|
| GetItem por PK/SK exatos | `GetCommand`, retorna `Entity \| null` |
| `begins_with(SK, 'PREFIX#')` | `QueryCommand` com `KeyConditionExpression` de prefixo |
| `BETWEEN` nas datas do SK | `QueryCommand` com `:from`/`:to`, `ScanIndexForward: false` |
| Busca por atributo em GSI | `QueryCommand` com `IndexName: 'GSI1'` (ou 2/3) |
| Escrita condicional / unicidade | `ConditionExpression: 'attribute_not_exists(SK)'` |
| Escrita atômica multi-item | `TransactWriteCommand` |

Repositório retorna `null` quando não acha — nunca lança.

## Fase 5 — Endpoints

Só se o spec declarar. Para cada endpoint, siga integralmente a skill `new-endpoint` (schema → use
case → controller → lambda → entrada no `sls` → request no Yaak). Se o spec não trouxer endpoint,
pare na Fase 4 e diga que a camada de dados está pronta para receber endpoints via `/new-endpoint`.

## Fase 6 — Wiring

Só quando houver lambda:

- Criar `sls/functions/<módulo>.yml`.
- Apendar `  - ${file(./sls/functions/<módulo>.yml)}` sob `functions:` no `serverless.yml`.

`serverless.yml` é o **único arquivo pré-existente** que este fluxo edita. Se precisar tocar em
qualquer outro (`ErrorCode.ts` para um código novo, `role.yml` para permissão S3/SQS), avise
explicitamente antes.

## Fase 7 — Yaak

Todo endpoint novo entra no workspace **Poupar** do Yaak, via MCP (`mcp__yaak__*`). Sem isso o
endpoint existe no deploy mas não no cliente que o time usa para testar.

1. `list_workspaces` → pegue o `id` do workspace `Poupar` (o id muda por máquina, não hardcode).
2. `list_folders` → procure a pasta com o nome do módulo (`Merchants`, `Purchases`, ...).
   Se não existir, `create_folder` com o nome do módulo **no plural, capitalizado**.
3. `list_http_requests` → não recrie request que já existe; use `update_http_request` para ajustar.
4. `create_http_request` para cada endpoint novo, dentro do `folderId` do módulo.

Padrão de cada request (espelha `Accounts` e `Auth`, que são a referência):

| Campo | Valor |
|---|---|
| `name` | `<Verbo> <Entidade>` em inglês — `List Merchants`, `Get Merchant`, `Create Merchant` |
| `url` | `${[ BASE_URL ]}/<path>` — path param resolvido com um valor de exemplo real, não `{cnpj}` |
| `method` | o mesmo do `httpApi` no `sls` |
| `authenticationType` | `bearer` com `authentication: { token: "${[ TOKEN ]}" }` em rota privada; omitido em rota pública. Rota `@AdminOnly()` usa `${[ ADMIN_TOKEN ]}` |
| `bodyType` | `application/json` quando há body, mais o header `Content-Type: application/json` |
| `body` | `{ text: "<json indentado com 2 espaços>" }`, preenchido com um exemplo válido pelo schema Zod — enum com valor real do domínio, `...Cents` em inteiro, CNPJ com 14 dígitos |

O body de exemplo tem que passar na validação do schema que você acabou de escrever: os mesmos
campos, sem sobra e sem falta.

## Fase 8 — Verificar

```
pnpm typecheck
pnpm biome check
```

Ambos limpos antes de seguir. Biome: tabs, aspas simples, sem trailing comma, semicolons.

## Fase 9 — Revisar

Despache o agent `module-reviewer` com: o spec original colado pelo usuário e a lista de arquivos
gerados. Relate os findings ao usuário; corrija os de severidade alta e pergunte sobre o resto.

## Armadilhas deste repo

- **`Registry` usa `impl.name` como token** — nome de classe duplicado em qualquer lugar do app
  lança no import. Confira que cada classe nova tem nome único no `src/` inteiro.
- **`@Injectable()` só registra se o arquivo for importado** — a cadeia lambda → controller →
  use case → repository é o que popula o container.
- **`dynamoClient` não remove `undefined`** — atributo opcional é `| null`, nunca `| undefined`.
- `noImplicitOverride: true` — `handle` sem `override` não compila.
