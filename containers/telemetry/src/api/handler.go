package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"

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

func decodeLogRequest(r *http.Request) (*LogRequest, error) {
	var req LogRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		if errors.Is(err, io.EOF) {
			return nil, errors.New("empty body")
		}
		var syntaxErr *json.SyntaxError
		if errors.As(err, &syntaxErr) {
			return nil, fmt.Errorf("malformed JSON at offset %d", syntaxErr.Offset)
		}
		return nil, err
	}
	return &req, nil
}

func validateLogRequest(req *LogRequest) error {
	// DT-24: Reject both empty and whitespace-only messages
	if strings.TrimSpace(req.Message) == "" {
		return errors.New("message is required")
	}
	return nil
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
	logRequest, err := decodeLogRequest(r)
	if err != nil {
		span.SetStatus(codes.Error, err.Error())
		h.sendError(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Add log metadata to span
	span.SetAttributes(
		attribute.String("log.level", logRequest.Level),
		attribute.String("log.source", logRequest.Source),
		attribute.String("log.correlation.id", logRequest.LogID),
	)

	// Validate required fields are present in log request
	if err := validateLogRequest(logRequest); err != nil {
		span.SetStatus(codes.Error, err.Error())
		h.sendError(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Write log entry to file system via logger
	// DT-34: Renamed req to logRequest to clarify variable type and purpose.
	if err := h.logger.Log(logRequest.Level, logRequest.Message, logRequest.LogID, logRequest.Source); err != nil {
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
// Note: No tracing for health checks to reduce noise
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
