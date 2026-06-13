<?php

namespace App\Jobs;

use App\Models\DemandAlert;
use App\Services\Notification\DemandAlertChannelFactory;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Throwable;

class ProcessDemandAlertJob implements ShouldQueue
{
    use Queueable;

    public function __construct(private readonly int $alertId)
    {
    }

    public function handle(DemandAlertChannelFactory $factory): void
    {
        $alert = DemandAlert::query()->find($this->alertId);

        if (! $alert) {
            return;
        }

        try {
            $factory->make($alert->channel)->send($alert);

            $alert->forceFill([
                'status' => DemandAlert::STATUS_SENT,
                'sent_at' => now(),
                'error_message' => null,
            ])->save();
        } catch (Throwable $exception) {
            $alert->forceFill([
                'status' => DemandAlert::STATUS_FAILED,
                'error_message' => $exception->getMessage(),
            ])->save();

            throw $exception;
        }
    }
}
