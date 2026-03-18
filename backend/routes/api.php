<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AlertController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DriverController;
use App\Http\Controllers\Api\FuelRecordController;
use App\Http\Controllers\Api\MaintenanceController;
use App\Http\Controllers\Api\VehicleController;
use Illuminate\Support\Facades\Route;

// Some auth middlewares expect a named "login" route for guest redirects.
// This API returns JSON instead of redirecting to a web login page.
Route::get('/login', fn () => response()->json(['message' => 'Unauthenticated.'], 401))->name('login');
Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);
Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/reset-password', [AuthController::class, 'resetPassword']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);

    Route::get('/dashboard', [DashboardController::class, 'index']);
    Route::get('/alerts', [AlertController::class, 'index']);

    // Vehicles: Admin full CRUD, Fleet Manager read-only
    Route::get('/vehicles', [VehicleController::class, 'index']);
    Route::get('/vehicles/{vehicle}', [VehicleController::class, 'show']);
    Route::middleware('role:administrator')->group(function () {
        Route::post('/vehicles', [VehicleController::class, 'store']);
        Route::put('/vehicles/{vehicle}', [VehicleController::class, 'update']);
        Route::delete('/vehicles/{vehicle}', [VehicleController::class, 'destroy']);
    });

    // Drivers: Admin only
    Route::middleware('role:administrator')->apiResource('drivers', DriverController::class);

    // Maintenance: Admin full, Fleet Manager can add/view
    Route::get('/maintenances', [MaintenanceController::class, 'index']);
    Route::get('/maintenances/{maintenance}', [MaintenanceController::class, 'show']);
    Route::post('/maintenances', [MaintenanceController::class, 'store']);
    Route::middleware('role:administrator')->group(function () {
        Route::put('/maintenances/{maintenance}', [MaintenanceController::class, 'update']);
        Route::delete('/maintenances/{maintenance}', [MaintenanceController::class, 'destroy']);
    });

    // Fuel: Admin full, Fleet Manager can add/view
    Route::get('/fuel-records', [FuelRecordController::class, 'index']);
    Route::get('/fuel-records/{fuelRecord}', [FuelRecordController::class, 'show']);
    Route::post('/fuel-records', [FuelRecordController::class, 'store']);
    Route::middleware('role:administrator')->group(function () {
        Route::put('/fuel-records/{fuelRecord}', [FuelRecordController::class, 'update']);
        Route::delete('/fuel-records/{fuelRecord}', [FuelRecordController::class, 'destroy']);
    });
});
