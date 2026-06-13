<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('demands', function (Blueprint $table) {
            $table->string('oficio_path')->nullable()->after('discard_message');
            $table->string('oficio_original_name')->nullable()->after('oficio_path');
            $table->string('oficio_mime_type')->nullable()->after('oficio_original_name');
        });
    }

    public function down(): void
    {
        Schema::table('demands', function (Blueprint $table) {
            $table->dropColumn([
                'oficio_path',
                'oficio_original_name',
                'oficio_mime_type',
            ]);
        });
    }
};
