package config

import (
	"log"
	"os"
	"strconv"
)

type Config struct {
	Port               string
	LogPath            string
	MaxFileSize        int64
	ValidationInterval int
}

// Load reads environment variables and constructs telemetry configuration
func Load() *Config {
	port := os.Getenv("TELEMETRY_PORT")
	if port == "" {
		port = "8081"
	}

	logPath := os.Getenv("TELEMETRY_LOG_PATH")
	if logPath == "" {
		logPath = "/var/log/telemetry"
	}

	maxFileSizeStr := os.Getenv("TELEMETRY_MAX_FILE_SIZE")
	maxFileSize := int64(1048576)
	if maxFileSizeStr != "" {
		if parsed, err := strconv.ParseInt(maxFileSizeStr, 10, 64); err == nil {
			maxFileSize = parsed
			log.Printf("Using configured max file size: %d bytes", maxFileSize)
		} else {
			log.Printf("Invalid TELEMETRY_MAX_FILE_SIZE '%s', using default %d bytes: %v", maxFileSizeStr, maxFileSize, err)
		}
	} else {
		log.Printf("TELEMETRY_MAX_FILE_SIZE not set, using default %d bytes", maxFileSize)
	}

	validationIntervalStr := os.Getenv("TELEMETRY_VALIDATION_INTERVAL")
	validationInterval := 10
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

	return &Config{
		Port:               port,
		LogPath:            logPath,
		MaxFileSize:        maxFileSize,
		ValidationInterval: validationInterval,
	}
}
