<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_laws', function (Blueprint $table) {
            $table->id();
            $table->string('number')->unique();
            $table->text('description');
            $table->enum('status', ['in_committee', 'in_voting', 'approved', 'sanctioned']);
            $table->date('protocol_date');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_laws');
    }
};
