package monitor

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"heartbeat/client"
	"heartbeat/config"
)

type Monitor struct {
	targets   []config.Target
	telemetry *client.TelemetryClient
	timeout   time.Duration
}

type HealthStatus struct {
	Name    string
	Healthy bool
	Latency time.Duration
	Error   string
}

func NewMonitor(targets []config.Target, telemetry *client.TelemetryClient, timeout time.Duration) *Monitor {
	return &Monitor{
		targets:   targets,
		telemetry: telemetry,
		timeout:   timeout,
	}
}

func (m *Monitor) CheckAll() []HealthStatus {
	results := make([]HealthStatus, len(m.targets))

	for i, target := range m.targets {
		results[i] = m.checkTarget(target)
	}

	return results
}

func (m *Monitor) checkTarget(target config.Target) HealthStatus {
	status := HealthStatus{Name: target.Name}

	client := &http.Client{Timeout: m.timeout}
	start := time.Now()

	resp, err := client.Get(target.URL)
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

func (m *Monitor) LogResults(results []HealthStatus) {
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
		m.telemetry.Log("INFO", message)
	} else {
		message = fmt.Sprintf("Service issues - healthy: [%s], unhealthy: [%s]",
			strings.Join(healthy, ", "), strings.Join(unhealthy, ", "))
		m.telemetry.Log("WARN", message)
	}
}
