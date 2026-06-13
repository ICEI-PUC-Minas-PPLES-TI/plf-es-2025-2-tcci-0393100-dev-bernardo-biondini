<?php

use App\Http\Controllers\Api\AccessProfileController;
use App\Http\Controllers\Api\AgendaController;
use App\Http\Controllers\Api\AmendmentController;
use App\Http\Controllers\Api\CmsController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ChatbotDemandController;
use App\Http\Controllers\Api\DemandController;
use App\Http\Controllers\Api\DemandAlertController;
use App\Http\Controllers\Api\DemandHistoryController;
use App\Http\Controllers\Api\NewsController;
use App\Http\Controllers\Api\PermissionController;
use App\Http\Controllers\Api\ProjectLawController;
use App\Http\Controllers\Api\SiteProjectController;
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
Route::get('/site-content', [CmsController::class, 'publicOverview']);
Route::get('/content/{key}', [CmsController::class, 'showPublic']);
Route::get('/news', [NewsController::class, 'publicIndex']);
Route::get('/site-projects', [SiteProjectController::class, 'publicIndex']);

Route::prefix('chatbot')->middleware('chatbot.internal')->group(function () {
    Route::get('/demand-options', [ChatbotDemandController::class, 'options']);
    Route::get('/cities', [ChatbotDemandController::class, 'searchCities']);
    Route::get('/cities/{city}/institutions', [ChatbotDemandController::class, 'cityInstitutions']);
    Route::get('/citizens/lookup', [ChatbotDemandController::class, 'lookupCitizen']);
    Route::post('/citizens', [ChatbotDemandController::class, 'storeCitizen']);
    Route::post('/demands', [ChatbotDemandController::class, 'store']);
    Route::get('/demands/open', [ChatbotDemandController::class, 'openDemands']);
    Route::get('/demands/{id}/status', [ChatbotDemandController::class, 'status']);
});

