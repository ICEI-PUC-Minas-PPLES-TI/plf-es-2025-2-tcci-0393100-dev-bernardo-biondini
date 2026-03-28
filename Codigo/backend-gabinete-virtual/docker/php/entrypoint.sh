#!/bin/sh
set -eu

cd /var/www/html

if [ ! -f .env ]; then
  if [ -f .env.docker.example ]; then
    cp .env.docker.example .env
  elif [ -f .env.example ]; then
    cp .env.example .env
  fi
fi

if [ ! -d vendor ]; then
  composer install --no-interaction --prefer-dist
fi

if ! grep -q "^APP_KEY=base64:" .env; then
  php artisan key:generate --force
fi

until php artisan migrate --force; do
  echo "Aguardando banco de dados..."
  sleep 3
done

chown -R www-data:www-data storage bootstrap/cache
chmod -R ug+rwx storage bootstrap/cache

exec "$@"
