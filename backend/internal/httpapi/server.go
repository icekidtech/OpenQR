// Package httpapi wires the HTTP router, middleware and handlers.
package httpapi

import (
	"net/http"

	"github.com/icekidtech/OpenQR/backend/internal/auth"
	"github.com/icekidtech/OpenQR/backend/internal/config"
	"github.com/icekidtech/OpenQR/backend/internal/store"
)

type Server struct {
	cfg   *config.Config
	store *store.Store
	jwt   *auth.JWTManager
	oidc  *auth.OIDCVerifier
}

func NewServer(cfg *config.Config, st *store.Store, jwt *auth.JWTManager, oidc *auth.OIDCVerifier) *Server {
	return &Server{cfg: cfg, store: st, jwt: jwt, oidc: oidc}
}

func (s *Server) Handler() http.Handler {
	public := http.NewServeMux()
	public.HandleFunc("GET /healthz", s.handleHealth)
	public.HandleFunc("POST /v1/auth/google", s.handleAuthGoogle)
	public.HandleFunc("POST /v1/auth/apple", s.handleAuthApple)
	public.HandleFunc("POST /v1/auth/refresh", s.handleAuthRefresh)

	protected := http.NewServeMux()
	protected.HandleFunc("GET /v1/me", s.handleMe)
	protected.HandleFunc("GET /v1/qrcodes", s.handleListQRCodes)
	protected.HandleFunc("POST /v1/qrcodes", s.handleCreateQRCode)
	protected.HandleFunc("GET /v1/qrcodes/{id}", s.handleGetQRCode)
	protected.HandleFunc("PATCH /v1/qrcodes/{id}", s.handleUpdateQRCode)
	protected.HandleFunc("DELETE /v1/qrcodes/{id}", s.handleDeleteQRCode)
	protected.HandleFunc("GET /v1/batches", s.handleListBatches)
	protected.HandleFunc("POST /v1/batches", s.handleCreateBatch)
	protected.HandleFunc("DELETE /v1/batches/{id}", s.handleDeleteBatch)

	// Specific public /v1/auth/* patterns take precedence over this wildcard.
	public.Handle("/v1/", s.requireAuth(protected))

	var h http.Handler = public
	h = s.recoverer(h)
	h = s.logger(h)
	h = s.cors(h)
	return h
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
