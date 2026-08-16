// Package config loads the API configuration from environment variables.
package config

import (
	"errors"
	"fmt"
	"os"
	"strings"
	"time"
)

type Config struct {
	Port          string
	DatabaseURL   string
	JWTSecret     string
	GoogleClients []string
	AppleClientID string
	CORSOrigins   []string
	AccessTTL     time.Duration
	RefreshTTL    time.Duration
}

func Load() (*Config, error) {
	cfg := &Config{
		Port:          getenv("PORT", ""),
		DatabaseURL:   getenv("DATABASE_URL", ""),
		JWTSecret:     os.Getenv("JWT_SECRET"),
		GoogleClients: splitCSV(os.Getenv("GOOGLE_CLIENT_IDS")),
		AppleClientID: os.Getenv("APPLE_CLIENT_ID"),
		CORSOrigins:   splitCSV(os.Getenv("CORS_ORIGINS")),
		AccessTTL:     duration(getenv("ACCESS_TOKEN_TTL", "1h"), time.Hour),
		RefreshTTL:    duration(getenv("REFRESH_TOKEN_TTL", "720h"), 30*24*time.Hour),
	}
	if cfg.JWTSecret == "" {
		return nil, errors.New("JWT_SECRET is required")
	}
	return cfg, nil
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func splitCSV(s string) []string {
	var out []string
	for _, part := range strings.Split(s, ",") {
		if part = strings.TrimSpace(part); part != "" {
			out = append(out, part)
		}
	}
	return out
}

func duration(s string, fallback time.Duration) time.Duration {
	d, err := time.ParseDuration(s)
	if err != nil {
		return fallback
	}
	return d
}

func (c *Config) String() string {
	return fmt.Sprintf("port=%s googleClients=%d cors=%d", c.Port, len(c.GoogleClients), len(c.CORSOrigins))
}
