# Heartbeat Service

Health monitoring service that periodically checks all microservices and aggregates status.

## Purpose

The heartbeat service provides centralized health monitoring for the 3EDataToolkit platform. It performs periodic health checks of all services (default 15 seconds), aggregates health status reporting, logs health status to telemetry service, provides OpenTelemetry trace integration for monitoring workflows, and enables early detection of service failures.

## Technology Stack

- Go 1.24.0
- net/http (Go standard library)
- OpenTelemetry v1.39.0 (OTLP HTTP Trace Exporter, SDK with span creation)
- github.com/google/uuid (unique ID generation)
- go.opentelemetry.io/otel/trace (tracing API)

## Key Features

**Periodic Health Checks**: Configurable interval (default 15 seconds). Checks multiple services simultaneously via HTTP GET requests.

**Monitored Services**: Telemetry at http://telemetry:8081/status, Proxy at http://proxy:80/status, Webservice at http://webservice:3000/api/status.

**Status Aggregation**: Combines individual service health into aggregate status. Reports failures with service names. Logs all checks to telemetry service.

**Correlation IDs**: Generates unique log ID per check cycle. Links related health checks in logs. Visible in Jaeger traces.

**OpenTelemetry Tracing**: Creates spans for each health check cycle with span attributes including checked services, response times, and success/failure status.

## Configuration

| Variable                      | Description                     | Default               |
| ----------------------------- | ------------------------------- | --------------------- |
| `HEARTBEAT_INTERVAL`          | Health check interval (seconds) | `15`                  |
| `TELEMETRY_HOST`              | Telemetry service hostname      | `telemetry`           |
| `TELEMETRY_PORT`              | Telemetry service port          | `8081`                |
| `PROXY_HOST`                  | Proxy service hostname          | `proxy`               |
| `PROXY_PORT`                  | Proxy service port              | `80`                  |
| `WEBSERVICE_HOST`             | Webservice hostname             | `webservice`          |
| `WEBSERVICE_PORT`             | Webservice port                 | `3000`                |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP collector endpoint         | `otel-collector:4318` |

## Directory Structure

```
containers/heartbeat/
├── Dockerfile
├── init.sh
└── src/
    ├── main.go
    ├── monitor/monitor.go
    ├── client/telemetry.go
    └── config/config.go
```

## Dependencies

- **telemetry**: Forwards logs (required)
- **proxy**: Monitors health (required)
- **webservice**: Monitors health (required)
- **otel-collector**: Receives traces
- **Network**: Internal network only, not exposed externally

## Development

```bash
# Build
docker-compose build heartbeat

# View logs
docker-compose logs -f heartbeat

# Check aggregated health
docker-compose exec telemetry cat /var/log/telemetry/telemetry.log | grep heartbeat
```

## Observability

All health check results logged to telemetry service in format: `[timestamp] [level] [log_id] [heartbeat] message`

View traces in Jaeger UI. Each check cycle creates a span showing checked services and results.

## Troubleshooting

**Heartbeat not logging**: Check telemetry service is running. Verify TELEMETRY_HOST and TELEMETRY_PORT.

**False health failures**: Increase check interval with HEARTBEAT_INTERVAL=30. Check service startup times.

**Service not starting**: Heartbeat depends on telemetry, proxy, webservice being healthy. Check with `docker-compose ps`.
