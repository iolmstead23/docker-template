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

func main() {
	cfg := config.Load()

	writer, err := rotation.NewRotatingWriter(cfg.LogPath, cfg.MaxFileSize)
	if err != nil {
		log.Fatalf("Failed to initialize rotating writer: %v", err)
	}
	defer writer.Close()

	appLogger := logger.NewLogger(writer)
	handler := api.NewHandler(appLogger)

	http.HandleFunc("/log", handler.HandleLog)
	http.HandleFunc("/status", handler.HandleStatus)

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("Telemetry service starting on %s", addr)
	log.Printf("Session ID: %s", writer.SessionID())
	log.Printf("Log path: %s", cfg.LogPath)
	log.Printf("Max file size: %d bytes", cfg.MaxFileSize)

	appLogger.Log("INFO", "Telemetry service started", "", "telemetry")

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-sigChan
		log.Println("Shutting down telemetry service...")
		appLogger.Log("INFO", "Telemetry service shutting down", "", "telemetry")
		writer.Close()
		os.Exit(0)
	}()

	if err := http.ListenAndServe(addr, nil); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