Route::middleware('auth:api')->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'show']);
    Route::get('/alerts', [DemandAlertController::class, 'index']);
    Route::post('/alerts/{id}/read', [DemandAlertController::class, 'markAsRead']);

    Route::get('/permissions', [PermissionController::class, 'index'])
        ->middleware('permission:'.PermissionCodes::ROLES_VIEW);

    Route::prefix('roles')->group(function () {
        Route::get('/', [AccessProfileController::class, 'adminIndex'])
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
        Route::get('/', [DemandController::class, 'index']);
        Route::get('/options', [DemandController::class, 'options']);
        Route::get('/{id}/histories', [DemandHistoryController::class, 'indexByDemand']);
        Route::get('/{id}/oficio/download', [DemandController::class, 'downloadOficio']);
        Route::post('/', [DemandController::class, 'store']);
        Route::get('/{id}', [DemandController::class, 'show']);
        Route::put('/{id}', [DemandController::class, 'update']);
        Route::delete('/{id}', [DemandController::class, 'destroy']);
    });

    Route::prefix('amendments')->group(function () {
        Route::get('/', [AmendmentController::class, 'index'])
            ->middleware('permission:'.PermissionCodes::AMENDMENTS_MANAGE);
        Route::get('/options', [AmendmentController::class, 'options'])
            ->middleware('permission:'.PermissionCodes::AMENDMENTS_MANAGE);
        Route::post('/', [AmendmentController::class, 'store'])
            ->middleware('permission:'.PermissionCodes::AMENDMENTS_MANAGE);
        Route::put('/{id}/status', [AmendmentController::class, 'updateStatus'])
            ->middleware('permission:'.PermissionCodes::AMENDMENTS_MANAGE);
        Route::get('/{id}', [AmendmentController::class, 'show'])
            ->middleware('permission:'.PermissionCodes::AMENDMENTS_MANAGE);
        Route::put('/{id}', [AmendmentController::class, 'update'])
            ->middleware('permission:'.PermissionCodes::AMENDMENTS_MANAGE);
        Route::delete('/{id}', [AmendmentController::class, 'destroy'])
            ->middleware('permission:'.PermissionCodes::AMENDMENTS_MANAGE);
    });

    Route::prefix('project-laws')->group(function () {
        Route::get('/', [ProjectLawController::class, 'index'])
            ->middleware('permission:'.PermissionCodes::PROJECT_LAWS_MANAGE);
        Route::get('/options', [ProjectLawController::class, 'options'])
            ->middleware('permission:'.PermissionCodes::PROJECT_LAWS_MANAGE);
        Route::post('/', [ProjectLawController::class, 'store'])
            ->middleware('permission:'.PermissionCodes::PROJECT_LAWS_MANAGE);
        Route::put('/{id}/status', [ProjectLawController::class, 'updateStatus'])
            ->middleware('permission:'.PermissionCodes::PROJECT_LAWS_MANAGE);
        Route::get('/{id}', [ProjectLawController::class, 'show'])
            ->middleware('permission:'.PermissionCodes::PROJECT_LAWS_MANAGE);
        Route::put('/{id}', [ProjectLawController::class, 'update'])
            ->middleware('permission:'.PermissionCodes::PROJECT_LAWS_MANAGE);
        Route::delete('/{id}', [ProjectLawController::class, 'destroy'])
            ->middleware('permission:'.PermissionCodes::PROJECT_LAWS_MANAGE);
    });

    Route::prefix('agenda')->group(function () {
        Route::get('/events', [AgendaController::class, 'index'])
            ->middleware('permission:'.PermissionCodes::AGENDA_MANAGE);
        Route::get('/events/options', [AgendaController::class, 'options'])
            ->middleware('permission:'.PermissionCodes::AGENDA_MANAGE);
        Route::post('/events', [AgendaController::class, 'store'])
            ->middleware('permission:'.PermissionCodes::AGENDA_MANAGE);
        Route::get('/events/{id}', [AgendaController::class, 'show'])
            ->middleware('permission:'.PermissionCodes::AGENDA_MANAGE);
        Route::put('/events/{id}', [AgendaController::class, 'update'])
            ->middleware('permission:'.PermissionCodes::AGENDA_MANAGE);
        Route::delete('/events/{id}', [AgendaController::class, 'destroy'])
            ->middleware('permission:'.PermissionCodes::AGENDA_MANAGE);

        Route::get('/alerts', [AgendaController::class, 'listAlerts']);
        Route::post('/alerts/{id}/read', [AgendaController::class, 'markAlertAsRead']);
        Route::post('/alerts', [AgendaController::class, 'storeAlert'])
            ->middleware('permission:'.PermissionCodes::AGENDA_MANAGE);
        Route::delete('/alerts/{id}', [AgendaController::class, 'destroyAlert']);
    });

    Route::prefix('cms')->middleware('permission:'.PermissionCodes::CMS_MANAGE)->group(function () {
        Route::get('/sections', [CmsController::class, 'index']);
        Route::get('/options', [CmsController::class, 'options']);
        Route::put('/sections/{key}', [CmsController::class, 'update']);

        Route::get('/news', [NewsController::class, 'index']);
        Route::get('/news/{id}', [NewsController::class, 'show']);
        Route::post('/news', [NewsController::class, 'store']);
        Route::put('/news/{id}', [NewsController::class, 'update']);
        Route::delete('/news/{id}', [NewsController::class, 'destroy']);

        Route::get('/site-projects', [SiteProjectController::class, 'index']);
        Route::get('/site-projects/{id}', [SiteProjectController::class, 'show']);
        Route::post('/site-projects', [SiteProjectController::class, 'store']);
        Route::put('/site-projects/{id}', [SiteProjectController::class, 'update']);
        Route::delete('/site-projects/{id}', [SiteProjectController::class, 'destroy']);
    });
});
