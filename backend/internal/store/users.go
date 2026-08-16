package store

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
)

const userColumns = "id, email, name, avatar_url, created_at, updated_at"

// userColumnsQualified is used in JOIN queries where both sides define
// overlapping column names (e.g. created_at) to avoid "column reference is
// ambiguous" errors.
const userColumnsQualified = "u.id, u.email, u.name, u.avatar_url, u.created_at, u.updated_at"

func scanUser(row pgx.Row) (*User, error) {
	var u User
	err := row.Scan(&u.ID, &u.Email, &u.Name, &u.AvatarURL, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (s *Store) GetUserByID(ctx context.Context, id string) (*User, error) {
	u, err := scanUser(s.pool.QueryRow(ctx, "SELECT "+userColumns+" FROM users WHERE id = $1", id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return u, err
}

// UpsertUser ensures a user exists for the given provider identity and
// returns the user record. If the identity is new and the email already
// belongs to another user, the identity is merged into that account.
func (s *Store) UpsertUser(ctx context.Context, provider, sub string, email, name, avatar *string) (*User, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// 1. Look up the user by provider identity.
	u, err := scanUser(tx.QueryRow(ctx, `
		SELECT `+userColumnsQualified+`
		FROM users u
		JOIN user_identities ui ON ui.user_id = u.id
		WHERE ui.provider = $1 AND ui.provider_sub = $2`, provider, sub))
	if err == nil {
		// Refresh mutable profile fields if the provider sent new values.
		if name != nil || avatar != nil {
			if _, err := tx.Exec(ctx, `
				UPDATE users
				SET name = COALESCE($2, name),
				    avatar_url = COALESCE($3, avatar_url),
				    updated_at = now()
				WHERE id = $1`, u.ID, name, avatar); err != nil {
				return nil, err
			}
		}
		if err := tx.Commit(ctx); err != nil {
			return nil, err
		}
		return u, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}

	// 2. New identity. Merge into an existing user with the same email if one exists.
	if email != nil && *email != "" {
		existing, err := scanUser(tx.QueryRow(ctx,
			"SELECT "+userColumns+" FROM users WHERE email = $1", *email))
		if err == nil {
			if _, err := tx.Exec(ctx, `
				INSERT INTO user_identities(user_id, provider, provider_sub)
				VALUES ($1, $2, $3)`, existing.ID, provider, sub); err != nil {
				return nil, err
			}
			if err := tx.Commit(ctx); err != nil {
				return nil, err
			}
			return existing, nil
		}
		if !errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
	}

	// 3. Create a brand-new user plus identity.
	u, err = scanUser(tx.QueryRow(ctx, `
		INSERT INTO users (email, name, avatar_url)
		VALUES ($1, $2, $3)
		RETURNING `+userColumns, email, name, avatar))
	if err != nil {
		return nil, fmt.Errorf("insert user: %w", err)
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO user_identities(user_id, provider, provider_sub)
		VALUES ($1, $2, $3)`, u.ID, provider, sub); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return u, nil
}
