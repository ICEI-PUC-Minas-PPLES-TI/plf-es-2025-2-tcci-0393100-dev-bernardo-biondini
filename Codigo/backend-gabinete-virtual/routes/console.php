<?php

use App\Services\Agenda\AgendaReminderService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('agenda:dispatch-reminders', function (AgendaReminderService $agendaReminderService) {
    $count = $agendaReminderService->dispatchDueReminders();

    $this->info("{$count} lembrete(s) de agenda enfileirado(s).");
})->purpose('Enfileira lembretes de agenda vencidos para notificacao em tempo real.');
