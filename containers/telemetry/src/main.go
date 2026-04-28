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

func initTracer(ctx context.Context) (*sdktrace.TracerProvider, error) {
	otlpEndpoint := os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
	if otlpEndpoint == "" {
		otlpEndpoint = "otel-collector:4318"
	}

	exporter, err := otlptracehttp.New(ctx,
		otlptracehttp.WithEndpoint(otlpEndpoint),
		otlptracehttp.WithInsecure(),
	)
	if err != nil {
		return nil, err
	}

	res, err := resource.New(ctx,
		resource.WithAttributes(
			semconv.ServiceName("telemetry"),
			semconv.ServiceVersion("1.0.0"),
		),
	)
	if err != nil {
		return nil, err
	}

	tp := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(exporter),
		sdktrace.WithResource(res),
	)

	otel.SetTracerProvider(tp)
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
	tracer := otel.Tracer("telemetry")
	_, span := tracer.Start(ctx, "service-startup")
	span.SetAttributes(semconv.ServiceName("telemetry"))
	span.End()
	tp.ForceFlush(ctx)

	return func() {
		if err := tp.Shutdown(ctx); err != nil {
			log.Printf("Error shutting down tracer provider: %v", err)
		}
	}
}

// initLogger creates and returns a logger with its cleanup function
func initLogger(cfg *config.Config) (*logger.Logger, func()) {
	writer, err := rotation.NewRotatingWriter(cfg.LogPath, cfg.MaxFileSize, cfg.ValidationInterval)
	if err != nil {
		log.Fatalf("Failed to initialize rotating writer: %v", err)
	}

	appLogger := logger.NewLogger(writer)
	log.Printf("Session ID: %s", writer.SessionID())
	log.Printf("Log path: %s", cfg.LogPath)
	log.Printf("Max file size: %d bytes", cfg.MaxFileSize)
	log.Printf("Validation interval: %d writes", cfg.ValidationInterval)
	appLogger.Log("INFO", "Telemetry service started", "", "telemetry")

	return appLogger, func() { appLogger.Close() }
}

// registerRoutes registers HTTP endpoints for the telemetry API
func registerRoutes(handler *api.Handler) {
	http.HandleFunc("/log", handler.HandleLog)
	http.HandleFunc("/status", handler.HandleStatus)
}

// awaitShutdown returns a done channel that closes when shutdown signal is received
func awaitShutdown(srv *http.Server, appLogger *logger.Logger) chan struct{} {
	done := make(chan struct{})
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-sigChan
		log.Println("Shutting down telemetry service...")
		appLogger.Log("INFO", "Telemetry service shutting down", "", "telemetry")
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		srv.Shutdown(shutdownCtx)
		close(done)
	}()

	return done
}

// main initializes and runs the telemetry logging service
func main() {
	ctx := context.Background()

	stopTracing := initTracing(ctx)
	defer stopTracing()

	cfg := config.Load()
	appLogger, cleanup := initLogger(cfg)
	defer cleanup()

	handler := api.NewHandler(appLogger)
	registerRoutes(handler)

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("Telemetry service starting on %s", addr)
	srv := &http.Server{
		Addr:         addr,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}
	done := awaitShutdown(srv, appLogger)

	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server failed: %v", err)
	}

	<-done
}
