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

	"github.com/google/uuid"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
)

// initTracer initializes OpenTelemetry tracer provider
func initTracer(ctx context.Context) (*sdktrace.TracerProvider, error) {
	// Get OTLP endpoint from environment or use default
	otlpEndpoint := os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
	if otlpEndpoint == "" {
		otlpEndpoint = "http://otel-collector:4318"
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
	return tp, nil
}

// main initializes and runs the heartbeat service for continuous health monitoring
func main() {
	ctx := context.Background()

	// Initialize OpenTelemetry tracer
	tp, err := initTracer(ctx)
	if err != nil {
		log.Printf("Failed to initialize tracer: %v", err)
	} else {
		defer func() {
			if err := tp.Shutdown(ctx); err != nil {
				log.Printf("Error shutting down tracer provider: %v", err)
			}
		}()
		log.Println("OpenTelemetry tracer initialized")
	}

	// Load configuration from environment variables with sensible defaults
	cfg := config.Load()

	// Create telemetry client for sending logs to centralized logging service
	telemetryClient := client.NewTelemetryClient(cfg.TelemetryURL, cfg.Interval)

	log.Printf("Heartbeat service starting")
	log.Printf("Check interval: %s", cfg.Interval)
	log.Printf("Telemetry URL: %s", cfg.TelemetryURL)
	log.Printf("Monitoring %d targets", len(cfg.Targets))

	for _, t := range cfg.Targets {
		log.Printf("  - %s: %s", t.Name, t.URL)
	}

	// Create monitor that will check all configured service endpoints
	mon := monitor.NewMonitor(cfg.Targets, telemetryClient, cfg.Interval)

	// Generate correlation ID for service startup event
	startupLogID := uuid.New().String()
	// Log service startup to telemetry with correlation ID
	if err := telemetryClient.Log("INFO", "Heartbeat service started", startupLogID); err != nil {
		log.Printf("Failed to send startup log to telemetry: %v", err)
	}

	// Set up graceful shutdown on SIGINT/SIGTERM signals
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	// Create ticker for periodic health checks at configured interval
	ticker := time.NewTicker(cfg.Interval)
	defer ticker.Stop()

	// Run initial health check before entering main loop
	runCheck(mon)

	// Main event loop: run checks on ticker or shutdown on signal
	for {
		select {
		case <-ticker.C:
			runCheck(mon)
		case <-sigChan:
			// Generate correlation ID for shutdown event
			shutdownLogID := uuid.New().String()
			log.Println("Shutting down heartbeat service...")
			// Log shutdown to telemetry with correlation ID
			if err := telemetryClient.Log("INFO", "Heartbeat service shutting down", shutdownLogID); err != nil {
				log.Printf("Failed to send shutdown log to telemetry: %v", err)
			}
			return
		}
	}
}

// runCheck executes health checks on all targets and logs results both locally and to telemetry
func runCheck(mon *monitor.Monitor) {
	tracer := otel.Tracer("heartbeat")
	ctx, span := tracer.Start(context.Background(), "health-check-batch")
	defer span.End()

	// Generate correlation ID for this health check batch
	correlationID := uuid.New().String()
	span.SetAttributes(attribute.String("log.correlation.id", correlationID))

	log.Println("Running health check...")
	results := mon.CheckAllWithContext(ctx)
	mon.LogResults(results)

	// Add span attributes based on results
	healthyCount := 0
	unhealthyCount := 0
	for _, r := range results {
		if r.Healthy {
			healthyCount++
			log.Printf("  [OK] %s (%dms)", r.Name, r.Latency.Milliseconds())
		} else {
			unhealthyCount++
			log.Printf("  [FAIL] %s: %s", r.Name, r.Error)
		}
	}

	span.SetAttributes(
		attribute.Int("health.check.total", len(results)),
		attribute.Int("health.check.healthy", healthyCount),
		attribute.Int("health.check.unhealthy", unhealthyCount),
	)
}
