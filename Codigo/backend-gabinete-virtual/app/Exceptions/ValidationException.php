<?php

namespace App\Exceptions;

use Exception;

class ValidationException extends Exception
{
    protected $code = 422;

    /**
     * @var array<int|string, mixed>
     */
    protected array $errors = [];

    /**
     * @param array<int|string, mixed>|string $errors
     */
    public function __construct(
        array|string $errors,
        ?string $message = null,
    ) {
        parent::__construct($message ?? 'Erro de validação.');
        $this->errors = \is_array($errors) ? $errors : [$errors];
    }

    public function render()
    {
        return response()->json([
            'message' => $this->message,
            'errors' => $this->errors ?? [],
        ], $this->code);
    }

    public function errors(): array
    {
        return $this->errors;
    }
}
