package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"heartbeat/client"
	"heartbeat/config"
	"heartbeat/monitor"

	"github.com/google/uuid"
)

// main initializes and runs the heartbeat service for continuous health monitoring
func main() {
	// Load configuration from environment variables with sensible defaults
	cfg := config.Load()

	// Create telemetry client for sending logs to centralized logging service
	telemetryClient := client.NewTelemetryClient(cfg.TelemetryURL, cfg.Interval)

	log.Printf("Heartbeat service starting")
	log.Printf("Check interval: %s", cfg.Interval)
	log.Printf("Telemetry URL: %s", cfg.TelemetryURL)
	log.Printf("Monitoring %d targets", len(cfg.Targets))

	for _, t := range cfg.Targets {
		log.Printf("  - %s: %s", t.Name, t.URL)
	}

	// Create monitor that will check all configured service endpoints
	mon := monitor.NewMonitor(cfg.Targets, telemetryClient, cfg.Interval)

	// Generate correlation ID for service startup event
	startupLogID := uuid.New().String()
	// Log service startup to telemetry with correlation ID
	if err := telemetryClient.Log("INFO", "Heartbeat service started", startupLogID); err != nil {
		log.Printf("Failed to send startup log to telemetry: %v", err)
	}

	// Set up graceful shutdown on SIGINT/SIGTERM signals
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	// Create ticker for periodic health checks at configured interval
	ticker := time.NewTicker(cfg.Interval)
	defer ticker.Stop()

	// Run initial health check before entering main loop
	runCheck(mon)

	// Main event loop: run checks on ticker or shutdown on signal
	for {
		select {
		case <-ticker.C:
			runCheck(mon)
		case <-sigChan:
			// Generate correlation ID for shutdown event
			shutdownLogID := uuid.New().String()
			log.Println("Shutting down heartbeat service...")
			// Log shutdown to telemetry with correlation ID
			if err := telemetryClient.Log("INFO", "Heartbeat service shutting down", shutdownLogID); err != nil {
				log.Printf("Failed to send shutdown log to telemetry: %v", err)
			}
			return
		}
	}
}

// runCheck executes health checks on all targets and logs results both locally and to telemetry
func runCheck(mon *monitor.Monitor) {
	log.Println("Running health check...")
	results := mon.CheckAll()
	mon.LogResults(results)

	for _, r := range results {
		if r.Healthy {
			log.Printf("  [OK] %s (%dms)", r.Name, r.Latency.Milliseconds())
		} else {
			log.Printf("  [FAIL] %s: %s", r.Name, r.Error)
		}
	}
}
