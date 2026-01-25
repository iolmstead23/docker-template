# Telemetry Service

Centralized logging service with automatic file rotation and OpenTelemetry integration.

## Purpose

The telemetry service acts as a centralized log aggregator for all microservices in the 3EDataToolkit platform. It provides HTTP endpoint for log ingestion, structured log formatting with correlation IDs, automatic log file rotation based on file size, recovery mechanism for externally deleted log files, and OpenTelemetry trace export.

## Technology Stack

- Go 1.24.0, OpenTelemetry v1.39.0
- github.com/google/uuid

## Key Features

**HTTP Log Endpoint**: POST /log accepts JSON requests with level, message, log_id, and source fields.

**Structured Log Format**: JSONL (JSON Lines) - one JSON object per line with fields: timestamp, level, log_id, source, message. Example: `{"timestamp":"2026-01-24T12:34:56.000Z","level":"INFO","log_id":"test-123","source":"test","message":"Test log"}`

**Log Rotation**: Size-based rotation (default 1MB per file). Files named with timestamps and session ID: `telemetry-YYYYMMDD-HHMMSS-SESSION.log` (e.g., `telemetry-20260124-123456-a1b2c3d4.log`).

**File Recovery**: Periodic validation (default every 10 writes) with automatic recreation if deleted.

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `TELEMETRY_PORT` | HTTP server port | `8081` |
| `TELEMETRY_LOG_PATH` | Log file directory | `/var/log/telemetry` |
| `TELEMETRY_MAX_FILE_SIZE` | Rotation threshold (bytes) | `1048576` (1MB) |
| `TELEMETRY_VALIDATION_INTERVAL` | File check frequency (writes) | `10` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP collector endpoint | `otel-collector:4318` |

## Directory Structure

```
containers/telemetry/
├── Dockerfile
├── init.sh
└── src/
    ├── main.go
    ├── api/handler.go
    ├── logger/logger.go
    ├── rotation/rotation.go
    └── config/config.go
```

## Dependencies

- **otel-collector**: Receives traces via OTLP HTTP
- **Network**: Internal network only, not exposed externally

## API Reference

### POST /log

```bash
curl -X POST http://telemetry:8081/log \
  -H "Content-Type: application/json" \
  -d '{"level":"info","message":"Test log","log_id":"test-123","source":"test"}'
```

Response: `200 OK`

### GET /status

Health check endpoint. Response: `200 OK` with JSON body `{"status":"ok","session_id":"..."}`

## Development

```bash
# Build
docker-compose build telemetry

# Test
curl -X POST http://localhost:8081/log \
  -H "Content-Type: application/json" \
  -d '{"level":"info","message":"Test","log_id":"test-123","source":"test"}'

# View logs (use wildcard due to timestamped filenames)
cat logs/telemetry-*.log
# or list all log files
ls -la logs/
```

## Troubleshooting

**Log files not created**: Check volume mounts in docker-compose.yml and verify TELEMETRY_LOG_PATH directory permissions.

**Service not accepting logs**: Verify port 8081 is not in use, check Docker network connectivity.

**Traces not appearing in Jaeger**: Confirm OTEL_EXPORTER_OTLP_ENDPOINT points to collector, check otel-collector service is running.
