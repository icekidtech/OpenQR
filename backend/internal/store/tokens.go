package store

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
)

func (s *Store) CreateRefreshToken(ctx context.Context, userID, tokenHash string, expiresAt time.Time) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
		VALUES ($1, $2, $3)`, userID, tokenHash, expiresAt)
	return err
}

// FindRefreshToken returns the user id and expiry for a valid, unexpired token hash.
func (s *Store) FindRefreshToken(ctx context.Context, tokenHash string) (userID string, expiresAt time.Time, err error) {
	err = s.pool.QueryRow(ctx, `
		SELECT user_id, expires_at FROM refresh_tokens WHERE token_hash = $1`, tokenHash).
		Scan(&userID, &expiresAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", time.Time{}, ErrNotFound
	}
	return userID, expiresAt, err
}

func (s *Store) DeleteRefreshToken(ctx context.Context, tokenHash string) error {
	_, err := s.pool.Exec(ctx, "DELETE FROM refresh_tokens WHERE token_hash = $1", tokenHash)
	return err
}

// RotateRefreshToken atomically replaces an old token with a new one.
func (s *Store) RotateRefreshToken(ctx context.Context, oldHash, newHash, userID string, expiresAt time.Time) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, "DELETE FROM refresh_tokens WHERE token_hash = $1", oldHash); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
		VALUES ($1, $2, $3)`, userID, newHash, expiresAt); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
