package store

import (
	"encoding/json"
	"time"
)

type User struct {
	ID        string    `json:"id"`
	Email     *string   `json:"email"`
	Name      *string   `json:"name"`
	AvatarURL *string   `json:"avatarUrl"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type QRCode struct {
	ID        string          `json:"id"`
	UserID    string          `json:"-"`
	Label     *string         `json:"label"`
	URL       string          `json:"url"`
	Settings  json.RawMessage `json:"settings"`
	Format    string          `json:"format"`
	BatchID   *string         `json:"batchId"`
	CreatedAt time.Time       `json:"createdAt"`
	UpdatedAt time.Time       `json:"updatedAt"`
}

type Batch struct {
	ID        string    `json:"id"`
	UserID    string    `json:"-"`
	Name      *string   `json:"name"`
	Count     int       `json:"count"`
	CreatedAt time.Time `json:"createdAt"`
}

// NewQRCode is the input for creating a single QR code record.
type NewQRCode struct {
	Label    *string         `json:"label"`
	URL      string          `json:"url"`
	Settings json.RawMessage `json:"settings"`
	Format   string          `json:"format"`
}

// QRCodePatch is a partial update for a QR code record.
type QRCodePatch struct {
	Label    *string         `json:"label"`
	URL      *string         `json:"url"`
	Settings json.RawMessage `json:"settings"`
	Format   *string         `json:"format"`
}
