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
	logPath     string
	maxFileSize int64
	sessionID   string
	currentFile *os.File
	currentSize int64
	mu          sync.Mutex
}

func NewRotatingWriter(logPath string, maxFileSize int64) (*RotatingWriter, error) {
	rw := &RotatingWriter{
		logPath:     logPath,
		maxFileSize: maxFileSize,
		sessionID:   uuid.New().String(),
	}

	if err := os.MkdirAll(logPath, 0755); err != nil {
		return nil, fmt.Errorf("failed to create log directory: %w", err)
	}

	if err := rw.openNewFile(); err != nil {
		return nil, err
	}

	return rw, nil
}

func (rw *RotatingWriter) SessionID() string {
	return rw.sessionID
}

func (rw *RotatingWriter) Write(p []byte) (n int, err error) {
	rw.mu.Lock()
	defer rw.mu.Unlock()

	if rw.currentSize+int64(len(p)) > rw.maxFileSize {
		if err := rw.rotate(); err != nil {
			return 0, err
		}
	}

	n, err = rw.currentFile.Write(p)
	if err != nil {
		return n, err
	}

	rw.currentSize += int64(n)
	return n, nil
}

func (rw *RotatingWriter) rotate() error {
	if rw.currentFile != nil {
		rw.currentFile.Close()
	}

	rw.sessionID = uuid.New().String()
	return rw.openNewFile()
}

func (rw *RotatingWriter) openNewFile() error {
	timestamp := time.Now().Format("20060102-150405")
	filename := fmt.Sprintf("telemetry-%s-%s.log", timestamp, rw.sessionID[:8])
	filePath := filepath.Join(rw.logPath, filename)

	file, err := os.OpenFile(filePath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		return fmt.Errorf("failed to open log file: %w", err)
	}

	rw.currentFile = file
	rw.currentSize = 0
	return nil
}

func (rw *RotatingWriter) Close() error {
	rw.mu.Lock()
	defer rw.mu.Unlock()

	if rw.currentFile != nil {
		return rw.currentFile.Close()
	}
	return nil
}
