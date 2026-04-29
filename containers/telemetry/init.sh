#!/bin/sh
set -e

echo "Starting telemetry service..."
echo "Log path: ${TELEMETRY_LOG_PATH:-/var/log/telemetry}"
echo "Port: ${TELEMETRY_PORT:-8081}"
echo "Max file size: ${TELEMETRY_MAX_FILE_SIZE:-1048576} bytes"
echo "OTLP endpoint: ${OTEL_EXPORTER_OTLP_ENDPOINT:-otel-collector:4318}"

mkdir -p "${TELEMETRY_LOG_PATH:-/var/log/telemetry}"

exec ./telemetry
