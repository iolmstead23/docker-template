package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"telemetry/api"
	"telemetry/config"
	"telemetry/logger"
	"telemetry/rotation"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
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
			semconv.ServiceName("telemetry"),
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

// main initializes and runs the telemetry logging service
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

		// Create test span to verify tracer is working
		tracer := otel.Tracer("telemetry")
		_, span := tracer.Start(ctx, "service-startup")
		span.SetAttributes(
			semconv.ServiceName("telemetry"),
		)
		span.End()

		// Force flush to ensure startup span is exported
		tp.ForceFlush(ctx)
	}

	// Load configuration from environment (port, log path, max file size)
	cfg := config.Load()

	// Create rotating log writer that handles file rotation at size limits
	writer, err := rotation.NewRotatingWriter(cfg.LogPath, cfg.MaxFileSize, cfg.ValidationInterval)
	if err != nil {
		log.Fatalf("Failed to initialize rotating writer: %v", err)
	}
	defer writer.Close()

	// Create logger that formats and writes log entries
	appLogger := logger.NewLogger(writer)
	// Create HTTP handler for log and status endpoints
	handler := api.NewHandler(appLogger)

	// Register HTTP endpoints for receiving logs and health checks
	http.HandleFunc("/log", handler.HandleLog)
	http.HandleFunc("/status", handler.HandleStatus)

	// Log service startup details for operational monitoring
	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("Telemetry service starting on %s", addr)
	log.Printf("Session ID: %s", writer.SessionID())
	log.Printf("Log path: %s", cfg.LogPath)
	log.Printf("Max file size: %d bytes", cfg.MaxFileSize)
	log.Printf("Validation interval: %d writes", cfg.ValidationInterval)

	// Log service start event to its own log file
	appLogger.Log("INFO", "Telemetry service started", "", "telemetry")

	// Set up signal handler for graceful shutdown on SIGINT/SIGTERM
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	// Wait for shutdown signal in separate goroutine
	go func() {
		<-sigChan
		log.Println("Shutting down telemetry service...")
		appLogger.Log("INFO", "Telemetry service shutting down", "", "telemetry")
		writer.Close()
		os.Exit(0)
	}()

	// Start HTTP server and block until error or shutdown
	srv := &http.Server{
		Addr:         addr,
		Handler:      nil,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}
	if err := srv.ListenAndServe(); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
