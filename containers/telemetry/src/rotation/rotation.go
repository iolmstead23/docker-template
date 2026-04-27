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
	logPath            string     // logPath is the directory where log files are created
	maxFileSize        int64      // maxFileSize is the byte limit triggering rotation to a new file
	sessionID          string     // sessionID uniquely identifies the current log file for correlation
	currentFile        *os.File   // currentFile is the open file handle being written to
	currentSize        int64      // currentSize tracks bytes written to current file
	mu                 sync.Mutex // mu protects concurrent access to file operations
	writeCounter       int        // writeCounter tracks writes since last validation
	validationInterval int        // validationInterval is how often to validate file existence
	currentFileName    string     // currentFileName is the full path to current log file
}

// NewRotatingWriter creates a writer that rotates log files at size threshold
func NewRotatingWriter(logPath string, maxFileSize int64, validationInterval int) (*RotatingWriter, error) {
	rw := &RotatingWriter{
		logPath:            logPath,
		maxFileSize:        maxFileSize,
		sessionID:          uuid.New().String(), // Generate unique session ID for this log file
		writeCounter:       0,
		validationInterval: validationInterval,
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

// validateFile checks if the current log file still exists on the filesystem
func (rw *RotatingWriter) validateFile() error {
	if _, err := os.Stat(rw.currentFileName); err != nil {
		if os.IsNotExist(err) {
			return fmt.Errorf("log file deleted: %w", err)
		}
		return fmt.Errorf("failed to stat log file: %w", err)
	}
	return nil
}

// recreateDeletedLogFile handles recreation of a deleted log file with the same filename
// DT-32: Renamed from recreateFile to clarify the specific recovery scenario.
func (rw *RotatingWriter) recreateDeletedLogFile() error {
	// Log to stderr (visible in Docker logs, no recursion)
	fmt.Fprintf(os.Stderr, "[WARN] Log file deleted, recreating: %s (session: %s)\n",
		rw.currentFileName, rw.sessionID)

	// Close orphaned handle
	if rw.currentFile != nil {
		rw.currentFile.Close()
	}

	// Recreate with SAME filename (preserves session continuity)
	file, err := os.OpenFile(rw.currentFileName,
		os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		return fmt.Errorf("failed to recreate log file: %w", err)
	}

	// Update state
	rw.currentFile = file
	rw.currentSize = 0  // Reset - file is empty
	rw.writeCounter = 0 // Reset validation counter

	return nil
}

// recoverMissingFile validates the file exists and recreates it if deleted
func (rw *RotatingWriter) recoverMissingFile() error {
	if err := rw.validateFile(); err != nil {
		return rw.recreateDeletedLogFile()
	}
	return nil
}

// Write appends data to current log file and rotates if size limit exceeded
func (rw *RotatingWriter) Write(p []byte) (n int, err error) {
	// Lock for thread-safe file operations
	rw.mu.Lock()
	defer rw.mu.Unlock()

	// Increment write counter
	rw.writeCounter++

	// Periodic validation check
	if rw.writeCounter%rw.validationInterval == 0 {
		if err := rw.recoverMissingFile(); err != nil { // DT-8
			return 0, err
		}
	}

	// Check if writing would exceed size limit and rotate if needed
	if rw.currentSize+int64(len(p)) > rw.maxFileSize {
		if err := rw.rotate(); err != nil {
			return 0, err
		}
	}

	// Attempt write
	n, err = rw.currentFile.Write(p)
	if err != nil {
		// Write failed - try to recreate once
		if recreateErr := rw.recreateDeletedLogFile(); recreateErr != nil {
			return n, fmt.Errorf("write failed and recreation failed: %w", recreateErr)
		}
		// Retry write after recreation
		n, err = rw.currentFile.Write(p)
		if err != nil {
			return n, fmt.Errorf("write failed after recreation: %w", err)
		}
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
	// Reset write counter on rotation
	rw.writeCounter = 0
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
	// Store full file path for validation
	rw.currentFileName = filePath
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
