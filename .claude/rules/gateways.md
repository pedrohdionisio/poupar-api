---
globs: src/infra/gateways/**
---

# Gateways

Gateways encapsulam integrações com serviços externos (S3, SQS, Cognito, WebSocket API Gateway).

## Estrutura obrigatória

```typescript
@Injectable()
export class FileStorageGateway {
  constructor(private readonly config: AppConfig) {}

  async createPOST({ id, file }: FileStorageGateway.CreatePostParams): Promise<FileStorageGateway.CreatePostResult> {
    // lógica de integração com S3
    return { uploadSignature };
  }
}

export namespace FileStorageGateway {
  export type CreatePostParams = { id: string; file: { key: string; size: number } };
  export type CreatePostResult = { uploadSignature: string };
}
```

## Regras

- Aplique `@Injectable()` — gateways entram no container DI.
- Receba `AppConfig` via construtor para acessar URLs, bucket names e configurações de serviços.
- Declare tipos de input e output no namespace do gateway.
- Traduza erros do SDK externo em erros de aplicação (`@application/errors/`) quando necessário.
- Métodos estáticos são permitidos para operações sem estado (ex: geração de file keys).
- Para WebSocket, use `Promise.allSettled` ao iterar conexões — uma falha não deve bloquear as demais; limpe conexões com `GoneException`.

## Nomes de métodos

Prefira verbos de ação que descrevem a operação externa:
- `publish`, `send` — para filas e mensageria
- `broadcast` — para WebSocket
- `createPOST`, `getFile`, `deleteObject` — para operações de storage

## Proibido

- Lógica de negócio no gateway — apenas integração com serviço externo.
- Importar entidades de domínio além do necessário para construir a requisição.
- Acessar diretamente os clientes AWS fora de `@infra/clients/` — importe os singletons exportados.
