# Webservice

Next.js frontend application with OpenTelemetry instrumentation and centralized logging.

## Purpose

The webservice provides the user-facing web interface for the 3EDataToolkit platform. It features a Next.js 14 frontend application with React 18, server-side rendering (SSR) and API routes, OpenTelemetry automatic instrumentation, health check filtering to reduce trace volume, and integration with centralized telemetry logging.

## Technology Stack

- Next.js 14.2.35
- Node.js (Alpine-based container)
- React 18.2.0
- TypeScript 5.3.3
- OpenTelemetry @opentelemetry/api v1.7.0, @opentelemetry/sdk-trace-node v1.19.0, @opentelemetry/instrumentation-http v0.45.1, @opentelemetry/exporter-trace-otlp-http v0.45.1

## Key Features

**Next.js Application**: Server-side rendering for performance. API routes for backend logic. Static asset serving. Hot reload in development.

**OpenTelemetry Instrumentation**: Automatic HTTP instrumentation. Custom health check filtering. OTLP HTTP trace export. Resource detection for service name and version.

**Health Check Endpoint**: GET /api/status returns JSON with service status. Excluded from OpenTelemetry tracing.

**Centralized Logging**: Logs forwarded to telemetry service in structured format with correlation IDs. Integration with proxy-generated correlation IDs.

**Trace Context Propagation**: Receives W3C trace context from proxy. Continues spans across service boundary. Exports spans to OpenTelemetry Collector.

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `WEBSERVICE_PORT` | HTTP server port | `3000` |
| `TELEMETRY_HOST` | Telemetry service hostname | `telemetry` |
| `TELEMETRY_PORT` | Telemetry service port | `8081` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP collector endpoint | `http://otel-collector:4318/v1/traces` |

## Directory Structure

```
containers/webservice/
├── Dockerfile
├── init.sh
├── nginx.conf
├── supervisord.conf
└── src/
    ├── package.json
    ├── next.config.js
    ├── instrumentation.ts
    ├── app/
    └── lib/telemetry.ts
```

## Dependencies

- **telemetry**: Forwards logs (optional, non-critical)
- **otel-collector**: Receives traces
- **proxy**: Receives incoming requests (in production setup)
- **Network**: Internal network only, not directly exposed to host. Accessed via proxy service.

## API Reference

### GET /api/status

Health check endpoint. Response: `{"status":"healthy","service":"webservice","timestamp":"2026-01-19T10:30:45Z"}`

### GET /

Home page rendered by Next.js.

## Development

```bash
# Build
docker-compose build webservice

# Run standalone
cd containers/webservice/src
npm install
npm run dev  # Development mode

# Build for production
npm run build
npm start
```

## Observability

View traces in Jaeger UI at http://localhost:16686. Search for service "webservice". Logs in ./logs/telemetry.log with correlation IDs from proxy.

## Troubleshooting

**Service not starting**: Check Node.js version. Verify dependencies with `npm install`. Review logs with `docker-compose logs webservice`.

**Traces not appearing**: Verify OTEL_EXPORTER_OTLP_ENDPOINT is correct. Check otel-collector is running.

**Health check failing**: Test with `curl http://localhost:3000/api/status`. Check port 3000 is not in use.

**Pages not rendering**: Check Next.js build completed. Verify static assets with `ls .next`.
