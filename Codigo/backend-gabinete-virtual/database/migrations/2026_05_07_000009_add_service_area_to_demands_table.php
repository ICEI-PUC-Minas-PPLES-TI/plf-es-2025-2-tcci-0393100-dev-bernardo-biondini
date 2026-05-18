<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('demands', function (Blueprint $table) {
            $table->string('service_area')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('demands', function (Blueprint $table) {
            $table->dropColumn('service_area');
        });
    }
};
