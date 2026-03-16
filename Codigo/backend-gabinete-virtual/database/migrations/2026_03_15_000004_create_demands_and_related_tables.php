<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('demands', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description');
            $table->enum('status', ['open', 'in_progress', 'completed']);
            $table->enum('priority', ['low', 'medium', 'high']);
            $table->foreignId('responsible_user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('city_id')->constrained('cities')->restrictOnDelete();
            $table->foreignId('institution_id')->constrained('institutions')->restrictOnDelete();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('created_by_citizen_id')->nullable()->constrained('citizens')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('events', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->dateTime('event_at');
            $table->string('location');
            $table->text('context');
            $table->timestamps();
        });

        Schema::create('demand_event', function (Blueprint $table) {
            $table->foreignId('demand_id')->constrained('demands')->cascadeOnDelete();
            $table->foreignId('event_id')->constrained('events')->cascadeOnDelete();

            $table->primary(['demand_id', 'event_id']);
        });

        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('citizen_id')->constrained('citizens')->cascadeOnDelete();
            $table->foreignId('demand_id')->constrained('demands')->cascadeOnDelete();
            $table->text('message');
            $table->dateTime('sent_at');
            $table->string('type');
        });

        Schema::create('attachments', function (Blueprint $table) {
            $table->id();
            $table->string('reference_table');
            $table->unsignedBigInteger('reference_id');
            $table->string('file_path');
            $table->timestamp('created_at')->useCurrent();

            $table->index(['reference_table', 'reference_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attachments');
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('demand_event');
        Schema::dropIfExists('events');
        Schema::dropIfExists('demands');
    }
};
