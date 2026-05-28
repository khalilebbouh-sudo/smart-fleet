<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Support\Facades\Storage;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = ['name', 'email', 'password', 'role', 'photo_path'];

    protected $hidden = ['password', 'remember_token'];

    protected $appends = ['photo_url'];

    public function getPhotoUrlAttribute(): ?string
    {
        if (! $this->photo_path) return null;
        return url(Storage::disk('public')->url($this->photo_path));
    }

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function isAdministrator(): bool
    {
        return $this->role === 'admin';
    }

    public function isFleetManager(): bool
    {
        return $this->role === 'gestionnaire';
    }

    public function isUser(): bool
    {
        return $this->role === 'user';
    }

    public function missions(): BelongsToMany
    {
        return $this->belongsToMany(Mission::class)->withTimestamps();
    }
}
