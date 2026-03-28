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
        Schema::create('cities', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('region');
        });

        Schema::create('institutions', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('type');
            $table->foreignId('city_id')->constrained('cities')->restrictOnDelete();
        });

        Schema::create('leaders', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('position');
            $table->foreignId('institution_id')->constrained('institutions')->cascadeOnDelete();
        });

        Schema::create('citizens', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('cpf')->unique();
            $table->date('birth_date');
            $table->string('phone');
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('chatbot_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('citizen_id')->constrained('citizens')->cascadeOnDelete();
            $table->string('channel');
            $table->dateTime('started_at');
            $table->dateTime('ended_at')->nullable();
        });

        Schema::create('content_preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('citizen_id')->unique()->constrained('citizens')->cascadeOnDelete();
            $table->boolean('receive_content');
        });

        Schema::create('amendments', function (Blueprint $table) {
            $table->id();
            $table->string('number');
            $table->decimal('amount', 14, 2);
            $table->enum('status', ['planned', 'in_execution', 'completed']);
            $table->foreignId('city_id')->constrained('cities')->restrictOnDelete();
            $table->string('application_area');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('amendments');
        Schema::dropIfExists('content_preferences');
        Schema::dropIfExists('chatbot_sessions');
        Schema::dropIfExists('citizens');
        Schema::dropIfExists('leaders');
        Schema::dropIfExists('institutions');
        Schema::dropIfExists('cities');
    }
};
