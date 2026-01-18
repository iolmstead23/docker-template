package telemetry

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"
)

// Client sends log entries to the centralized telemetry service
type Client struct {
	url    string       // url is the telemetry service /log endpoint
	client *http.Client // client is the HTTP client with configured timeout
}

// LogRequest represents a telemetry log entry with correlation ID for distributed tracing
type LogRequest struct {
	Level   string `json:"level"`
	Message string `json:"message"`
	LogID   string `json:"log_id"`
	Source  string `json:"source"`
}

var defaultClient *Client

// init initializes the default telemetry client from environment variables
func init() {
	// Read telemetry host from environment with default fallback
	host := os.Getenv("TELEMETRY_HOST")
	if host == "" {
		host = "telemetry"
	}
	// Read telemetry port from environment with default fallback
	port := os.Getenv("TELEMETRY_PORT")
	if port == "" {
		port = "8081"
	}

	// Create default client with 5-second timeout for telemetry requests
	defaultClient = &Client{
		url: fmt.Sprintf("http://%s:%s/log", host, port),
		client: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

// Log sends a log entry to telemetry with local fallback on failure
func Log(level, message, logID string) {
	if defaultClient == nil {
		// Log locally if telemetry client not initialized
		log.Printf("[WARN] Telemetry client not initialized, cannot log: %s", message)
		return
	}
	// Attempt to send log to telemetry service, fallback to local logging on failure
	if err := defaultClient.Log(level, message, logID); err != nil {
		log.Printf("[ERROR] Failed to send telemetry log: %v (original message: %s)", err, message)
	}
}

// Log sends the log request via HTTP POST with error handling
func (c *Client) Log(level, message, logID string) error {
	req := LogRequest{
		Level:   level,
		Message: message,
		LogID:   logID,
		Source:  "proxy",
	}

	body, err := json.Marshal(req)
	if err != nil {
		return fmt.Errorf("failed to marshal log request: %w", err)
	}

	resp, err := c.client.Post(c.url, "application/json", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("failed to send HTTP request: %w", err)
	}
	defer resp.Body.Close()

	// Check HTTP status code to ensure telemetry service accepted the log
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("telemetry service returned status %d", resp.StatusCode)
	}

	return nil
}
