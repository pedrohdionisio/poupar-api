---
name: new-endpoint
description: Adiciona um endpoint HTTP completo (schema Zod + use case + controller + lambda entry + entrada no serverless) a um módulo que já tem entity, item e repository. Use quando o pedido for criar uma rota, endpoint ou caso de uso novo em cima de uma entidade existente.
---

# Novo endpoint

Vertical slice completo sobre um módulo existente. Se a entidade/repositório ainda não existirem,
use `/new-module` primeiro.

Leia antes de gerar: `.claude/rules/controllers.md`, `usecases.md`, `schemas.md`,
`lambda-functions.md`. O molde de formatação real é `accounts` —
`src/application/controllers/accounts/UpdateAccountController.ts` e os arquivos irmãos.

## Fase 1 — Contexto

Leia a entidade e o repositório do módulo alvo. Você precisa saber quais métodos o repositório já
tem antes de decidir se o use case reaproveita ou se falta um método.

## Fase 2 — Confirmar

Colete (do prompt ou perguntando):

- Método HTTP e path, com os params entre chaves — `PUT /merchants/{cnpj}/alias`.
- Público ou privado. Privado é o default; público só quando explicitado.
- Precisa `@AdminOnly()`? Só para operação restrita a admin — rota privada comum não leva.
- statusCode de sucesso: `201` em criação, `200` com body, `204` sem body.
- Nome da classe: `<Verbo><Entidade>Controller` / `<Verbo><Entidade>UseCase`.

## Fase 3 — Gerar, nesta ordem

**1. Schema** — `src/application/controllers/<módulo>/schemas/<verbo><Entidade>Schema.ts`

Exporta um schema por parte presente da request (`xxxBodySchema`, `xxxParamsSchema`,
`xxxQuerySchema`) **e** os tipos inferidos. Endpoint que não lê nada da request não gera arquivo e a
controller não recebe `@Schema`.

**2. Use case** — `src/application/usecases/<módulo>/<Verbo><Entidade>UseCase.ts`

`@Injectable()`, único método público `execute(input)`, `Input`/`Output` no namespace. Toda a regra
de negócio vive aqui: validar existência antes de modificar, lançar `ResourceNotFound` /
`ResourceAlreadyExists` / `Conflict` de `@application/errors/`.

**3. Controller** — `src/application/controllers/<módulo>/<Verbo><Entidade>Controller.ts`

Decorators na ordem `@Schema` → `@Injectable` → `@AdminOnly`. `protected override async handle`.
Genéricos de `Controller.Request` na ordem `<TType, TBody, TParams, TQueryParams>`. Um use case por
controller, sem lógica além da chamada.

**4. Lambda** — `src/main/functions/<módulo>/<verbo><Entidade>.ts`

Cinco linhas, `import 'reflect-metadata'` na primeira, `Registry.getInstance().resolve(...)`.

## Fase 4 — Método faltando no repositório

Se o use case precisa de uma query que o repositório não tem, **adicione o método ao repositório**
seguindo `.claude/rules/repositories.md` e `single-table.md`. Nunca monte `QueryCommand` no use case
nem importe o AWS SDK fora da infra.

## Fase 5 — Serverless

Adicione a entrada em `sls/functions/<módulo>.yml`:

```yaml
updateMerchantAlias:
  handler: src/main/functions/merchants/updateMerchantAlias.handler
  events:
    - httpApi:
        path: /merchants/{cnpj}/alias
        method: PUT
        authorizer:
          name: CognitoAuthorizer
```

Rota pública omite o bloco `authorizer` inteiro. Se for o primeiro endpoint do módulo, crie o
arquivo e apende a linha em `serverless.yml` sob `functions:`.

## Fase 6 — Yaak

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

## Fase 7 — Verificar e revisar

```
pnpm typecheck
pnpm biome check
```

Depois despache o agent `module-reviewer` escopado aos arquivos deste slice.

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

## Armadilhas

- Nome de classe precisa ser único no app inteiro — `Registry` indexa por `impl.name`.
- `override` em `handle` é obrigatório (`noImplicitOverride`).
- O path param do `httpApi` tem que bater exatamente com a chave do `paramsSchema`.
- Erro novo exige código novo em `ErrorCode.ts` — avise antes de editar esse arquivo.
