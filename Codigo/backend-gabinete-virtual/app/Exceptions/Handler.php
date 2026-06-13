<?php

namespace App\Exceptions;

use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Validation\ValidationException as LaravelValidationException;
use Throwable;

class Handler extends ExceptionHandler
{
    /**
     * The list of the inputs that are never flashed to the session on validation errors.
     *
     * @var array<int, string>
     */
    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    /**
     * Register the exception handling callbacks for the application.
     */
    public function register(): void
    {
        $this->reportable(function (Throwable $e) {
            //
        });
    }

    /**
     * Render an exception into an HTTP response.
     */
    public function render($request, Throwable $e)
    {
        // Handle custom exceptions
        if ($e instanceof ResourceNotFoundException) {
            return $this->errorResponse($e->getMessage(), 404, $e);
        }

        if ($e instanceof UnprocessableEntityException) {
            return $this->errorResponse($e->getMessage(), 422, $e);
        }

        if ($e instanceof ValidationException) {
            return $this->errorResponse($e->getMessage(), 422, $e, [
                'errors' => $e->errors(),
            ]);
        }

        if ($e instanceof AuthorizationException) {
            return $this->errorResponse(
                $e->getMessage() !== 'This action is unauthorized.'
                    ? $e->getMessage()
                    : 'Voce nao tem permissao para executar esta acao.',
                403,
                $e,
            );
        }

        // Handle Eloquent ModelNotFoundException
        if ($e instanceof ModelNotFoundException) {
            return $this->errorResponse('Recurso não encontrado.', 404, $e);
        }

        // Handle Database QueryException (foreign key constraint, etc)
        if ($e instanceof QueryException) {
            // Check if it's a foreign key constraint error
            if (strpos($e->getMessage(), 'foreign key constraint') !== false ||
                strpos($e->getMessage(), 'FOREIGN KEY constraint') !== false) {
                return $this->errorResponse('Não foi possível remover o recurso porque ele está em uso.', 422, $e);
            }

            // Generic database error
            return $this->errorResponse('Erro ao processar a operação no banco de dados.', 422, $e);
        }

        // Handle validation errors
        if ($e instanceof LaravelValidationException) {
            // Flatten the validation errors into a single array
            $errors = $e->validator->errors()->all();

            return $this->errorResponse('Erro de validação.', 422, $e, [
                'errors' => $errors,
            ]);
        }

        return $this->errorResponse($e->getMessage(), 500, $e);
    }

    private function errorResponse(string $message, int $status, Throwable $e, array $extra = [])
    {
        $payload = array_merge([
            'message' => $message,
        ], $extra);

        if (config('app.debug')) {
            $payload['exception'] = get_class($e);
            $payload['file'] = $e->getFile();
            $payload['line'] = $e->getLine();
            $payload['trace'] = $e->getTrace();
        }

        return response()->json($payload, $status);
    }
}
