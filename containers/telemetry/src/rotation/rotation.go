package rotation

import (
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/google/uuid"
)

// RotatingWriter manages log file rotation based on size limits
type RotatingWriter struct {
	logPath     string    // logPath is the directory where log files are created
	maxFileSize int64     // maxFileSize is the byte limit triggering rotation to a new file
	sessionID   string    // sessionID uniquely identifies the current log file for correlation
	currentFile *os.File  // currentFile is the open file handle being written to
	currentSize int64     // currentSize tracks bytes written to current file
	mu          sync.Mutex // mu protects concurrent access to file operations
}

// NewRotatingWriter creates a writer that rotates log files at size threshold
func NewRotatingWriter(logPath string, maxFileSize int64) (*RotatingWriter, error) {
	rw := &RotatingWriter{
		logPath:     logPath,
		maxFileSize: maxFileSize,
		// Generate unique session ID for this log file
		sessionID:   uuid.New().String(),
	}

	// Ensure log directory exists before creating files
	if err := os.MkdirAll(logPath, 0755); err != nil {
		return nil, fmt.Errorf("failed to create log directory: %w", err)
	}

	// Open the initial log file for writing
	if err := rw.openNewFile(); err != nil {
		return nil, err
	}

	return rw, nil
}

// SessionID returns the current session identifier for log correlation
func (rw *RotatingWriter) SessionID() string {
	return rw.sessionID
}

// Write appends data to current log file and rotates if size limit exceeded
func (rw *RotatingWriter) Write(p []byte) (n int, err error) {
	// Lock for thread-safe file operations
	rw.mu.Lock()
	defer rw.mu.Unlock()

	// Check if writing would exceed size limit and rotate if needed
	if rw.currentSize+int64(len(p)) > rw.maxFileSize {
		if err := rw.rotate(); err != nil {
			return 0, err
		}
	}

	// Write data to current file and track bytes written
	n, err = rw.currentFile.Write(p)
	if err != nil {
		return n, err
	}

	rw.currentSize += int64(n)
	return n, nil
}

// rotate closes current file and opens a new one with fresh session ID
func (rw *RotatingWriter) rotate() error {
	// Close current file if one is open
	if rw.currentFile != nil {
		rw.currentFile.Close()
	}

	// Generate new session ID for the new file
	rw.sessionID = uuid.New().String()
	return rw.openNewFile()
}

// openNewFile creates and opens a new log file with timestamp and session ID
func (rw *RotatingWriter) openNewFile() error {
	// Generate timestamp for log file name (YYYYMMDD-HHMMSS format)
	timestamp := time.Now().Format("20060102-150405")
	// Build filename with timestamp and truncated session ID
	filename := fmt.Sprintf("telemetry-%s-%s.log", timestamp, rw.sessionID[:8])
	filePath := filepath.Join(rw.logPath, filename)

	// Open file with create, write, and append flags
	file, err := os.OpenFile(filePath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		return fmt.Errorf("failed to open log file: %w", err)
	}

	// Set as current file and reset size counter
	rw.currentFile = file
	rw.currentSize = 0
	return nil
}

// Close flushes and closes the current log file
func (rw *RotatingWriter) Close() error {
	rw.mu.Lock()
	defer rw.mu.Unlock()

	if rw.currentFile != nil {
		return rw.currentFile.Close()
	}
	return nil
}
