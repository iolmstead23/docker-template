package main

import (
	// Import Caddy command-line interface for proxy server functionality
	caddycmd "github.com/caddyserver/caddy/v2/cmd"

	// Import all standard Caddy modules (reverse proxy, file server, etc.)
	_ "github.com/caddyserver/caddy/v2/modules/standard"

	// Import custom request logging middleware with telemetry integration
	_ "proxy/tracing"
)

// main initializes and starts the Caddy proxy server with custom middleware
func main() {
	// Start Caddy server with all registered modules and middleware
	caddycmd.Main()
}
