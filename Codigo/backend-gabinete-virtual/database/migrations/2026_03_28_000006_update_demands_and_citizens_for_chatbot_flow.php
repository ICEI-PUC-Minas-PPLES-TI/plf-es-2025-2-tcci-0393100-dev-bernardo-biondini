<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('demands', function (Blueprint $table) {
            $table->foreignId('responsible_user_id')->nullable()->change();
        });

        Schema::table('citizens', function (Blueprint $table) {
            $table->string('cpf')->nullable()->change();
            $table->date('birth_date')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('demands', function (Blueprint $table) {
            $table->foreignId('responsible_user_id')->nullable(false)->change();
        });

        Schema::table('citizens', function (Blueprint $table) {
            $table->string('cpf')->nullable(false)->change();
            $table->date('birth_date')->nullable(false)->change();
        });
    }
};
