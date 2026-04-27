FROM golang:1.24.0-alpine AS builder
# DT-48: Pin Go version to ensure reproducible builds across machines and CI runs

WORKDIR /build

COPY src/go.mod src/go.sum* ./
RUN go mod download

COPY src/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -o heartbeat .

FROM alpine:3.19.1
# DT-49: Pin Alpine patch version to prevent silent runtime changes

RUN apk add --no-cache ca-certificates

WORKDIR /app

COPY --from=builder /build/heartbeat .
COPY init.sh .
RUN sed -i 's/\r$//' init.sh && chmod +x init.sh

ENTRYPOINT ["./init.sh"]
