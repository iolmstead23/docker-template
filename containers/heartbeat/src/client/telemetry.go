package client

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// TelemetryClient sends log entries to the centralized telemetry service
type TelemetryClient struct {
	url    string       // URL is the telemetry service /log endpoint
	client *http.Client // Client is the HTTP client with configured timeout
}

// LogRequest represents a telemetry log entry with correlation ID for distributed tracing
type LogRequest struct {
	Level   string `json:"level"`
	Message string `json:"message"`
	LogID   string `json:"log_id"`
	Source  string `json:"source"`
}

// NewTelemetryClient creates a client for sending logs to telemetry service
func NewTelemetryClient(url string, timeout time.Duration) *TelemetryClient {
	// DT-26: Clamp timeout to prevent invalid values
	const minTimeout = 1 * time.Second
	const maxTimeout = 60 * time.Second
	if timeout < minTimeout {
		timeout = minTimeout
	} else if timeout > maxTimeout {
		timeout = maxTimeout
	}
	return &TelemetryClient{
		url: url,
		client: &http.Client{
			Timeout: timeout,
		},
	}
}

// Log sends a log entry to telemetry with correlation ID for request tracing
func (c *TelemetryClient) Log(level, message, logID string) error {
	req := LogRequest{
		Level:   level,
		Message: message,
		LogID:   logID,
		Source:  "heartbeat",
	}

	// Marshal log request to JSON for HTTP transport
	body, err := json.Marshal(req)
	if err != nil {
		return fmt.Errorf("failed to marshal log request: %w", err)
	}

	// Send POST request to telemetry service log endpoint
	resp, err := c.client.Post(c.url, "application/json", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("failed to send log: %w", err)
	}
	defer resp.Body.Close()

	// Verify telemetry service accepted the log (2xx status codes only)
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("telemetry returned status %d", resp.StatusCode)
	}

	return nil
}
