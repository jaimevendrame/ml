# Build stage
FROM golang:1.23-alpine AS builder
RUN apk add --no-cache gcc musl-dev
WORKDIR /build
COPY apps/whatsapp-service/go.mod apps/whatsapp-service/go.sum ./
RUN go mod download
COPY apps/whatsapp-service/ .
RUN CGO_ENABLED=1 go build -ldflags="-s -w" -o /server ./cmd/server

# Final stage
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
