package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

type Config struct {
	Interval      time.Duration
	TelemetryURL  string
	Targets       []Target
}

type Target struct {
	Name string
	URL  string
}

func Load() *Config {
	intervalStr := os.Getenv("HEARTBEAT_INTERVAL")
	interval := 15
	if intervalStr != "" {
		if parsed, err := strconv.Atoi(intervalStr); err == nil {
			interval = parsed
		}
	}

	telemetryHost := os.Getenv("TELEMETRY_HOST")
	if telemetryHost == "" {
		telemetryHost = "telemetry"
	}
	telemetryPort := os.Getenv("TELEMETRY_PORT")
	if telemetryPort == "" {
		telemetryPort = "8081"
	}

	proxyHost := os.Getenv("PROXY_HOST")
	if proxyHost == "" {
		proxyHost = "proxy"
	}
	proxyPort := os.Getenv("PROXY_PORT")
	if proxyPort == "" {
		proxyPort = "80"
	}

	webserviceHost := os.Getenv("WEBSERVICE_HOST")
	if webserviceHost == "" {
		webserviceHost = "webservice"
	}
	webservicePort := os.Getenv("WEBSERVICE_PORT")
	if webservicePort == "" {
		webservicePort = "3000"
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
		Interval:     time.Duration(interval) * time.Second,
		TelemetryURL: fmt.Sprintf("http://%s:%s/log", telemetryHost, telemetryPort),
		Targets:      targets,
	}
}
