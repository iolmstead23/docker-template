package client

// IMPORTS
import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// TYPES

// TelemetryClient sends log entries to the centralized telemetry service
type TelemetryClient struct {
	url    string
	client *http.Client
}

// LogRequest represents a telemetry log entry with correlation ID for distributed tracing
type LogRequest struct {
	Level   string `json:"level"`
	Message string `json:"message"`
	LogID   string `json:"log_id"`
	Source  string `json:"source"`
}

// FUNCTIONS

// NewTelemetryClient creates a client for sending logs to telemetry service
func NewTelemetryClient(url string, timeout time.Duration) *TelemetryClient {
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

	body, err := json.Marshal(req)
	if err != nil {
		return fmt.Errorf("failed to marshal log request: %w", err)
	}

	resp, err := c.client.Post(c.url, "application/json", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("failed to send log: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("telemetry returned status %d", resp.StatusCode)
	}

	return nil
}
