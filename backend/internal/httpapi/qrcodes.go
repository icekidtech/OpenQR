package httpapi

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/icekidtech/OpenQR/backend/internal/auth"
	"github.com/icekidtech/OpenQR/backend/internal/store"
)

type createQRCodeRequest struct {
	Label    *string         `json:"label"`
	URL      string          `json:"url"`
	Settings json.RawMessage `json:"settings"`
	Format   *string         `json:"format"`
	BatchID  *string         `json:"batchId"`
}

func (s *Server) handleListQRCodes(w http.ResponseWriter, r *http.Request) {
	userID, _ := auth.UserIDFromContext(r.Context())
	var batchID *string
	if b := r.URL.Query().Get("batchId"); b != "" {
		batchID = &b
	}
	items, err := s.store.ListQRCodes(r.Context(), userID, batchID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load qr codes")
		return
	}
	if items == nil {
		items = []store.QRCode{}
	}
	writeJSON(w, http.StatusOK, items)
}

func (s *Server) handleCreateQRCode(w http.ResponseWriter, r *http.Request) {
	userID, _ := auth.UserIDFromContext(r.Context())
	var req createQRCodeRequest
	if err := decodeJSON(r, &req); err != nil || req.URL == "" {
		writeError(w, http.StatusBadRequest, "url is required")
		return
	}
	format := "png"
	if req.Format != nil {
		format = *req.Format
	}
	q, err := s.store.CreateQRCode(r.Context(), userID, store.NewQRCode{
		Label:    req.Label,
		URL:      req.URL,
		Settings: req.Settings,
		Format:   format,
	}, req.BatchID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create qr code")
		return
	}
	writeJSON(w, http.StatusCreated, q)
}

func (s *Server) handleGetQRCode(w http.ResponseWriter, r *http.Request) {
	userID, _ := auth.UserIDFromContext(r.Context())
	q, err := s.store.GetQRCode(r.Context(), r.PathValue("id"), userID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "qr code not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not load qr code")
		return
	}
	writeJSON(w, http.StatusOK, q)
}

func (s *Server) handleUpdateQRCode(w http.ResponseWriter, r *http.Request) {
	userID, _ := auth.UserIDFromContext(r.Context())
	var req store.QRCodePatch
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	q, err := s.store.UpdateQRCode(r.Context(), r.PathValue("id"), userID, req)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "qr code not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not update qr code")
		return
	}
	writeJSON(w, http.StatusOK, q)
}

func (s *Server) handleDeleteQRCode(w http.ResponseWriter, r *http.Request) {
	userID, _ := auth.UserIDFromContext(r.Context())
	if err := s.store.DeleteQRCode(r.Context(), r.PathValue("id"), userID); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "qr code not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not delete qr code")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
