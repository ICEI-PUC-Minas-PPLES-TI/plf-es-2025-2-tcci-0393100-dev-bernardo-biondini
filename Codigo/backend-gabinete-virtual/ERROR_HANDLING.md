# Tratamento de Erros Padronizado

Este documento descreve como usar o novo sistema centralizado de tratamento de erros no backend da aplicação.

## Visão Geral

O sistema de tratamento de erros foi implementado usando um **Exception Handler** centralizado que intercepta todas as exceções lançadas durante a execução da aplicação e retorna respostas JSON padronizadas com os status HTTP apropriados.

## Estrutura de Exceções

### Exceções Customizadas

#### 1. `ResourceNotFoundException`
Lançada quando um recurso não é encontrado no banco de dados.

**Uso:**
```php
use App\Exceptions\ResourceNotFoundException;

public function show(int $id)
{
    $record = $this->repository->findById($id); // Lança ModelNotFoundException
    // Ou você pode lançar manualmente:
    // throw new ResourceNotFoundException('Usuário');
    
    return response()->json(['data' => $record]);
}
```

**Resposta:**
```json
{
    "message": "Recurso não encontrado."
}
```
Status HTTP: `404`

#### 2. `UnprocessableEntityException`
Lançada quando uma operação não pode ser procesada (ex: violação de chave estrangeira, restrições de negócio).

**Uso:**
```php
use App\Exceptions\UnprocessableEntityException;

public function delete(int $id)
{
    // Se houver uma restrição de chave estrangeira, o Handler captura automaticamente
    $this->model->findOrFail($id)->delete();
    
    return response()->json(['message' => 'Recurso removido com sucesso.']);
}
```

**Resposta:**
```json
{
    "message": "Não foi possível remover o recurso porque ele está em uso."
}
```
Status HTTP: `422`

#### 3. `ValidationException`
Lançada para erros de validação customizados.

**Uso:**
```php
use App\Exceptions\ValidationException;

public function customValidation()
{
    $errors = [
        'email' => 'Este email já está registrado.',
        'name' => 'Nome deve ter entre 3 e 100 caracteres.'
    ];
    
    throw new ValidationException($errors);
}
```

**Resposta:**
```json
{
    "message": "Erro de validação.",
    "errors": {
        "email": "Este email já está registrado.",
        "name": "Nome deve ter entre 3 e 100 caracteres."
    }
}
```
Status HTTP: `422`

## Exceções do Laravel Automaticamente Tratadas

### `ModelNotFoundException`
Automaticamente convertida para uma resposta 404 quando o Eloquent não encontra um modelo.

```php
$user = User::findOrFail($id); // Lança ModelNotFoundException
```

Resposta: `404 "Recurso não encontrado."`

### `QueryException` (Violação de Chave Estrangeira)
Automaticamente convertida para uma resposta 422 quando há erro de constraint.

```php
$role->delete(); // Se a role está sendo usada por usuários
```

Resposta: `422 "Não foi possível remover o recurso porque ele está em uso."`

### `ValidationException` (Validação de Request)
Automaticamente formatada para JSON com lista de erros.

Resposta: 
```json
{
    "message": "Erro de validação.",
    "errors": {
        "email": ["O email é obrigatório."],
        "password": ["A senha deve ter entre 8 e 255 caracteres."]
    }
}
```
Status HTTP: `422`

## Refatoração de Controllers

### Antes (Com Try-Catch)
```php
public function show(int $id): JsonResponse
{
    try {
        return response()->json([
            'data' => $this->service->findById($id),
        ]);
    } catch (ModelNotFoundException) {
        return response()->json([
            'message' => 'Recurso não encontrado.',
        ], 404);
    }
}

public function destroy(int $id): JsonResponse
{
    try {
        $this->service->delete($id);
        return response()->json(['message' => 'Removido com sucesso.']);
    } catch (ModelNotFoundException) {
        return response()->json(['message' => 'Recurso não encontrado.'], 404);
    } catch (QueryException) {
        return response()->json(['message' => 'Não foi possível remover.'], 422);
    }
}
```

### Depois (Sem Try-Catch)
```php
public function show(int $id): JsonResponse
{
    return response()->json([
        'data' => $this->service->findById($id),
    ]);
}

public function destroy(int $id): JsonResponse
{
    $this->service->delete($id);
    return response()->json(['message' => 'Removido com sucesso.']);
}
```

## Benefícios

✅ **Código mais limpo:** Sem try-catch em toda controller  
✅ **Consistência:** Todos os erros seguem o mesmo padrão  
✅ **Manutenção:** Mudanças no tratamento de erros em um únicolugar  
✅ **Reutilização:** Services e repositories não precisam se preocupar com formatação de resposta  
✅ **Testabilidade:** Mais fácil escrever testes sem mock de try-catch  

## Fluxo de Tratamento

```
┌─────────────────────────────────────┐
│         Request llega à Controller   │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  Service/Repository executa lógica   │
└────────────┬────────────────────────┘
             │
             │ Exceção lançada
             ▼
┌─────────────────────────────────────┐
│  Exception Handler (app/Exceptions)  │
│  - Captura a exceção               │
│  - Formata resposta JSON            │
│  - Retorna status HTTP correto      │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│      Resposta JSON retornada         │
│      ao cliente (com 404, 422, etc)  │
└─────────────────────────────────────┘
```

## Como Adicionar Novas Exceções

1. Crie um arquivo em `app/Exceptions/` herdando de `Exception`
2. Implemente o método `render()` que retorna `response()->json(...)`
3. Adicione o tratamento no `Handler.php`

Exemplo:
```php
// app/Exceptions/UnauthorizedException.php
namespace App\Exceptions;

class UnauthorizedException extends Exception
{
    protected $code = 401;
    
    public function render()
    {
        return response()->json([
            'message' => 'Não autorizado.'
        ], $this->code);
    }
}

// app/Exceptions/Handler.php
// No método render()
if ($e instanceof UnauthorizedException) {
    return $e->render();
}
```

## Testes

Os testes devem verificar o comportamento do Handler sem necessidade de try-catch nos testes:

```php
public function test_show_returns_404_when_user_not_found()
{
    $response = $this->getJson('/api/users/999');
    
    $response->assertStatus(404)
             ->assertJson(['message' => 'Recurso não encontrado.']);
}
```
