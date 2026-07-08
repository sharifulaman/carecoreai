package config

import (
	"context"
	"log"
	"os"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

var S3Client *s3.Client

func InitAWS() {
	region := os.Getenv("AWS_REGION")
	if region == "" {
		log.Println("AWS_REGION is not set; file uploads will be disabled until AWS is configured")
		return
	}

	loadOptions := []func(*config.LoadOptions) error{
		config.WithRegion(region),
	}

	accessKey := os.Getenv("AWS_ACCESS_KEY_ID")
	secretKey := os.Getenv("AWS_SECRET_ACCESS_KEY")
	if accessKey != "" && secretKey != "" {
		loadOptions = append(loadOptions, config.WithCredentialsProvider(
			credentials.NewStaticCredentialsProvider(accessKey, secretKey, ""),
		))
	}

	cfg, err := config.LoadDefaultConfig(
		context.TODO(),
		loadOptions...,
	)

	if err != nil {
		log.Printf("failed to initialize AWS SDK: %v", err)
		return
	}

	S3Client = s3.NewFromConfig(cfg)
}
