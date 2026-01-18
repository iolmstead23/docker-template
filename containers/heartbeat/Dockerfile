FROM golang:1.21-alpine AS builder

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
RUN chmod +x init.sh

ENTRYPOINT ["./init.sh"]
