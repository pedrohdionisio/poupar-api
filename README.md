> 🌎 [English](README.en.md) · **Português (Brasil)**

# poupar-api

API serverless do **Poupar** — app de controle de gastos de supermercado que transforma a foto de um
cupom fiscal em compra estruturada, com histórico de preço por produto e gasto por categoria.

Construída sobre AWS Lambda + API Gateway HTTP v2, DynamoDB single-table, Cognito, S3 e SQS, em
TypeScript estrito com Clean Architecture e injeção de dependências própria.

---

## Sumário

- [Principais funcionalidades](#principais-funcionalidades)
- [Stack](#stack)
- [Arquitetura](#arquitetura)
- [Fluxo de scan de cupom](#fluxo-de-scan-de-cupom)
- [Modelagem de dados](#modelagem-de-dados)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Pré-requisitos](#pré-requisitos)
- [Configuração local](#configuração-local)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Deploy](#deploy)
- [Scripts](#scripts)
- [Referência da API](#referência-da-api)
- [Tratamento de erros](#tratamento-de-erros)
- [Convenções de código](#convenções-de-código)
- [Infraestrutura provisionada](#infraestrutura-provisionada)
- [Licença](#licença)

---

## Principais funcionalidades

| Domínio | O que faz |
| --- | --- |
| **Auth** | Cadastro, login, refresh token e recuperação de senha via Cognito. `internalId` (ULID da conta) é injetado no JWT por um trigger `PreTokenGeneration` V2. |
| **Merchants** | CRUD dos estabelecimentos do usuário, com contadores agregados (`purchaseCount`, `totalSpentCents`, primeira/última compra). CNPJ é atributo opcional validado por dígito verificador — nunca chave. |
| **Scans** | Upload da foto do cupom por presigned POST, extração assíncrona via OpenAI, rascunho para revisão do usuário e confirmação que vira compra. |
| **Purchases** | Importação (manual ou vinda de scan), listagem por período, atualização e exclusão em cascata com estorno das projeções. |
| **Receipts** | Detalhe imutável dos itens de uma compra. |
| **Account Products** | Catálogo de produtos por conta, chaveado por `productKey` (`sha1` do nome normalizado), com categoria editável. |
| **Price Points** | Série temporal de preço por produto — quanto você pagou, quando e onde. |
| **Category Spends** | Agregado mensal de gasto por categoria de produto (mês em horário de Brasília). |

---

## Stack

| Camada | Tecnologia |
| --- | --- |
| Runtime | Node.js 22 (`nodejs22.x`) |
| Linguagem | TypeScript 6 em modo `strict` + `noImplicitOverride` |
| Compute | AWS Lambda (bundle por função via esbuild) |
| API | API Gateway HTTP API v2 + JWT authorizer (Cognito) |
| Banco | DynamoDB single-table, `PAY_PER_REQUEST`, PITR 35 dias, TTL nativo |
| Auth | Amazon Cognito User Pool (e-mail via SES) |
| Storage | S3 (presigned POST, lifecycle de 30 dias) |
| Fila | SQS + DLQ (3 tentativas) + alarme CloudWatch/SNS |
| IA | OpenAI Responses API (`gpt-5-mini` por padrão), com JSON Schema estruturado |
| Validação | Zod v4 |
| DI | Decorators próprios (`@Injectable`) + `reflect-metadata` |
| IaC | Serverless Framework v4 |
| Lint/Format | Biome 2 |
| Package manager | pnpm 11 |

---

## Arquitetura

Clean Architecture com quatro camadas e dependência sempre apontando para dentro:

```
main ──▶ application ──▶ entities
 │            │
 │            ▼
 └────────▶ infra ──▶ AWS SDK
              │
              ▼
            kernel (DI, decorators)
```

| Camada | Responsabilidade |
| --- | --- |
| `src/application` | Controllers, use cases, entidades, normalizadores, contratos e hierarquia de erros. Nenhum import do AWS SDK. |
| `src/infra` | Repositórios DynamoDB, Item mappers, gateways externos (Cognito, S3, OpenAI) e clients AWS. |
| `src/kernel` | Container de DI (`Registry`) e decorators (`@Injectable`, `@Schema`, `@AdminOnly`). |
| `src/main` | Entry points das Lambdas e adapters (`lambdaHttpAdapter`, `lambdaSQSAdapter`). Cada entry point tem no máximo 5 linhas. |
| `src/shared` | `AppConfig` (env validado por Zod), `Saga` para compensações e utilitários. |

### Injeção de dependências

O `Registry` é um container singleton que resolve o grafo por `design:paramtypes` — sem tokens
manuais. Basta anotar a classe:

```typescript
@Injectable()
export class CreateScanUseCase {
	constructor(
		private readonly scanRepository: ScanRepository,
		private readonly merchantRepository: MerchantRepository,
		private readonly fileStorageGateway: FileStorageGateway
	) {}
}
```

E resolver no entry point da Lambda:

```typescript
import 'reflect-metadata';

import { CreateScanController } from '@application/controllers/scans/CreateScanController';
import { Registry } from '@kernel/di/Registry';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';

const controller = Registry.getInstance().resolve(CreateScanController);

export const handler = lambdaHttpAdapter(controller);
```

> `import 'reflect-metadata'` precisa ser a **primeira linha** do arquivo — sem ela os decorators
> não registram os metadados de tipo.

### Validação declarativa

O decorator `@Schema` liga os schemas Zod à controller; o `lambdaHttpAdapter` traduz `ZodError` em
`400 VALIDATION` com a lista de campos inválidos.

```typescript
@Schema({ params: confirmScanParamsSchema, body: confirmScanBodySchema })
@Injectable()
export class ConfirmScanController extends Controller<'private', ConfirmScanController.Response> { }
```

---

## Fluxo de scan de cupom

O caminho da foto até a compra persistida é assíncrono e resiliente a retry:

```
┌──────────┐  1. POST /scans                    ┌────────────────────┐
│  Client  │ ─────────────────────────────────▶ │  createScan λ      │
│          │ ◀───── scanId + presigned POST ─── │  Scan: PENDING     │
└────┬─────┘                                    └────────────────────┘
     │ 2. POST multipart direto no S3 (scans/{accountId}/{scanId})
     ▼
┌──────────────┐  3. s3:ObjectCreated  ┌────────────┐   4. batchSize 1
│ UploadsBucket│ ────────────────────▶ │ ScansQueue │ ───────────────┐
└──────────────┘                       └─────┬──────┘                │
                                             │ 3 falhas              ▼
                                             ▼             ┌──────────────────────┐
                                        ┌──────────┐       │  processScan λ       │
                                        │ ScansDLQ │       │  180s / 1024 MB      │
                                        └────┬─────┘       └──────────┬───────────┘
                                             │ alarme SNS             │ 5. OpenAI
                                             ▼                        ▼
                                        ✉️  e-mail            ┌──────────────────┐
                                                              │ ocr/{...}.json   │
                                                              │ Scan: AWAITING_  │
                                                              │        REVIEW    │
                                                              └────────┬─────────┘
     ┌──────────┐  6. GET /scans/{scanId} → draft                      │
     │  Client  │ ◀────────────────────────────────────────────────────┘
     └────┬─────┘
          │ 7. POST /scans/{scanId}/confirm (draft revisado pelo usuário)
          ▼
   ┌────────────────────────────────────────────────────────────┐
   │ ImportPurchaseUseCase → TransactWrite                       │
   │ Purchase + Receipt + PurchaseDedupe + projeções             │
   │ Scan: DONE                                                  │
   └────────────────────────────────────────────────────────────┘
```

Pontos de projeto que valem destaque:

- **Idempotência do consumer.** `startProcessing` faz um update condicional; se a mensagem for
  entregue de novo enquanto o scan já está em `PROCESSING`, a execução retorna sem reprocessar.
- **Erro transitório × permanente.** Falha transitória é relançada para a SQS reentregar até
  `MAX_ATTEMPTS = 3`; falha permanente marca o scan como `FAILED` com `errorCode` semântico
  (`UNREADABLE_PHOTO`, `PARSE_FAILED`, `DUPLICATE_RECEIPT`, `INTERNAL_ERROR`).
- **Vocabulário do usuário no prompt.** Antes de chamar a IA, o use case carrega até 400
  `AccountProduct`s da conta e envia como `knownProducts`, para que a extração reaproveite os nomes
  e categorias já normalizados em vez de inventar variações.
- **Dedupe por chave de acesso.** A chave de 44 dígitos da NFC-e vira o item `ACCESS_KEY#`, gravado
  na mesma transação da compra com `attribute_not_exists(SK)` — reimportar o mesmo cupom devolve
  `409` com o `purchaseId` original.
- **Raw da IA preservado.** A resposta bruta é gravada em `ocr/{accountId}/{scanId}.json`, o que
  permite reprocessar ou auditar a extração depois.
- **TTL.** Scans expiram sozinhos em 30 dias (atributo `ttl`), e os objetos no S3 também.

---

## Modelagem de dados

Uma única tabela (`MainTable`) com três GSIs de projeção `ALL`. **Nada é global**: toda entidade
mora na partição da conta dona do dado, separada por prefixo de SK.

| Entidade | PK | SK |
| --- | --- | --- |
| `Account` | `ACCOUNTS` | `ACCOUNT#{accountId}` |
| `Merchant` | `ACCOUNT#{accountId}` | `MERCHANT#{merchantId}` |
| `Purchase` | `ACCOUNT#{accountId}` | `PURCHASE#{purchasedAt}#{purchaseId}` |
| `Receipt` | `ACCOUNT#{accountId}` | `RECEIPT#{purchaseId}` |
| `PurchaseDedupe` | `ACCOUNT#{accountId}` | `ACCESS_KEY#{chave44}` |
| `Scan` | `ACCOUNT#{accountId}` | `SCAN#{scanId}` |
| `AccountProduct` | `ACCOUNT#{accountId}` | `PRODUCT#{productKey}` |
| `CategorySpend` | `ACCOUNT#{accountId}` | `CATEGORY_SPEND#{month}#{category}` |
| `PricePoint` | `ACCOUNT#{accountId}#PRODUCT#{productKey}` | `PRICE#{purchasedAt}#{purchaseId}` |

**GSI1/GSI2** hoje projetam apenas `Account` (listagem por role e busca por e-mail). **GSI3** está
livre. Atributo de índice não usado é byte pago em toda escrita — só projete quando houver access
pattern que exija.

### Convenções

- **Data no SK é a data do fato** (`purchasedAt`, emissão da nota), nunca a de criação do registro.
  ISO 8601 UTC, então ordenação lexicográfica = ordenação cronológica e filtro por período é um
  `BETWEEN` numa Query só.
- **Dinheiro é inteiro em centavos** (sufixo `...Cents`). Quantidade fracionária é inteiro em
  milésimos (sufixo `...Milli`: `0,384 KG` → `384`) acompanhada do campo `unit`. Nenhum float.
- **`productKey` é `sha1(normalizedName)`** — 40 hex, sem prefixo, o que o mantém usável como path
  param. GTIN é atributo e âncora de matching, não chave.
- **Merchant é ULID**, criado pelo usuário antes da compra. O CNPJ é opcional.
- **Opcional é `| null`, não `| undefined`** — o `dynamoClient` roda com `removeUndefinedValues`, e
  atributo ausente não distingue "sem valor" de "campo novo".
- **Snapshots são propositais.** `merchantName` e `category` copiados na compra congelam o passado e
  evitam resolver referência na Query.
- **Soft delete só onde o volume é baixo** (Account, Merchant). Partição que cresce (Purchase,
  Receipt, PricePoint) usa delete real dentro da transação que estorna os contadores; jobs (Scan)
  usam TTL nativo.

O detalhamento completo está em [`.claude/rules/single-table.md`](.claude/rules/single-table.md).

---

## Estrutura de pastas

```
src/
├── application/
│   ├── contracts/          # Controller, IQueueConsumer
│   ├── controllers/        # HTTP handlers + schemas/ por módulo
│   ├── entities/           # domínio puro (Account, Purchase, Scan, ...)
│   ├── errors/             # http/ (status) e application/ (semânticos)
│   ├── normalizers/        # normalização de extração e de importação
│   ├── queues/             # consumers SQS
│   └── usecases/           # regra de negócio, um execute() por caso
├── infra/
│   ├── clients/            # singletons do AWS SDK
│   ├── database/dynamo/
│   │   ├── items/          # mappers entidade ↔ item (chaves, centavos)
│   │   └── repositories/   # comandos DynamoDB
│   ├── emails/             # templates React Email
│   └── gateways/           # Cognito, S3, OpenAI
├── kernel/
│   ├── decorators/         # Injectable, Schema, AdminOnly
│   └── di/Registry.ts
├── main/
│   ├── adapters/           # lambdaHttpAdapter, lambdaSQSAdapter
│   └── functions/          # entry points, agrupados por domínio
└── shared/                 # AppConfig, Saga, utils, types

sls/
├── config/                 # env.yml, role.yml
├── functions/              # definição das Lambdas por domínio
└── resources/              # UserPool, MainTable, ScansQueue, UploadsBucket, domínio
```

---

## Pré-requisitos

- Node.js 22+
- pnpm 11+ (`corepack enable`)
- Conta AWS com credenciais configuradas (`aws configure` ou variáveis de ambiente)
- Serverless Framework v4 CLI autenticado (`npm i -g serverless && serverless login`)
- Uma chave da API da OpenAI
- Um domínio verificado no SES na região do deploy (o Cognito envia e-mails com
  `EmailSendingAccount: DEVELOPER`)

---

## Configuração local

```bash
git clone <repo-url> poupar-api
cd poupar-api
pnpm install
cp .env.example .env
```

Preencha o `.env` (veja a tabela abaixo) e valide o projeto:

```bash
pnpm typecheck
pnpm biome check
```

> Não há emulação local do stack (LocalStack/serverless-offline). O ciclo de desenvolvimento é
> `serverless deploy` num stage próprio — por exemplo `--stage pedro`.

---

## Variáveis de ambiente

### `.env` — consumido pelo CloudFormation no momento do deploy

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `COGNITO_EMAILS_FROM` | sim | Remetente dos e-mails do User Pool (`Nome <no-reply@dominio>`). |
| `COGNITO_EMAILS_REPLY_TO` | sim | Endereço de reply-to. |
| `SES_ARN` | sim | ARN da identidade verificada no SES. |
| `API_DOMAIN` | não | Domínio customizado da API. Se vazio, o custom domain não é criado. |
| `ROUTE_53_HOSTED_ZONE_ID` | não | Hosted zone para o certificado ACM e o registro A. Exigido junto de `API_DOMAIN`. |
| `DISABLE_DEFAULT_APIGW_ENDPOINT` | não | `true` desliga o endpoint `execute-api` padrão (use com custom domain). |
| `DLQ_ALARM_EMAIL` | não | E-mail inscrito no tópico SNS do alarme da DLQ. Se vazio, alarme e tópico não são criados. |
| `OPENAI_API_KEY` | fallback | Fallback do SSM (veja abaixo). |
| `OPENAI_MODEL` | não | Padrão `gpt-5-mini`. |

### Runtime das Lambdas — resolvido em `sls/config/env.yml`

Injetadas pelo CloudFormation a partir dos recursos criados; validadas em boot por
[`src/shared/config/env.ts`](src/shared/config/env.ts), que derruba a função se alguma faltar.

| Variável | Origem |
| --- | --- |
| `COGNITO_CLIENT_ID` / `COGNITO_CLIENT_SECRET` / `COGNITO_POOL_ID` | `UserPool` / `UserPoolClient` |
| `MAIN_TABLE_NAME` | `MainTable` |
| `UPLOADS_BUCKET_NAME` | `UploadsBucket` |
| `OPENAI_API_KEY` | SSM `/poupar/{stage}/openai-api-key`, com fallback para a env do deploy |
| `OPENAI_MODEL` | env do deploy, padrão `gpt-5-mini` |

Crie o parâmetro SSM antes do primeiro deploy:

```bash
aws ssm put-parameter \
  --name /poupar/dev/openai-api-key \
  --type SecureString \
  --value "sk-..." \
  --region sa-east-1
```

---

## Deploy

```bash
# stage padrão (dev), região sa-east-1
serverless deploy

# stage nomeado
serverless deploy --stage prod

# uma função só, após a stack existir
serverless deploy function --function processScan
```

Logs e invocação:

```bash
serverless logs --function processScan --tail
serverless invoke --function listMerchants --log
```

> **Atenção:** `MainTable` e o `UserPool` têm proteção contra exclusão ativada
> (`DeletionProtectionEnabled` / `DeletionProtection: ACTIVE`). `serverless remove` falha enquanto
> a proteção estiver ligada — desative manualmente e de forma consciente antes de destruir um stage.

O trigger `preTokenGeneration` é configurado **manualmente** no `UserPool.yml` para usar o evento
V2. Não renomeie a função `preTokenGenerationTrigger` sem ajustar o `LambdaArn` correspondente.

---

## Scripts

| Comando | O que faz |
| --- | --- |
| `pnpm typecheck` | `tsc --noEmit` sobre todo o projeto. |
| `pnpm biome check` | Lint + formatação + organização de imports. Rode antes de finalizar qualquer alteração. |
| `pnpm biome check --write` | Aplica as correções automáticas. |

Utilitários em [`scripts/`](scripts/) (rode com um runner de TypeScript, ex.: `npx tsx`):

```bash
# popula a tabela com o seed
MAIN_TABLE_NAME=poupar-api-dev-MainTable npx tsx scripts/seedDynamo.ts seed/mainTable.seed.json

# exercita o fluxo completo de scan contra um stage já deployado
API_URL=https://api.exemplo.com EMAIL=... PASSWORD=... node scripts/test-scan-upload.mjs
```

`test-scan-upload.mjs` lê `.env` e aceita `--negative`, `--dlq`, `--reupload` e `--confirm` para
exercitar os caminhos de erro, a DLQ, o reupload e a confirmação da compra. Alternativamente,
defina `ACCESS_TOKEN` para pular o login.

---

## Referência da API

Base URL: `https://{apiId}.execute-api.sa-east-1.amazonaws.com` ou o `API_DOMAIN` configurado.

Rotas privadas exigem `Authorization: Bearer <accessToken>`; o `accountId` é extraído do claim
`internalId` do JWT — nunca do payload da request.

### Auth — público

| Método | Rota | Corpo |
| --- | --- | --- |
| `POST` | `/auth/sign-up` | `{ name, email, password, role }` |
| `POST` | `/auth/sign-in` | `{ email, password }` |
| `POST` | `/auth/refresh-token` | `{ refreshToken }` |
| `POST` | `/auth/forgot-password` | `{ email }` |
| `POST` | `/auth/reset-password` | `{ email, code, password }` |

### Accounts

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/accounts/me` | Dados da conta autenticada. |
| `GET` | `/accounts` | Lista contas (restrito a admin). |
| `PUT` | `/accounts/{accountId}` | Atualiza nome e role. |
| `DELETE` | `/accounts/{accountId}` | Remove a conta e o usuário no Cognito. |

### Merchants

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/merchants` | Lista os estabelecimentos da conta. |
| `POST` | `/merchants` | Cria — `{ name, category, cnpj? }`. |
| `GET` | `/merchants/{merchantId}` | Detalhe com contadores agregados. |
| `PUT` | `/merchants/{merchantId}` | Atualiza. |
| `DELETE` | `/merchants/{merchantId}` | Remove. |

### Scans

| Método | Rota | Descrição |
| --- | --- | --- |
| `POST` | `/scans` | `{ merchantId, contentType }` → `{ scanId, uploadSignature: { url, fields } }`. Presigned POST válido por 5 min, até 10 MB, `image/jpeg` ou `image/png`. |
| `GET` | `/scans` | Lista scans; filtros `status` e `limit` (≤ 100). |
| `GET` | `/scans/{scanId}` | Status atual e, em `AWAITING_REVIEW`, o `draft` extraído. |
| `POST` | `/scans/{scanId}/confirm` | Confirma o draft revisado e cria a compra. Só aceita scan em `AWAITING_REVIEW`. |

Estados do scan: `PENDING → PROCESSING → AWAITING_REVIEW → DONE`, com `FAILED` como terminal
alternativo.

### Purchases

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/purchases` | Lista por período; `from` e `to` (ISO datetime) andam juntos, `limit` ≤ 100. |
| `POST` | `/purchases/import` | Importa uma compra completa com seus itens. |
| `PUT` | `/purchases/{purchasedAt}/{purchaseId}` | Atualiza a compra. |
| `DELETE` | `/purchases/{purchasedAt}/{purchaseId}` | Exclui em cascata e estorna as projeções. |

> `purchasedAt` faz parte da rota porque é parte do SK — sem ele não há Query direta pelo item.

### Receipts, produtos e análises

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/purchases/{purchaseId}/receipt` | Itens do cupom da compra. |
| `GET` | `/account-products` | Catálogo de produtos da conta. |
| `PATCH` | `/account-products/{productKey}/category` | Recategoriza um produto — `{ category }`. |
| `GET` | `/price-points?productKey=<sha1>` | Histórico de preço do produto. |
| `GET` | `/category-spends?from=YYYY-MM&to=YYYY-MM` | Gasto mensal por categoria. |

### Exemplo — ciclo completo do scan

```bash
# 1. cria o scan e recebe o presigned POST
curl -X POST "$API_URL/scans" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"merchantId":"01JQ...","contentType":"image/jpeg"}'

# 2. sobe a foto direto no S3 com os campos devolvidos
curl -X POST "$UPLOAD_URL" \
  -F key=... -F Content-Type=image/jpeg -F policy=... -F x-amz-signature=... \
  -F file=@cupom.jpg

# 3. consulta até virar AWAITING_REVIEW
curl "$API_URL/scans/$SCAN_ID" -H "Authorization: Bearer $TOKEN"

# 4. confirma o draft revisado
curl -X POST "$API_URL/scans/$SCAN_ID/confirm" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"purchasedAt":"2026-08-31T18:20:00.000Z","totalCents":18790,"items":[...]}'
```

---

## Tratamento de erros

Toda falha sai no mesmo envelope:

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Merchant not found.",
    "details": { "purchaseId": "01JQ..." }
  }
}
```

Erros de validação trazem `message` como lista de campos:

```json
{
  "error": {
    "code": "VALIDATION",
    "message": [{ "field": "items.0.totalCents", "error": "Invalid input" }]
  }
}
```

A hierarquia separa protocolo de domínio:

```
Error
├── HttpError (abstrato)        → BadRequest 400, Unauthorized 401, Forbbiden 403, Conflict 409
└── ApplicationError (abstrato) → ResourceNotFound, ResourceAlreadyExists, EmailAlreadyInUse,
                                  InvalidCredentials, InvalidRefreshToken, ReceiptAlreadyImported,
                                  ReceiptExtractionFailed, ReceiptNotParsed, FileNotFound, ...
```

Todo código vive no enum `ErrorCode` — nunca crie string de código solta. Erros de domínio nunca são
`throw new Error(...)` genérico.

---

## Convenções de código

- `@Injectable()` em toda classe registrada no container.
- Tipos relacionados a uma classe ficam no `namespace` exportado do mesmo arquivo
  (`UseCase.Input`, `UseCase.Output`, `Repository.GetByIdParams`).
- Path aliases: `@application/*`, `@infra/*`, `@kernel/*`, `@main/*`, `@shared/*`.
- IDs são **ULID**, nunca UUID.
- Um schema Zod por endpoint, em `schemas/<verbo><Entidade>Schema.ts`; o tipo inferido é sempre
  exportado e é ele que tipa `Controller.Request`.
- Use cases expõem um único método público `execute(input)`.
- Repositórios devolvem `null` quando não encontram — não lançam.
- Item mappers são o único lugar que conhece prefixo de chave e conversão de centavos.
- Sem `console.log` — apenas `console.error` em adapters Lambda.
- Formatação Biome: tabs, aspas simples, sem trailing comma, semicolons obrigatórios.
- Nada de comentário que descreva o que o código já diz, nem abstração antecipando requisito
  hipotético.

As regras completas por tipo de arquivo estão em [`.claude/rules/`](.claude/rules/):
[entities](.claude/rules/entities.md) ·
[items](.claude/rules/items.md) ·
[repositories](.claude/rules/repositories.md) ·
[gateways](.claude/rules/gateways.md) ·
[usecases](.claude/rules/usecases.md) ·
[controllers](.claude/rules/controllers.md) ·
[schemas](.claude/rules/schemas.md) ·
[errors](.claude/rules/errors.md) ·
[queues](.claude/rules/queues.md) ·
[lambda-functions](.claude/rules/lambda-functions.md) ·
[single-table](.claude/rules/single-table.md)

---

## Infraestrutura provisionada

| Recurso | Detalhes |
| --- | --- |
| `MainTable` | DynamoDB `PAY_PER_REQUEST`, GSI1/GSI2/GSI3 com projeção `ALL`, PITR 35 dias, TTL no atributo `ttl`, deletion protection. |
| `UserPool` / `UserPoolClient` | Login por e-mail, senha mínima de 8 caracteres, atributo custom `internalId`, access token de 24 h, refresh token com rotação, secret gerado. |
| `UploadsBucket` | Criptografia AES256, acesso público bloqueado, `BucketOwnerEnforced`, expiração de 30 dias em `scans/` e `ocr/`, notificação `ObjectCreated` para a SQS no prefixo `scans/`. |
| `ScansQueue` / `ScansDLQ` | Visibility timeout 240 s, retenção 14 dias, redrive após 3 tentativas; alarme CloudWatch + SNS quando a DLQ deixa de estar vazia. |
| `APIGWCustomDomain` | Certificado ACM validado por DNS, domain name regional TLS 1.2 e registro A no Route 53 — criados somente se `API_DOMAIN` e `ROUTE_53_HOSTED_ZONE_ID` estiverem definidos. |

A role de execução é mínima e explícita ([`sls/config/role.yml`](sls/config/role.yml)): CRUD na
tabela e seus índices, `AdminDeleteUser`/`AdminAddUserToGroup` no User Pool, leitura e escrita em
`scans/*` e escrita em `ocr/*`.

---

## Licença

ISC.
