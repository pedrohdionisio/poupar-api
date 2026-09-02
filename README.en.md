> 🌎 **English** · [Português (Brasil)](README.md)

# poupar-api

Serverless API for **Poupar** — a grocery spending tracker that turns a photo of a receipt into a
structured purchase, with per-product price history and spending broken down by category.

Built on AWS Lambda + API Gateway HTTP v2, a DynamoDB single table, Cognito, S3 and SQS, in strict
TypeScript with Clean Architecture and a hand-rolled dependency injection container.

---

## Table of contents

- [Features](#features)
- [Stack](#stack)
- [Architecture](#architecture)
- [Receipt scan flow](#receipt-scan-flow)
- [Data model](#data-model)
- [Project layout](#project-layout)
- [Prerequisites](#prerequisites)
- [Local setup](#local-setup)
- [Environment variables](#environment-variables)
- [Deploy](#deploy)
- [Scripts](#scripts)
- [API reference](#api-reference)
- [Error handling](#error-handling)
- [Code conventions](#code-conventions)
- [Provisioned infrastructure](#provisioned-infrastructure)
- [License](#license)

---

## Features

| Domain | What it does |
| --- | --- |
| **Auth** | Sign-up, sign-in, refresh token and password recovery through Cognito. The account's `internalId` (a ULID) is injected into the JWT by a `PreTokenGeneration` V2 trigger. |
| **Merchants** | CRUD for the user's stores, with aggregated counters (`purchaseCount`, `totalSpentCents`, first/last purchase). The CNPJ (Brazilian tax ID) is an optional attribute validated by its check digits — never a key. |
| **Scans** | Receipt photo upload via presigned POST, asynchronous extraction through OpenAI, a draft for the user to review, and a confirmation step that turns it into a purchase. |
| **Purchases** | Import (manual or from a scan), listing by period, updates, and cascading deletes that roll back every projection. |
| **Receipts** | Immutable line-item detail of a purchase. |
| **Account Products** | Per-account product catalog keyed by `productKey` (`sha1` of the normalized name), with an editable category. |
| **Price Points** | Per-product price time series — what you paid, when, and where. |
| **Category Spends** | Monthly spending aggregate per product category (months computed in Brasília time). |

---

## Stack

| Layer | Technology |
| --- | --- |
| Runtime | Node.js 22 (`nodejs22.x`) |
| Language | TypeScript 6, `strict` + `noImplicitOverride` |
| Compute | AWS Lambda (per-function bundles via esbuild) |
| API | API Gateway HTTP API v2 + Cognito JWT authorizer |
| Database | DynamoDB single table, `PAY_PER_REQUEST`, 35-day PITR, native TTL |
| Auth | Amazon Cognito User Pool (email through SES) |
| Storage | S3 (presigned POST, 30-day lifecycle) |
| Queue | SQS + DLQ (3 attempts) + CloudWatch/SNS alarm |
| AI | OpenAI Responses API (`gpt-5-mini` by default) with a structured JSON Schema |
| Validation | Zod v4 |
| DI | Custom decorators (`@Injectable`) + `reflect-metadata` |
| IaC | Serverless Framework v4 |
| Lint/Format | Biome 2 |
| Package manager | pnpm 11 |

---

## Architecture

Clean Architecture across four layers, with dependencies always pointing inward:

```
main ──▶ application ──▶ entities
 │            │
 │            ▼
 └────────▶ infra ──▶ AWS SDK
              │
              ▼
            kernel (DI, decorators)
```

| Layer | Responsibility |
| --- | --- |
| `src/application` | Controllers, use cases, entities, normalizers, contracts and the error hierarchy. No AWS SDK imports. |
| `src/infra` | DynamoDB repositories, Item mappers, external gateways (Cognito, S3, OpenAI) and AWS clients. |
| `src/kernel` | DI container (`Registry`) and decorators (`@Injectable`, `@Schema`, `@AdminOnly`). |
| `src/main` | Lambda entry points and adapters (`lambdaHttpAdapter`, `lambdaSQSAdapter`). Every entry point is 5 lines or fewer. |
| `src/shared` | `AppConfig` (env validated by Zod), a `Saga` helper for compensations, and utilities. |

### Dependency injection

`Registry` is a singleton container that resolves the graph from `design:paramtypes` — no manual
tokens. Annotating the class is enough:

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

And resolving it in the Lambda entry point:

```typescript
import 'reflect-metadata';

import { CreateScanController } from '@application/controllers/scans/CreateScanController';
import { Registry } from '@kernel/di/Registry';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';

const controller = Registry.getInstance().resolve(CreateScanController);

export const handler = lambdaHttpAdapter(controller);
```

> `import 'reflect-metadata'` must be the **first line** of the file — without it the decorators
> never register the type metadata.

### Declarative validation

The `@Schema` decorator binds Zod schemas to the controller; `lambdaHttpAdapter` translates a
`ZodError` into `400 VALIDATION` with the list of offending fields.

```typescript
@Schema({ params: confirmScanParamsSchema, body: confirmScanBodySchema })
@Injectable()
export class ConfirmScanController extends Controller<'private', ConfirmScanController.Response> { }
```

---

## Receipt scan flow

The path from photo to persisted purchase is asynchronous and retry-safe:

```
┌──────────┐  1. POST /scans                    ┌────────────────────┐
│  Client  │ ─────────────────────────────────▶ │  createScan λ      │
│          │ ◀───── scanId + presigned POST ─── │  Scan: PENDING     │
└────┬─────┘                                    └────────────────────┘
     │ 2. multipart POST straight to S3 (scans/{accountId}/{scanId})
     ▼
┌──────────────┐  3. s3:ObjectCreated  ┌────────────┐   4. batchSize 1
│ UploadsBucket│ ────────────────────▶ │ ScansQueue │ ───────────────┐
└──────────────┘                       └─────┬──────┘                │
                                             │ 3 failures            ▼
                                             ▼             ┌──────────────────────┐
                                        ┌──────────┐       │  processScan λ       │
                                        │ ScansDLQ │       │  180s / 1024 MB      │
                                        └────┬─────┘       └──────────┬───────────┘
                                             │ SNS alarm              │ 5. OpenAI
                                             ▼                        ▼
                                        ✉️  email             ┌──────────────────┐
                                                              │ ocr/{...}.json   │
                                                              │ Scan: AWAITING_  │
                                                              │        REVIEW    │
                                                              └────────┬─────────┘
     ┌──────────┐  6. GET /scans/{scanId} → draft                      │
     │  Client  │ ◀────────────────────────────────────────────────────┘
     └────┬─────┘
          │ 7. POST /scans/{scanId}/confirm (draft reviewed by the user)
          ▼
   ┌────────────────────────────────────────────────────────────┐
   │ ImportPurchaseUseCase → TransactWrite                       │
   │ Purchase + Receipt + PurchaseDedupe + projections           │
   │ Scan: DONE                                                  │
   └────────────────────────────────────────────────────────────┘
```

Design points worth calling out:

- **Idempotent consumer.** `startProcessing` issues a conditional update; if the message is
  redelivered while the scan is already `PROCESSING`, the execution returns without reprocessing.
- **Transient vs. permanent failures.** A transient failure is rethrown so SQS redelivers up to
  `MAX_ATTEMPTS = 3`; a permanent one marks the scan `FAILED` with a semantic `errorCode`
  (`UNREADABLE_PHOTO`, `PARSE_FAILED`, `DUPLICATE_RECEIPT`, `INTERNAL_ERROR`).
- **The user's vocabulary goes into the prompt.** Before calling the model, the use case loads up to
  400 of the account's `AccountProduct`s and sends them as `knownProducts`, so extraction reuses
  names and categories that were already normalized instead of inventing new variants.
- **Deduplication by access key.** The NFC-e's 44-character access key becomes an `ACCESS_KEY#`
  item, written in the same transaction as the purchase under `attribute_not_exists(SK)` —
  re-importing the same receipt returns `409` carrying the original `purchaseId`.
- **The raw model output is preserved.** The unparsed response is stored at
  `ocr/{accountId}/{scanId}.json`, which makes reprocessing or auditing an extraction possible later.
- **TTL.** Scans expire on their own after 30 days (the `ttl` attribute), and so do the S3 objects.

---

## Data model

A single table (`MainTable`) with three GSIs projecting `ALL`. **Nothing is global**: every entity
lives in the partition of the account that owns it, separated by an SK prefix.

| Entity | PK | SK |
| --- | --- | --- |
| `Account` | `ACCOUNTS` | `ACCOUNT#{accountId}` |
| `Merchant` | `ACCOUNT#{accountId}` | `MERCHANT#{merchantId}` |
| `Purchase` | `ACCOUNT#{accountId}` | `PURCHASE#{purchasedAt}#{purchaseId}` |
| `Receipt` | `ACCOUNT#{accountId}` | `RECEIPT#{purchaseId}` |
| `PurchaseDedupe` | `ACCOUNT#{accountId}` | `ACCESS_KEY#{key44}` |
| `Scan` | `ACCOUNT#{accountId}` | `SCAN#{scanId}` |
| `AccountProduct` | `ACCOUNT#{accountId}` | `PRODUCT#{productKey}` |
| `CategorySpend` | `ACCOUNT#{accountId}` | `CATEGORY_SPEND#{month}#{category}` |
| `PricePoint` | `ACCOUNT#{accountId}#PRODUCT#{productKey}` | `PRICE#{purchasedAt}#{purchaseId}` |

**GSI1/GSI2** currently project only `Account` (listing by role and lookup by email). **GSI3** is
free. An index attribute nobody reads is a byte paid on every write — only project when an access
pattern demands it.

### Conventions

- **The date in the SK is the date of the fact** (`purchasedAt`, when the receipt was issued), never
  when the record was created. ISO 8601 in UTC, so lexicographic order equals chronological order
  and any period filter collapses into a single `BETWEEN` query.
- **Money is an integer in cents** (`...Cents` suffix). Fractional quantities are integers in
  thousandths (`...Milli` suffix: `0.384 KG` → `384`) alongside a `unit` field. No floats anywhere.
- **`productKey` is `sha1(normalizedName)`** — 40 hex characters, no prefix, which keeps it usable
  as a path parameter. The GTIN is an attribute and a matching anchor, not a key.
- **A merchant is a ULID**, created by the user before the purchase. The CNPJ is optional.
- **Optional means `| null`, not `| undefined`** — `dynamoClient` runs with `removeUndefinedValues`,
  and a missing attribute cannot distinguish "no value" from "new field".
- **Snapshots are deliberate.** `merchantName` and `category` copied onto the purchase freeze the
  past and avoid resolving a reference at query time.
- **Soft deletes only where volume is low** (Account, Merchant). Growing partitions (Purchase,
  Receipt, PricePoint) use hard deletes inside the transaction that rolls back the derived counters;
  jobs (Scan) use native TTL.

The full write-up lives in [`.claude/rules/single-table.md`](.claude/rules/single-table.md)
(Portuguese).

---

## Project layout

```
src/
├── application/
│   ├── contracts/          # Controller, IQueueConsumer
│   ├── controllers/        # HTTP handlers + per-module schemas/
│   ├── entities/           # pure domain (Account, Purchase, Scan, ...)
│   ├── errors/             # http/ (status codes) and application/ (semantic)
│   ├── normalizers/        # extraction and import normalization
│   ├── queues/             # SQS consumers
│   └── usecases/           # business rules, one execute() per case
├── infra/
│   ├── clients/            # AWS SDK singletons
│   ├── database/dynamo/
│   │   ├── items/          # entity ↔ item mappers (keys, cents)
│   │   └── repositories/   # DynamoDB commands
│   ├── emails/             # React Email templates
│   └── gateways/           # Cognito, S3, OpenAI
├── kernel/
│   ├── decorators/         # Injectable, Schema, AdminOnly
│   └── di/Registry.ts
├── main/
│   ├── adapters/           # lambdaHttpAdapter, lambdaSQSAdapter
│   └── functions/          # entry points, grouped by domain
└── shared/                 # AppConfig, Saga, utils, types

sls/
├── config/                 # env.yml, role.yml
├── functions/              # Lambda definitions per domain
└── resources/              # UserPool, MainTable, ScansQueue, UploadsBucket, custom domain
```

---

## Prerequisites

- Node.js 22+
- pnpm 11+ (`corepack enable`)
- An AWS account with configured credentials (`aws configure` or environment variables)
- The Serverless Framework v4 CLI, authenticated (`npm i -g serverless && serverless login`)
- An OpenAI API key
- A domain verified in SES in the deploy region (Cognito sends email with
  `EmailSendingAccount: DEVELOPER`)

---

## Local setup

```bash
git clone <repo-url> poupar-api
cd poupar-api
pnpm install
cp .env.example .env
```

Fill in `.env` (see the table below) and validate the project:

```bash
pnpm typecheck
pnpm biome check
```

> There is no local emulation of the stack (no LocalStack, no serverless-offline). The development
> loop is `serverless deploy` into your own stage — for example `--stage pedro`.

---

## Environment variables

### `.env` — consumed by CloudFormation at deploy time

| Variable | Required | Description |
| --- | --- | --- |
| `COGNITO_EMAILS_FROM` | yes | Sender for User Pool emails (`Name <no-reply@domain>`). |
| `COGNITO_EMAILS_REPLY_TO` | yes | Reply-to address. |
| `SES_ARN` | yes | ARN of the verified SES identity. |
| `API_DOMAIN` | no | Custom API domain. Left empty, the custom domain is not created. |
| `ROUTE_53_HOSTED_ZONE_ID` | no | Hosted zone for the ACM certificate and the A record. Required alongside `API_DOMAIN`. |
| `DISABLE_DEFAULT_APIGW_ENDPOINT` | no | `true` disables the default `execute-api` endpoint (use with a custom domain). |
| `DLQ_ALARM_EMAIL` | no | Email subscribed to the DLQ alarm's SNS topic. Left empty, neither alarm nor topic is created. |
| `OPENAI_API_KEY` | fallback | Fallback for SSM (see below). |
| `OPENAI_MODEL` | no | Defaults to `gpt-5-mini`. |

### Lambda runtime — resolved in `sls/config/env.yml`

Injected by CloudFormation from the created resources, and validated at boot by
[`src/shared/config/env.ts`](src/shared/config/env.ts), which fails the function if any is missing.

| Variable | Source |
| --- | --- |
| `COGNITO_CLIENT_ID` / `COGNITO_CLIENT_SECRET` / `COGNITO_POOL_ID` | `UserPool` / `UserPoolClient` |
| `MAIN_TABLE_NAME` | `MainTable` |
| `UPLOADS_BUCKET_NAME` | `UploadsBucket` |
| `OPENAI_API_KEY` | SSM `/poupar/{stage}/openai-api-key`, falling back to the deploy-time env |
| `OPENAI_MODEL` | deploy-time env, defaults to `gpt-5-mini` |

Create the SSM parameter before the first deploy:

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
# default stage (dev), region sa-east-1
serverless deploy

# named stage
serverless deploy --stage prod

# a single function, once the stack exists
serverless deploy function --function processScan
```

Logs and invocation:

```bash
serverless logs --function processScan --tail
serverless invoke --function listMerchants --log
```

> **Heads up:** `MainTable` and the `UserPool` have deletion protection enabled
> (`DeletionProtectionEnabled` / `DeletionProtection: ACTIVE`). `serverless remove` fails while that
> protection is on — disable it manually and deliberately before tearing a stage down.

The `preTokenGeneration` trigger is wired **manually** in `UserPool.yml` so it can use the V2 event.
Do not rename the `preTokenGenerationTrigger` function without updating the matching `LambdaArn`.

---

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm typecheck` | `tsc --noEmit` across the project. |
| `pnpm biome check` | Lint + formatting + import organization. Run it before wrapping up any change. |
| `pnpm biome check --write` | Applies the automatic fixes. |

Utilities in [`scripts/`](scripts/) (run them through a TypeScript runner, e.g. `npx tsx`):

```bash
# seed the table
MAIN_TABLE_NAME=poupar-api-dev-MainTable npx tsx scripts/seedDynamo.ts seed/mainTable.seed.json

# exercise the full scan flow against an already deployed stage
API_URL=https://api.example.com EMAIL=... PASSWORD=... node scripts/test-scan-upload.mjs
```

`test-scan-upload.mjs` reads `.env` and accepts `--negative`, `--dlq`, `--reupload` and `--confirm`
to exercise the failure paths, the DLQ, re-uploading and purchase confirmation. Alternatively, set
`ACCESS_TOKEN` to skip the login step.

---

## API reference

Base URL: `https://{apiId}.execute-api.sa-east-1.amazonaws.com`, or the configured `API_DOMAIN`.

Private routes require `Authorization: Bearer <accessToken>`; `accountId` is read from the JWT's
`internalId` claim — never from the request payload.

### Auth — public

| Method | Route | Body |
| --- | --- | --- |
| `POST` | `/auth/sign-up` | `{ name, email, password, role }` |
| `POST` | `/auth/sign-in` | `{ email, password }` |
| `POST` | `/auth/refresh-token` | `{ refreshToken }` |
| `POST` | `/auth/forgot-password` | `{ email }` |
| `POST` | `/auth/reset-password` | `{ email, code, password }` |

### Accounts

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/accounts/me` | The authenticated account. |
| `GET` | `/accounts` | Lists accounts (admin only). |
| `PUT` | `/accounts/{accountId}` | Updates name and role. |
| `DELETE` | `/accounts/{accountId}` | Deletes the account and its Cognito user. |

### Merchants

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/merchants` | Lists the account's merchants. |
| `POST` | `/merchants` | Creates one — `{ name, category, cnpj? }`. |
| `GET` | `/merchants/{merchantId}` | Detail, including aggregated counters. |
| `PUT` | `/merchants/{merchantId}` | Updates. |
| `DELETE` | `/merchants/{merchantId}` | Deletes. |

### Scans

| Method | Route | Description |
| --- | --- | --- |
| `POST` | `/scans` | `{ merchantId, contentType }` → `{ scanId, uploadSignature: { url, fields } }`. The presigned POST is valid for 5 minutes, up to 10 MB, `image/jpeg` or `image/png`. |
| `GET` | `/scans` | Lists scans; `status` and `limit` (≤ 100) filters. |
| `GET` | `/scans/{scanId}` | Current status and, in `AWAITING_REVIEW`, the extracted `draft`. |
| `POST` | `/scans/{scanId}/confirm` | Confirms the reviewed draft and creates the purchase. Only accepts a scan in `AWAITING_REVIEW`. |

Scan states: `PENDING → PROCESSING → AWAITING_REVIEW → DONE`, with `FAILED` as the alternative
terminal state.

### Purchases

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/purchases` | Lists by period; `from` and `to` (ISO datetime) travel together, `limit` ≤ 100. |
| `POST` | `/purchases/import` | Imports a complete purchase with its line items. |
| `PUT` | `/purchases/{purchasedAt}/{purchaseId}` | Updates the purchase. |
| `DELETE` | `/purchases/{purchasedAt}/{purchaseId}` | Deletes it in cascade and rolls back the projections. |

> `purchasedAt` is part of the route because it is part of the SK — without it there is no direct
> query for the item.

### Receipts, products and analytics

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/purchases/{purchaseId}/receipt` | The purchase's receipt line items. |
| `GET` | `/account-products` | The account's product catalog. |
| `PATCH` | `/account-products/{productKey}/category` | Recategorizes a product — `{ category }`. |
| `GET` | `/price-points?productKey=<sha1>` | Price history for a product. |
| `GET` | `/category-spends?from=YYYY-MM&to=YYYY-MM` | Monthly spending per category. |

### Example — the full scan cycle

```bash
# 1. create the scan and receive the presigned POST
curl -X POST "$API_URL/scans" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"merchantId":"01JQ...","contentType":"image/jpeg"}'

# 2. upload the photo straight to S3 with the returned fields
curl -X POST "$UPLOAD_URL" \
  -F key=... -F Content-Type=image/jpeg -F policy=... -F x-amz-signature=... \
  -F file=@receipt.jpg

# 3. poll until it reaches AWAITING_REVIEW
curl "$API_URL/scans/$SCAN_ID" -H "Authorization: Bearer $TOKEN"

# 4. confirm the reviewed draft
curl -X POST "$API_URL/scans/$SCAN_ID/confirm" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"purchasedAt":"2026-08-31T18:20:00.000Z","totalCents":18790,"items":[...]}'
```

---

## Error handling

Every failure comes back in the same envelope:

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Merchant not found.",
    "details": { "purchaseId": "01JQ..." }
  }
}
```

Validation errors carry `message` as a list of fields:

```json
{
  "error": {
    "code": "VALIDATION",
    "message": [{ "field": "items.0.totalCents", "error": "Invalid input" }]
  }
}
```

The hierarchy keeps protocol and domain apart:

```
Error
├── HttpError (abstract)        → BadRequest 400, Unauthorized 401, Forbbiden 403, Conflict 409
└── ApplicationError (abstract) → ResourceNotFound, ResourceAlreadyExists, EmailAlreadyInUse,
                                  InvalidCredentials, InvalidRefreshToken, ReceiptAlreadyImported,
                                  ReceiptExtractionFailed, ReceiptNotParsed, FileNotFound, ...
```

Every code lives in the `ErrorCode` enum — never invent a loose code string. Domain errors are never
a generic `throw new Error(...)`.

---

## Code conventions

- `@Injectable()` on every class registered in the container.
- Types belonging to a class live in the exported `namespace` in the same file (`UseCase.Input`,
  `UseCase.Output`, `Repository.GetByIdParams`).
- Path aliases: `@application/*`, `@infra/*`, `@kernel/*`, `@main/*`, `@shared/*`.
- IDs are **ULIDs**, never UUIDs.
- One Zod schema per endpoint, in `schemas/<verb><Entity>Schema.ts`; the inferred type is always
  exported, and it is what types `Controller.Request`.
- Use cases expose a single public method, `execute(input)`.
- Repositories return `null` when nothing is found — they do not throw.
- Item mappers are the only place that knows about key prefixes and cent conversion.
- No `console.log` — only `console.error`, and only in Lambda adapters.
- Biome formatting: tabs, single quotes, no trailing commas, semicolons required.
- No comments restating what the code already says, and no abstractions built for hypothetical
  requirements.

The complete per-file-type rules live in [`.claude/rules/`](.claude/rules/) (Portuguese):
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

## Provisioned infrastructure

| Resource | Details |
| --- | --- |
| `MainTable` | DynamoDB `PAY_PER_REQUEST`, GSI1/GSI2/GSI3 projecting `ALL`, 35-day PITR, TTL on the `ttl` attribute, deletion protection. |
| `UserPool` / `UserPoolClient` | Email login, 8-character minimum password, custom `internalId` attribute, 24 h access token, refresh token rotation, generated client secret. |
| `UploadsBucket` | AES256 encryption, public access blocked, `BucketOwnerEnforced`, 30-day expiration on `scans/` and `ocr/`, `ObjectCreated` notification to SQS on the `scans/` prefix. |
| `ScansQueue` / `ScansDLQ` | 240 s visibility timeout, 14-day retention, redrive after 3 attempts; CloudWatch + SNS alarm when the DLQ stops being empty. |
| `APIGWCustomDomain` | DNS-validated ACM certificate, regional TLS 1.2 domain name and a Route 53 A record — created only when both `API_DOMAIN` and `ROUTE_53_HOSTED_ZONE_ID` are set. |

The execution role is minimal and explicit ([`sls/config/role.yml`](sls/config/role.yml)): CRUD on
the table and its indexes, `AdminDeleteUser`/`AdminAddUserToGroup` on the User Pool, read and write
under `scans/*`, and write under `ocr/*`.

---

## License

ISC.
