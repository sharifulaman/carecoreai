package services

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	"io"
	"mime"
	"mime/multipart"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"carecore-backend/config"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
)

var (
	ErrUploadValidation   = errors.New("upload validation error")
	ErrUploadUnavailable  = errors.New("upload service unavailable")
	ErrUploadNotSupported = errors.New("upload type not supported")
)

type UploadResult struct {
	Key          string `json:"key"`
	FileURL      string `json:"file_url"`
	ContentType  string `json:"content_type"`
	OriginalName string `json:"original_name"`
	Size         int64  `json:"size"`
	Compressed   bool   `json:"compressed"`
}

const defaultMaxUploadSizeBytes = int64(50 * 1024 * 1024)

var allowedUploadMIMEs = map[string]struct{}{
	"image/jpeg":         {},
	"image/png":          {},
	"image/webp":         {},
	"image/gif":          {},
	"text/html":          {},
	"application/pdf":    {},
	"application/msword": {},
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document":   {},
	"application/vnd.oasis.opendocument.text":                                   {},
	"application/vnd.ms-powerpoint":                                             {},
	"application/vnd.openxmlformats-officedocument.presentationml.presentation": {},
	"application/vnd.ms-excel":                                                  {},
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":         {},
	"application/zip":             {},
	"application/x-7z-compressed": {},
	"text/plain":                  {},
	"text/csv":                    {},
}

var allowedStoragePrefixes = map[string]struct{}{
	"users/profile":               {},
	"users/documents":             {},
	"users/avatars":               {},
	"residents/medical":           {},
	"residents/reports":           {},
	"residents/prescriptions":     {},
	"residents/attachments":       {},
	"staff/documents":             {},
	"staff/certificates":          {},
	"staff/contracts":             {},
	"shifts/exports":              {},
	"shifts/reports":              {},
	"finance/invoices":            {},
	"finance/receipts":            {},
	"finance/statements":          {},
	"compliance/audits":           {},
	"compliance/incident-reports": {},
	"temp":                        {},
	"backups":                     {},
}

func UploadMultipartFile(ctx context.Context, fileHeader *multipart.FileHeader, folder string) (*UploadResult, error) {
	if config.S3Client == nil {
		return nil, ErrUploadUnavailable
	}
	if fileHeader == nil {
		return nil, fmt.Errorf("%w: file is required", ErrUploadValidation)
	}

	maxBytes := maxUploadSizeBytes()
	if fileHeader.Size > 0 && fileHeader.Size > maxBytes {
		return nil, fmt.Errorf("%w: file exceeds the maximum size of %d MB", ErrUploadValidation, maxBytes/(1024*1024))
	}

	file, err := fileHeader.Open()
	if err != nil {
		return nil, err
	}
	defer file.Close()

	rawBytes, err := io.ReadAll(file)
	if err != nil {
		return nil, err
	}

	if int64(len(rawBytes)) > maxBytes {
		return nil, fmt.Errorf("%w: file exceeds the maximum size of %d MB", ErrUploadValidation, maxBytes/(1024*1024))
	}

	declaredType := normalizeMediaType(fileHeader.Header.Get("Content-Type"))
	sniffedType := http.DetectContentType(firstBytes(rawBytes))
	if err := validateUploadType(fileHeader.Filename, declaredType, sniffedType); err != nil {
		return nil, err
	}

	contentType := chooseContentType(declaredType, sniffedType)
	uploadBytes := rawBytes
	compressed := false

	if isCompressibleImage(contentType, fileHeader.Filename, sniffedType) {
		compressedBytes, compressedType, compressErr := compressImage(rawBytes, contentType)
		if compressErr == nil {
			uploadBytes = compressedBytes
			contentType = compressedType
			compressed = true
		}
	}

	storagePrefix, err := normalizeStoragePrefix(folder)
	if err != nil {
		return nil, err
	}

	key := buildObjectKey(storagePrefix, fileHeader.Filename, contentType)
	if err := putObject(ctx, key, bytes.NewReader(uploadBytes), contentType); err != nil {
		return nil, err
	}

	signedURL, err := GenerateSignedURL(ctx, key, 24*time.Hour)
	if err != nil {
		return nil, err
	}

	return &UploadResult{
		Key:          key,
		FileURL:      signedURL,
		ContentType:  contentType,
		OriginalName: filepath.Base(fileHeader.Filename),
		Size:         int64(len(uploadBytes)),
		Compressed:   compressed,
	}, nil
}

