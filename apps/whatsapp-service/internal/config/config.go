package config

import "os"

type Config struct {
	SessionPath  string
	ServiceToken string
	Port         string
}

func Load() *Config {
	return &Config{
		SessionPath:  getEnv("SESSION_PATH", "/data/session.db"),
		ServiceToken: getEnv("INTERNAL_SERVICE_TOKEN", ""),
		Port:         getEnv("PORT", "8080"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
