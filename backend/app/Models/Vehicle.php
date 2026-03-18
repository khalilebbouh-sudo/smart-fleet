<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Vehicle extends Model
{
    use HasFactory;

    protected $fillable = [
        'brand', 'model', 'license_plate', 'year', 'mileage', 'status',
    ];

    protected function casts(): array
    {
        return [
            'year' => 'integer',
            'mileage' => 'integer',
        ];
    }

    public function driver(): HasOne
    {
        return $this->hasOne(Driver::class);
    }

    public function maintenances(): HasMany
    {
        return $this->hasMany(Maintenance::class)->orderByDesc('date');
    }

    public function fuelRecords(): HasMany
    {
        return $this->hasMany(FuelRecord::class)->orderByDesc('date');
    }
}
