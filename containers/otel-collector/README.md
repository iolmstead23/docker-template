# OpenTelemetry Collector Configuration

## Overview

This directory contains the OpenTelemetry Collector configuration for the 3EDataToolkit distributed tracing system.

## Configuration File

**File**: `otel-collector-config.yml`

### Receivers

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318
```

- **OTLP gRPC**: Receives traces via gRPC on port 4317
- **OTLP HTTP**: Receives traces via HTTP on port 4318 (with CORS enabled)

### Processors

```yaml
processors:
  batch:
    timeout: 10s
    send_batch_size: 1024

  resource:
    attributes:
      - key: service.name
        action: upsert
        from_attribute: service.name
```

- **Batch Processor**: Batches traces for efficient transmission
- **Resource Processor**: Ensures service.name attribute is set

### Exporters

```yaml
exporters:
  otlp:
    endpoint: jaeger:4317
    tls:
      insecure: true

  logging:
    loglevel: debug
```

- **OTLP Exporter**: Sends traces to Jaeger backend
- **Logging Exporter**: Logs traces to console for debugging

### Service Pipeline

```yaml
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch, resource]
      exporters: [otlp, logging]
```

The pipeline receives OTLP traces, processes them, and exports to both Jaeger and the console.

## Ports

- **4317**: OTLP gRPC receiver (internal only)
- **4318**: OTLP HTTP receiver (internal only)
- **8888**: Prometheus metrics endpoint (internal)

## Docker Compose Integration

```yaml
otel-collector:
  image: otel/opentelemetry-collector-contrib:0.91.0
  container_name: otel-collector
  hostname: otel-collector
  command: ["--config=/etc/otel-collector-config.yml"]
  volumes:
    - ./containers/otel-collector/otel-collector-config.yml:/etc/otel-collector-config.yml
  ports:
    - "4317:4317"
    - "4318:4318"
  networks:
    - internal
  restart: unless-stopped
```

## Modifying Configuration

To modify the OpenTelemetry Collector configuration:

1. Edit `otel-collector-config.yml`
2. Restart the collector:
   ```bash
   docker compose restart otel-collector
   ```
3. Verify configuration:
   ```bash
   docker compose logs otel-collector --tail 50
   ```

## Common Configuration Changes

### Add Additional Exporters

```yaml
exporters:
  otlp:
    endpoint: jaeger:4317
    tls:
      insecure: true

  prometheus:
    endpoint: "0.0.0.0:8889"

  zipkin:
    endpoint: "http://zipkin:9411/api/v2/spans"
```

### Add Sampling Processor

```yaml
processors:
  probabilistic_sampler:
    sampling_percentage: 10  # Sample 10% of traces
```

### Add Span Attributes

```yaml
processors:
  attributes:
    actions:
      - key: environment
        value: production
        action: insert
```

## Debugging

### View Collector Logs
```bash
docker compose logs otel-collector -f
```

### Check Configuration Validation
```bash
docker compose exec otel-collector /otelcol-contrib validate --config=/etc/otel-collector-config.yml
```

### Test OTLP HTTP Endpoint
```bash
curl -v http://localhost:4318/v1/traces
```

### Test OTLP gRPC Endpoint
```bash
grpcurl -plaintext localhost:4317 list
```

## Resources

- [OpenTelemetry Collector Documentation](https://opentelemetry.io/docs/collector/)
- [Collector Configuration Reference](https://opentelemetry.io/docs/collector/configuration/)
- [OTLP Receiver](https://github.com/open-telemetry/opentelemetry-collector/tree/main/receiver/otlpreceiver)
- [OTLP Exporter](https://github.com/open-telemetry/opentelemetry-collector/tree/main/exporter/otlpexporter)
