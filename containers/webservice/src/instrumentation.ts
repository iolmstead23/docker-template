import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { BatchSpanProcessor, SpanProcessor, ReadableSpan, Span } from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
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
  // Get OTLP endpoint from environment or use default (full URL with protocol for TypeScript)
  const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4318/v1/traces';

  console.log('Initializing OpenTelemetry for webservice...');

  // Create OTLP trace exporter (HTTP only, no gRPC dependencies)
  const traceExporter = new OTLPTraceExporter({
    url: otlpEndpoint,
  });

  // Create resource with service information
  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'webservice',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
  });

  // Create tracer provider
  const provider = new NodeTracerProvider({
    resource: resource,
  });

  // Add batch span processor wrapped in health check filter
  const batchProcessor = new BatchSpanProcessor(traceExporter);
  const filterProcessor = new HealthCheckFilterProcessor(batchProcessor);
  provider.addSpanProcessor(filterProcessor);

  // Register the provider
  provider.register({
    propagator: new W3CTraceContextPropagator(),
  });

  // Register HTTP instrumentation for automatic tracing of HTTP requests
  registerInstrumentations({
    instrumentations: [
      new HttpInstrumentation({
        ignoreIncomingPaths: ['/api/status', '/status'], // Don't trace health checks
      }),
    ],
  });

  // Create test span to verify tracer is working
  const tracer = trace.getTracer('webservice');
  const span = tracer.startSpan('service-startup');
  span.setAttribute('service.name', 'webservice');
  span.end();

  // Force flush to ensure startup span is exported
  provider.forceFlush();

  console.log('OpenTelemetry SDK initialized for webservice');

  // Gracefully shutdown on process exit
  process.on('SIGTERM', () => {
    provider.shutdown()
      .then(() => console.log('OpenTelemetry SDK shut down'))
      .catch((error) => console.error('Error shutting down OpenTelemetry SDK', error))
      .finally(() => process.exit(0));
  });
}
