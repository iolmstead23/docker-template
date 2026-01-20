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
type RequestLogger struct{}

// CaddyModule returns module metadata for Caddy registration
func (RequestLogger) CaddyModule() caddy.ModuleInfo {
	return caddy.ModuleInfo{
		ID:  "http.handlers.request_logger",
		New: func() caddy.Module { return new(RequestLogger) },
	}
}

// Provision sets up the middleware (no-op for this simple middleware)
func (rl *RequestLogger) Provision(ctx caddy.Context) error {
	return nil
}

// Validate checks middleware configuration (no-op for this simple middleware)
func (rl *RequestLogger) Validate() error {
	return nil
}

// ServeHTTP handles each request by adding trace ID and logging to telemetry
func (rl RequestLogger) ServeHTTP(w http.ResponseWriter, r *http.Request, next caddyhttp.Handler) error {
	// Skip tracing for health check endpoints and Jaeger UI requests
	if r.URL.Path == "/status" || r.URL.Path == "/api/status" {
		// Still forward request, but don't create span
		return next.ServeHTTP(w, r)
	}

	// Skip tracing for Jaeger UI requests to prevent them from appearing in traces
	if r.Host == "jaeger:16686" || r.Host == "localhost:16686" {
		return next.ServeHTTP(w, r)
	}

	// Extract trace context from incoming request headers
	ctx := otel.GetTextMapPropagator().Extract(r.Context(), propagation.HeaderCarrier(r.Header))

	// Create span with extracted context for distributed tracing
	tracer := otel.Tracer("proxy")
	ctx, span := tracer.Start(ctx, "http-request")
	defer span.End()

	// Extract or generate X-Log-ID header for request correlation
	logID := r.Header.Get("X-Log-ID")
	if logID == "" {
		// Use trace ID as correlation ID if no X-Log-ID provided
		traceID := span.SpanContext().TraceID().String()
		logID = traceID
	}

	// Link correlation ID to span for log-trace correlation
	span.SetAttributes(
		attribute.String("log.correlation.id", logID),
		attribute.String("http.method", r.Method),
		attribute.String("http.url", r.URL.Path),
		attribute.String("http.host", r.Host),
	)

	// Propagate log ID to both request and response for end-to-end tracing
	r.Header.Set("X-Log-ID", logID)
	w.Header().Set("X-Log-ID", logID)

	// Record request start time for latency measurement
	start := time.Now()

	// Wrap response writer to capture status code
	rw := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}

	// Pass request to next handler with span context
	r = r.WithContext(ctx)
	err := next.ServeHTTP(rw, r)

	// Calculate request duration for performance monitoring
	duration := time.Since(start)

	// Add response details to span
	span.SetAttributes(
		attribute.Int("http.status_code", rw.statusCode),
		attribute.Int64("http.duration_ms", duration.Milliseconds()),
	)

	// Set span status based on HTTP status code
	if rw.statusCode >= 500 {
		span.SetStatus(codes.Error, fmt.Sprintf("HTTP %d", rw.statusCode))
	} else if rw.statusCode >= 400 {
		span.SetStatus(codes.Error, fmt.Sprintf("HTTP %d", rw.statusCode))
	} else {
		span.SetStatus(codes.Ok, "")
	}

	// Skip logging for health check endpoints and Jaeger UI to reduce log noise
	if r.URL.Path == "/status" || r.URL.Path == "/api/status" {
		return err
	}

	// Skip logging for Jaeger UI requests
	if r.Host == "jaeger:16686" || r.Host == "localhost:16686" {
		return err
	}

	// Format log message with HTTP method, path, status, and duration
	message := fmt.Sprintf("%s %s -> %d (%dms)",
		r.Method, r.URL.Path, rw.statusCode, duration.Milliseconds())

	// Determine log level based on HTTP status code (INFO, WARN, ERROR)
	level := "INFO"
	if rw.statusCode >= 400 {
		level = "WARN"
	}
	if rw.statusCode >= 500 {
		level = "ERROR"
	}

	// Send request log to telemetry service with trace context
	telemetry.Log(ctx, level, message, logID)

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
