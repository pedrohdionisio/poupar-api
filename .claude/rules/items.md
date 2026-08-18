---
globs: src/infra/database/dynamo/items/**
---

# DynamoDB Items

Items são mappers entre entidades de domínio e itens DynamoDB — single-table design com composite keys.

## Estrutura obrigatória

```typescript
export class ProductItem {
  static readonly type = 'Product';
  private readonly keys: ProductItem.Keys;

  constructor(private readonly attr: ProductItem.Attributes) {
    this.keys = {
      PK: ProductItem.getPK(),
      SK: ProductItem.getSK({ id: this.attr.id }),
      GSI1PK: ProductItem.getGSI1PK(),
      GSI1SK: ProductItem.getGSI1SK({ id: this.attr.id })
    };
  }

  toItem(): ProductItem.ItemType {
    return { ...this.keys, ...this.attr, type: ProductItem.type };
  }

  static fromEntity({ entity }: ProductItem.FromEntityParams): ProductItem {
    return new ProductItem({ ...entity, createdAt: entity.createdAt.toISOString() });
  }

  static toEntity({ item }: ProductItem.ToEntityParams): Product {
    return new Product({ ...item, createdAt: new Date(item.createdAt) });
  }

  static getPK(): ProductItem['keys']['PK'] { return 'PRODUCTS'; }
  static getSK({ id }: { id: string }): ProductItem['keys']['SK'] { return `PRODUCT#${id}`; }
  static getGSI1PK(): ProductItem['keys']['GSI1PK'] { return 'PRODUCTS'; }
  static getGSI1SK({ id }: { id: string }): ProductItem['keys']['GSI1SK'] { return `PRODUCT#${id}`; }
}

export namespace ProductItem {
  export type Keys = {
    PK: 'PRODUCTS';
    SK: `PRODUCT#${string}`;
    GSI1PK: 'PRODUCTS';
    GSI1SK: `PRODUCT#${string}`;
  };
  export type Attributes = { id: string; createdAt: string; /* ... */ };
  export type ItemType = Keys & Attributes & { type: 'Product' };
  export type FromEntityParams = { entity: Product };
  export type ToEntityParams = { item: ProductItem.ItemType };
}
```

## Regras

- Defina todos os tipos de chave com template literals precisos no namespace `Keys`.
- `createdAt` é salvo como ISO string no DynamoDB e convertido para `Date` no `toEntity`.
- `type` identifica a entidade no item — use o valor estático `ProductItem.type`.
- Métodos `getPK`, `getSK`, `getGSI1PK`, `getGSI1SK` são estáticos e tipados com retorno inferido da `Keys`.
- `fromEntity` cria um `Item` a partir de uma entidade; `toEntity` faz o caminho inverso.
- Preços são convertidos: centavos (int) no DynamoDB ↔ valor original na entidade.

## Proibido

- Lógica de negócio no Item mapper.
- Retornar objetos raw do DynamoDB fora desse arquivo — sempre use `toEntity`.
- Chaves hardcoded nos repositórios — sempre use os métodos estáticos do Item.
