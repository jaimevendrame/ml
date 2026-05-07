package handlers

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"time"

	"github.com/jaimevendrame/ml/apps/whatsapp-service/internal/config"
	"github.com/jaimevendrame/ml/apps/whatsapp-service/internal/whatsapp"
	"go.mau.fi/whatsmeow"
	waProto "go.mau.fi/whatsmeow/proto/waE2E"
	"go.mau.fi/whatsmeow/types"
	"google.golang.org/protobuf/proto"
)

type Handler struct {
	wa  *whatsapp.WAClient
	cfg *config.Config
}

func New(wa *whatsapp.WAClient, cfg *config.Config) *Handler {
	return &Handler{wa: wa, cfg: cfg}
}

func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /qr", h.auth(h.getQR))
	mux.HandleFunc("GET /status", h.auth(h.getStatus))
	mux.HandleFunc("POST /send", h.auth(h.postSend))
	mux.HandleFunc("GET /groups", h.auth(h.getGroups))
	mux.HandleFunc("GET /health", h.health)
}

// --- middleware ---

func (h *Handler) auth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if h.cfg.ServiceToken != "" && r.Header.Get("X-Internal-Token") != h.cfg.ServiceToken {
			jsonError(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		next(w, r)
	}
}

// --- GET /health ---

func (h *Handler) health(w http.ResponseWriter, _ *http.Request) {
	jsonOK(w, map[string]string{"status": "ok"})
}

// --- GET /qr ---

func (h *Handler) getQR(w http.ResponseWriter, _ *http.Request) {
	jsonOK(w, map[string]any{
		"status": h.wa.Status(),
		"qr":     nullableString(h.wa.QR()),
	})
}

// --- GET /status ---

func (h *Handler) getStatus(w http.ResponseWriter, _ *http.Request) {
	jsonOK(w, map[string]any{
		"status":    h.wa.Status(),
		"connected": h.wa.IsConnected(),
	})
}

// --- POST /send ---

type sendRequest struct {
	JID      string `json:"jid"`
	Text     string `json:"text"`
	ImageURL string `json:"image_url"`
}

func (h *Handler) postSend(w http.ResponseWriter, r *http.Request) {
	if !h.wa.IsLoggedIn() {
		jsonError(w, "not connected", http.StatusServiceUnavailable)
		return
	}

	var req sendRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if req.JID == "" || req.Text == "" {
		jsonError(w, "jid and text are required", http.StatusBadRequest)
		return
	}

	jid, err := types.ParseJID(req.JID)
	if err != nil {
		jsonError(w, "invalid jid: "+err.Error(), http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	var msg *waProto.Message
	if req.ImageURL != "" {
		msg, err = h.buildImageMessage(ctx, req.Text, req.ImageURL)
		if err != nil {
			slog.Error("build image message", "error", err)
			jsonError(w, "failed to prepare image: "+err.Error(), http.StatusBadGateway)
			return
		}
	} else {
		msg = &waProto.Message{Conversation: proto.String(req.Text)}
	}

	resp, err := h.wa.Inner().SendMessage(ctx, jid, msg)
	if err != nil {
		slog.Error("send message", "jid", req.JID, "error", err)
		jsonError(w, "send failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	slog.Info("message sent", "jid", req.JID, "id", resp.ID)
	jsonOK(w, map[string]string{"id": resp.ID})
}

func (h *Handler) buildImageMessage(ctx context.Context, caption, imageURL string) (*waProto.Message, error) {
	reqHTTP, err := http.NewRequestWithContext(ctx, http.MethodGet, imageURL, nil)
	if err != nil {
		return nil, err
	}
	resp, err := http.DefaultClient.Do(reqHTTP)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(io.LimitReader(resp.Body, 10<<20)) // 10 MB
	if err != nil {
		return nil, err
	}

	uploaded, err := h.wa.Inner().Upload(ctx, data, whatsmeow.MediaImage)
	if err != nil {
		return nil, err
	}

	return &waProto.Message{
		ImageMessage: &waProto.ImageMessage{
			Caption:       proto.String(caption),
			URL:           proto.String(uploaded.URL),
			DirectPath:    proto.String(uploaded.DirectPath),
			MediaKey:      uploaded.MediaKey,
			FileEncSHA256: uploaded.FileEncSHA256,
			FileSHA256:    uploaded.FileSHA256,
			FileLength:    proto.Uint64(uint64(len(data))),
			Mimetype:      proto.String(http.DetectContentType(data)),
		},
	}, nil
}

// --- GET /groups ---

type groupItem struct {
	JID  string `json:"jid"`
	Name string `json:"name"`
}

func (h *Handler) getGroups(w http.ResponseWriter, r *http.Request) {
	if !h.wa.IsLoggedIn() {
		jsonError(w, "not connected", http.StatusServiceUnavailable)
		return
	}

	groups, err := h.wa.GetJoinedGroups(r.Context())
	if err != nil {
		slog.Error("get groups", "error", err)
		jsonError(w, "failed to get groups: "+err.Error(), http.StatusInternalServerError)
		return
	}

	items := make([]groupItem, 0, len(groups))
	for _, g := range groups {
		items = append(items, groupItem{JID: g.JID.String(), Name: g.Name})
	}
	jsonOK(w, map[string]any{"groups": items})
}

// --- helpers ---

func jsonOK(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(v); err != nil {
		slog.Error("json encode", "error", err)
	}
}

func jsonError(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

func nullableString(s string) any {
	if s == "" {
		return nil
	}
	return s
}
