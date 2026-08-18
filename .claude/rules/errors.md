---
globs: src/application/errors/**
---

# Errors

Hierarquia de erros da aplicação — separa erros HTTP de erros de domínio.

## Hierarquia

```
Error
├── HttpError (abstrato)       → erros com statusCode HTTP
│   ├── BadRequest (400)
│   ├── Unauthorized (401)
│   ├── Forbbiden (403)
│   ├── NotFound (404)
│   └── Conflict (409)
└── ApplicationError (abstrato) → erros de domínio com código semântico
    ├── ResourceNotFound
    ├── ResourceAlreadyExists
    └── ...
```

## Regras

- Estenda `HttpError` para erros diretamente ligados ao protocolo HTTP.
- Estenda `ApplicationError` para erros de regra de negócio — o `lambdaHttpAdapter` converte para a resposta adequada.
- Todo novo erro deve usar um código de `ErrorCode` existente ou adicionar um novo valor ao enum `ErrorCode`.
- Nunca crie strings de código de erro fora do enum `ErrorCode`.
- `HttpError` requer `statusCode` e `code` como propriedades concretas (não abstratas) na subclasse.
- Mensagens de erro devem ser descritivas e em inglês — são expostas na API.

## Adicionando um novo erro

1. Adicione o código em `ErrorCode.ts` se não existir equivalente.
2. Crie o arquivo na subpasta correta (`http/` ou `application/`).
3. Implemente `statusCode`, `code`, e `message` no construtor.

## Proibido

- `throw new Error('mensagem genérica')` em use cases ou controllers — use a hierarquia de erros.
- Criar subclasses de `HttpError` com statusCode incorreto para o tipo de erro.
- Duplicar códigos — verifique `ErrorCode` antes de adicionar.
