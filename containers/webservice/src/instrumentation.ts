import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { BatchSpanProcessor, SpanProcessor, ReadableSpan, Span } from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { trace, Context } from '@opentelemetry/api';

// Custom span processor to filter out health check endpoint traces
class HealthCheckFilterProcessor implements SpanProcessor {
  private readonly _processor: SpanProcessor;
  private readonly _healthCheckPaths = ['/api/status', '/status'];

  constructor(processor: SpanProcessor) {
    this._processor = processor;
  }

  onStart(span: Span, parentContext: Context): void {
    this._processor.onStart(span, parentContext);
  }

  onEnd(span: ReadableSpan): void {
    // Filter out health check spans based on span name or attributes
    const spanName = span.name.toLowerCase();
    const httpTarget = span.attributes['http.target'] as string;
    const httpRoute = span.attributes['http.route'] as string;
    const nextRoute = span.attributes['next.route'] as string;

    // Check if this is a health check endpoint span
    const isHealthCheck = this._healthCheckPaths.some(path =>
      spanName.includes(path) ||
      httpTarget?.includes(path) ||
      httpRoute?.includes(path) ||
      nextRoute?.includes(path)
    );

    // Only forward non-health-check spans to the exporter
    if (!isHealthCheck) {
      this._processor.onEnd(span);
    }
  }

  forceFlush(): Promise<void> {
    return this._processor.forceFlush();
  }

  shutdown(): Promise<void> {
    return this._processor.shutdown();
  }
}

export function register() {
  // Skip OpenTelemetry initialization if disabled (e.g., in test environments)
  if (process.env.OTEL_SDK_DISABLED === 'true') {
    console.log('OpenTelemetry SDK is disabled via OTEL_SDK_DISABLED env var');
    return;
  }

  // Get OTLP endpoint from environment or use default (full URL with protocol for TypeScript)
  const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4318/v1/traces';

  console.log('Initializing OpenTelemetry for webservice...');

  // Create OTLP trace exporter (HTTP only, no gRPC dependencies)
  const traceExporter = new OTLPTraceExporter({
    url: otlpEndpoint,
  });

  // Create resource with service information
  const resource = new Resource({
    [ATTR_SERVICE_NAME]: 'webservice',
    [ATTR_SERVICE_VERSION]: '1.0.0',
  });

  // Create batch span processor wrapped in health check filter
  const batchProcessor = new BatchSpanProcessor(traceExporter);
  const filterProcessor = new HealthCheckFilterProcessor(batchProcessor);

  // Create tracer provider with span processors
  const provider = new NodeTracerProvider({
    resource: resource,
    spanProcessors: [filterProcessor],
  });

  // Register the provider with W3C trace context propagation
  provider.register({
    propagator: new W3CTraceContextPropagator(),
  });

  // Note: HttpInstrumentation removed - not compatible with Next.js standalone + nginx
  // Next.js will automatically create incoming request spans via its built-in instrumentation
  // Health check filtering still works via HealthCheckFilterProcessor above

  // Create test span to verify tracer is working
  const tracer = trace.getTracer('webservice');
  const span = tracer.startSpan('service-startup');
  span.setAttribute('service.name', 'webservice');
  span.end();

  // Force flush to ensure startup span is exported (fire-and-forget)
  void provider.forceFlush();

  console.log('OpenTelemetry SDK initialized for webservice');

  // Gracefully shutdown on process exit
  process.on('SIGTERM', () => {
    provider.shutdown()
      .then(() => console.log('OpenTelemetry SDK shut down'))
      .catch((error) => console.error('Error shutting down OpenTelemetry SDK', error))
      .finally(() => process.exit(0));
  });
}
