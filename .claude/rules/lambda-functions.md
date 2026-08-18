---
globs: src/main/functions/**
---

# Lambda Functions

Entry points das funções Lambda — sem lógica de negócio, apenas wiring entre DI e adapter.

## Estrutura obrigatória

```typescript
import 'reflect-metadata';

import { CreateProductController } from '@application/controllers/products/CreateProductController';
import { Registry } from '@kernel/di/Registry';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';

const controller = Registry.getInstance().resolve(CreateProductController);

export const handler = lambdaHttpAdapter(controller);
```

## Regras

- `import 'reflect-metadata'` deve ser a **primeira linha** — obrigatório para o sistema de decorators funcionar.
- Resolva a dependência via `Registry.getInstance().resolve(ClassName)` — nunca instancie manualmente.
- Use o adapter correto para o tipo de trigger:
  - HTTP API Gateway → `lambdaHttpAdapter`
  - WebSocket → `lambdaWebSocketAdapter`
  - SQS → `lambdaSQSAdapter`
  - S3 Event → `lambdaS3EventAdapter`
- Mantenha o arquivo em 5 linhas ou menos — qualquer lógica além do wiring pertence ao controller/handler.
- Organize em subpastas por domínio: `functions/products/`, `functions/orders/`, `functions/websocket/`, etc.

## Proibido

- Lógica de negócio, validação, ou tratamento de erro no entry point.
- Instanciar controllers ou handlers diretamente com `new`.
- Importar repositórios ou gateways diretamente.
