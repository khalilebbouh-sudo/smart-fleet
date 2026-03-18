<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vehicle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VehicleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Vehicle::with(['driver']);

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('brand', 'like', "%{$search}%")
                    ->orWhere('model', 'like', "%{$search}%")
                    ->orWhere('license_plate', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $perPage = (int) $request->integer('per_page', 15);
        $perPage = max(1, min(100, $perPage));

        $vehicles = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json($vehicles);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'brand' => 'required|string|max:255',
            'model' => 'required|string|max:255',
            'license_plate' => 'required|string|max:255|unique:vehicles',
            'year' => 'required|integer|min:1900|max:' . (date('Y') + 1),
            'mileage' => 'required|integer|min:0',
            'status' => 'required|in:active,maintenance,inactive',
        ]);

        $vehicle = Vehicle::create($validated);

        return response()->json($vehicle->load('driver'), 201);
    }

    public function show(Vehicle $vehicle): JsonResponse
    {
        $vehicle->load(['driver', 'maintenances', 'fuelRecords']);
        return response()->json($vehicle);
    }

    public function update(Request $request, Vehicle $vehicle): JsonResponse
    {
        $validated = $request->validate([
            'brand' => 'sometimes|string|max:255',
            'model' => 'sometimes|string|max:255',
            'license_plate' => 'sometimes|string|max:255|unique:vehicles,license_plate,' . $vehicle->id,
            'year' => 'sometimes|integer|min:1900|max:' . (date('Y') + 1),
            'mileage' => 'sometimes|integer|min:0',
            'status' => 'sometimes|in:active,maintenance,inactive',
        ]);

        $vehicle->update($validated);

        return response()->json($vehicle->fresh('driver'));
    }

    public function destroy(Vehicle $vehicle): JsonResponse
    {
        $vehicle->delete();
        return response()->json(null, 204);
    }
}
