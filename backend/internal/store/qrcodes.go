package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
)

const qrColumns = "id, user_id, label, url, settings, format, batch_id, created_at, updated_at"

func scanQRCode(row pgx.Row) (*QRCode, error) {
	var q QRCode
	var settings []byte
	err := row.Scan(&q.ID, &q.UserID, &q.Label, &q.URL, &settings, &q.Format, &q.BatchID, &q.CreatedAt, &q.UpdatedAt)
	if err != nil {
		return nil, err
	}
	if settings == nil {
		settings = []byte("{}")
	}
	q.Settings = json.RawMessage(settings)
	return &q, nil
}

func (s *Store) ListQRCodes(ctx context.Context, userID string, batchID *string) ([]QRCode, error) {
	query := "SELECT " + qrColumns + " FROM qr_codes WHERE user_id = $1"
	args := []any{userID}
	if batchID != nil {
		query += " AND batch_id = $2"
		args = append(args, *batchID)
	}
	query += " ORDER BY created_at DESC"

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []QRCode
	for rows.Next() {
		q, err := scanQRCode(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *q)
	}
	return out, rows.Err()
}

func (s *Store) GetQRCode(ctx context.Context, id, userID string) (*QRCode, error) {
	q, err := scanQRCode(s.pool.QueryRow(ctx,
		"SELECT "+qrColumns+" FROM qr_codes WHERE id = $1 AND user_id = $2", id, userID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return q, err
}

func (s *Store) CreateQRCode(ctx context.Context, userID string, in NewQRCode, batchID *string) (*QRCode, error) {
	settings := in.Settings
	if len(settings) == 0 || string(settings) == "" {
		settings = json.RawMessage("{}")
	}
	format := in.Format
	if format == "" {
		format = "png"
	}
	q, err := scanQRCode(s.pool.QueryRow(ctx, `
		INSERT INTO qr_codes (user_id, label, url, settings, format, batch_id)
		VALUES ($1, $2, $3, $4::jsonb, $5, $6)
		RETURNING `+qrColumns,
		userID, in.Label, in.URL, string(settings), format, batchID))
	if err != nil {
		return nil, fmt.Errorf("insert qr code: %w", err)
	}
	return q, nil
}

func (s *Store) UpdateQRCode(ctx context.Context, id, userID string, patch QRCodePatch) (*QRCode, error) {
	query := "UPDATE qr_codes SET updated_at = now()"
	var args []any
	arg := func(expr string, v any) {
		args = append(args, v)
		query += ", " + fmt.Sprintf(expr, len(args))
	}
	if patch.Label != nil {
		arg("label = $%d", *patch.Label)
	}
	if patch.URL != nil {
		arg("url = $%d", *patch.URL)
	}
	if len(patch.Settings) > 0 {
		arg("settings = $%d::jsonb", string(patch.Settings))
	}
	if patch.Format != nil {
		arg("format = $%d", *patch.Format)
	}
	args = append(args, id, userID)
	query += " WHERE id = $" + fmt.Sprintf("%d", len(args)-1) + " AND user_id = $" + fmt.Sprintf("%d", len(args)) + " RETURNING " + qrColumns

	q, err := scanQRCode(s.pool.QueryRow(ctx, query, args...))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return q, err
}

func (s *Store) DeleteQRCode(ctx context.Context, id, userID string) error {
	tag, err := s.pool.Exec(ctx, "DELETE FROM qr_codes WHERE id = $1 AND user_id = $2", id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
