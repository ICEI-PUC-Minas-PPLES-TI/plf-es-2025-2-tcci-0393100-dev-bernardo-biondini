<?php

namespace App\Services\Auth;

use App\Models\AccessProfile;
use App\Models\ApiToken;
use App\Models\User;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\UnauthorizedHttpException;

class AuthService
{
    public function register(array $data): array
    {
        $accessProfile = $this->resolveAccessProfile($data['access_profile_id'] ?? null);

        $user = User::query()->create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'access_profile_id' => $accessProfile->id,
        ]);

        return $this->issueTokenForUser(
            $user->load('access_profile.permissions'),
            $data['device_name'] ?? 'web',
        );
    }

    public function login(array $credentials): array
    {
        $user = User::query()
            ->where('email', $credentials['email'])
            ->with('access_profile.permissions')
            ->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw new AuthenticationException('Credenciais inválidas.');
        }

        return $this->issueTokenForUser($user, $credentials['device_name'] ?? 'web');
    }

    public function logout(User $user, string $plainTextToken): void
    {
        $hashedToken = hash('sha256', $plainTextToken);

        $user->apiTokens()
            ->where('token', $hashedToken)
            ->delete();
    }

    public function getAuthenticatedUser(User $user): User
    {
        return $user->load('access_profile.permissions');
    }

    public function resolveUserFromToken(?string $plainTextToken): ?User
    {
        if (! $plainTextToken) {
            return null;
        }

        $hashedToken = hash('sha256', $plainTextToken);

        $token = ApiToken::query()
            ->where('token', $hashedToken)
            ->where(function ($query) {
                $query->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            })
            ->with('user.access_profile.permissions')
            ->first();

        if (! $token) {
            return null;
        }

        $token->forceFill(['last_used_at' => now()])->save();

        return $token->user;
    }

    public function extractBearerToken(?string $authorizationHeader): string
    {
        if (! $authorizationHeader || ! Str::startsWith($authorizationHeader, 'Bearer ')) {
            throw new UnauthorizedHttpException('Bearer', 'Token de autenticação ausente.');
        }

        return Str::after($authorizationHeader, 'Bearer ');
    }

    private function issueTokenForUser(User $user, string $deviceName): array
    {
        $plainTextToken = Str::random(64);

        $user->apiTokens()->create([
            'name' => $deviceName,
            'token' => hash('sha256', $plainTextToken),
        ]);

        return [
            'user' => $user,
            'token' => $plainTextToken,
            'token_type' => 'Bearer',
        ];
    }

    private function resolveAccessProfile(?int $accessProfileId): AccessProfile
    {
        if ($accessProfileId) {
            return AccessProfile::query()->findOrFail($accessProfileId);
        }

        return AccessProfile::query()->firstOrCreate(
            ['name' => 'Usuario padrao'],
            ['description' => 'Perfil inicial para novos acessos.'],
        );
    }
}
