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
)

func main() {
	cfg := config.Load()

	telemetryClient := client.NewTelemetryClient(cfg.TelemetryURL, cfg.Interval)

	log.Printf("Heartbeat service starting")
	log.Printf("Check interval: %s", cfg.Interval)
	log.Printf("Telemetry URL: %s", cfg.TelemetryURL)
	log.Printf("Monitoring %d targets", len(cfg.Targets))

	for _, t := range cfg.Targets {
		log.Printf("  - %s: %s", t.Name, t.URL)
	}

	mon := monitor.NewMonitor(cfg.Targets, telemetryClient, cfg.Interval)

	telemetryClient.Log("INFO", "Heartbeat service started")

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	ticker := time.NewTicker(cfg.Interval)
	defer ticker.Stop()

	runCheck(mon)

	for {
		select {
		case <-ticker.C:
			runCheck(mon)
		case <-sigChan:
			log.Println("Shutting down heartbeat service...")
			telemetryClient.Log("INFO", "Heartbeat service shutting down")
			return
		}
	}
}

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
