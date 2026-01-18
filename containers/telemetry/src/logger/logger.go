package logger

import (
	"fmt"
	"strings"
	"time"

	"telemetry/rotation"
)

type Logger struct {
	writer *rotation.RotatingWriter
}

func NewLogger(writer *rotation.RotatingWriter) *Logger {
	return &Logger{writer: writer}
}

func (l *Logger) SessionID() string {
	return l.writer.SessionID()
}

func (l *Logger) Log(level, message, logID, source string) error {
	level = strings.ToUpper(level)
	if !isValidLevel(level) {
		level = "INFO"
	}

	if logID == "" {
		logID = "-"
	}

	if source == "" {
		source = "unknown"
	}

	timestamp := time.Now().Format("2006-01-02T15:04:05.000Z07:00")
	entry := fmt.Sprintf("[%s] [%s] [%s] [%s] %s\n", timestamp, level, logID, source, message)

	_, err := l.writer.Write([]byte(entry))
	return err
}

func isValidLevel(level string) bool {
	validLevels := []string{"DEBUG", "INFO", "WARN", "ERROR"}
	for _, valid := range validLevels {
		if level == valid {
			return true
		}
	}
	return false
}

func (l *Logger) Close() error {
	return l.writer.Close()
}
