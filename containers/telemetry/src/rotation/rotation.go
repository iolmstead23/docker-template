package rotation

import (
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/google/uuid"
)

type RotatingWriter struct {
	logPath            string
	maxFileSize        int64
	sessionID          string
	currentFile        *os.File
	currentSize        int64
	mu                 sync.Mutex
	writeCounter       int
	validationInterval int
	currentFileName    string
	currentInode       uint64
}

// NewRotatingWriter creates a writer that rotates log files at size threshold
func NewRotatingWriter(logPath string, maxFileSize int64, validationInterval int) (*RotatingWriter, error) {
	rw := &RotatingWriter{
		logPath:            logPath,
		maxFileSize:        maxFileSize,
		sessionID:          uuid.New().String(),
		writeCounter:       0,
		validationInterval: validationInterval,
	}

	if err := os.MkdirAll(logPath, 0755); err != nil {
		return nil, fmt.Errorf("failed to create log directory: %w", err)
	}

	if err := rw.openNewFile(); err != nil {
		return nil, err
	}

	return rw, nil
}

// SessionID returns the current session identifier for log correlation
func (rw *RotatingWriter) SessionID() string {
	return rw.sessionID
}

// checkFileExists checks if the current log file still exists on the filesystem
func (rw *RotatingWriter) checkFileExists() error {
	info, err := os.Stat(rw.currentFileName)
	if err != nil {
		if os.IsNotExist(err) {
			return fmt.Errorf("log file deleted: %w", err)
		}
		return fmt.Errorf("failed to stat log file: %w", err)
	}
	if extractInode(info) != rw.currentInode {
		return fmt.Errorf("log file replaced: inode changed")
	}
	return nil
}

// recreateDeletedLogFile handles recreation of a deleted log file with the same filename
func (rw *RotatingWriter) recreateDeletedLogFile() error {
	fmt.Fprintf(os.Stderr, "[WARN] Log file deleted, recreating: %s (session: %s)\n",
		rw.currentFileName, rw.sessionID)

	if rw.currentFile != nil {
		rw.currentFile.Close()
	}

	file, err := os.OpenFile(rw.currentFileName,
		os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		return fmt.Errorf("failed to recreate log file: %w", err)
	}

	info, err := file.Stat()
	if err != nil {
		file.Close()
		return fmt.Errorf("failed to stat recreated log file: %w", err)
	}
	rw.currentFile = file
	rw.currentSize = 0
	rw.writeCounter = 0
	rw.currentInode = extractInode(info)

	return nil
}

// recoverMissingFile validates the file exists and recreates it if deleted
func (rw *RotatingWriter) recoverMissingFile() error {
	if err := rw.checkFileExists(); err != nil {
		return rw.recreateDeletedLogFile()
	}
	return nil
}

// Write appends data to current log file and rotates if size limit exceeded
func (rw *RotatingWriter) Write(p []byte) (n int, err error) {
	rw.mu.Lock()
	defer rw.mu.Unlock()

	rw.writeCounter++

	if rw.writeCounter%rw.validationInterval == 0 {
		if err := rw.recoverMissingFile(); err != nil {
			return 0, err
		}
	}

	if rw.currentSize+int64(len(p)) > rw.maxFileSize {
		if err := rw.rotate(); err != nil {
			return 0, err
		}
	}

	n, err = rw.currentFile.Write(p)
	if err != nil {
		if recreateErr := rw.recreateDeletedLogFile(); recreateErr != nil {
			return n, fmt.Errorf("write failed and recreation failed: %w", recreateErr)
		}
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
	if rw.currentFile != nil {
		rw.currentFile.Close()
	}

	rw.sessionID = uuid.New().String()
	rw.writeCounter = 0
	return rw.openNewFile()
}

// openNewFile creates and opens a new log file with timestamp and session ID
func (rw *RotatingWriter) openNewFile() error {
	timestamp := time.Now().Format("20060102-150405")
	filename := fmt.Sprintf("telemetry-%s-%s.log", timestamp, rw.sessionID[:8])
	filePath := filepath.Join(rw.logPath, filename)

	file, err := os.OpenFile(filePath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		return fmt.Errorf("failed to open log file: %w", err)
	}

	info, err := file.Stat()
	if err != nil {
		file.Close()
		return fmt.Errorf("failed to stat new log file: %w", err)
	}
	rw.currentFile = file
	rw.currentSize = 0
	rw.currentFileName = filePath
	rw.currentInode = extractInode(info)
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
