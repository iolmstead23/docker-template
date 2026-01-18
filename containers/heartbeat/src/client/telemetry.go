package client

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type TelemetryClient struct {
	url    string
	client *http.Client
}

type LogRequest struct {
	Level   string `json:"level"`
	Message string `json:"message"`
	LogID   string `json:"log_id"`
	Source  string `json:"source"`
}

func NewTelemetryClient(url string, timeout time.Duration) *TelemetryClient {
	return &TelemetryClient{
		url: url,
		client: &http.Client{
			Timeout: timeout,
		},
	}
}

func (c *TelemetryClient) Log(level, message string) error {
	req := LogRequest{
		Level:   level,
		Message: message,
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

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("telemetry returned status %d", resp.StatusCode)
	}

	return nil
}
