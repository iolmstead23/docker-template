#!/bin/sh
set -e

echo "Starting webservice..."
echo "Port: ${WEBSERVICE_PORT:-3000}"
echo "Internal Port: ${WEBSERVICE_INTERNAL_PORT:-3001}"
echo "Telemetry: ${TELEMETRY_HOST:-telemetry}:${TELEMETRY_PORT:-8081}"

# Process nginx.conf with environment variable substitution
envsubst '${WEBSERVICE_PORT},${WEBSERVICE_INTERNAL_PORT}' < /etc/nginx/nginx.conf > /etc/nginx/nginx.conf.tmp
mv /etc/nginx/nginx.conf.tmp /etc/nginx/nginx.conf

exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf