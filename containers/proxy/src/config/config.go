package config

import (
	"fmt"
	"log"
	"os"
	"time"
)

// Active holds the loaded service configuration, set once at startup by Load.
var Active Config

// Config holds all proxy service configuration loaded from environment variables.
type Config struct {
	ProxyPort        string
	ProxyAdminPort   string
	TelemetryHost    string
	TelemetryPort    string
	TelemetryTimeout time.Duration
	TelemetryURL     string
	WebserviceHost   string
	WebservicePort   string
	OTLPEndpoint     string
}

// getEnvOrDefault returns the value of key if set and non-empty, otherwise defaultVal.
func getEnvOrDefault(key, defaultVal string) string {
	val := os.Getenv(key)
	if val == "" {
		return defaultVal
	}
	return val
}

// Load reads all proxy environment variables once, stores the result in Active, and returns a pointer to it.
func Load() *Config {
	timeoutStr := getEnvOrDefault("TELEMETRY_TIMEOUT", "5s")
	timeout, err := time.ParseDuration(timeoutStr)
	if err != nil {
		log.Printf("Invalid TELEMETRY_TIMEOUT %q, using default 5s: %v", timeoutStr, err)
		timeout = 5 * time.Second
	}

	telemetryHost := getEnvOrDefault("TELEMETRY_HOST", "telemetry")
	telemetryPort := getEnvOrDefault("TELEMETRY_PORT", "8081")

	Active = Config{
		ProxyPort:        getEnvOrDefault("PROXY_PORT", "80"),
		ProxyAdminPort:   getEnvOrDefault("PROXY_ADMIN_PORT", "2019"),
		TelemetryHost:    telemetryHost,
		TelemetryPort:    telemetryPort,
		TelemetryTimeout: timeout,
		TelemetryURL:     fmt.Sprintf("http://%s:%s/log", telemetryHost, telemetryPort),
		WebserviceHost:   getEnvOrDefault("WEBSERVICE_HOST", "webservice"),
		WebservicePort:   getEnvOrDefault("WEBSERVICE_PORT", "3000"),
		OTLPEndpoint:     getEnvOrDefault("OTEL_EXPORTER_OTLP_ENDPOINT", "otel-collector:4318"),
	}
	return &Active
}
