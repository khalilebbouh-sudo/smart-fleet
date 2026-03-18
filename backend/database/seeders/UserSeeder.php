<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $users = [
            [
                'email' => 'admin@fleet.local',
                'name' => 'Admin',
                'password' => Hash::make('password'),
                'role' => 'administrator',
            ],
            [
                'email' => 'manager@fleet.local',
                'name' => 'Fleet Manager',
                'password' => Hash::make('password'),
                'role' => 'fleet_manager',
            ],
            [
                'email' => 'khalil@gmail.com',
                'name' => 'Khalil',
                'password' => Hash::make('password'),
                'role' => 'administrator',
            ],
            [
                'email' => 'admin@gmail.com',
                'name' => 'Admin',
                'password' => Hash::make('password'),
                'role' => 'administrator',
            ],
        ];

        foreach ($users as $data) {
            User::updateOrCreate(
                ['email' => $data['email']],
                $data
            );
        }
    }
}
