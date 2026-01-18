package telemetry

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"
)

type Client struct {
	url    string
	client *http.Client
}

type LogRequest struct {
	Level   string `json:"level"`
	Message string `json:"message"`
	LogID   string `json:"log_id"`
	Source  string `json:"source"`
}

var defaultClient *Client

func init() {
	host := os.Getenv("TELEMETRY_HOST")
	if host == "" {
		host = "telemetry"
	}
	port := os.Getenv("TELEMETRY_PORT")
	if port == "" {
		port = "8081"
	}

	defaultClient = &Client{
		url: fmt.Sprintf("http://%s:%s/log", host, port),
		client: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

func Log(level, message, logID string) {
	if defaultClient == nil {
		return
	}
	defaultClient.Log(level, message, logID)
}

func (c *Client) Log(level, message, logID string) error {
	req := LogRequest{
		Level:   level,
		Message: message,
		LogID:   logID,
		Source:  "proxy",
	}

	body, err := json.Marshal(req)
	if err != nil {
		return err
	}

	resp, err := c.client.Post(c.url, "application/json", bytes.NewReader(body))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	return nil
}
