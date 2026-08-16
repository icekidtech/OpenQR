package httpapi

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/icekidtech/OpenQR/backend/internal/store"
)

type googleAuthRequest struct {
	IDToken string `json:"idToken"`
}

type appleFullName struct {
	GivenName  string `json:"givenName"`
	FamilyName string `json:"familyName"`
}

type appleAuthRequest struct {
	IdentityToken string         `json:"identityToken"`
	FullName      *appleFullName `json:"fullName,omitempty"`
}

type refreshRequest struct {
	RefreshToken string `json:"refreshToken"`
}

type authResponse struct {
	AccessToken  string      `json:"accessToken"`
	RefreshToken string      `json:"refreshToken"`
	User         *store.User `json:"user"`
}

func (s *Server) handleAuthGoogle(w http.ResponseWriter, r *http.Request) {
	var req googleAuthRequest
	if err := decodeJSON(r, &req); err != nil || req.IDToken == "" {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	claims, err := s.oidc.VerifyGoogle(r.Context(), req.IDToken)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "invalid google id token")
		return
	}
	u, err := s.store.UpsertUser(r.Context(), "google", claims.Subject, claims.Email, claims.Name, claims.Picture)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create session")
		return
	}
	s.writeAuthResponse(w, r, u)
}

func (s *Server) handleAuthApple(w http.ResponseWriter, r *http.Request) {
	var req appleAuthRequest
	if err := decodeJSON(r, &req); err != nil || req.IdentityToken == "" {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	claims, err := s.oidc.VerifyApple(r.Context(), req.IdentityToken)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "invalid apple identity token")
		return
	}
	var name *string
	if req.FullName != nil {
		full := strings.TrimSpace(req.FullName.GivenName + " " + req.FullName.FamilyName)
		if full != "" {
			name = &full
		}
	}
	u, err := s.store.UpsertUser(r.Context(), "apple", claims.Subject, claims.Email, name, nil)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create session")
		return
	}
	s.writeAuthResponse(w, r, u)
}

func (s *Server) handleAuthRefresh(w http.ResponseWriter, r *http.Request) {
	var req refreshRequest
	if err := decodeJSON(r, &req); err != nil || req.RefreshToken == "" {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	hash := hashToken(req.RefreshToken)

	userID, expiresAt, err := s.store.FindRefreshToken(r.Context(), hash)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusUnauthorized, "invalid refresh token")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not refresh session")
		return
	}
	if time.Now().After(expiresAt) {
		_ = s.store.DeleteRefreshToken(r.Context(), hash)
		writeError(w, http.StatusUnauthorized, "refresh token expired")
		return
	}

	access, refresh, err := s.rotateTokens(r.Context(), userID, hash)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not refresh session")
		return
	}
	u, err := s.store.GetUserByID(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load user")
		return
	}
	writeJSON(w, http.StatusOK, authResponse{AccessToken: access, RefreshToken: refresh, User: u})
}

func (s *Server) writeAuthResponse(w http.ResponseWriter, r *http.Request, u *store.User) {
	access, refresh, err := s.issueTokens(r.Context(), u.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create session")
		return
	}
	writeJSON(w, http.StatusOK, authResponse{AccessToken: access, RefreshToken: refresh, User: u})
}

func (s *Server) issueTokens(ctx context.Context, userID string) (access, refresh string, err error) {
	access, err = s.jwt.IssueAccessToken(userID)
	if err != nil {
		return "", "", err
	}
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", "", err
	}
	refresh = base64.RawURLEncoding.EncodeToString(raw)
	if err := s.store.CreateRefreshToken(ctx, userID, hashToken(refresh), time.Now().Add(s.cfg.RefreshTTL)); err != nil {
		return "", "", err
	}
	return access, refresh, nil
}

func (s *Server) rotateTokens(ctx context.Context, userID, oldHash string) (access, refresh string, err error) {
	access, err = s.jwt.IssueAccessToken(userID)
	if err != nil {
		return "", "", err
	}
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", "", err
	}
	refresh = base64.RawURLEncoding.EncodeToString(raw)
	if err := s.store.RotateRefreshToken(ctx, oldHash, hashToken(refresh), userID, time.Now().Add(s.cfg.RefreshTTL)); err != nil {
		return "", "", err
	}
	return access, refresh, nil
}

func hashToken(tok string) string {
	sum := sha256.Sum256([]byte(tok))
	return hex.EncodeToString(sum[:])
}
