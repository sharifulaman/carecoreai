// db/rls.go
package db

import (
	"context"
	"fmt"

	"gorm.io/gorm"
)

// OrgScopedDB returns a GORM session bound to a transaction that has
// app.current_org set for the duration of that transaction.
// This is what activates RLS — without it, RLS policies see no org_id
// and silently return zero rows.
//
// IMPORTANT: every value returned by gorm.Session() shares the underlying
// connection pool but SET LOCAL only applies within an explicit transaction,
// so this must wrap calls in Begin/Commit.
func OrgScopedDB(ctx context.Context, orgID string) (*gorm.DB, error) {
	tx := DB.WithContext(ctx).Begin()
	if tx.Error != nil {
		return nil, tx.Error
	}

	// SET LOCAL only affects the current transaction — critical for pooled connections
	if err := tx.Exec(fmt.Sprintf("SET LOCAL app.current_org = %s", quoteLiteral(orgID))).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	return tx, nil
}

// quoteLiteral safely escapes a string for inline SQL.
// orgID comes from validated JWT claims (not user input), but we still
// avoid string concatenation vulnerabilities as a matter of discipline.
func quoteLiteral(s string) string {
	return "'" + escapeSingleQuotes(s) + "'"
}

func escapeSingleQuotes(s string) string {
	out := make([]rune, 0, len(s))
	for _, r := range s {
		if r == '\'' {
			out = append(out, '\'', '\'')
		} else {
			out = append(out, r)
		}
	}
	return string(out)
}