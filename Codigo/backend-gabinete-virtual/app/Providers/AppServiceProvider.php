<?php

namespace App\Providers;

use App\Exceptions\Handler as AppExceptionHandler;
use App\Services\Auth\AuthService;
use Dedoc\Scramble\OpenApiContext;
use Dedoc\Scramble\Scramble;
use Dedoc\Scramble\Support\Generator\OpenApi;
use Dedoc\Scramble\Support\Generator\SecurityRequirement;
use Dedoc\Scramble\Support\Generator\SecurityScheme;
use Illuminate\Contracts\Debug\ExceptionHandler;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

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

        Scramble::afterOpenApiGenerated(function (OpenApi $document, OpenApiContext $context): void {
            $document->components->addSecurityScheme(
                'bearerAuth',
                SecurityScheme::http('bearer', 'Bearer')
                    ->as('bearerAuth')
                    ->setDescription('Informe o token Bearer obtido em /api/auth/login ou /api/auth/register.'),
            );

            $document->components->addSecurityScheme(
                'chatbotToken',
                SecurityScheme::apiKey('header', 'X-Chatbot-Token')
                    ->as('chatbotToken')
                    ->setDescription('Token interno usado pelos endpoints protegidos do chatbot.'),
            );

            $routeSecurity = [];
            $apiPrefix = trim((string) config('scramble.api_path', 'api'), '/');

            foreach (app('router')->getRoutes() as $route) {
                $uri = trim($route->uri(), '/');

                if ($apiPrefix === '' || ! Str::startsWith($uri, $apiPrefix)) {
                    continue;
                }

                $normalizedUri = trim(Str::after($uri, $apiPrefix), '/');
                $middlewares = $route->gatherMiddleware();
                $security = [];

                if (in_array('auth:api', $middlewares, true)) {
                    $security[] = new SecurityRequirement(['bearerAuth' => []]);
                }

                if (in_array('chatbot.internal', $middlewares, true)) {
                    $security[] = new SecurityRequirement(['chatbotToken' => []]);
                }

                if ($security === []) {
                    continue;
                }

                foreach (array_filter($route->methods(), fn (string $method) => $method !== 'HEAD') as $method) {
                    $routeSecurity[$normalizedUri][strtolower($method)] = $security;
                }
            }

            foreach ($document->paths as $path) {
                $normalizedPath = trim($path->path, '/');

                foreach ($path->operations as $method => $operation) {
                    $operation->security = $routeSecurity[$normalizedPath][$method] ?? null;
                }
            }
        });
    }
}
