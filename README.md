# 3EDataToolkit

A containerized microservices architecture with comprehensive observability using OpenTelemetry and centralized logging.

## Overview

3EDataToolkit provides a production-ready microservices platform.

## Architecture

The system consists of 6 containerized services orchestrated via Docker Compose:

### Telemetry Service (Port 8081)

Centralized logging service with file rotation. Receives logs from all services via HTTP POST endpoint, writes structured logs with timestamps and correlation IDs, and implements automatic file rotation based on configurable size limits.

### Proxy Service (Port 3000)

Caddy v2.7.6 reverse proxy with custom middleware. Generates unique correlation IDs (X-Log-ID) for each request, implements W3C trace context propagation, and forwards requests to the webservice backend with health check filtering.

### Heartbeat Service

Health monitoring service that periodically checks all services (default 15s interval). Monitors telemetry, proxy, and webservice endpoints, aggregates health status, and logs results to the centralized telemetry service.

### Webservice (Port 3000)

Next.js 14.2.35 frontend application with React 18.2.0. Features OpenTelemetry auto-instrumentation, server-side rendering, health monitoring integration, and forwards logs to the centralized telemetry service.

### OpenTelemetry Collector (Ports 4317, 4318)

OTLP trace aggregation service. Receives traces from all services via gRPC (4317) and HTTP (4318), processes and batches trace data, and exports to Jaeger for visualization.

### Jaeger (Port 16686)

Distributed tracing visualization UI. Standard all-in-one deployment for viewing and analyzing traces across all services.

## Network Architecture

- **Internal Network**: Secure communication between services (telemetry, heartbeat, webservice, otel-collector)
- **External Network**: Public-facing proxy and Jaeger UI
- **Port Mapping**: Only proxy (3000) and Jaeger UI (16686) exposed to host

## Installation

### Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- 2GB RAM minimum
- Ports 3000 and 16686 available on host

### Quick Start

1. Clone the repository

```bash
git clone https://github.com/iolmstead23/docker-template.git
cd 3EDataToolkit
```

2. Configure environment variables

```bash
cp .env.template .env
```

3. Build and start all services

```bash
docker-compose up --build
```

4. Verify deployment

```bash
docker-compose ps
```

5. Access services

- Web Application: http://localhost:3000
- Jaeger UI: http://localhost:16686
- Proxy Status: http://localhost:3000/status

## Configuration

All services are configured via environment variables defined in `.env`:

### Key Configuration Variables

- `TELEMETRY_PORT`: Log service port (default: 8081)
- `TELEMETRY_MAX_FILE_SIZE`: Log rotation size in bytes (default: 1048576)
- `TELEMETRY_LOG_PATH`: Log file directory (default: /var/log/telemetry)
- `HEARTBEAT_INTERVAL`: Health check interval in seconds (default: 15)
- `PROXY_PORT`: Internal proxy port (default: 80)
- `WEBSERVICE_PORT`: Internal web service port (default: 3000)

See [.env.template](.env.template) for complete configuration options.

## Container Details

For detailed information about each container, see individual README files:

- [Telemetry Service](containers/telemetry/README.md) - Centralized logging with file rotation
- [Proxy Service](containers/proxy/README.md) - Reverse proxy with tracing middleware
- [Heartbeat Service](containers/heartbeat/README.md) - Health monitoring service
- [Webservice](containers/webservice/README.md) - Next.js frontend application
- [OpenTelemetry Collector](containers/otel-collector/README.md) - Trace aggregation

## Development

### Building Individual Containers

```bash
# Build specific service
docker-compose build telemetry

# Rebuild without cache
docker-compose build --no-cache proxy
```

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f telemetry

# View telemetry log files
docker-compose exec telemetry ls -la /var/log/telemetry
```

### Debugging

```bash
# Enter container shell
docker-compose exec telemetry sh

# View OpenTelemetry traces
# Navigate to http://localhost:16686 and search for service traces
```

## Observability

### Distributed Tracing

All services export traces to the OpenTelemetry Collector, which forwards to Jaeger:

1. Access Jaeger UI at http://localhost:16686
2. Select service from dropdown (telemetry, proxy, heartbeat, webservice)
3. Click "Find Traces" to view request flows

### Correlation IDs

Each request receives a unique `X-Log-ID` header from the proxy:

- Tracks requests across service boundaries
- Included in all log entries
- Visible in Jaeger traces

### Log Files

Centralized logs stored in `./logs` directory:

- Format: `[timestamp] [level] [log_id] [source] message`
- Automatic rotation at 1MB (configurable)
- Persistent across container restarts

## Health Checks

Health check endpoints:

- Proxy: `/status`
- Webservice: `/api/status`
- Telemetry: `/status`

Heartbeat service monitors all endpoints and reports aggregate health.

## Author

**Third Eye Consulting**
