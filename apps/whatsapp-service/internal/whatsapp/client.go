package whatsapp

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"sync"

	"github.com/jaimevendrame/ml/apps/whatsapp-service/internal/config"
	_ "github.com/mattn/go-sqlite3"
	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/store/sqlstore"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
	waLog "go.mau.fi/whatsmeow/util/log"
)

const (
	StatusDisconnected = "disconnected"
	StatusWaitingQR    = "waiting_qr"
	StatusConnected    = "connected"
	StatusLoggedOut    = "logged_out"
)

type WAClient struct {
	wac *whatsmeow.Client
	mu  sync.RWMutex
	qr  string
	st  string
}

func NewClient(cfg *config.Config) (*WAClient, error) {
	if err := os.MkdirAll(filepath.Dir(cfg.SessionPath), 0o700); err != nil {
		return nil, fmt.Errorf("create session dir: %w", err)
	}

	dsn := fmt.Sprintf("file:%s?_foreign_keys=on", cfg.SessionPath)
	db, err := sql.Open("sqlite3", dsn)
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}

	ctx := context.Background()

	container := sqlstore.NewWithDB(db, "sqlite3", waLog.Noop)
	if err := container.Upgrade(ctx); err != nil {
		return nil, fmt.Errorf("upgrade store: %w", err)
	}

	device, err := container.GetFirstDevice(ctx)
	if err != nil {
		return nil, fmt.Errorf("get device: %w", err)
	}

	c := &WAClient{
		wac: whatsmeow.NewClient(device, waLog.Noop),
		st:  StatusDisconnected,
	}
	c.wac.AddEventHandler(c.handleEvent)
	return c, nil
}

func (c *WAClient) Connect() error {
	if c.wac.Store.ID == nil {
		c.setState(StatusWaitingQR, "")
		qrChan, err := c.wac.GetQRChannel(context.Background())
		if err != nil {
			return fmt.Errorf("get qr channel: %w", err)
		}
		go c.watchQR(qrChan)
	}
	if err := c.wac.Connect(); err != nil {
		return fmt.Errorf("connect: %w", err)
	}
	return nil
}

func (c *WAClient) Disconnect() {
	c.wac.Disconnect()
}

func (c *WAClient) IsConnected() bool {
	return c.wac.IsConnected()
}

func (c *WAClient) IsLoggedIn() bool {
	return c.wac.IsLoggedIn()
}

func (c *WAClient) Status() string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.st
}

func (c *WAClient) QR() string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.qr
}

func (c *WAClient) Inner() *whatsmeow.Client {
	return c.wac
}

func (c *WAClient) GetJoinedGroups(ctx context.Context) ([]*types.GroupInfo, error) {
	return c.wac.GetJoinedGroups(ctx)
}

func (c *WAClient) setState(st, qr string) {
	c.mu.Lock()
	c.st = st
	c.qr = qr
	c.mu.Unlock()
}

func (c *WAClient) watchQR(ch <-chan whatsmeow.QRChannelItem) {
	for evt := range ch {
		switch evt.Event {
		case "code":
			c.setState(StatusWaitingQR, evt.Code)
			slog.Info("qr code updated")
		case "success":
			c.setState(StatusConnected, "")
			slog.Info("whatsapp paired successfully")
		case "timeout":
			c.setState(StatusDisconnected, "")
			slog.Warn("qr code timed out")
		case "err":
			slog.Error("qr error", "error", evt.Error)
			c.setState(StatusDisconnected, "")
		}
	}
}

func (c *WAClient) handleEvent(raw interface{}) {
	switch raw.(type) {
	case *events.Connected:
		c.setState(StatusConnected, "")
		slog.Info("whatsapp connected")
	case *events.Disconnected:
		c.setState(StatusDisconnected, "")
		slog.Warn("whatsapp disconnected")
	case *events.LoggedOut:
		c.setState(StatusLoggedOut, "")
		slog.Warn("whatsapp logged out")
	}
}
