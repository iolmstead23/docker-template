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

**OpenTelemetry Instrumentation**: Custom health check filtering to reduce trace volume. OTLP HTTP trace export to collector. Resource detection for service name and version. Note: HTTP instrumentation is disabled due to incompatibility with Next.js standalone mode + nginx.

**Health Check Endpoint**: GET /api/status returns JSON with service status. Excluded from OpenTelemetry tracing.

**Centralized Logging**: Logs forwarded to telemetry service in structured format with correlation IDs. Integration with proxy-generated correlation IDs.

**Trace Context Propagation**: Receives W3C trace context from proxy. Continues spans across service boundary. Exports spans to OpenTelemetry Collector.

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `WEBSERVICE_PORT` | External nginx HTTP port | `3000` |
| `WEBSERVICE_INTERNAL_PORT` | Internal Next.js port (nginx proxies to this) | `3001` |
| `STATE_PATH` | Directory for persisting application state | `/app/appState` |
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

Health check endpoint. Excluded from OpenTelemetry tracing. Response: `{"status":"ok","service":"webservice","timestamp":"2026-01-24T12:34:56.789Z"}`

### GET /

Home page rendered by Next.js.

### State Management API

**GET /api/state** - List all available state files

**Settings Management:**
- `GET /api/state/settings` - Read application settings
- `PUT /api/state/settings` - Update application settings (JSON body)
- `DELETE /api/state/settings` - Reset settings to defaults

**Preferences Management:**
- `GET /api/state/preferences` - Read user preferences
- `PUT /api/state/preferences` - Update user preferences (JSON body)
- `DELETE /api/state/preferences` - Delete user preferences

**Event History Management:**
- `GET /api/state/events` - Read event history
- `POST /api/state/events` - Add event to history (JSON body)
- `PUT /api/state/events` - Update event history (JSON body with array)
- `DELETE /api/state/events` - Clear event history

All state data is persisted to the `STATE_PATH` directory and survives container restarts when properly mounted as a volume.

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
