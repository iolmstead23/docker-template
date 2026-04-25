package tracing

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/caddyserver/caddy/v2"
	"github.com/caddyserver/caddy/v2/caddyconfig/caddyfile"
	"github.com/caddyserver/caddy/v2/caddyconfig/httpcaddyfile"
	"github.com/caddyserver/caddy/v2/modules/caddyhttp"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
	"go.opentelemetry.io/otel/trace"

	"proxy/telemetry"
)

// Init registers the RequestLogger middleware with Caddy on package load
func init() {
	caddy.RegisterModule(RequestLogger{})
	httpcaddyfile.RegisterHandlerDirective("request_logger", parseCaddyfile)

	// Initialize OpenTelemetry tracer
	initTracer()
}

// initTracer initializes OpenTelemetry tracer provider for proxy service
func initTracer() {
	ctx := context.Background()

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
		// Log error but don't fail - tracing is optional
		fmt.Fprintf(os.Stderr, "[WARN] Failed to initialize OTLP trace exporter: %v\n", err)
		return
	}

	// Create resource with service name
	res, err := resource.New(ctx,
		resource.WithAttributes(
			semconv.ServiceName("proxy"),
			semconv.ServiceVersion("1.0.0"),
		),
	)
	if err != nil {
		fmt.Fprintf(os.Stderr, "[WARN] Failed to create tracer resource: %v\n", err)
		return
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

	// Create test span to verify tracer is working
	tracer := otel.Tracer("proxy")
	_, span := tracer.Start(ctx, "service-startup")
	span.SetAttributes(
		semconv.ServiceName("proxy"),
	)
	span.End()

	// Force flush to ensure startup span is exported
	tp.ForceFlush(ctx)
}

// RequestLogger is a Caddy middleware that adds request tracing and telemetry
type RequestLogger struct {
	telemetryClient *telemetry.Client
}

// CaddyModule returns module metadata for Caddy registration
func (RequestLogger) CaddyModule() caddy.ModuleInfo {
	return caddy.ModuleInfo{
		ID:  "http.handlers.request_logger",
		New: func() caddy.Module { return new(RequestLogger) },
	}
}

// Provision sets up the middleware and initializes the telemetry client
func (rl *RequestLogger) Provision(ctx caddy.Context) error {
	rl.telemetryClient = telemetry.New()
	return nil
}

// Validate checks middleware configuration (no-op for this simple middleware)
func (rl *RequestLogger) Validate() error {
	return nil
}

// shouldSkipTracing evaluates skip conditions for tracing
func shouldSkipTracing(r *http.Request) bool {
	if r.URL.Path == "/status" || r.URL.Path == "/api/status" {
		return true
	}
	return r.Host == "jaeger:16686" || r.Host == "localhost:16686"
}

// shouldSkipLogging evaluates skip conditions for logging
func shouldSkipLogging(r *http.Request) bool {
	if r.URL.Path == "/status" || r.URL.Path == "/api/status" {
		return true
	}
	return r.Host == "jaeger:16686" || r.Host == "localhost:16686"
}

// buildRequestSpan sets up trace context, creates span, and resolves log ID
func buildRequestSpan(r *http.Request) (context.Context, trace.Span, string) {
	ctx := otel.GetTextMapPropagator().Extract(r.Context(), propagation.HeaderCarrier(r.Header))
	tracer := otel.Tracer("proxy")
	ctx, span := tracer.Start(ctx, "http-request")

	logID := r.Header.Get("X-Log-ID")
	if logID == "" {
		logID = span.SpanContext().TraceID().String()
	}

	span.SetAttributes(
		attribute.String("log.correlation.id", logID),
		attribute.String("http.method", r.Method),
		attribute.String("http.url", r.URL.Path),
		attribute.String("http.host", r.Host),
	)

	return ctx, span, logID
}

// dispatchTelemetryLog formats and sends telemetry log to service
func dispatchTelemetryLog(client *telemetry.Client, ctx context.Context, rw *responseWriter, r *http.Request, logID string, duration time.Duration) {
	message := fmt.Sprintf("%s %s -> %d (%dms)", r.Method, r.URL.Path, rw.statusCode, duration.Milliseconds())

	level := "INFO"
	if rw.statusCode >= 500 {
		level = "ERROR"
	} else if rw.statusCode >= 400 {
		level = "WARN"
	}

	telemetry.Log(client, ctx, level, message, logID)
}

// ServeHTTP handles each request by adding trace ID and logging to telemetry
func (rl RequestLogger) ServeHTTP(w http.ResponseWriter, r *http.Request, next caddyhttp.Handler) error {
	if shouldSkipTracing(r) {
		return next.ServeHTTP(w, r)
	}

	ctx, span, logID := buildRequestSpan(r)
	defer span.End()

	r.Header.Set("X-Log-ID", logID)
	w.Header().Set("X-Log-ID", logID)
	r = r.WithContext(ctx)

	start := time.Now()
	rw := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}
	err := next.ServeHTTP(rw, r)
	duration := time.Since(start)

	span.SetAttributes(
		attribute.Int("http.status_code", rw.statusCode),
		attribute.Int64("http.duration_ms", duration.Milliseconds()),
	)
	if rw.statusCode >= 500 {
		span.SetStatus(codes.Error, fmt.Sprintf("HTTP %d", rw.statusCode))
	} else if rw.statusCode >= 400 {
		span.SetStatus(codes.Error, fmt.Sprintf("HTTP %d", rw.statusCode))
	} else {
		span.SetStatus(codes.Ok, "")
	}

	if !shouldSkipLogging(r) {
		dispatchTelemetryLog(rl.telemetryClient, ctx, rw, r, logID, duration)
	}

	return err
}

// responseWriter wraps http.ResponseWriter to capture status code
type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

// WriteHeader captures status code before forwarding to underlying writer
func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

// parseCaddyfile parses Caddyfile configuration for this middleware
func parseCaddyfile(h httpcaddyfile.Helper) (caddyhttp.MiddlewareHandler, error) {
	var rl RequestLogger
	err := rl.UnmarshalCaddyfile(h.Dispenser)
	return rl, err
}

// UnmarshalCaddyfile implements Caddyfile config parsing (no args expected)
func (rl *RequestLogger) UnmarshalCaddyfile(d *caddyfile.Dispenser) error {
	for d.Next() {
		if d.NextArg() {
			return d.ArgErr()
		}
	}
	return nil
}

// Compile-time interface compliance checks for Caddy integration
var (
	_ caddy.Provisioner           = (*RequestLogger)(nil)
	_ caddy.Validator             = (*RequestLogger)(nil)
	_ caddyhttp.MiddlewareHandler = (*RequestLogger)(nil)
	_ caddyfile.Unmarshaler       = (*RequestLogger)(nil)
)
