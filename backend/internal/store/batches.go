package store

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/jackc/pgx/v5"
)

const batchColumns = "id, user_id, name, created_at"

func scanBatch(row pgx.Row) (*Batch, error) {
	var b Batch
	err := row.Scan(&b.ID, &b.UserID, &b.Name, &b.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &b, nil
}

func (s *Store) ListBatches(ctx context.Context, userID string) ([]Batch, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT b.`+batchColumns+`, COUNT(q.id)::int AS count
		FROM batches b
		LEFT JOIN qr_codes q ON q.batch_id = b.id
		WHERE b.user_id = $1
		GROUP BY b.id
		ORDER BY b.created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []Batch
	for rows.Next() {
		var b Batch
		if err := rows.Scan(&b.ID, &b.UserID, &b.Name, &b.CreatedAt, &b.Count); err != nil {
			return nil, err
		}
		out = append(out, b)
	}
	return out, rows.Err()
}

// CreateBatch creates a batch and its QR codes in a single transaction.
func (s *Store) CreateBatch(ctx context.Context, userID string, name *string, items []NewQRCode) (*Batch, []QRCode, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, nil, err
	}
	defer tx.Rollback(ctx)

	b, err := scanBatch(tx.QueryRow(ctx, `
		INSERT INTO batches (user_id, name)
		VALUES ($1, $2)
		RETURNING `+batchColumns, userID, name))
	if err != nil {
		return nil, nil, fmt.Errorf("insert batch: %w", err)
	}
	b.Count = len(items)

	created := make([]QRCode, 0, len(items))
	for _, item := range items {
		settings := item.Settings
		if len(settings) == 0 || string(settings) == "" {
			settings = json.RawMessage("{}")
		}
		format := item.Format
		if format == "" {
			format = "png"
		}
		q, err := scanQRCode(tx.QueryRow(ctx, `
			INSERT INTO qr_codes (user_id, label, url, settings, format, batch_id)
			VALUES ($1, $2, $3, $4::jsonb, $5, $6)
			RETURNING `+qrColumns,
			userID, item.Label, item.URL, string(settings), format, b.ID))
		if err != nil {
			return nil, nil, fmt.Errorf("insert batch qr code: %w", err)
		}
		created = append(created, *q)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, nil, err
	}
	return b, created, nil
}

func (s *Store) DeleteBatch(ctx context.Context, id, userID string) error {
	tag, err := s.pool.Exec(ctx, "DELETE FROM batches WHERE id = $1 AND user_id = $2", id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
