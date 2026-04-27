FROM golang:1.24.0-alpine AS builder
# DT-48: Pin Go version to ensure reproducible builds across machines and CI runs

WORKDIR /build

COPY src/go.mod src/go.sum* ./
RUN go mod download

COPY src/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -o heartbeat .

FROM alpine:3.19

RUN apk add --no-cache ca-certificates

WORKDIR /app

COPY --from=builder /build/heartbeat .
COPY init.sh .
RUN sed -i 's/\r$//' init.sh && chmod +x init.sh

ENTRYPOINT ["./init.sh"]
