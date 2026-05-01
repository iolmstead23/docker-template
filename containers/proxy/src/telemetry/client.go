package telemetry

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/propagation"
)

// Client sends log entries to the centralized telemetry service
type Client struct {
	url         string
	client      *http.Client
	mu          sync.Mutex
	circuitOpen bool
}

// LogRequest represents a telemetry log entry with correlation ID for distributed tracing
type LogRequest struct {
	Level   string `json:"level"`
	Message string `json:"message"`
	LogID   string `json:"log_id"`
	Source  string `json:"source"`
}

// NewFromConfig constructs a Client using the provided telemetry URL and HTTP timeout.
func NewFromConfig(telemetryURL string, timeout time.Duration) *Client {
	return &Client{
		url: telemetryURL,
		client: &http.Client{
			Timeout: timeout,
		},
	}
}

// Log sends a log entry via c; opens the circuit on first failure and suppresses subsequent errors until the endpoint recovers
func Log(c *Client, ctx context.Context, level, message, logID string) {
	if err := c.Log(ctx, level, message, logID); err != nil {
		c.openCircuit(err, message)
		return
	}
	c.closeCircuit()
}

// openCircuit logs the first telemetry failure and marks the circuit open; suppresses all subsequent failures until closeCircuit is called
func (c *Client) openCircuit(err error, originalMessage string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if !c.circuitOpen {
		log.Printf("[ERROR] Failed to send telemetry log: %v (original message: %s)", err, originalMessage)
		c.circuitOpen = true
	}
}

// closeCircuit resets the circuit so the next failure will be logged
func (c *Client) closeCircuit() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.circuitOpen = false
}

// Log submits a structured entry to the centralized telemetry service; attaches the current trace context for correlation
func (c *Client) Log(ctx context.Context, level, message, logID string) error {
	tracer := otel.Tracer("proxy")
	ctx, span := tracer.Start(ctx, "telemetry-log")
	defer span.End()

	span.SetAttributes(
		attribute.String("log.level", level),
		attribute.String("log.correlation.id", logID),
		attribute.String("telemetry.endpoint", c.url),
	)

	req := LogRequest{
		Level:   level,
		Message: message,
		LogID:   logID,
		Source:  "proxy",
	}

	body, err := json.Marshal(req)
	if err != nil {
		span.RecordError(err)
		return fmt.Errorf("failed to marshal log request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", c.url, bytes.NewReader(body))
	if err != nil {
		span.RecordError(err)
		return fmt.Errorf("failed to create HTTP request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	otel.GetTextMapPropagator().Inject(ctx, propagation.HeaderCarrier(httpReq.Header))

	resp, err := c.client.Do(httpReq)
	if err != nil {
		span.RecordError(err)
		return fmt.Errorf("failed to send HTTP request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		err := fmt.Errorf("telemetry service returned status %d", resp.StatusCode)
		span.RecordError(err)
		return err
	}

	return nil
}
