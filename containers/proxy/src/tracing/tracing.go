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

func init() {
	caddy.RegisterModule(RequestLogger{})
	httpcaddyfile.RegisterHandlerDirective("request_logger", parseCaddyfile)
}

type RequestLogger struct{}

func (RequestLogger) CaddyModule() caddy.ModuleInfo {
	return caddy.ModuleInfo{
		ID:  "http.handlers.request_logger",
		New: func() caddy.Module { return new(RequestLogger) },
	}
}

func (rl *RequestLogger) Provision(ctx caddy.Context) error {
	return nil
}

func (rl *RequestLogger) Validate() error {
	return nil
}

func (rl RequestLogger) ServeHTTP(w http.ResponseWriter, r *http.Request, next caddyhttp.Handler) error {
	logID := r.Header.Get("X-Log-ID")
	if logID == "" {
		logID = uuid.New().String()
	}

	r.Header.Set("X-Log-ID", logID)
	w.Header().Set("X-Log-ID", logID)

	start := time.Now()

	rw := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}

	err := next.ServeHTTP(rw, r)

	duration := time.Since(start)

	// Skip logging for monitoring/health check endpoints
	if r.URL.Path == "/status" || r.URL.Path == "/api/status" {
		return err
	}

	message := fmt.Sprintf("%s %s -> %d (%dms)",
		r.Method, r.URL.Path, rw.statusCode, duration.Milliseconds())

	level := "INFO"
	if rw.statusCode >= 400 {
		level = "WARN"
	}
	if rw.statusCode >= 500 {
		level = "ERROR"
	}

	telemetry.Log(level, message, logID)

	return err
}

type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

func parseCaddyfile(h httpcaddyfile.Helper) (caddyhttp.MiddlewareHandler, error) {
	var rl RequestLogger
	err := rl.UnmarshalCaddyfile(h.Dispenser)
	return rl, err
}

func (rl *RequestLogger) UnmarshalCaddyfile(d *caddyfile.Dispenser) error {
	for d.Next() {
		if d.NextArg() {
			return d.ArgErr()
		}
	}
	return nil
}

var (
	_ caddy.Provisioner           = (*RequestLogger)(nil)
	_ caddy.Validator             = (*RequestLogger)(nil)
	_ caddyhttp.MiddlewareHandler = (*RequestLogger)(nil)
	_ caddyfile.Unmarshaler       = (*RequestLogger)(nil)
)
