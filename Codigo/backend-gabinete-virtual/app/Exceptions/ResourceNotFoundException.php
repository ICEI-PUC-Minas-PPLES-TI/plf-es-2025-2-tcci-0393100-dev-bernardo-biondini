<?php

namespace App\Exceptions;

use Exception;

class ResourceNotFoundException extends Exception
{
    protected $code = 404;

    public function __construct(string $resource = 'Recurso', ?string $message = null)
    {
        parent::__construct($message ?? "{$resource} não encontrado.");
    }

    public function render()
    {
        return response()->json([
            'message' => $this->message,
        ], $this->code);
    }
}
