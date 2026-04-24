FROM golang:alpine AS builder

WORKDIR /build

COPY src/go.mod src/go.sum* ./
RUN go mod download

COPY src/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -o telemetry .

FROM alpine:3.19

RUN apk add --no-cache ca-certificates

WORKDIR /app

COPY --from=builder /build/telemetry .
COPY init.sh .
RUN sed -i 's/\r$//' init.sh && chmod +x init.sh

EXPOSE 8081

ENTRYPOINT ["./init.sh"]
