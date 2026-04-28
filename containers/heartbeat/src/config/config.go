package config

import (
	"fmt"
	"log"
	"os"
	"strconv"
	"time"
)

// Config holds all heartbeat service configuration loaded from environment
type Config struct {
	Interval         time.Duration
	TelemetryURL     string
	TelemetryTimeout time.Duration
	Targets          []Target
}

// Target represents a single service endpoint to health check
type Target struct {
	Name string
	URL  string
}

// getEnvOrDefault reads an environment variable and returns its value, or a default if unset.
func getEnvOrDefault(key, defaultVal string) string {
	val := os.Getenv(key)
	if val == "" {
		return defaultVal
	}
	return val
}

// Load reads environment variables and constructs service configuration with defaults
func Load() *Config {
	intervalStr := os.Getenv("HEARTBEAT_INTERVAL")
	interval := 15
	if intervalStr != "" {
		if parsed, err := strconv.Atoi(intervalStr); err == nil {
			interval = parsed
			log.Printf("Using configured heartbeat interval: %d seconds", interval)
		} else {
			log.Printf("Invalid HEARTBEAT_INTERVAL '%s', using default %d seconds: %v", intervalStr, interval, err)
		}
	} else {
		log.Printf("HEARTBEAT_INTERVAL not set, using default %d seconds", interval)
	}

	telemetryHost := getEnvOrDefault("TELEMETRY_HOST", "telemetry")
	telemetryPort := getEnvOrDefault("TELEMETRY_PORT", "8081")
	proxyHost := getEnvOrDefault("PROXY_HOST", "proxy")
	proxyPort := getEnvOrDefault("PROXY_PORT", "80")
	webserviceHost := getEnvOrDefault("WEBSERVICE_HOST", "webservice")
	webservicePort := getEnvOrDefault("WEBSERVICE_PORT", "3000")

	telemetryTimeoutStr := getEnvOrDefault("TELEMETRY_TIMEOUT", "5s")
	telemetryTimeout, err := time.ParseDuration(telemetryTimeoutStr)
	if err != nil {
		log.Printf("Invalid TELEMETRY_TIMEOUT '%s', using default 5s: %v", telemetryTimeoutStr, err)
		telemetryTimeout = 5 * time.Second
	}

	targets := []Target{
		{
			Name: "telemetry",
			URL:  fmt.Sprintf("http://%s:%s/status", telemetryHost, telemetryPort),
		},
		{
			Name: "proxy",
			URL:  fmt.Sprintf("http://%s:%s/status", proxyHost, proxyPort),
		},
		{
			Name: "webservice",
			URL:  fmt.Sprintf("http://%s:%s/api/status", webserviceHost, webservicePort),
		},
	}

	return &Config{
		Interval:         time.Duration(interval) * time.Second,
		TelemetryURL:     fmt.Sprintf("http://%s:%s/log", telemetryHost, telemetryPort),
		TelemetryTimeout: telemetryTimeout,
		Targets:          targets,
	}
}
