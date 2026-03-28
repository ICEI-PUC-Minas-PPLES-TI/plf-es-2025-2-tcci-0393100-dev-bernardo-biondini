<?php

namespace App\Exceptions;

use Exception;

class UnprocessableEntityException extends Exception
{
    protected $code = 422;

    public function __construct(?string $message = null)
    {
        parent::__construct($message ?? 'Não foi possível processar a solicitação.');
    }

    public function render()
    {
        return response()->json([
            'message' => $this->message,
        ], $this->code);
    }
}
