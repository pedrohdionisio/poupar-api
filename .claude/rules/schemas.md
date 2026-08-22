---
globs: src/application/controllers/**/schemas/**
---

# Schemas (Zod)

Validação de entrada das controllers. Um arquivo por endpoint, na pasta `schemas/` do módulo.

## Estrutura obrigatória

```typescript
import { Account } from '@application/entities/Account';
import z from 'zod';

export const updateAccountBodySchema = z.object({
	name: z.string().min(1, '"name" is required'),
	role: z.enum(Account.Role)
});

export const updateAccountParamsSchema = z.object({
	accountId: z.ulid()
});

export type UpdateAccountParams = z.infer<typeof updateAccountParamsSchema>;

export type UpdateAccountBody = z.infer<typeof updateAccountBodySchema>;
```

## Regras

- Arquivo: `schemas/<verbo><Entidade>Schema.ts` — um por endpoint, nunca um schema compartilhado
  entre endpoints diferentes.
- Exporte um schema por parte da request presente: `xxxBodySchema`, `xxxParamsSchema`,
  `xxxQuerySchema`. Endpoint sem body não declara `bodySchema`.
- Exporte **sempre** o tipo inferido de cada schema (`z.infer<typeof ...>`) — é ele que tipa
  `Controller.Request` na controller.
- Ids gerados por nós: `z.ulid()`. Chave natural externa tem validação própria — CNPJ
  `z.string().regex(/^\d{14}$/)`, chave de acesso `z.string().length(44)`, GTIN por tamanho.
- Enums vêm do domínio: `z.enum(Entidade.Enum)` — nunca redeclare os valores no schema.
- Valores monetários: `z.int().nonnegative()` no campo `...Cents`. Nunca aceite float e converta
  depois; o cliente manda centavos.
- Datas de entrada: `z.iso.datetime()`, convertidas para `Date` no use case, não no schema.
- Mensagens de erro em inglês — são expostas na API pelo `lambdaHttpAdapter`.

## Proibido

- Regra de negócio no schema (checar existência, unicidade, permissão) — isso é do use case.
- `z.any()` ou `z.unknown()` em campo que a controller repassa ao use case.
- Declarar o schema dentro do arquivo da controller.
