<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            DB::statement("ALTER TABLE demands DROP CONSTRAINT IF EXISTS demands_status_check");
            DB::statement(
                "ALTER TABLE demands ADD CONSTRAINT demands_status_check CHECK (status IN ('open', 'under_review', 'in_progress', 'completed', 'discarded'))"
            );

            return;
        }

        if ($driver === 'mysql') {
            DB::statement(
                "ALTER TABLE demands MODIFY status ENUM('open', 'under_review', 'in_progress', 'completed', 'discarded') NOT NULL"
            );
        }
    }

    public function down(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            DB::statement("ALTER TABLE demands DROP CONSTRAINT IF EXISTS demands_status_check");
            DB::statement(
                "ALTER TABLE demands ADD CONSTRAINT demands_status_check CHECK (status IN ('open', 'under_review', 'in_progress', 'completed'))"
            );

            return;
        }

        if ($driver === 'mysql') {
            DB::statement(
                "ALTER TABLE demands MODIFY status ENUM('open', 'under_review', 'in_progress', 'completed') NOT NULL"
            );
        }
    }
};
