#!/bin/sh
set -e

echo "Starting webservice..."
echo "Port: ${WEBSERVICE_PORT:-3000}"
echo "Telemetry: ${TELEMETRY_HOST:-telemetry}:${TELEMETRY_PORT:-8081}"

exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
