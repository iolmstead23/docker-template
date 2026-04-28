package main

import (
	caddycmd "github.com/caddyserver/caddy/v2/cmd"
	_ "github.com/caddyserver/caddy/v2/modules/standard"
	_ "proxy/tracing"
)

// main initializes and starts the Caddy proxy server with custom middleware
func main() {
	caddycmd.Main()
}
