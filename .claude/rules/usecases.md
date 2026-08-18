---
globs: src/application/usecases/**
---

# Use Cases

Use cases contêm toda a lógica de negócio — orquestram repositórios e gateways, validam regras de domínio.

## Estrutura obrigatória

```typescript
@Injectable()
export class CreateProductUseCase {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly categoryRepository: CategoryRepository
  ) {}

  async execute(input: CreateProductUseCase.Input): Promise<CreateProductUseCase.Output> {
    // lógica aqui
    return { id: product.id };
  }
}

export namespace CreateProductUseCase {
  export type Input = { name: string; categoryId: string };
  export type Output = { id: string };
}
```

## Regras

- O método público é sempre `execute(input)` — não adicione métodos auxiliares públicos.
- Declare `Input` e `Output` no namespace do use case.
- Lance erros de `@application/errors/` quando uma regra de negócio é violada:
  - `ResourceNotFound` — entidade não encontrada
  - `ResourceAlreadyExists` — conflito de unicidade
  - `Conflict` — estado inválido para a operação
- Valide existência de dependências antes de criar/modificar entidades.
- Construa entidades via `new Entity(input)` — nunca construa objetos raw para persistir.

## Proibido

- Importar AWS SDK diretamente — use repositórios e gateways.
- Acessar `AppConfig` — configuração é responsabilidade da infra.
- Retornar instâncias de entidade completas quando o output pode ser um subconjunto tipado.
- Métodos `private` complexos — extraia para outro use case se a lógica crescer.
