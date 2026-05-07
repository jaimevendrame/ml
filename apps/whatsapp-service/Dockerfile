# Build context: ./apps/whatsapp-service (paths are relative to that dir)
FROM golang:1.23-alpine AS builder
RUN apk add --no-cache gcc musl-dev
WORKDIR /build
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=1 go build -ldflags="-s -w" -o /server ./cmd/server

FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=builder /server .
RUN mkdir -p /data
VOLUME ["/data"]
ENV SESSION_PATH=/data/session.db
ENV PORT=8080
EXPOSE 8080
ENTRYPOINT ["/app/server"]
