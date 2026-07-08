package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

// ---------------------------------------------------------------------------
// Public handler
// ---------------------------------------------------------------------------

// InvokeLLM is a provider-agnostic AI gateway.
//
// Configuration (carecore-backend/.env):
//
//	AI_API_KEY   — required; the API key from whichever provider you use.
//	AI_PROVIDER  — optional override: "anthropic" | "openai" | "gemini".
//	               If omitted the provider is detected from the key prefix:
//	                 sk-ant-*  → Anthropic
//	                 sk-*      → OpenAI
//	                 AIza*     → Google Gemini
//
// Request body: { "prompt": "...", "response_json_schema": { ... } }
// Response:     the parsed JSON object returned by the model.
func InvokeLLM(c *gin.Context) {
	apiKey := os.Getenv("AI_API_KEY")
	if apiKey == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status": "error",
			"error":  gin.H{"code": "LLM_UNAVAILABLE", "message": "AI_API_KEY not set in .env"},
		})
		return
	}

	var req struct {
		Prompt             string         `json:"prompt"`
		ResponseJSONSchema map[string]any `json:"response_json_schema"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Prompt == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  gin.H{"code": "BAD_REQUEST", "message": "prompt is required"},
		})
		return
	}

	provider := detectProvider(apiKey)

	var (
		text string
		err  error
	)
	switch provider {
	case "openai":
		text, err = callOpenAI(c.Request.Context(), apiKey, req.Prompt, req.ResponseJSONSchema)
	case "gemini":
		text, err = callGemini(c.Request.Context(), apiKey, req.Prompt, req.ResponseJSONSchema)
	default: // anthropic
		text, err = callAnthropic(c.Request.Context(), apiKey, req.Prompt, req.ResponseJSONSchema)
	}

	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{
			"status": "error",
			"error":  gin.H{"code": "LLM_ERROR", "message": err.Error()},
		})
		return
	}

	result, parseErr := parseJSON(text)
	if parseErr != nil {
		// Return raw text under a "text" key so the frontend still gets something.
		c.JSON(http.StatusOK, gin.H{"status": "success", "data": gin.H{"text": text}})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success", "data": result})
}

// ---------------------------------------------------------------------------
// Provider detection
// ---------------------------------------------------------------------------

func detectProvider(key string) string {
	explicit := strings.ToLower(strings.TrimSpace(os.Getenv("AI_PROVIDER")))
	if explicit != "" {
		return explicit
	}
	switch {
	case strings.HasPrefix(key, "sk-ant-"):
		return "anthropic"
	case strings.HasPrefix(key, "sk-"):
		return "openai"
	case strings.HasPrefix(key, "AIza"):
		return "gemini"
	default:
		return "anthropic"
	}
}

// ---------------------------------------------------------------------------
// Anthropic
// ---------------------------------------------------------------------------

func callAnthropic(ctx interface{ Value(any) any }, apiKey, prompt string, schema map[string]any) (string, error) {
	userContent := buildUserContent(prompt, schema)

	body := map[string]any{
		"model":      "claude-haiku-4-5-20251001",
		"max_tokens": 2048,
		"system":     jsonSystemPrompt(),
		"messages":   []map[string]any{{"role": "user", "content": userContent}},
	}

	resp, err := postJSON("https://api.anthropic.com/v1/messages", body, map[string]string{
		"x-api-key":         apiKey,
		"anthropic-version": "2023-06-01",
	})
	if err != nil {
		return "", err
	}

	var result struct {
		Content []struct {
			Text string `json:"text"`
		} `json:"content"`
		Error *struct{ Message string `json:"message"` } `json:"error,omitempty"`
	}
	if err := json.Unmarshal(resp, &result); err != nil {
		return "", fmt.Errorf("failed to parse Anthropic response")
	}
	if result.Error != nil {
		return "", fmt.Errorf("Anthropic: %s", result.Error.Message)
	}
	if len(result.Content) == 0 {
		return "", fmt.Errorf("empty response from Anthropic")
	}
	return result.Content[0].Text, nil
}

// ---------------------------------------------------------------------------
// OpenAI
// ---------------------------------------------------------------------------

func callOpenAI(ctx interface{ Value(any) any }, apiKey, prompt string, schema map[string]any) (string, error) {
	userContent := buildUserContent(prompt, schema)

	body := map[string]any{
		"model": "gpt-4o-mini",
		"messages": []map[string]any{
			{"role": "system", "content": jsonSystemPrompt()},
			{"role": "user", "content": userContent},
		},
		"response_format": map[string]string{"type": "json_object"},
	}

	resp, err := postJSON("https://api.openai.com/v1/chat/completions", body, map[string]string{
		"Authorization": "Bearer " + apiKey,
	})
	if err != nil {
		return "", err
	}

	var result struct {
		Choices []struct {
			Message struct{ Content string `json:"content"` } `json:"message"`
		} `json:"choices"`
		Error *struct{ Message string `json:"message"` } `json:"error,omitempty"`
	}
	if err := json.Unmarshal(resp, &result); err != nil {
		return "", fmt.Errorf("failed to parse OpenAI response")
	}
	if result.Error != nil {
		return "", fmt.Errorf("OpenAI: %s", result.Error.Message)
	}
	if len(result.Choices) == 0 {
		return "", fmt.Errorf("empty response from OpenAI")
	}
	return result.Choices[0].Message.Content, nil
}

// ---------------------------------------------------------------------------
// Google Gemini
// ---------------------------------------------------------------------------

func callGemini(ctx interface{ Value(any) any }, apiKey, prompt string, schema map[string]any) (string, error) {
	userContent := buildUserContent(prompt, schema)
	fullPrompt := jsonSystemPrompt() + "\n\n" + userContent

	body := map[string]any{
		"contents": []map[string]any{
			{"parts": []map[string]any{{"text": fullPrompt}}},
		},
		"generationConfig": map[string]any{
			"responseMimeType": "application/json",
		},
	}

	url := "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + apiKey
	resp, err := postJSON(url, body, nil)
	if err != nil {
		return "", err
	}

	var result struct {
		Candidates []struct {
			Content struct {
				Parts []struct{ Text string `json:"text"` } `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
		Error *struct{ Message string `json:"message"` } `json:"error,omitempty"`
	}
	if err := json.Unmarshal(resp, &result); err != nil {
		return "", fmt.Errorf("failed to parse Gemini response")
	}
	if result.Error != nil {
		return "", fmt.Errorf("Gemini: %s", result.Error.Message)
	}
	if len(result.Candidates) == 0 || len(result.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("empty response from Gemini")
	}
	return result.Candidates[0].Content.Parts[0].Text, nil
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

func jsonSystemPrompt() string {
	return "You are a structured JSON responder. Output ONLY valid JSON — no markdown code blocks, no explanation, no prefix text."
}

func buildUserContent(prompt string, schema map[string]any) string {
	if len(schema) == 0 {
		return prompt
	}
	schemaJSON, _ := json.Marshal(schema)
	return prompt + fmt.Sprintf("\n\nRespond with JSON matching exactly this schema:\n%s", string(schemaJSON))
}

func postJSON(url string, body map[string]any, headers map[string]string) ([]byte, error) {
	bodyBytes, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("failed to encode request body")
	}

	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to create HTTP request")
	}
	req.Header.Set("Content-Type", "application/json")
	for k, v := range headers {
		req.Header.Set(k, v)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("HTTP request failed: %s", err.Error())
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body")
	}
	return data, nil
}

func parseJSON(text string) (map[string]any, error) {
	text = strings.TrimSpace(text)
	text = strings.TrimPrefix(text, "```json")
	text = strings.TrimPrefix(text, "```")
	text = strings.TrimSuffix(text, "```")
	text = strings.TrimSpace(text)

	var result map[string]any
	if err := json.Unmarshal([]byte(text), &result); err != nil {
		return nil, err
	}
	return result, nil
}
