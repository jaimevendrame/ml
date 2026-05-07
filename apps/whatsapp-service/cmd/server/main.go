package main

import (
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/jaimevendrame/ml/apps/whatsapp-service/internal/config"
	"github.com/jaimevendrame/ml/apps/whatsapp-service/internal/handlers"
	"github.com/jaimevendrame/ml/apps/whatsapp-service/internal/whatsapp"
)

func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})))

	cfg := config.Load()

	waClient, err := whatsapp.NewClient(cfg)
	if err != nil {
		slog.Error("failed to initialize whatsapp client", "error", err)
		os.Exit(1)
	}
	defer waClient.Disconnect()

	if err := waClient.Connect(); err != nil {
		slog.Error("failed to connect", "error", err)
		os.Exit(1)
	}

	mux := http.NewServeMux()
	handlers.New(waClient, cfg).Register(mux)

	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: mux,
	}

	go func() {
		slog.Info("server starting", "port", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	slog.Info("shutting down")
	waClient.Disconnect()
}