func GenerateSignedURL(ctx context.Context, key string, expires time.Duration) (string, error) {
	if config.S3Client == nil {
		return "", ErrUploadUnavailable
	}

	bucket := os.Getenv("AWS_BUCKET")
	if bucket == "" {
		return "", ErrUploadUnavailable
	}

	presigner := s3.NewPresignClient(config.S3Client)
	result, err := presigner.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(key),
	}, func(opts *s3.PresignOptions) {
		opts.Expires = expires
	})
	if err != nil {
		return "", err
	}

	return result.URL, nil
}

func DeleteObject(ctx context.Context, key string) error {
	if config.S3Client == nil {
		return ErrUploadUnavailable
	}

	bucket := os.Getenv("AWS_BUCKET")
	if bucket == "" {
		return ErrUploadUnavailable
	}

	_, err := config.S3Client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(key),
	})
	return err
}

func ResolveObjectKey(rawValue string) (string, error) {
	trimmed := strings.TrimSpace(rawValue)
	if trimmed == "" {
		return "", fmt.Errorf("%w: key or file_url is required", ErrUploadValidation)
	}

	parsedURL, err := url.Parse(trimmed)
	if err == nil && parsedURL.Scheme != "" && parsedURL.Host != "" {
		return strings.TrimPrefix(parsedURL.Path, "/"), nil
	}

	return strings.TrimPrefix(trimmed, "/"), nil
}

func maxUploadSizeBytes() int64 {
	return defaultMaxUploadSizeBytes
}

func normalizeMediaType(value string) string {
	if value == "" {
		return ""
	}
	mediaType, _, err := mime.ParseMediaType(value)
	if err != nil {
		return strings.ToLower(strings.TrimSpace(value))
	}
	return strings.ToLower(mediaType)
}

func chooseContentType(declaredType, sniffedType string) string {
	if declaredType != "" && declaredType != "application/octet-stream" {
		return declaredType
	}
	return sniffedType
}

func validateUploadType(fileName, declaredType, sniffedType string) error {
	ext := strings.ToLower(filepath.Ext(fileName))
	if isAllowedForExtension(ext, declaredType, sniffedType) {
		return nil
	}
	if _, ok := allowedUploadMIMEs[declaredType]; ok {
		return nil
	}
	if _, ok := allowedUploadMIMEs[sniffedType]; ok {
		return nil
	}
	return fmt.Errorf("%w: unsupported file type %q", ErrUploadValidation, declaredType)
}

func isAllowedForExtension(ext, declaredType, sniffedType string) bool {
	switch ext {
	case ".jpg", ".jpeg":
		return declaredType == "image/jpeg" || sniffedType == "image/jpeg"
	case ".png":
		return declaredType == "image/png" || sniffedType == "image/png"
	case ".webp":
		return declaredType == "image/webp" || sniffedType == "image/webp"
	case ".gif":
		return declaredType == "image/gif" || sniffedType == "image/gif"
	case ".pdf":
		return declaredType == "application/pdf" || sniffedType == "application/pdf"
	case ".html", ".htm":
		return declaredType == "text/html" || sniffedType == "text/html"
	case ".doc":
		return declaredType == "application/msword" || sniffedType == "application/msword"
	case ".docx":
		return declaredType == "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || sniffedType == "application/zip" || sniffedType == "application/octet-stream"
	case ".odt":
		return declaredType == "application/vnd.oasis.opendocument.text" || sniffedType == "application/zip" || sniffedType == "application/octet-stream"
	case ".ppt":
		return declaredType == "application/vnd.ms-powerpoint" || sniffedType == "application/vnd.ms-powerpoint" || sniffedType == "application/octet-stream"
	case ".pptx":
		return declaredType == "application/vnd.openxmlformats-officedocument.presentationml.presentation" || sniffedType == "application/zip" || sniffedType == "application/octet-stream"
	case ".xls":
		return declaredType == "application/vnd.ms-excel" || sniffedType == "application/vnd.ms-excel"
	case ".xlsx":
		return declaredType == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || sniffedType == "application/zip" || sniffedType == "application/octet-stream"
	case ".zip":
		return declaredType == "application/zip" || sniffedType == "application/zip"
	case ".7z":
		return declaredType == "application/x-7z-compressed" || sniffedType == "application/octet-stream"
	case ".txt":
		return declaredType == "text/plain" || sniffedType == "text/plain" || sniffedType == "application/octet-stream"
	case ".csv":
		return declaredType == "text/csv" || sniffedType == "text/plain" || sniffedType == "application/octet-stream"
	default:
		return false
	}
}

