<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->string('type')->default('meeting')->after('title');
            $table->dateTime('starts_at')->nullable()->after('event_at');
            $table->dateTime('ends_at')->nullable()->after('starts_at');
            $table->text('description')->nullable()->after('context');
            $table->unsignedInteger('participants_expected')->nullable()->after('description');
            $table->string('color', 16)->nullable()->after('participants_expected');
            $table->foreignId('city_id')->nullable()->after('color')->constrained('cities')->nullOnDelete();
        });

        DB::statement('UPDATE events SET starts_at = event_at, ends_at = event_at WHERE starts_at IS NULL');

        Schema::create('event_alerts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->nullable()->constrained('events')->nullOnDelete();
            $table->string('title');
            $table->text('message')->nullable();
            $table->dateTime('alert_at');
            $table->unsignedInteger('lead_time_minutes')->nullable();
            $table->enum('channel', ['email', 'system'])->default('system');
            $table->boolean('is_recurring')->default(false);
            $table->timestamps();

            $table->index('alert_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_alerts');

        Schema::table('events', function (Blueprint $table) {
            $table->dropConstrainedForeignId('city_id');
            $table->dropColumn([
                'type',
                'starts_at',
                'ends_at',
                'description',
                'participants_expected',
                'color',
            ]);
        });
    }
};
