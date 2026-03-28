<?php

namespace App\Providers;

use App\Exceptions\Handler as AppExceptionHandler;
use App\Services\Auth\AuthService;
use Illuminate\Contracts\Debug\ExceptionHandler;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(ExceptionHandler::class, AppExceptionHandler::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Auth::viaRequest('api-token', function ($request) {
            return app(AuthService::class)->resolveUserFromToken($request->bearerToken());
        });
    }
}
