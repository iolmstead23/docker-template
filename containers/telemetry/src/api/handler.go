package api

import (
	"encoding/json"
	"net/http"

	"telemetry/logger"
)

// Handler processes HTTP requests for the telemetry API
type Handler struct {
	logger *logger.Logger // logger writes formatted log entries to rotating files
}

type LogRequest struct {
	Level   string `json:"level"`
	Message string `json:"message"`
	LogID   string `json:"log_id"`
	Source  string `json:"source"`
}

// StatusResponse is returned by the /status endpoint with service health
type StatusResponse struct {
	Status    string `json:"status"`
	SessionID string `json:"session_id"`
}

// ErrorResponse is returned for all error cases with details
type ErrorResponse struct {
	Error string `json:"error"`
}

// NewHandler creates an API handler with the provided logger
func NewHandler(logger *logger.Logger) *Handler {
	return &Handler{logger: logger}
}

// HandleLog receives log entries from services via POST /log
func (h *Handler) HandleLog(w http.ResponseWriter, r *http.Request) {
	// Only accept POST requests for log submission
	if r.Method != http.MethodPost {
		h.sendError(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Decode JSON log request from request body
	var req LogRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.sendError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	// Validate required fields are present in log request
	if req.Message == "" {
		h.sendError(w, "message is required", http.StatusBadRequest)
		return
	}

	// Write log entry to file system via logger
	if err := h.logger.Log(req.Level, req.Message, req.LogID, req.Source); err != nil {
		h.sendError(w, "failed to write log", http.StatusInternalServerError)
		return
	}

	// Return success response to caller
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

// HandleStatus returns service health information via GET /status
func (h *Handler) HandleStatus(w http.ResponseWriter, r *http.Request) {
	// Only accept GET requests for status checks
	if r.Method != http.MethodGet {
		h.sendError(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Build status response with session ID for log correlation
	response := StatusResponse{
		Status:    "ok",
		SessionID: h.logger.SessionID(),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// sendError writes a JSON error response with appropriate HTTP status code
func (h *Handler) sendError(w http.ResponseWriter, message string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(ErrorResponse{Error: message})
}
