---
globs: src/application/queues/**
---

# Queue Consumers

> **Infra ainda não implementada.** Não existem hoje no repo: `src/application/queues/**`,
> `IQueueConsumer`, `lambdaSQSAdapter`, nem fila SQS no `serverless.yml`. Esta rule descreve o
> formato-alvo para quando o fluxo de importação assíncrona for construído — **não importe esses
> símbolos até que existam**. Ao implementar, crie primeiro o contrato e o adapter.

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
