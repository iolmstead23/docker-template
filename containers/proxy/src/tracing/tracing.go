package tracing

import (
	"fmt"
	"net/http"
	"time"

	"github.com/caddyserver/caddy/v2"
	"github.com/caddyserver/caddy/v2/caddyconfig/caddyfile"
	"github.com/caddyserver/caddy/v2/caddyconfig/httpcaddyfile"
	"github.com/caddyserver/caddy/v2/modules/caddyhttp"
	"github.com/google/uuid"

	"proxy/telemetry"
)

// init registers the RequestLogger middleware with Caddy on package load
func init() {
	caddy.RegisterModule(RequestLogger{})
	httpcaddyfile.RegisterHandlerDirective("request_logger", parseCaddyfile)
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
	// Extract or generate X-Log-ID header for request correlation
	logID := r.Header.Get("X-Log-ID")
	if logID == "" {
		logID = uuid.New().String()
	}

	// Propagate log ID to both request and response for end-to-end tracing
	r.Header.Set("X-Log-ID", logID)
	w.Header().Set("X-Log-ID", logID)

	// Record request start time for latency measurement
	start := time.Now()

	// Wrap response writer to capture status code
	rw := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}

	// Pass request to next handler in the chain
	err := next.ServeHTTP(rw, r)

	// Calculate request duration for performance monitoring
	duration := time.Since(start)

	// Skip logging for health check endpoints to reduce log noise
	if r.URL.Path == "/status" || r.URL.Path == "/api/status" {
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

	// Send request log to telemetry service
	telemetry.Log(level, message, logID)

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
