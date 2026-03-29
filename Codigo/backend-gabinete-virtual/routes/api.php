<?php

use App\Http\Controllers\Api\AccessProfileController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ChatbotDemandController;
use App\Http\Controllers\Api\DemandController;
use App\Http\Controllers\Api\DemandHistoryController;
use App\Http\Controllers\Api\PermissionController;
use App\Http\Controllers\Api\UserController;
use App\Support\PermissionCodes;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::get('/me', [AuthController::class, 'me'])->middleware('auth:api');
    Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:api');
});

Route::get('/access-profiles', [AccessProfileController::class, 'index']);

Route::prefix('chatbot')->middleware('chatbot.internal')->group(function () {
    Route::get('/demand-options', [ChatbotDemandController::class, 'options']);
    Route::post('/demands', [ChatbotDemandController::class, 'store']);
});

Route::middleware('auth:api')->group(function () {
    Route::get('/permissions', [PermissionController::class, 'index'])
        ->middleware('permission:'.PermissionCodes::ROLES_VIEW);

    Route::prefix('roles')->group(function () {
        Route::get('/', [AccessProfileController::class, 'index'])
            ->middleware('permission:'.PermissionCodes::ROLES_VIEW);
        Route::post('/', [AccessProfileController::class, 'store'])
            ->middleware('permission:'.PermissionCodes::ROLES_CREATE);
        Route::get('/{id}', [AccessProfileController::class, 'show'])
            ->middleware('permission:'.PermissionCodes::ROLES_VIEW);
        Route::put('/{id}', [AccessProfileController::class, 'update'])
            ->middleware('permission:'.PermissionCodes::ROLES_UPDATE);
        Route::delete('/{id}', [AccessProfileController::class, 'destroy'])
            ->middleware('permission:'.PermissionCodes::ROLES_DELETE);
    });

    Route::prefix('users')->group(function () {
        Route::get('/', [UserController::class, 'index'])
            ->middleware('permission:'.PermissionCodes::USERS_VIEW);
        Route::post('/', [UserController::class, 'store'])
            ->middleware('permission:'.PermissionCodes::USERS_CREATE);
    });

    Route::prefix('demands')->group(function () {
        Route::get('/', [DemandController::class, 'index'])
            ->middleware('permission:'.PermissionCodes::DEMANDS_MANAGE);
        Route::get('/options', [DemandController::class, 'options'])
            ->middleware('permission:'.PermissionCodes::DEMANDS_MANAGE);
        Route::get('/{id}/histories', [DemandHistoryController::class, 'indexByDemand'])
            ->middleware('permission:'.PermissionCodes::DEMANDS_MANAGE);
        Route::post('/', [DemandController::class, 'store'])
            ->middleware('permission:'.PermissionCodes::DEMANDS_MANAGE);
        Route::get('/{id}', [DemandController::class, 'show'])
            ->middleware('permission:'.PermissionCodes::DEMANDS_MANAGE);
        Route::put('/{id}', [DemandController::class, 'update'])
            ->middleware('permission:'.PermissionCodes::DEMANDS_MANAGE);
        Route::delete('/{id}', [DemandController::class, 'destroy'])
            ->middleware('permission:'.PermissionCodes::DEMANDS_MANAGE);
    });
});