func isCompressibleImage(contentType, fileName, sniffedType string) bool {
	ext := strings.ToLower(filepath.Ext(fileName))
	if contentType == "image/jpeg" || contentType == "image/png" {
		return true
	}
	if sniffedType == "image/jpeg" || sniffedType == "image/png" {
		return true
	}
	return ext == ".jpg" || ext == ".jpeg" || ext == ".png"
}

func compressImage(rawBytes []byte, contentType string) ([]byte, string, error) {
	decodedImage, format, err := image.Decode(bytes.NewReader(rawBytes))
	if err != nil {
		return nil, "", err
	}

	var buffer bytes.Buffer
	switch format {
	case "jpeg":
		if err := jpeg.Encode(&buffer, decodedImage, &jpeg.Options{Quality: 80}); err != nil {
			return nil, "", err
		}
		return buffer.Bytes(), "image/jpeg", nil
	case "png":
		encoder := png.Encoder{CompressionLevel: png.BestCompression}
		if err := encoder.Encode(&buffer, decodedImage); err != nil {
			return nil, "", err
		}
		return buffer.Bytes(), "image/png", nil
	default:
		return rawBytes, contentType, nil
	}
}

func normalizeStoragePrefix(folder string) (string, error) {
	cleanFolder := strings.Trim(strings.ToLower(folder), "/ ")
	if cleanFolder == "" {
		return "temp", nil
	}

	// Allow explicit, whitelisted static prefixes
	if _, ok := allowedStoragePrefixes[cleanFolder]; ok {
		return cleanFolder, nil
	}

	// Allow dynamic prefixes for common resource roots, e.g. homes/<id>/documents,
	// residents/<id>/attachments, users/<id>/documents, staff/<id>/documents, etc.
	allowedRoots := []string{"homes/", "home/", "residents/", "users/", "staff/", "finance/", "compliance/", "shifts/", "backups/"}
	for _, root := range allowedRoots {
		if strings.HasPrefix(cleanFolder, root) {
			// ensure there is at least one additional path segment after the root
			rest := strings.TrimPrefix(cleanFolder, root)
			if rest != "" {
				return cleanFolder, nil
			}
		}
	}

	return "", fmt.Errorf("%w: unsupported storage path %q", ErrUploadValidation, cleanFolder)
}

func buildObjectKey(folder, fileName, contentType string) string {
	cleanFolder := strings.Trim(strings.ToLower(folder), "/ ")
	if cleanFolder == "" {
		cleanFolder = "temp"
	}

	ext := strings.ToLower(filepath.Ext(fileName))
	if ext == "" {
		ext = extensionForContentType(contentType)
	}

	return fmt.Sprintf("%s/%s%s", cleanFolder, uuid.NewString(), ext)
}

func extensionForContentType(contentType string) string {
	switch contentType {
	case "image/jpeg":
		return ".jpg"
	case "image/png":
		return ".png"
	case "image/webp":
		return ".webp"
	case "image/gif":
		return ".gif"
	case "application/pdf":
		return ".pdf"
	case "text/html":
		return ".html"
	case "application/msword":
		return ".doc"
	case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
		return ".docx"
	case "application/vnd.oasis.opendocument.text":
		return ".odt"
	case "application/vnd.ms-powerpoint":
		return ".ppt"
	case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
		return ".pptx"
	case "application/vnd.ms-excel":
		return ".xls"
	case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
		return ".xlsx"
	case "application/zip":
		return ".zip"
	case "application/x-7z-compressed":
		return ".7z"
	case "text/csv":
		return ".csv"
	case "text/plain":
		return ".txt"
	default:
		return ""
	}
}

func putObject(ctx context.Context, key string, body io.Reader, contentType string) error {
	bucket := os.Getenv("AWS_BUCKET")
	if bucket == "" {
		return ErrUploadUnavailable
	}

	_, err := config.S3Client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(bucket),
		Key:         aws.String(key),
		Body:        body,
		ContentType: aws.String(contentType),
	})
	return err
}

func firstBytes(data []byte) []byte {
	if len(data) > 512 {
		return data[:512]
	}
	return data
}
