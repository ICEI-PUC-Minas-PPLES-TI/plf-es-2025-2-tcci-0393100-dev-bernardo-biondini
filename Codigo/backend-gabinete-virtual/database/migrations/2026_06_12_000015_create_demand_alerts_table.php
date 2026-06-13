<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('demand_alerts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('demand_id')->constrained('demands')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->cascadeOnDelete();
            $table->foreignId('citizen_id')->nullable()->constrained('citizens')->cascadeOnDelete();
            $table->string('title');
            $table->text('message');
            $table->string('type')->default('demand_updated');
            $table->string('channel');
            $table->string('status')->default('pending');
            $table->json('metadata')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamps();

            $table->index(['channel', 'status']);
            $table->index(['user_id', 'channel', 'read_at']);
            $table->index(['citizen_id', 'channel']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('demand_alerts');
    }
};
