package logger

import (
	"encoding/json"
	"strings"
	"time"

	"telemetry/rotation"
)

// Logger formats and writes log entries to rotating files
type Logger struct {
	writer *rotation.RotatingWriter // writer handles file rotation and manages current log file
}

// NewLogger creates a logger that writes to the provided rotating writer
func NewLogger(writer *rotation.RotatingWriter) *Logger {
	return &Logger{writer: writer}
}

// SessionID returns the current log file session identifier for correlation
func (l *Logger) SessionID() string {
	return l.writer.SessionID()
}

// LogEntry represents a structured log entry in JSONL format
type LogEntry struct {
	Timestamp string `json:"timestamp"`
	Level     string `json:"level"`
	LogID     string `json:"log_id"`
	Source    string `json:"source"`
	Message   string `json:"message"`
}

// Log writes a JSONL formatted log entry with timestamp, level, ID, source, and message
func (l *Logger) Log(level, message, logID, source string) error {
	// Normalize level to uppercase for consistency
	level = strings.ToUpper(level)
	// Validate log level and default to INFO if invalid
	if !isValidLevel(level) {
		level = "INFO"
	}

	// Use hyphen placeholder for empty log IDs
	if logID == "" {
		logID = "-"
	}

	// Use "unknown" for empty source to aid in debugging misconfigured services
	if source == "" {
		source = "unknown"
	}

	// Create structured log entry
	entry := LogEntry{
		Timestamp: time.Now().Format("2006-01-02T15:04:05.000Z07:00"),
		Level:     level,
		LogID:     logID,
		Source:    source,
		Message:   message,
	}

	// Marshal to JSON (single line)
	jsonData, err := json.Marshal(entry)
	if err != nil {
		return err
	}

	// Write JSONL entry (JSON + newline) to rotating log file
	jsonData = append(jsonData, '\n')
	_, err = l.writer.Write(jsonData)
	return err
}

// isValidLevel checks if the provided log level is one of the supported levels
func isValidLevel(level string) bool {
	validLevels := []string{"DEBUG", "INFO", "WARN", "ERROR"}
	for _, valid := range validLevels {
		if level == valid {
			return true
		}
	}
	return false
}

// Close flushes and closes the underlying log file writer
func (l *Logger) Close() error {
	return l.writer.Close()
}
