package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"telemetry/api"
	"telemetry/config"
	"telemetry/logger"
	"telemetry/rotation"
)

// main initializes and runs the telemetry logging service
func main() {
	// Load configuration from environment (port, log path, max file size)
	cfg := config.Load()

	// Create rotating log writer that handles file rotation at size limits
	writer, err := rotation.NewRotatingWriter(cfg.LogPath, cfg.MaxFileSize)
	if err != nil {
		log.Fatalf("Failed to initialize rotating writer: %v", err)
	}
	defer writer.Close()

	// Create logger that formats and writes log entries
	appLogger := logger.NewLogger(writer)
	// Create HTTP handler for log and status endpoints
	handler := api.NewHandler(appLogger)

	// Register HTTP endpoints for receiving logs and health checks
	http.HandleFunc("/log", handler.HandleLog)
	http.HandleFunc("/status", handler.HandleStatus)

	// Log service startup details for operational monitoring
	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("Telemetry service starting on %s", addr)
	log.Printf("Session ID: %s", writer.SessionID())
	log.Printf("Log path: %s", cfg.LogPath)
	log.Printf("Max file size: %d bytes", cfg.MaxFileSize)

	// Log service start event to its own log file
	appLogger.Log("INFO", "Telemetry service started", "", "telemetry")

	// Set up signal handler for graceful shutdown on SIGINT/SIGTERM
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	// Wait for shutdown signal in separate goroutine
	go func() {
		<-sigChan
		log.Println("Shutting down telemetry service...")
		appLogger.Log("INFO", "Telemetry service shutting down", "", "telemetry")
		writer.Close()
		os.Exit(0)
	}()

	// Start HTTP server and block until error or shutdown
	if err := http.ListenAndServe(addr, nil); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
