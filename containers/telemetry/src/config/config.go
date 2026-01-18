package config

import (
	"os"
	"strconv"
)

type Config struct {
	Port        string
	LogPath     string
	MaxFileSize int64
}

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
	maxFileSize := int64(1048576) // Default 1MB
	if maxFileSizeStr != "" {
		if parsed, err := strconv.ParseInt(maxFileSizeStr, 10, 64); err == nil {
			maxFileSize = parsed
		}
	}

	return &Config{
		Port:        port,
		LogPath:     logPath,
		MaxFileSize: maxFileSize,
	}
}
