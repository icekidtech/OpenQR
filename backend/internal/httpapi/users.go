package httpapi

import (
	"errors"
	"net/http"

	"github.com/icekidtech/OpenQR/backend/internal/auth"
	"github.com/icekidtech/OpenQR/backend/internal/store"
)

func (s *Server) handleMe(w http.ResponseWriter, r *http.Request) {
	userID, _ := auth.UserIDFromContext(r.Context())
	u, err := s.store.GetUserByID(r.Context(), userID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "user not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not load user")
		return
	}
	writeJSON(w, http.StatusOK, u)
}
