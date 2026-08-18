---
globs: src/application/queues/**
---

# Queue Consumers

Consumers processam mensagens SQS — implementam `IQueueConsumer<TMessage>`.

## Estrutura obrigatória

```typescript
@Injectable()
export class ProductsQueueConsumer implements IQueueConsumer<ProductsQueueGateway.Message> {
  constructor(private readonly productRepository: ProductRepository) {}

  async process(message: ProductsQueueGateway.Message): Promise<void> {
    // lógica de processamento
  }
}
```

## Regras

- Aplique `@Injectable()` e implemente `IQueueConsumer<TMessage>` com o tipo exato da mensagem.
- O tipo `TMessage` deve corresponder ao tipo publicado pelo gateway de fila (`XQueueGateway.Message`).
- Lance erros explícitos (`ResourceNotFound`, etc.) — o adapter SQS captura e propaga para retry.
- Importe AWS SDK apenas para operações que não têm gateway/repositório adequado (ex: operações diretas no S3 para processamento de imagem).
- Use `Promise.all` para operações paralelas independentes dentro do `process`.

## Proibido

- Silenciar erros — não use `try/catch` vazio ou retorne sem processar em caso de falha.
- Lógica de parsing da mensagem SQS — essa responsabilidade é do `lambdaSQSAdapter`.
- Publicar mensagens em outra fila dentro do consumer sem um gateway dedicado.
