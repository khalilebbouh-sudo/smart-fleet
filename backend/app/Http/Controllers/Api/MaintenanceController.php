<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Maintenance;
use App\Models\Vehicle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MaintenanceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Maintenance::with('vehicle');

        if ($request->filled('vehicle_id')) {
            $query->where('vehicle_id', $request->vehicle_id);
        }

        $perPage = (int) $request->integer('per_page', 15);
        $perPage = max(1, min(100, $perPage));

        $maintenances = $query->orderByDesc('date')->paginate($perPage);

        return response()->json($maintenances);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'vehicle_id' => 'required|exists:vehicles,id',
            'maintenance_type' => 'required|string|max:255',
            'description' => 'nullable|string',
            'date' => 'required|date',
            'odometer' => 'nullable|integer|min:0',
            'cost' => 'required|numeric|min:0',
        ]);

        $maintenance = Maintenance::create($validated);

        return response()->json($maintenance->load('vehicle'), 201);
    }

    public function show(Maintenance $maintenance): JsonResponse
    {
        $maintenance->load('vehicle');
        return response()->json($maintenance);
    }

    public function update(Request $request, Maintenance $maintenance): JsonResponse
    {
        $validated = $request->validate([
            'vehicle_id' => 'sometimes|exists:vehicles,id',
            'maintenance_type' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'date' => 'sometimes|date',
            'odometer' => 'nullable|integer|min:0',
            'cost' => 'sometimes|numeric|min:0',
        ]);

        $maintenance->update($validated);

        return response()->json($maintenance->fresh('vehicle'));
    }

    public function destroy(Maintenance $maintenance): JsonResponse
    {
        $maintenance->delete();
        return response()->json(null, 204);
    }
}
