<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Driver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DriverController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Driver::with('vehicle');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('license_number', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $drivers = $query->orderBy('created_at', 'desc')->paginate(15);

        return response()->json($drivers);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:50',
            'license_number' => 'nullable|string|max:255',
            'address' => 'nullable|string',
            'vehicle_id' => 'nullable|exists:vehicles,id',
        ]);

        $driver = Driver::create($validated);

        return response()->json($driver->load('vehicle'), 201);
    }

    public function show(Driver $driver): JsonResponse
    {
        $driver->load('vehicle');
        return response()->json($driver);
    }

    public function update(Request $request, Driver $driver): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'phone' => 'nullable|string|max:50',
            'license_number' => 'nullable|string|max:255',
            'address' => 'nullable|string',
            'vehicle_id' => 'nullable|exists:vehicles,id',
        ]);

        $driver->update($validated);

        return response()->json($driver->fresh('vehicle'));
    }

    public function destroy(Driver $driver): JsonResponse
    {
        $driver->delete();
        return response()->json(null, 204);
    }
}
