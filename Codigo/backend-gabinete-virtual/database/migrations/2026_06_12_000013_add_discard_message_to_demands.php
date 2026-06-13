<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('demands', function (Blueprint $table) {
            $table->text('discard_message')->nullable()->after('status');
        });

        $histories = DB::table('demand_histories')
            ->select(['demand_id', 'metadata'])
            ->where('action', 'created')
            ->orderBy('id')
            ->get();

        foreach ($histories as $history) {
            $metadata = $history->metadata;

            if (is_string($metadata)) {
                $metadata = json_decode($metadata, true);
            } elseif (is_object($metadata)) {
                $metadata = json_decode(json_encode($metadata), true);
            }

            if (! is_array($metadata)) {
                continue;
            }

            $discardMessage = data_get($metadata, 'chatbot_validation.message');

            if (! is_string($discardMessage) || trim($discardMessage) === '') {
                continue;
            }

            DB::table('demands')
                ->where('id', $history->demand_id)
                ->whereNull('discard_message')
                ->update([
                    'discard_message' => $discardMessage,
                ]);
        }
    }

    public function down(): void
    {
        Schema::table('demands', function (Blueprint $table) {
            $table->dropColumn('discard_message');
        });
    }
};
