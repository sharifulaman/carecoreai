package utils

import (
	"encoding/json"
	"fmt"
	"reflect"
	"time"
)

// ValidateJSONMarshaling is a generic helper function that validates any struct
// after JSON marshaling and unmarshaling. It handles type conversions automatically.
func ValidateJSONMarshaling(t interface{ Errorf(string, ...interface{}) }, original interface{}) error {
	// Marshal the struct to JSON
	bytes, err := json.Marshal(original)
	if err != nil {
		return fmt.Errorf("failed to marshal: %w", err)
	}

	// Unmarshal back to map
	var parsed map[string]interface{}
	if err := json.Unmarshal(bytes, &parsed); err != nil {
		return fmt.Errorf("failed to unmarshal: %w", err)
	}

	// Use reflection to iterate through struct fields
	val := reflect.ValueOf(original)
	typ := reflect.TypeOf(original)

	// Handle pointer types
	if val.Kind() == reflect.Ptr {
		val = val.Elem()
		typ = typ.Elem()
	}

	// Iterate through all fields
	for i := 0; i < val.NumField(); i++ {
		field := typ.Field(i)
		fieldValue := val.Field(i)

		// Get JSON tag name
		jsonTag := field.Tag.Get("json")
		if jsonTag == "" || jsonTag == "-" {
			continue // Skip fields without json tag
		}

		// Extract the actual field name (before comma)
		fieldName := jsonTag
		if idx := len(jsonTag) - 1; idx >= 0 && jsonTag[0:1] != "-" {
			if commaIdx := len(jsonTag); commaIdx > 0 {
				for j := 0; j < len(jsonTag); j++ {
					if jsonTag[j] == ',' {
						fieldName = jsonTag[:j]
						break
					}
				}
			}
		}

		parsedValue, exists := parsed[fieldName]
		if !exists {
			// Field might not be in JSON if zero value
			continue
		}

		// Compare values with type conversion
		if !compareValues(fieldValue, parsedValue) {
			return fmt.Errorf("field %s mismatch: expected %v (%T), got %v (%T)",
				fieldName, fieldValue.Interface(), fieldValue.Interface(), parsedValue, parsedValue)
		}
	}

	return nil
}

// compareValues handles type conversions for JSON marshaling
func compareValues(originalValue reflect.Value, jsonValue interface{}) bool {
	original := originalValue.Interface()

	// Handle nil cases
	if original == nil && jsonValue == nil {
		return true
	}

	switch v := original.(type) {
	case string:
		str, ok := jsonValue.(string)
		return ok && str == v

	case bool:
		b, ok := jsonValue.(bool)
		return ok && b == v

	case int, int8, int16, int32, int64:
		// JSON unmarshals numbers as float64
		f, ok := jsonValue.(float64)
		return ok && float64(originalValue.Int()) == f

	case uint, uint8, uint16, uint32, uint64:
		// JSON unmarshals numbers as float64
		f, ok := jsonValue.(float64)
		return ok && float64(originalValue.Uint()) == f

	case float32, float64:
		f, ok := jsonValue.(float64)
		return ok && originalValue.Float() == f

	case time.Time:
		// JSON marshals time.Time as RFC3339 string
		str, ok := jsonValue.(string)
		if !ok {
			return false
		}
		parsedTime, err := time.Parse(time.RFC3339, str)
		return err == nil && v.Equal(parsedTime)

	case *time.Time:
		// Pointer to time.Time
		if v == nil && jsonValue == nil {
			return true
		}
		if v == nil || jsonValue == nil {
			return false
		}
		str, ok := jsonValue.(string)
		if !ok {
			return false
		}
		parsedTime, err := time.Parse(time.RFC3339, str)
		return err == nil && v.Equal(parsedTime)

	case []string:
		// JSON unmarshals arrays as []interface{}
		arr, ok := jsonValue.([]interface{})
		if !ok || len(arr) != len(v) {
			return false
		}
		for i, item := range arr {
			if str, ok := item.(string); !ok || str != v[i] {
				return false
			}
		}
		return true

	case []byte:
		// datatypes.JSON - convert both to JSON strings and compare
		// This handles arbitrary JSON structures (objects, arrays, etc.)
		var originalVal interface{}
		if err := json.Unmarshal(v, &originalVal); err != nil {
			return false
		}

		// Marshal both values back to JSON for string comparison
		originalBytes, _ := json.Marshal(originalVal)
		jsonBytes, _ := json.Marshal(jsonValue)

		// Compare as JSON strings
		return string(originalBytes) == string(jsonBytes)

	case map[string]interface{}:
		jsonMap, ok := jsonValue.(map[string]interface{})
		return ok && mapsEqual(v, jsonMap)

	default:
		// Handle pq.StringArray and other alias types
		strSlice, ok := toStringSlice(original)
		if ok {
			arr, ok := jsonValue.([]interface{})
			if !ok {
				return false
			}
			if len(strSlice) != len(arr) {
				return false
			}
			for i, item := range arr {
				if str, ok := item.(string); !ok || str != strSlice[i] {
					return false
				}
			}
			return true
		}

		// Fallback: direct comparison
		return reflect.DeepEqual(original, jsonValue)
	}
}

// mapsEqual compares two maps recursively
func mapsEqual(map1, map2 map[string]interface{}) bool {
	if len(map1) != len(map2) {
		return false
	}
	for key, val1 := range map1 {
		val2, exists := map2[key]
		if !exists {
			return false
		}
		if !reflect.DeepEqual(val1, val2) {
			return false
		}
	}
	return true
}

// toStringSlice converts various string array types to []string
func toStringSlice(v interface{}) ([]string, bool) {
	switch val := v.(type) {
	case []string:
		return val, true
	default:
		// Try reflection for pq.StringArray and other string slice aliases
		rv := reflect.ValueOf(v)
		if rv.Kind() == reflect.Slice {
			strSlice := make([]string, rv.Len())
			for i := 0; i < rv.Len(); i++ {
				elem := rv.Index(i)
				if elem.Kind() == reflect.String {
					strSlice[i] = elem.String()
				} else {
					return nil, false
				}
			}
			return strSlice, true
		}
		return nil, false
	}
}
