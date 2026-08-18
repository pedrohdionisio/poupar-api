---
globs: src/infra/database/dynamo/repositories/**
---

# Repositories

Repositórios são a camada de acesso ao DynamoDB — traduzem operações de domínio em comandos SDK.

## Estrutura obrigatória

```typescript
@Injectable()
export class ProductRepository {
  constructor(private readonly appConfig: AppConfig) {}

  async getById({ id }: ProductRepository.GetByIdParams): Promise<Product | null> {
    const command = new QueryCommand({
      TableName: this.appConfig.database.dynamodb.mainTable,
      // ...
    });
    const { Items = [] } = await dynamoClient.send(command);
    const item = Items[0] as ProductItem.ItemType | undefined;
    return item ? ProductItem.toEntity({ item }) : null;
  }
}

export namespace ProductRepository {
  export type GetByIdParams = { id: string };
  export type CreateParams = { product: Product };
}
```

## Regras

- Sempre use `this.appConfig.database.dynamodb.mainTable` para o nome da tabela — nunca hardcode.
- Use o Item mapper (`XItem.toEntity`, `XItem.fromEntity`, `XItem.getPK`, etc.) para toda conversão.
- Retorne `null` quando um item não for encontrado — não lance erro no repositório.
- Declare um tipo de parâmetro por método no namespace (`GetByIdParams`, `CreateParams`, etc.).
- Use `QueryCommand` com GSI para buscas por atributos não-PK; use `GetCommand` para buscas por PK/SK exatos.
- Para listagens, inicialize `Items = []` no destructuring para evitar undefined.

## DynamoDB patterns

- PK global de uma entidade: ex. `'PRODUCTS'`
- SK individual: ex. `` `PRODUCT#${id}` ``
- GSI1PK/GSI1SK seguem o mesmo padrão definido no Item mapper.
- Preços são armazenados como inteiros (centavos) — a conversão acontece no Item mapper.

## Proibido

- Lógica de negócio (validações de domínio) no repositório.
- Importar entidades de camadas acima de `@application/entities/` para montar respostas.
- Hardcodar nomes de tabelas, índices ou prefixos de chave fora do Item mapper.
