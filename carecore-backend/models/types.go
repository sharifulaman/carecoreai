package models

import (
    "database/sql/driver"
    "fmt"
    "strings"
)

// StringArray maps Go []string to Postgres text[] column.
// If you already use github.com/lib/pq, replace this with:
//   type StringArray = pq.StringArray
type StringArray []string

func (a StringArray) Value() (driver.Value, error) {
    if a == nil {
        return "{}", nil
    }
    quoted := make([]string, len(a))
    for i, s := range a {
        quoted[i] = `"` + strings.ReplaceAll(s, `"`, `\"`) + `"`
    }
    return "{" + strings.Join(quoted, ",") + "}", nil
}

func (a *StringArray) Scan(value any) error {
    if value == nil {
        *a = StringArray{}
        return nil
    }
    str, ok := value.(string)
    if !ok {
        return fmt.Errorf("StringArray: expected string, got %T", value)
    }
    str = strings.TrimPrefix(strings.TrimSuffix(str, "}"), "{")
    if str == "" {
        *a = StringArray{}
        return nil
    }
    parts := strings.Split(str, ",")
    out := make(StringArray, 0, len(parts))
    for _, p := range parts {
        p = strings.TrimSpace(p)
        p = strings.Trim(p, `"`)
        out = append(out, p)
    }
    *a = out
    return nil
}