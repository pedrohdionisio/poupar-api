---
name: new-module
description: Cria um módulo novo do single-table de ponta a ponta — entity + item + repository + endpoints, sempre os quatro — a partir da linha da planilha de modelagem colada no prompt. Use quando o pedido for criar uma entidade nova do Poupar — Merchant, Purchase, Receipt, Scan, PricePoint, AccountProduct, AccountMerchant, GlobalPricePoint — ou qualquer entidade descrita por PK/SK/GSI + atributos.
---

# Novo módulo

Gera um módulo completo seguindo o molde de `accounts`, que é o único módulo full-stack do repo e a
**referência de formatação real** — as rules descrevem a regra, `accounts` mostra o formato.

**O módulo sai sempre completo: entity + item + repository + endpoints.** Não existe entrega
parcial "só da camada de dados" — spec sem endpoint declarado significa derivar o CRUD dos access
patterns, não parar antes deles. Ver Fase 5.

Leia antes de gerar: `.claude/rules/single-table.md`, `entities.md`, `items.md`, `repositories.md`.

**Fonte de consulta para dúvida de modelagem**: o artifact do single-table —
https://claude.ai/code/artifact/8a57201b-f6a8-4bf6-8f92-e132102dd037 — tem o desenho completo das
entidades do Poupar, com access patterns, chaves e atributos de cada uma. Consulte antes de
perguntar qualquer coisa ao usuário; ele resolve a maioria das lacunas do spec colado.

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

**Quando faltar informação que muda o código**, nesta ordem:

1. **Consulte o artifact** — https://claude.ai/code/artifact/8a57201b-f6a8-4bf6-8f92-e132102dd037 —
   e o repo (entidades irmãs, rules). A planilha colada é um resumo; o artifact é o desenho completo.
2. **Só então pergunte ao usuário**, se a dúvida persistir depois de consultar.

O que tipicamente falta:

- Tipo de um atributo ambíguo, ou se um campo é mutável (sem `readonly`) ou imutável.
- Access patterns, se o spec não os trouxer — eles definem quais métodos o repositório ganha, e
  estão no artifact para toda entidade do Poupar.
- Se um enum referenciado (`Merchant.Category`) já existe em outra entidade ou precisa ser criado —
  isso se responde com um grep, nunca com uma pergunta.
- Quais endpoints o módulo expõe, já que eles saem sempre (Fase 5).

Não invente atributo, chave nem método que não esteja no spec ou no artifact.

## Fase 2 — Confirmar o plano de arquivos

Antes de escrever, liste os caminhos exatos que serão criados, os métodos do repositório derivados
de cada access pattern **e as rotas dos endpoints** (método HTTP, path, statusCode). Aguarde o OK —
é mais barato abortar aqui.

Se algum item do plano veio do artifact em vez do spec colado, diga qual — o usuário precisa saber
o que você inferiu.

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

**Sempre gerados.** Para cada endpoint, siga integralmente a skill `new-endpoint` (schema → use
case → controller → lambda → entrada no `sls` → request no Yaak).

Quando o spec não declarar endpoint, derive-os — não pare na Fase 4 nem devolva a camada de dados
sozinha:

1. Procure os endpoints da entidade no artifact.
2. Se o artifact não os trouxer, derive do CRUD sobre os access patterns já confirmados: um `GET`
   de listagem por partição, um `GET` por chave, um `PUT` para os campos que o usuário edita, um
   `DELETE`. Rota privada por padrão, `accountId` vindo do token e nunca do path.
3. Não gere endpoint para access pattern que não é do usuário — agregado alimentado por stream ou
   fila (`applyPurchase`, contadores derivados) não vira rota HTTP.

Traga essa derivação no plano da Fase 2 para o usuário confirmar antes de escrever.

## Fase 6 — Wiring

Como os endpoints saem sempre, esta fase também:

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
gerados.

Ao receber o resultado, **mostre o resumo antes de perguntar qualquer coisa**:

1. Repasse o resumo do reviewer — uma linha por finding com `arquivo:linha`, agrupado por
   severidade. Inclua os que você mesmo vai corrigir; o usuário precisa saber o que mudou no
   código dele.
2. Para todo finding que muda comportamento, mostre o **trecho de código** que o reviewer citou e
   a sequência concreta que produz a falha. É a diferença entre o usuário decidir e o usuário
   chutar.
3. Só então corrija os de severidade ALTA e pergunte sobre o resto.

`AskUserQuestion` **não substitui o resumo**: numa opção cabe uma descrição curta, não o código nem
o porquê. Perguntar sem ter mostrado os findings é o erro a evitar aqui.

Descarte finding que você verificou ser falso — mas diga que descartou e por quê, em vez de omitir.

## Armadilhas deste repo

- **`Registry` usa `impl.name` como token** — nome de classe duplicado em qualquer lugar do app
  lança no import. Confira que cada classe nova tem nome único no `src/` inteiro.
- **`@Injectable()` só registra se o arquivo for importado** — a cadeia lambda → controller →
  use case → repository é o que popula o container.
- **`dynamoClient` remove `undefined`** (`removeUndefinedValues: true`) — o atributo some do item em
  silêncio em vez de estourar. Campo opcional é `| null`, nunca `| undefined`.
- `noImplicitOverride: true` — `handle` sem `override` não compila.
