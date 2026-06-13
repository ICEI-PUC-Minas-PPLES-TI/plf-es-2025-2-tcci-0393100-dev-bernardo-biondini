<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('event_alerts', function (Blueprint $table) {
            $table->foreignId('user_id')
                ->nullable()
                ->after('event_id')
                ->constrained('users')
                ->cascadeOnDelete();
            $table->string('status')->default('pending')->after('channel');
            $table->boolean('is_automatic')->default(false)->after('status');
            $table->timestamp('sent_at')->nullable()->after('is_recurring');
            $table->timestamp('read_at')->nullable()->after('sent_at');
            $table->text('error_message')->nullable()->after('read_at');

            $table->index(['user_id', 'alert_at']);
            $table->index(['user_id', 'read_at', 'sent_at']);
            $table->unique(
                ['event_id', 'user_id', 'lead_time_minutes', 'is_automatic'],
                'event_alerts_event_user_lead_auto_unique',
            );
        });
    }

    public function down(): void
    {
        Schema::table('event_alerts', function (Blueprint $table) {
            $table->dropUnique('event_alerts_event_user_lead_auto_unique');
            $table->dropIndex(['user_id', 'alert_at']);
            $table->dropIndex(['user_id', 'read_at', 'sent_at']);
            $table->dropConstrainedForeignId('user_id');
            $table->dropColumn([
                'status',
                'is_automatic',
                'sent_at',
                'read_at',
                'error_message',
            ]);
        });
    }
};
