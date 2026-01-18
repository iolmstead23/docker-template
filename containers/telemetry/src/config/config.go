package config

import (
	"log"
	"os"
	"strconv"
)

// Config holds telemetry service configuration from environment
type Config struct {
	Port               string // Port is the HTTP server port to listen on
	LogPath            string // LogPath is the directory where log files are written
	MaxFileSize        int64  // MaxFileSize is the byte limit before rotating to a new log file
	ValidationInterval int    // ValidationInterval is how often to check if log file still exists
}

// Load reads environment variables and constructs telemetry configuration
func Load() *Config {
	// Read HTTP port from environment with default fallback
	port := os.Getenv("TELEMETRY_PORT")
	if port == "" {
		port = "8081"
	}

	// Read log directory path from environment with default fallback
	logPath := os.Getenv("TELEMETRY_LOG_PATH")
	if logPath == "" {
		logPath = "/var/log/telemetry"
	}

	maxFileSizeStr := os.Getenv("TELEMETRY_MAX_FILE_SIZE")
	maxFileSize := int64(1048576) // Default 1MB max log file size
	if maxFileSizeStr != "" {
		if parsed, err := strconv.ParseInt(maxFileSizeStr, 10, 64); err == nil {
			maxFileSize = parsed
			log.Printf("Using configured max file size: %d bytes", maxFileSize)
		} else {
			// Log parsing failure so operators know config was ignored
			log.Printf("Invalid TELEMETRY_MAX_FILE_SIZE '%s', using default %d bytes: %v", maxFileSizeStr, maxFileSize, err)
		}
	} else {
		log.Printf("TELEMETRY_MAX_FILE_SIZE not set, using default %d bytes", maxFileSize)
	}

	// Read validation interval from environment with default fallback
	validationIntervalStr := os.Getenv("TELEMETRY_VALIDATION_INTERVAL")
	validationInterval := 50 // Default: check every 50 writes
	if validationIntervalStr != "" {
		if parsed, err := strconv.Atoi(validationIntervalStr); err == nil && parsed > 0 {
			validationInterval = parsed
			log.Printf("Using configured validation interval: %d writes", validationInterval)
		} else {
			log.Printf("Invalid TELEMETRY_VALIDATION_INTERVAL '%s', using default %d writes: %v", validationIntervalStr, validationInterval, err)
		}
	} else {
		log.Printf("TELEMETRY_VALIDATION_INTERVAL not set, using default %d writes", validationInterval)
	}

	// Return fully configured telemetry service settings
	return &Config{
		Port:               port,
		LogPath:            logPath,
		MaxFileSize:        maxFileSize,
		ValidationInterval: validationInterval,
	}
}
