# OpenTelemetry Collector

Standard OpenTelemetry Collector deployment for trace aggregation and export to Jaeger.

## Purpose

Central trace aggregation point. Receives traces from all services via OTLP protocol, processes and batches trace data, exports traces to Jaeger for visualization, and provides single configuration point for observability pipeline.

## Technology Stack

- Image: otel/opentelemetry-collector-contrib:0.91.0
- Receivers: OTLP gRPC (4317), HTTP (4318)
- Exporters: OTLP to Jaeger, logging

## Key Features

**OTLP Receivers**: gRPC on port 4317, HTTP on port 4318. CORS enabled for HTTP receiver (allows all origins with `allowed_origins: ["*"]`).

**Batch Processing**: Batches traces for efficient export. Timeout 10s, batch size 1024 spans.

**Resource Processing**: Enriches trace data with service attributes (service.name) for better identification in Jaeger.

**Trace Export**: Exports to Jaeger via OTLP (port 4317) with TLS disabled (`insecure: true`) for internal network communication. Also exports to console logging (debug level) for troubleshooting.

## Configuration

Static configuration file: otel-collector-config.yml.

**Service Environment Variables**: Each service that sends traces to the collector must set `OTEL_EXPORTER_OTLP_ENDPOINT`:
- Go services (telemetry, heartbeat, proxy): `otel-collector:4318`
- Webservice (Node.js): `http://otel-collector:4318/v1/traces`

**Jaeger Configuration**: Jaeger service requires `COLLECTOR_OTLP_ENABLED=true` to accept traces from the collector.

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318
        cors:
          allowed_origins:
            - "*"

processors:
  batch:
    timeout: 10s
    send_batch_size: 1024
  resource:
    attributes:
      - key: service.name
        action: upsert
        from_attribute: service.name

exporters:
  otlp:
    endpoint: jaeger:4317
    tls:
      insecure: true
  logging:
    loglevel: debug

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch, resource]
      exporters: [otlp, logging]
```

## Directory Structure

```
containers/otel-collector/
└── otel-collector-config.yml
```

## Dependencies

- **jaeger**: Exports traces
- **Network**: Internal network only. Receives from telemetry, proxy, heartbeat, webservice.

## Ports

| Port | Protocol | Purpose |
|------|----------|---------|
| 4317 | gRPC | OTLP gRPC receiver |
| 4318 | HTTP | OTLP HTTP receiver |

Both ports mapped to host for debugging.

## Development

```bash
# Modify configuration
vi containers/otel-collector/otel-collector-config.yml

# Restart to apply changes
docker-compose restart otel-collector

# View logs
docker-compose logs -f otel-collector

# Test endpoint
curl -X POST http://localhost:4318/v1/traces \
  -H "Content-Type: application/json" \
  -d @test-trace.json
```

## Troubleshooting

**Traces not appearing in Jaeger**: Check Jaeger is running with `docker-compose ps jaeger`. Verify collector logs with `docker-compose logs otel-collector`.

**Services not sending traces**: Verify OTEL_EXPORTER_OTLP_ENDPOINT in service configuration. Check port 4318 is accessible.

**High memory usage**: Reduce batch size in configuration. Add memory limits in docker-compose.yml.
