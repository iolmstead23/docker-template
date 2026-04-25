package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"heartbeat/client"
	"heartbeat/config"
	"heartbeat/monitor"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
	"go.opentelemetry.io/otel/trace"
)

// initTracer initializes OpenTelemetry tracer provider
func initTracer(ctx context.Context) (*sdktrace.TracerProvider, error) {
	// Get OTLP endpoint from environment or use default (host:port only, no protocol)
	otlpEndpoint := os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
	if otlpEndpoint == "" {
		otlpEndpoint = "otel-collector:4318"
	}

	// Create OTLP trace exporter using HTTP protocol
	exporter, err := otlptracehttp.New(ctx,
		otlptracehttp.WithEndpoint(otlpEndpoint),
		otlptracehttp.WithInsecure(),
	)
	if err != nil {
		return nil, err
	}

	// Create resource with service name
	res, err := resource.New(ctx,
		resource.WithAttributes(
			semconv.ServiceName("heartbeat"),
			semconv.ServiceVersion("1.0.0"),
		),
	)
	if err != nil {
		return nil, err
	}

	// Create tracer provider
	tp := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(exporter),
		sdktrace.WithResource(res),
	)

	otel.SetTracerProvider(tp)

	// Configure trace context propagation for distributed tracing
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	))

	return tp, nil
}

// initTracing initializes OpenTelemetry and returns a cleanup func for deferred shutdown
func initTracing(ctx context.Context) func() {
	tp, err := initTracer(ctx)
	if err != nil {
		log.Printf("Failed to initialize tracer: %v", err)
		return func() {}
	}

	log.Println("OpenTelemetry tracer initialized")
	tracer := otel.Tracer("heartbeat")
	_, span := tracer.Start(ctx, "service-startup")
	span.SetAttributes(semconv.ServiceName("heartbeat"))
	span.End()
	tp.ForceFlush(ctx)

	return func() {
		if err := tp.Shutdown(ctx); err != nil {
			log.Printf("Error shutting down tracer provider: %v", err)
		}
	}
}

// setupMonitor loads config, creates telemetry client, and initializes monitor
func setupMonitor() (*monitor.Monitor, *client.TelemetryClient, time.Duration) {
	cfg := config.Load()
	telemetryClient := client.NewTelemetryClient(cfg.TelemetryURL, cfg.Interval)

	log.Printf("Heartbeat service starting")
	log.Printf("Check interval: %s", cfg.Interval)
	log.Printf("Telemetry URL: %s", cfg.TelemetryURL)
	log.Printf("Monitoring %d targets", len(cfg.Targets))
	for _, t := range cfg.Targets {
		log.Printf("  - %s: %s", t.Name, t.URL)
	}

	return monitor.NewMonitor(cfg.Targets, telemetryClient, cfg.Interval), telemetryClient, cfg.Interval
}

// sendStartupLog creates startup span and logs service startup to telemetry
func sendStartupLog(ctx context.Context, telemetryClient *client.TelemetryClient) {
	tracer := otel.Tracer("heartbeat")
	_, startupSpan := tracer.Start(ctx, "service-startup-log")
	startupTraceID := startupSpan.SpanContext().TraceID().String()
	startupSpan.SetAttributes(attribute.String("log.correlation.id", startupTraceID))
	if err := telemetryClient.Log("INFO", "Heartbeat service started", startupTraceID); err != nil {
		log.Printf("Failed to send startup log to telemetry: %v", err)
	}
	startupSpan.End()
}

// sendShutdownLog creates shutdown span and logs service shutdown to telemetry
func sendShutdownLog(ctx context.Context, telemetryClient *client.TelemetryClient) {
	tracer := otel.Tracer("heartbeat")
	shutdownCtx, shutdownSpan := tracer.Start(ctx, "service-shutdown-log")
	_ = shutdownCtx
	shutdownTraceID := shutdownSpan.SpanContext().TraceID().String()
	shutdownSpan.SetAttributes(attribute.String("log.correlation.id", shutdownTraceID))
	log.Println("Shutting down heartbeat service...")
	if err := telemetryClient.Log("INFO", "Heartbeat service shutting down", shutdownTraceID); err != nil {
		log.Printf("Failed to send shutdown log to telemetry: %v", err)
	}
	shutdownSpan.End()
}

// awaitShutdown runs periodic health checks and handles graceful shutdown on signal
func awaitShutdown(ctx context.Context, mon *monitor.Monitor, telemetryClient *client.TelemetryClient, interval time.Duration) {
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	runCheck(mon)

	for {
		select {
		case <-ticker.C:
			runCheck(mon)
		case <-sigChan:
			sendShutdownLog(ctx, telemetryClient)
			return
		}
	}
}

// main initializes and runs the heartbeat service for continuous health monitoring
func main() {
	ctx := context.Background()

	stopTracing := initTracing(ctx)
	defer stopTracing()

	mon, telemetryClient, interval := setupMonitor()
	sendStartupLog(ctx, telemetryClient)
	awaitShutdown(ctx, mon, telemetryClient, interval)
}

// runCheck executes health checks on all targets and logs results both locally and to telemetry
func runCheck(mon *monitor.Monitor) {
	tracer := otel.Tracer("heartbeat")
	ctx, span := tracer.Start(context.Background(), "health-check-batch")
	defer span.End()

	// Use trace ID as correlation ID for log-trace correlation (matches proxy/webservice pattern)
	traceID := span.SpanContext().TraceID().String()
	span.SetAttributes(attribute.String("log.correlation.id", traceID))

	log.Println("Running health check...")
	results := mon.CheckAllWithContext(ctx)
	mon.LogResults(results, traceID)

	// Add span attributes and events based on results
	healthyCount := 0
	unhealthyCount := 0
	for _, r := range results {
		if r.Healthy {
			healthyCount++
			log.Printf("  [OK] %s (%dms)", r.Name, r.Latency.Milliseconds())
			// Record health check result as span event
			span.AddEvent("health-check-success", trace.WithAttributes(
				attribute.String("service.name", r.Name),
				attribute.Int64("latency_ms", r.Latency.Milliseconds()),
			))
		} else {
			unhealthyCount++
			log.Printf("  [FAIL] %s: %s", r.Name, r.Error)
			// Record health check result as span event
			span.AddEvent("health-check-failed", trace.WithAttributes(
				attribute.String("service.name", r.Name),
				attribute.String("error", r.Error),
			))
		}
	}

	span.SetAttributes(
		attribute.Int("health.check.total", len(results)),
		attribute.Int("health.check.healthy", healthyCount),
		attribute.Int("health.check.unhealthy", unhealthyCount),
	)
}
