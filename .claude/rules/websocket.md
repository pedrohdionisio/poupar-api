---
globs: src/application/websocket/**
---

# WebSocket Handlers

Handlers de WebSocket gerenciam conexões e eventos em tempo real — implementam `IWebSocketHandler`.

## Estrutura obrigatória

```typescript
@Injectable()
export class ConnectHandler implements IWebSocketHandler {
  constructor(private readonly connectionRepository: ConnectionRepository) {}

  async handle(input: IWebSocketHandler.Input): Promise<IWebSocketHandler.Output> {
    // lógica do evento
    return { statusCode: 200 };
  }
}
```

## Regras

- Aplique `@Injectable()` e implemente `IWebSocketHandler`.
- Retorne sempre `{ statusCode: number }` — API Gateway WebSocket exige esse formato.
- No `ConnectHandler`, valide o `token` presente em `queryStringParameters` antes de salvar a conexão:
  - Token ausente → `return { statusCode: 401 }`
  - Token inválido (parse falhou) → `return { statusCode: 401 }` dentro de `catch`
  - Extraia `accountId` do claim `custom:internalId` ou `internalId` do JWT.
- No `DisconnectHandler`, remova a conexão do repositório — trate erro de conexão já removida como no-op.
- Use `connectionRepository` para persistir e limpar `connectionId`.

## Eventos WebSocket

- `$connect` → `ConnectHandler` — autentica e salva conexão
- `$disconnect` → `DisconnectHandler` — remove conexão
- Broadcasts são feitos via `WebSocketGateway.broadcast` a partir de use cases, não de handlers.

## Proibido

- Lançar exceções não tratadas — sempre retorne statusCode de erro em vez de propagar.
- Lógica de negócio nos handlers — delegue a use cases se necessário.
- Acessar o AWS API Gateway Management SDK diretamente — use `WebSocketGateway`.
