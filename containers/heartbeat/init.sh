#!/bin/sh
set -e

echo "Starting heartbeat service..."
echo "Interval: ${HEARTBEAT_INTERVAL:-15} seconds"
echo "Telemetry: ${TELEMETRY_HOST:-telemetry}:${TELEMETRY_PORT:-8081}"

exec ./heartbeat
