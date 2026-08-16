// Package migrations embeds the SQL migration files so they can be applied
// automatically at startup.
package migrations

import "embed"

//go:embed *.sql
var FS embed.FS
