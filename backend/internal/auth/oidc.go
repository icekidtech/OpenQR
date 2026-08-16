package auth

import (
	"context"
	"errors"
	"fmt"
	"sync"

	"github.com/coreos/go-oidc/v3/oidc"
)

const (
	googleIssuer = "https://accounts.google.com"
	appleIssuer  = "https://appleid.apple.com"
)

// OIDCClaims are the identity claims extracted from a verified ID token.
type OIDCClaims struct {
	Subject string
	Email   *string
	Name    *string
	Picture *string
}

// OIDCVerifier verifies Google and Apple ID tokens using cached JWKS.
// Providers are initialized lazily so the API can boot without network access.
type OIDCVerifier struct {
	googleOnce sync.Once
	googleProv *oidc.Provider
	googleErr  error

	appleOnce sync.Once
	appleProv *oidc.Provider
	appleErr  error

	googleClients []string
	appleClientID string
}

func NewOIDCVerifier(googleClients []string, appleClientID string) *OIDCVerifier {
	return &OIDCVerifier{googleClients: googleClients, appleClientID: appleClientID}
}

func (v *OIDCVerifier) googleProvider(ctx context.Context) (*oidc.Provider, error) {
	v.googleOnce.Do(func() {
		v.googleProv, v.googleErr = oidc.NewProvider(ctx, googleIssuer)
	})
	return v.googleProv, v.googleErr
}

func (v *OIDCVerifier) appleProvider(ctx context.Context) (*oidc.Provider, error) {
	v.appleOnce.Do(func() {
		v.appleProv, v.appleErr = oidc.NewProvider(ctx, appleIssuer)
	})
	return v.appleProv, v.appleErr
}

func (v *OIDCVerifier) VerifyGoogle(ctx context.Context, rawToken string) (*OIDCClaims, error) {
	if len(v.googleClients) == 0 {
		return nil, errors.New("google client ids not configured")
	}
	prov, err := v.googleProvider(ctx)
	if err != nil {
		return nil, fmt.Errorf("load google provider: %w", err)
	}
	return v.verify(ctx, prov, rawToken, v.googleClients)
}

func (v *OIDCVerifier) VerifyApple(ctx context.Context, rawToken string) (*OIDCClaims, error) {
	if v.appleClientID == "" {
		return nil, errors.New("apple client id not configured")
	}
	prov, err := v.appleProvider(ctx)
	if err != nil {
		return nil, fmt.Errorf("load apple provider: %w", err)
	}
	return v.verify(ctx, prov, rawToken, []string{v.appleClientID})
}

func (v *OIDCVerifier) verify(ctx context.Context, provider *oidc.Provider, rawToken string, allowedAud []string) (*OIDCClaims, error) {
	verifier := provider.Verifier(&oidc.Config{SkipClientIDCheck: true})
	idToken, err := verifier.Verify(ctx, rawToken)
	if err != nil {
		return nil, fmt.Errorf("verify id token: %w", err)
	}
	if !hasAny(idToken.Audience, allowedAud) {
		return nil, errors.New("id token audience not allowed")
	}
	var claims struct {
		Sub     string  `json:"sub"`
		Email   *string `json:"email"`
		Name    *string `json:"name"`
		Picture *string `json:"picture"`
	}
	if err := idToken.Claims(&claims); err != nil {
		return nil, fmt.Errorf("decode id token claims: %w", err)
	}
	return &OIDCClaims{
		Subject: claims.Sub,
		Email:   claims.Email,
		Name:    claims.Name,
		Picture: claims.Picture,
	}, nil
}

func hasAny(values, allowed []string) bool {
	for _, v := range values {
		for _, a := range allowed {
			if v == a {
				return true
			}
		}
	}
	return false
}
