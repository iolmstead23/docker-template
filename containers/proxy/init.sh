#!/bin/sh
set -e

echo "Starting proxy service (Caddy with tracing)..."
echo "Proxy port: ${PROXY_PORT:-80}"
echo "Webservice: ${WEBSERVICE_HOST:-webservice}:${WEBSERVICE_PORT:-3000}"
echo "Telemetry: ${TELEMETRY_HOST:-telemetry}:${TELEMETRY_PORT:-8081}"

exec ./caddy run --config /etc/caddy/Caddyfile
