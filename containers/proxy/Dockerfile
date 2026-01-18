FROM golang:alpine AS builder

RUN apk add --no-cache git

WORKDIR /build

COPY src/go.mod src/go.sum* ./
RUN go mod download

COPY src/ ./

RUN CGO_ENABLED=0 GOOS=linux go build -o caddy .

FROM alpine:3.19

RUN apk add --no-cache ca-certificates

WORKDIR /app

COPY --from=builder /build/caddy .
COPY Caddyfile /etc/caddy/Caddyfile
COPY init.sh .
RUN chmod +x init.sh

EXPOSE 80
EXPOSE 2019

ENTRYPOINT ["./init.sh"]
