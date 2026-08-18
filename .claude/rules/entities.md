---
globs: src/application/entities/**
---

# Entities

Entidades são objetos de domínio puros — sem decorators de infra, sem acesso a repositórios.

## Estrutura obrigatória

- Declare `readonly id: string` e `readonly createdAt: Date` — nunca permitidos como mutáveis.
- Campos de negócio mutáveis **não** recebem `readonly`.
- Gere `id` com `ulid()` quando ausente: `this.id = attr.id ?? ulid()`.
- Inicialize `createdAt` com `new Date()` quando ausente: `this.createdAt = attr.createdAt ?? new Date()`.
- Use um único construtor que recebe `attr: Entity.Attributes`.

## Namespace de tipos

Exporte `Attributes` dentro do namespace da entidade:

```typescript
export namespace Product {
  export type Attributes = {
    id?: string;
    createdAt?: Date;
    name: string;
    // campos obrigatórios sem `?`
  };
}
```

## Enums e tipos de domínio

Declare enums e tipos de domínio no namespace da entidade, nunca em arquivos separados:

```typescript
export namespace Order {
  export enum Status { WAITING = 'WAITING', PRODUCTION = 'PRODUCTION', DONE = 'DONE' }
}
```

## Proibido

- Importar nada de `@infra/*` ou `@kernel/*`.
- Lógica de persistência ou chamadas externas.
- Campos opcionais desnecessários em `Attributes` — campos obrigatórios para criar a entidade não levam `?`.
