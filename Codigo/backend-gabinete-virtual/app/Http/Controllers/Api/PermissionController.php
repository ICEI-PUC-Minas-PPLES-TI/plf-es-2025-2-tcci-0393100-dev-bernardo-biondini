<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Permission\ListPermissionRequest;
use App\Models\Permission;
use Illuminate\Http\JsonResponse;

class PermissionController extends Controller
{
    public function index(ListPermissionRequest $request): JsonResponse
    {
        $permissions = Permission::query()
            ->orderBy('code')
            ->get(['id', 'code', 'description']);

        return response()->json([
            'data' => $permissions,
        ]);
    }
}
