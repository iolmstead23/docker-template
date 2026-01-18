package api

import (
	"encoding/json"
	"net/http"

	"telemetry/logger"
)

type Handler struct {
	logger *logger.Logger
}

type LogRequest struct {
	Level   string `json:"level"`
	Message string `json:"message"`
	LogID   string `json:"log_id"`
	Source  string `json:"source"`
}

type StatusResponse struct {
	Status    string `json:"status"`
	SessionID string `json:"session_id"`
}

type ErrorResponse struct {
	Error string `json:"error"`
}

func NewHandler(logger *logger.Logger) *Handler {
	return &Handler{logger: logger}
}

func (h *Handler) HandleLog(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.sendError(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req LogRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.sendError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Message == "" {
		h.sendError(w, "message is required", http.StatusBadRequest)
		return
	}

	if err := h.logger.Log(req.Level, req.Message, req.LogID, req.Source); err != nil {
		h.sendError(w, "failed to write log", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func (h *Handler) HandleStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		h.sendError(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	response := StatusResponse{
		Status:    "ok",
		SessionID: h.logger.SessionID(),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (h *Handler) sendError(w http.ResponseWriter, message string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(ErrorResponse{Error: message})
}
