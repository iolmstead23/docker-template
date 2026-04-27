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
)

// Monitor manages health checks for multiple service endpoints
type Monitor struct {
	targets   []config.Target         // Targets is the list of services to check
	telemetry *client.TelemetryClient // Telemetry is the client for sending health status logs
	timeout   time.Duration           // Time out is the HTTP request timeout for health checks
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

// CheckAll runs health checks on all configured targets, propagating ctx to each request.
func (m *Monitor) CheckAll(ctx context.Context) []HealthStatus {
	results := make([]HealthStatus, len(m.targets))

	for i, target := range m.targets {
		results[i] = m.checkTarget(ctx, target)
	}

	return results
}

// checkTarget performs an HTTP GET health check on a single service.
func (m *Monitor) checkTarget(ctx context.Context, target config.Target) HealthStatus {
	status := HealthStatus{Name: target.Name}

	client := &http.Client{Timeout: m.timeout}
	start := time.Now()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, target.URL, nil)
	if err != nil {
		status.Healthy = false
		status.Error = err.Error()
		status.Latency = time.Since(start)
		return status
	}

	var resp *http.Response
	for attempt := 0; attempt < 2; attempt++ {
		resp, err = client.Do(req)
		if err == nil || attempt == 1 {
			break
		}
		select {
		case <-ctx.Done():
		case <-time.After(500 * time.Millisecond):
		}
	}
	status.Latency = time.Since(start)

	if err != nil {
		status.Healthy = false
		status.Error = err.Error()
		return status
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		status.Healthy = true
	} else {
		status.Healthy = false
		status.Error = fmt.Sprintf("HTTP %d", resp.StatusCode)
	}

	return status
}

// LogResults aggregates health check results and logs to telemetry with correlation ID
func (m *Monitor) LogResults(results []HealthStatus, traceID string) {
	// Separate services into healthy and unhealthy groups for reporting
	var healthy, unhealthy []string

	for _, r := range results {
		if r.Healthy {
			healthy = append(healthy, fmt.Sprintf("%s(%dms)", r.Name, r.Latency.Milliseconds()))
		} else {
			unhealthy = append(unhealthy, fmt.Sprintf("%s(%s)", r.Name, r.Error))
		}
	}

	var message string
	if len(unhealthy) == 0 {
		message = fmt.Sprintf("All services healthy: %s", strings.Join(healthy, ", "))
		// Log successful health checks to telemetry with trace ID for correlation
		if err := m.telemetry.Log("INFO", message, traceID); err != nil {
			log.Printf("Failed to send health status to telemetry: %v", err)
		}
	} else {
		message = fmt.Sprintf("Service issues - healthy: [%s], unhealthy: [%s]",
			strings.Join(healthy, ", "), strings.Join(unhealthy, ", "))
		// Log health issues to telemetry as warning with trace ID for correlation
		if err := m.telemetry.Log("WARN", message, traceID); err != nil {
			log.Printf("Failed to send health warning to telemetry: %v", err)
		}
	}
}
