package api

import (
	"encoding/json"
	"net/http"

	"telemetry/logger"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
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
	// Create span for log request processing
	tracer := otel.Tracer("telemetry")
	_, span := tracer.Start(r.Context(), "log-request")
	defer span.End()

	// Only accept POST requests for log submission
	if r.Method != http.MethodPost {
		span.SetStatus(codes.Error, "method not allowed")
		h.sendError(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Decode JSON log request from request body
	var req LogRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		span.SetStatus(codes.Error, "invalid request body")
		h.sendError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	// Add log metadata to span
	span.SetAttributes(
		attribute.String("log.level", req.Level),
		attribute.String("log.source", req.Source),
		attribute.String("log.correlation.id", req.LogID),
	)

	// Validate required fields are present in log request
	if req.Message == "" {
		span.SetStatus(codes.Error, "message is required")
		h.sendError(w, "message is required", http.StatusBadRequest)
		return
	}

	// Write log entry to file system via logger
	if err := h.logger.Log(req.Level, req.Message, req.LogID, req.Source); err != nil {
		span.SetStatus(codes.Error, "failed to write log")
		h.sendError(w, "failed to write log", http.StatusInternalServerError)
		return
	}

	span.SetStatus(codes.Ok, "")

	// Return success response to caller
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

// HandleStatus returns service health information via GET /status
func (h *Handler) HandleStatus(w http.ResponseWriter, r *http.Request) {
	// Create span for status request
	tracer := otel.Tracer("telemetry")
	_, span := tracer.Start(r.Context(), "status-request")
	defer span.End()

	// Only accept GET requests for status checks
	if r.Method != http.MethodGet {
		span.SetStatus(codes.Error, "method not allowed")
		h.sendError(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Build status response with session ID for log correlation
	response := StatusResponse{
		Status:    "ok",
		SessionID: h.logger.SessionID(),
	}

	span.SetAttributes(attribute.String("session.id", h.logger.SessionID()))
	span.SetStatus(codes.Ok, "")

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// sendError writes a JSON error response with appropriate HTTP status code
func (h *Handler) sendError(w http.ResponseWriter, message string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(ErrorResponse{Error: message})
}
