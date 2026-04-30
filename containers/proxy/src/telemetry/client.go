package telemetry

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/propagation"
)

// Client sends log entries to the centralized telemetry service
type Client struct {
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

// NewFromConfig constructs a Client using the provided telemetry URL and HTTP timeout.
func NewFromConfig(telemetryURL string, timeout time.Duration) *Client {
	return &Client{
		url: telemetryURL,
		client: &http.Client{
			Timeout: timeout,
		},
	}
}

// Log sends a log entry via c, falling back to local logging on failure
func Log(c *Client, ctx context.Context, level, message, logID string) {
	if err := c.Log(ctx, level, message, logID); err != nil {
		log.Printf("[ERROR] Failed to send telemetry log: %v (original message: %s)", err, message)
	}
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
