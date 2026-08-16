// Command api runs the OpenQR backend HTTP API.
package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/icekidtech/OpenQR/backend/internal/auth"
	"github.com/icekidtech/OpenQR/backend/internal/config"
	"github.com/icekidtech/OpenQR/backend/internal/httpapi"
	"github.com/icekidtech/OpenQR/backend/internal/store"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	ctx := context.Background()

	st, err := store.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer st.Close()

	if err := st.Migrate(ctx); err != nil {
		log.Fatalf("migrations: %v", err)
	}

	jwt := auth.NewJWTManager(cfg.JWTSecret, cfg.AccessTTL)
	oidc := auth.NewOIDCVerifier(cfg.GoogleClients, cfg.AppleClientID)
	srv := httpapi.NewServer(cfg, st, jwt, oidc)

	httpServer := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           srv.Handler(),
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		log.Printf("openqr api listening on :%s (%s)", cfg.Port, cfg)
		if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("server: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = httpServer.Shutdown(shutdownCtx)
	log.Println("openqr api stopped")
}
