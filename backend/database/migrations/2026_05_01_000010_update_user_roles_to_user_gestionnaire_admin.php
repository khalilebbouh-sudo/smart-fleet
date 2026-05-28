<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::getDriverName();

        // This project uses MySQL/MariaDB (ENUM). Adjust safely in 3 steps:
        // 1) broaden enum to accept both old + new values
        // 2) update stored values
        // 3) narrow enum to the new canonical values and default to "user"
        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            DB::statement("ALTER TABLE users MODIFY role ENUM('administrator','fleet_manager','user','gestionnaire','admin') NOT NULL DEFAULT 'user'");
        }

        DB::table('users')->where('role', 'administrator')->update(['role' => 'admin']);
        DB::table('users')->where('role', 'fleet_manager')->update(['role' => 'gestionnaire']);

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            DB::statement("ALTER TABLE users MODIFY role ENUM('user','gestionnaire','admin') NOT NULL DEFAULT 'user'");
        }
    }

    public function down(): void
    {
        $driver = DB::getDriverName();

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            DB::statement("ALTER TABLE users MODIFY role ENUM('administrator','fleet_manager') NOT NULL DEFAULT 'fleet_manager'");
        }

        DB::table('users')->where('role', 'admin')->update(['role' => 'administrator']);
        DB::table('users')->where('role', 'gestionnaire')->update(['role' => 'fleet_manager']);
        DB::table('users')->where('role', 'user')->update(['role' => 'fleet_manager']);
    }
};

