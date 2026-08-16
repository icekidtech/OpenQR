package httpapi

import (
	"errors"
	"net/http"

	"github.com/icekidtech/OpenQR/backend/internal/auth"
	"github.com/icekidtech/OpenQR/backend/internal/store"
)

type createBatchRequest struct {
	Name    *string               `json:"name"`
	QRCodes []createQRCodeRequest `json:"qrcodes"`
}

func (s *Server) handleListBatches(w http.ResponseWriter, r *http.Request) {
	userID, _ := auth.UserIDFromContext(r.Context())
	items, err := s.store.ListBatches(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load batches")
		return
	}
	if items == nil {
		items = []store.Batch{}
	}
	writeJSON(w, http.StatusOK, items)
}

func (s *Server) handleCreateBatch(w http.ResponseWriter, r *http.Request) {
	userID, _ := auth.UserIDFromContext(r.Context())
	var req createBatchRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if len(req.QRCodes) == 0 {
		writeError(w, http.StatusBadRequest, "qrcodes is required")
		return
	}
	items := make([]store.NewQRCode, 0, len(req.QRCodes))
	for _, q := range req.QRCodes {
		if q.URL == "" {
			writeError(w, http.StatusBadRequest, "each qrcode requires a url")
			return
		}
		format := "png"
		if q.Format != nil {
			format = *q.Format
		}
		items = append(items, store.NewQRCode{
			Label:    q.Label,
			URL:      q.URL,
			Settings: q.Settings,
			Format:   format,
		})
	}
	batch, created, err := s.store.CreateBatch(r.Context(), userID, req.Name, items)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create batch")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"batch": batch, "qrcodes": created})
}

func (s *Server) handleDeleteBatch(w http.ResponseWriter, r *http.Request) {
	userID, _ := auth.UserIDFromContext(r.Context())
	if err := s.store.DeleteBatch(r.Context(), r.PathValue("id"), userID); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "batch not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not delete batch")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
