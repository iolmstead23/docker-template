# 3EDataToolkit

Microservices platform with OpenTelemetry tracing and centralized JSONL logging.

## Services

- **[Telemetry](containers/telemetry/README.md)** - Centralized logging with size-based rotation
- **[Proxy](containers/proxy/README.md)** - Caddy reverse proxy with correlation ID generation and W3C trace propagation
- **[Heartbeat](containers/heartbeat/README.md)** - Periodic health monitoring (15s interval)
- **[Webservice](containers/webservice/README.md)** - Next.js 14 frontend with state management API
- **[OpenTelemetry Collector](containers/otel-collector/README.md)** - OTLP trace aggregation and export to Jaeger
- **Jaeger** - Distributed tracing UI

## Quick Access

- Web Application: http://localhost:3000
- Jaeger Traces: http://localhost:16686
- Logs: `./logs/telemetry-*.log` (JSONL format)

## Configuration

Configure via `.env` file. See [.env.template](.env.template) for all options.

## Author

**Third Eye Consulting**
