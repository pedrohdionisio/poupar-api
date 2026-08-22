---
globs: src/application/controllers/**
---

# Controllers

Controllers são HTTP handlers — recebem request validado e delegam ao use case.

## Estrutura obrigatória

```typescript
@Schema({ params: updateProductParamsSchema, body: updateProductBodySchema })
@Injectable()
@AdminOnly()
export class UpdateProductController extends Controller<
	'private',
	UpdateProductController.Response
> {
	constructor(private readonly updateProductUseCase: UpdateProductUseCase) {
		super();
	}

	protected override async handle({
		params,
		body
	}: Controller.Request<
		'private',
		UpdateProductBody,
		UpdateProductParams
	>): Promise<Controller.Response<UpdateProductController.Response>> {
		await this.updateProductUseCase.execute({ ...body, id: params.productId });

		return { statusCode: 200 };
	}
}

export namespace UpdateProductController {
	export type Response = null;
}
```

## Decorators — ordem obrigatória

Aplique nesta sequência (decorators executam de baixo para cima):

1. `@Schema({ body?, params?, query? })` — validação Zod
2. `@Injectable()` — registro no DI
3. `@AdminOnly()` — autorização (quando necessário)

## Regras

- O método `handle` é o único método implementado — sem lógica de negócio além da chamada ao use case.
- `protected override async handle` — o `override` é obrigatório (`noImplicitOverride: true` no tsconfig).
- Tipe o parâmetro com `Controller.Request<TType, TBody, TParams, TQueryParams>` **nessa ordem**.
  Endpoint sem body e com params passa `Record<string, never>` na posição de `TBody`, ou omite os
  genéricos quando não lê nenhuma das partes.
- Declare schemas Zod em arquivo separado `schemas/verbNounSchema.ts` na mesma pasta — ver
  `.claude/rules/schemas.md`.
- Exporte o tipo `Response` no namespace da controller.
- Rotas públicas usam `Controller<'public', TResponse>` e `accountId` será `null`.
- Rotas privadas sem restrição de role não precisam de `@AdminOnly()`.

## Proibido

- Lógica de negócio no controller (validações de domínio, queries ao banco).
- Importar repositórios diretamente — sempre via use case.
- Mais de um use case por controller.
