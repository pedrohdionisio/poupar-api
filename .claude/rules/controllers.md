---
globs: src/application/controllers/**
---

# Controllers

Controllers são HTTP handlers — recebem request validado e delegam ao use case.

## Estrutura obrigatória

```typescript
@Schema({ body: mySchema })
@Injectable()
@AdminOnly()
export class CreateProductController extends Controller<'private', CreateProductController.Response> {
  constructor(private readonly createProductUseCase: CreateProductUseCase) {
    super();
  }

  protected override async handle({ body }: Controller.Request<'private', Params>): Promise<Controller.Response<CreateProductController.Response>> {
    const result = await this.createProductUseCase.execute(body);
    return { statusCode: 201, body: result };
  }
}

export namespace CreateProductController {
  export type Response = { id: string };
}
```

## Decorators — ordem obrigatória

Aplique nesta sequência (decorators executam de baixo para cima):

1. `@Schema({ body?, params?, query? })` — validação Zod
2. `@Injectable()` — registro no DI
3. `@AdminOnly()` — autorização (quando necessário)

## Regras

- O método `handle` é o único método implementado — sem lógica de negócio além da chamada ao use case.
- Use `Controller.Request<'private', TBody, TParams, TQueryParams>` para tipar o parâmetro de `handle`.
- Declare schemas Zod em arquivo separado `schemas/verbNounSchema.ts` na mesma pasta.
- Exporte o tipo `Response` no namespace da controller.
- Rotas públicas usam `Controller<'public', TResponse>` e `accountId` será `null`.
- Rotas privadas sem restrição de role não precisam de `@AdminOnly()`.

## Proibido

- Lógica de negócio no controller (validações de domínio, queries ao banco).
- Importar repositórios diretamente — sempre via use case.
- Mais de um use case por controller.
