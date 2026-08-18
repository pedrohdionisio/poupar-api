# waitr-api

Serverless REST + WebSocket API (AWS Lambda, Node.js, TypeScript strict).
Clean Architecture: `application` → `infra` → `kernel` → `main`.

## Stack

- Runtime: Node.js + TypeScript 5 strict + Biome
- Infra: AWS Lambda, DynamoDB single-table, Cognito, S3, SQS, API Gateway v2
- DI: decorators customizados (`@Injectable`) + `reflect-metadata`
- IDs: ULID — nunca UUID
- Validação: Zod v4
- Preços: inteiros em centavos no banco

## Arquitetura

```
src/application/   → controllers, use cases, entities, errors, contracts
src/infra/         → repositories, gateways, DynamoDB items, AWS clients
src/kernel/        → DI container, decorators (@Injectable, @Schema, @AdminOnly)
src/main/          → Lambda entry points e adapters
src/shared/        → AppConfig, utils
```

## Padrões globais

- Aplique `@Injectable()` em toda classe registrada no container DI.
- Declare tipos relacionados a uma classe no namespace exportado do mesmo arquivo.
- Use path aliases (`@application/*`, `@infra/*`, `@kernel/*`, `@main/*`, `@shared/*`).
- Lance erros de `src/application/errors/` — nunca `throw new Error()` genérico em camadas de domínio.
- Não adicione comentários que descrevam o que o código já expressa.
- Não crie abstrações antecipando requisitos hipotéticos.
- Não use `console.log` — use `console.error` apenas em adapters Lambda.

## Formatação (Biome)

Tabs, aspas simples, sem trailing comma, semicolons obrigatórios.
Imports organizados automaticamente (`organizeImports: on`).
Execute `pnpm biome check` antes de finalizar alterações.
