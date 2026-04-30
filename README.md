# 3EDataToolkit

Turnkey microservices platform with OpenTelemetry tracing and centralized JSONL logging.

## Quick Access
`Port numbers are set in .env`

- Web Application: http://localhost:4000
- Jaeger Traces: http://localhost:16686
- Logs: `./logs/telemetry-%YEAR%%MONTH%%DAY%-%HOUR%%MINUTES%%SECONDS%-%RANDOMIZED NUMBER%.log` (JSONL format)

## How to Start

Run `docker compose up -d --build` to build and run the full process
Run `docker compose -f docker-compose.noweb.yml up -d --build` to build and run without the web front end
