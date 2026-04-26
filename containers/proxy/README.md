# Proxy Service

Reverse proxy with custom OpenTelemetry tracing middleware and correlation ID generation.

## Purpose

The proxy service provides the public-facing HTTP interface for the 3EDataToolkit platform. It serves as a reverse proxy to the webservice backend, generates unique correlation IDs (X-Log-ID) for request tracking, implements W3C trace context propagation, forwards logs to centralized telemetry service, and filters health checks to reduce trace noise.

## Technology Stack

- Caddy v2.7.6 (Go-based web server)
- Go 1.24.0
- OpenTelemetry v1.39.0 (OTLP HTTP Trace Exporter, custom middleware for span creation)
- github.com/caddyserver/caddy/v2 (core proxy functionality)
- go.opentelemetry.io/otel (tracing instrumentation)

## Key Features

**Reverse Proxy**: Routes all requests to webservice backend with transparent header forwarding. Status endpoint at /status returns 200 OK.

**Correlation ID Generation**: Generates unique X-Log-ID header for each request using OpenTelemetry trace ID (128-bit hex string). If the request already has an X-Log-ID header, it is preserved. Propagates through entire request chain.

**OpenTelemetry Span Creation**: Creates parent span for each request with W3C Trace Context propagation (traceparent, tracestate headers). Span attributes include HTTP method, path, status code, and correlation ID.

**Health Check Filtering**: Excludes /api/status endpoints from tracing to reduce trace volume for high-frequency health checks.

**Log Forwarding**: Sends request logs to telemetry service in structured format with correlation IDs. Non-blocking async logging.

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `PROXY_PORT` | External HTTP port | `80` |
| `TELEMETRY_HOST` | Telemetry service hostname | `telemetry` |
| `TELEMETRY_PORT` | Telemetry service port | `8081` |
| `WEBSERVICE_HOST` | Backend service hostname | `webservice` |
| `WEBSERVICE_PORT` | Backend service port | `3000` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP collector endpoint | `otel-collector:4318` |

## Directory Structure

```
containers/proxy/
├── Dockerfile
├── Caddyfile
├── init.sh
└── src/
    ├── main.go
    ├── tracing/tracing.go
    └── telemetry/client.go
```

## Dependencies

- **telemetry**: Forwards logs (required for logging, not critical)
- **webservice**: Backend service (required, health check dependency)
- **otel-collector**: Receives traces via OTLP HTTP
- **Network**: External network (exposed to host on port 3000) and internal network

## API Reference

### GET /status

Health check endpoint (not proxied to backend). Response: `200 OK` with body `"OK"`

### ALL /*

Proxies all other requests to webservice. Headers added: X-Log-ID (correlation ID), traceparent (W3C trace context), tracestate (W3C trace state if applicable).

## Development

```bash
# Build
docker-compose build proxy

# Test
curl http://localhost:3000/status
curl -v http://localhost:3000/api/status
```

## Observability

View traces in Jaeger UI at http://localhost:16686. Search for service "proxy". Logs forwarded to ./logs/telemetry.log.

## Troubleshooting

**502 Bad Gateway**: Check webservice is running with `docker-compose ps webservice`.

**Traces not appearing**: Verify OTEL_EXPORTER_OTLP_ENDPOINT configuration. Check otel-collector is running.

**Port conflict**: Change PROXY_PORT in .env. Rebuild with `docker-compose up -d --build proxy`.
