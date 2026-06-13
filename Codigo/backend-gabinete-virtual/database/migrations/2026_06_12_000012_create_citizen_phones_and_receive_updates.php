<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('citizens', function (Blueprint $table) {
            $table->boolean('receive_demand_updates')->default(false)->after('phone');
        });

        Schema::create('citizen_phones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('citizen_id')->constrained('citizens')->cascadeOnDelete();
            $table->string('phone');
            $table->string('normalized_phone')->unique();
            $table->timestamp('created_at')->useCurrent();

            $table->unique(['citizen_id', 'normalized_phone']);
        });

        $contentPreferences = DB::table('content_preferences')
            ->pluck('receive_content', 'citizen_id');

        $citizens = DB::table('citizens')->select('id', 'phone')->get();

        foreach ($citizens as $citizen) {
            $normalizedPhone = preg_replace('/\D+/', '', (string) $citizen->phone) ?? '';

            if (str_starts_with($normalizedPhone, '55') && strlen($normalizedPhone) > 11) {
                $normalizedPhone = substr($normalizedPhone, 2);
            }

            if ($normalizedPhone !== '') {
                DB::table('citizen_phones')->insertOrIgnore([
                    'citizen_id' => $citizen->id,
                    'phone' => $citizen->phone,
                    'normalized_phone' => $normalizedPhone,
                    'created_at' => now(),
                ]);
            }

            if ($contentPreferences->has($citizen->id)) {
                DB::table('citizens')
                    ->where('id', $citizen->id)
                    ->update([
                        'receive_demand_updates' => (bool) $contentPreferences[$citizen->id],
                    ]);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('citizen_phones');

        Schema::table('citizens', function (Blueprint $table) {
            $table->dropColumn('receive_demand_updates');
        });
    }
};
