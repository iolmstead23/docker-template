package monitor

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"heartbeat/client"
	"heartbeat/config"

	"github.com/google/uuid"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
)

// Monitor manages health checks for multiple service endpoints
type Monitor struct {
	targets   []config.Target          // targets is the list of services to check
	telemetry *client.TelemetryClient  // telemetry is the client for sending health status logs
	timeout   time.Duration            // timeout is the HTTP request timeout for health checks
}

// HealthStatus represents the result of a single service health check
type HealthStatus struct {
	Name    string
	Healthy bool
	Latency time.Duration
	Error   string
}

// NewMonitor creates a monitor for checking multiple service endpoints
func NewMonitor(targets []config.Target, telemetry *client.TelemetryClient, timeout time.Duration) *Monitor {
	return &Monitor{
		targets:   targets,
		telemetry: telemetry,
		timeout:   timeout,
	}
}

// CheckAll runs health checks on all configured targets concurrently
func (m *Monitor) CheckAll() []HealthStatus {
	results := make([]HealthStatus, len(m.targets))

	for i, target := range m.targets {
		results[i] = m.checkTarget(target)
	}

	return results
}

// CheckAllWithContext runs health checks with OpenTelemetry tracing support
func (m *Monitor) CheckAllWithContext(ctx context.Context) []HealthStatus {
	tracer := otel.Tracer("heartbeat")
	results := make([]HealthStatus, len(m.targets))

	for i, target := range m.targets {
		// Create span for each individual health check
		_, span := tracer.Start(ctx, "health-check")
		span.SetAttributes(
			attribute.String("service.name", target.Name),
			attribute.String("service.url", target.URL),
		)

		results[i] = m.checkTarget(target)

		// Add health check results to span attributes
		span.SetAttributes(
			attribute.Bool("health.check.healthy", results[i].Healthy),
			attribute.Int64("health.check.latency_ms", results[i].Latency.Milliseconds()),
		)

		if !results[i].Healthy {
			span.SetStatus(codes.Error, results[i].Error)
			span.SetAttributes(attribute.String("health.check.error", results[i].Error))
		} else {
			span.SetStatus(codes.Ok, "")
		}

		span.End()
	}

	return results
}

// checkTarget performs an HTTP GET health check on a single service
func (m *Monitor) checkTarget(target config.Target) HealthStatus {
	status := HealthStatus{Name: target.Name}

	// Create dedicated HTTP client with timeout for this check
	client := &http.Client{Timeout: m.timeout}
	start := time.Now()

	// Execute health check and measure response latency
	resp, err := client.Get(target.URL)
	status.Latency = time.Since(start)

	if err != nil {
		status.Healthy = false
		status.Error = err.Error()
		return status
	}
	defer resp.Body.Close()

	// Treat 2xx status codes as healthy, anything else as unhealthy
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		status.Healthy = true
	} else {
		status.Healthy = false
		status.Error = fmt.Sprintf("HTTP %d", resp.StatusCode)
	}

	return status
}

// LogResults aggregates health check results and logs to telemetry with correlation ID
func (m *Monitor) LogResults(results []HealthStatus) {
	// Separate services into healthy and unhealthy groups for reporting
	var healthy, unhealthy []string

	for _, r := range results {
		if r.Healthy {
			healthy = append(healthy, fmt.Sprintf("%s(%dms)", r.Name, r.Latency.Milliseconds()))
		} else {
			unhealthy = append(unhealthy, fmt.Sprintf("%s(%s)", r.Name, r.Error))
		}
	}

	// Generate correlation ID for this health check batch
	healthCheckLogID := uuid.New().String()

	var message string
	if len(unhealthy) == 0 {
		message = fmt.Sprintf("All services healthy: %s", strings.Join(healthy, ", "))
		// Log successful health checks to telemetry with correlation ID
		if err := m.telemetry.Log("INFO", message, healthCheckLogID); err != nil {
			log.Printf("Failed to send health status to telemetry: %v", err)
		}
	} else {
		message = fmt.Sprintf("Service issues - healthy: [%s], unhealthy: [%s]",
			strings.Join(healthy, ", "), strings.Join(unhealthy, ", "))
		// Log health issues to telemetry as warning with correlation ID
		if err := m.telemetry.Log("WARN", message, healthCheckLogID); err != nil {
			log.Printf("Failed to send health warning to telemetry: %v", err)
		}
	}
}
