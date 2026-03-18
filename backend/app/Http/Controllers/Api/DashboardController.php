<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Driver;
use App\Models\FuelRecord;
use App\Models\Maintenance;
use App\Models\Vehicle;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(): JsonResponse
    {
        $payload = Cache::remember('dashboard:v1', now()->addSeconds(30), function () {
            $totalVehicles = Vehicle::count();
            $vehiclesUnderMaintenance = Vehicle::where('status', 'maintenance')->count();
            $activeDrivers = Driver::whereNotNull('vehicle_id')->count();

            $fuelTotals = FuelRecord::selectRaw('SUM(liters) as total_liters, SUM(price) as total_cost')->first();

            $recentMaintenances = Maintenance::with('vehicle')
                ->orderByDesc('date')
                ->limit(10)
                ->get();

            $vehiclesByStatus = Vehicle::query()
                ->select('status', DB::raw('COUNT(*) as count'))
                ->groupBy('status')
                ->orderBy('status')
                ->get()
                ->map(fn ($r) => ['status' => (string) $r->status, 'count' => (int) $r->count])
                ->values();

            $fuelByMonth = FuelRecord::query()
                ->selectRaw("DATE_FORMAT(`date`, '%Y-%m') as ym, SUM(liters) as liters, SUM(price) as cost")
                ->where('date', '>=', now()->subMonths(6)->startOfMonth())
                ->groupBy('ym')
                ->orderBy('ym')
                ->get()
                ->map(fn ($r) => [
                    'ym' => (string) $r->ym,
                    'liters' => (float) ($r->liters ?? 0),
                    'cost' => (float) ($r->cost ?? 0),
                ])
                ->values();

            $maintenanceByMonth = Maintenance::query()
                ->selectRaw("DATE_FORMAT(`date`, '%Y-%m') as ym, COUNT(*) as count, SUM(cost) as cost")
                ->where('date', '>=', now()->subMonths(6)->startOfMonth())
                ->groupBy('ym')
                ->orderBy('ym')
                ->get()
                ->map(fn ($r) => [
                    'ym' => (string) $r->ym,
                    'count' => (int) ($r->count ?? 0),
                    'cost' => (float) ($r->cost ?? 0),
                ])
                ->values();

            return [
                'total_vehicles' => $totalVehicles,
                'vehicles_under_maintenance' => $vehiclesUnderMaintenance,
                'active_drivers' => $activeDrivers,
                'fuel' => [
                    'total_liters' => (float) ($fuelTotals->total_liters ?? 0),
                    'total_cost' => (float) ($fuelTotals->total_cost ?? 0),
                ],
                'series' => [
                    'vehicles_by_status' => $vehiclesByStatus,
                    'fuel_by_month' => $fuelByMonth,
                    'maintenance_by_month' => $maintenanceByMonth,
                ],
                'recent_maintenances' => $recentMaintenances,
            ];
        });

        return response()->json($payload);
    }
}
