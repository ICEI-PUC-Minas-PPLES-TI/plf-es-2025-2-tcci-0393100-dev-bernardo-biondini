<?php

namespace App\Exceptions;

use RuntimeException;

class AgendaConflictException extends RuntimeException
{
    public function __construct(private readonly array $conflicts)
    {
        parent::__construct('Conflito de agenda detectado para o período informado.');
    }

    public function conflicts(): array
    {
        return $this->conflicts;
    }
}
