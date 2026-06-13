<?php

namespace App\Contracts;

use App\Models\DemandAlert;

interface DemandAlertChannel
{
    public function send(DemandAlert $alert): void;
}
